import os
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from .models import *
from .serializers import *
from .permissions import *
from .utils import validate_email_domain

# Google ID-token verification (google-auth library)
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from .eligibility import run_eligibility_check


# ── Auth helpers ──────────────────────────────────────────────────────────────

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Skip CSRF enforcement at the DRF layer — handled by the cookie instead."""
    def enforce_csrf(self, request):
        return


# ── Auth views ────────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({'role': user.role, 'user_id': user.id})
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def logout_view(request):
    logout(request)
    return Response({'success': True})


@api_view(['GET'])
def me_view(request):
    user = request.user
    data = {
        'role': user.role,
        'user_id': user.id,
        'username': user.username,
        'preferred_language': user.preferred_language
    }
    if user.role == 'department' and hasattr(user, 'department'):
        data['name'] = user.department.name
        data['department_id'] = user.department.id
        data['ministry'] = user.department.ministry
    elif user.role == 'startup' and hasattr(user, 'startup'):
        s = user.startup
        data['name'] = s.name
        data['startup_id'] = s.id
        data['sector_tags'] = s.sector_tags
        data['registration_status'] = s.registration_status
    else:
        data['name'] = user.username
    return Response(data)


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def signup_view(request):
    """Register a new startup or department user."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    role     = request.data.get('role', '')
    name     = request.data.get('name', username)

    if not username or not password or not role:
        return Response({'detail': 'username, password and role are required.'},
                        status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already taken.'},
                        status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, role=role)

    if role == 'startup':
        Startup.objects.create(
            user=user,
            name=name,
            sector_tags=request.data.get('sector_tags', []),
            team_size=max(1, int(request.data.get('team_size', 1) or 1)),
            pitch_summary=request.data.get('pitch_summary', ''),
            founded_year=int(request.data.get('founded_year', 2024) or 2024),
            registration_status=request.data.get('registration_status', 'unregistered'),
        )
    elif role == 'department':
        Department.objects.create(
            user=user,
            name=name,
            ministry=request.data.get('ministry', ''),
        )

    return Response({'detail': 'Account created. Please log in.'},
                    status=status.HTTP_201_CREATED)


# ── Google OAuth Profile Completion ────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_oauth_profile_view(request):
    """
    Complete the profile for a user who signed up via Google OAuth.
    Called after first Google sign-in to collect startup/department details.
    """
    user = request.user
    role = user.role

    if role == 'startup':
        if not hasattr(user, 'startup'):
            return Response({'error': 'Startup profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate required fields
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Startup name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        startup = user.startup
        startup.name = name.replace('[INCOMPLETE] ', '')
        startup.sector_tags = request.data.get('sector_tags', [])
        startup.team_size = max(1, int(request.data.get('team_size', 1) or 1))
        startup.pitch_summary = request.data.get('pitch_summary', '')
        startup.founded_year = int(request.data.get('founded_year', 2024) or 2024)
        startup.registration_status = request.data.get('registration_status', 'unregistered')
        startup.save()

    elif role == 'department':
        if not hasattr(user, 'department'):
            return Response({'error': 'Department profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Validate required fields
        name = request.data.get('name', '').strip()
        ministry = request.data.get('ministry', '').strip()
        if not name:
            return Response({'error': 'Department name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not ministry:
            return Response({'error': 'Ministry is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        dept = user.department
        dept.name = name.replace('[INCOMPLETE] ', '')
        dept.ministry = ministry
        dept.save()

    return Response({'detail': 'Profile completed successfully.'}, status=status.HTTP_200_OK)


# ── Google OAuth view ─────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_auth_view(request):
    """
    Verify a Google ID token issued by GIS, enforce domain/role rules, then
    create or retrieve the Django user and establish a Django session.
    
    **Smart role detection:**
    - Existing users: role is auto-detected from their account (login mode)
    - New users: role must be provided and domain is validated (signup mode)

    Expected request body:
        {
            "credential": "<Google ID token JWT>",
            "role": "department"|"startup"  // Required for NEW users only
        }

    Returns (200):
        { "role": str, "user_id": int, "is_new_user": bool }
    """
    token = request.data.get('credential')
    role  = request.data.get('role')  # Optional for existing users

    if not token:
        return Response(
            {'error': 'Invalid payload. "credential" is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 1. Cryptographically verify the Google ID token ───────────────────────
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except ValueError as exc:
        return Response(
            {'error': f'Invalid Google token: {str(exc).lower()}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email          = idinfo.get('email', '').lower().strip()
    email_verified = idinfo.get('email_verified', False)

    if not email or not email_verified:
        return Response(
            {'error': 'Google account email is not verified.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── 2. Check if user already exists (login) or is new (signup) ────────────
    user = User.objects.filter(email=email).first()
    
    if user:
        # Existing user — use their existing role (login mode)
        role = user.role
    else:
        # New user — role must be provided (signup mode)
        if not role or role not in ('department', 'startup'):
            return Response(
                {'error': 'Role is required for new users. Please use the signup flow.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Enforce domain ↔ role business rules for NEW users only
        if not validate_email_domain(email, role):
            if role == 'department':
                return Response(
                    {'error': 'Unauthorized domain. Government departments require a valid .gov.in or .nic.in email.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            else:
                return Response(
                    {'error': 'Government emails cannot register as startups.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

    # ── 3. Look up or create the Django user ──────────────────────────────────
    is_new_user = False

    if user:
        # Existing user logging in — role already determined above
        pass
    else:
        # First-time sign-in: provision a new account.
        is_new_user = True
        base_username = email.split('@')[0]
        username      = base_username
        counter       = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}_{counter}'
            counter += 1

        user = User.objects.create(
            username   = username,
            email      = email,
            first_name = idinfo.get('given_name',  ''),
            last_name  = idinfo.get('family_name', ''),
            role       = role,
        )
        user.set_unusable_password()
        user.save()

        # Create MINIMAL profile - user will complete it on next screen
        # We use a placeholder name so the frontend knows to show onboarding
        display_name = f"[INCOMPLETE] {idinfo.get('name', username)}"
        
        if role == 'startup':
            Startup.objects.create(
                user                = user,
                name                = display_name,  # Marked as incomplete
                sector_tags         = [],
                team_size           = 1,
                pitch_summary       = '',
                founded_year        = 2024,
                registration_status = 'unregistered',
            )
        elif role == 'department':
            Department.objects.create(
                user     = user,
                name     = display_name,  # Marked as incomplete
                ministry = '',
            )

    # ── 4. Establish a Django session (same as login_view) ────────────────────
    # We must set the backend explicitly because authenticate() was not called.
    user.backend = 'django.contrib.auth.backends.ModelBackend'
    login(request, user)

    return Response({
        'role': user.role,
        'user_id': user.id,
        'is_new_user': is_new_user  # Frontend needs this to decide onboarding
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def log_application_view(request, pk):
    """Create an audit log entry when dept/evaluator opens an application."""
    if not Application.objects.filter(pk=pk).exists():
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    AuditLog.objects.create(
        actor=request.user.username,
        action='Viewed solution brief',
        target=f'Application #{pk}',
    )
    return Response({'detail': 'Logged.'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_view(request):
    return Response({"status": "ok"})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_stats_view(request):
    return Response({
        'open_challenges': Challenge.objects.filter(status='open').count(),
        'startups':        User.objects.filter(role='startup').count(),
        'pilots_scaled':   ScaleUpEntry.objects.count(),
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def public_challenges_view(request):
    """Public list of open challenges — no auth required. Used on Landing page."""
    challenges = Challenge.objects.filter(status='open').order_by('-created_at')[:6]
    data = []
    for c in challenges:
        data.append({
            'id':              c.id,
            'title':           c.title,
            'department_name': c.department.name,
            'budget_ceiling':  c.budget_ceiling,
            'timeline_weeks':  c.timeline_weeks,
            'sector_tags':     c.sector_tags,
            'created_at':      c.created_at.isoformat(),
        })
    return Response(data)


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reset_demo_view(request):
    if request.user.role != 'admin':
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    from django.core.management import call_command
    call_command('seed_demo_data')
    return Response({'success': True})


# ── ViewSets ──────────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [permissions.IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [permissions.IsAuthenticated]


class StartupViewSet(viewsets.ModelViewSet):
    queryset = Startup.objects.all()
    serializer_class = StartupSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [permissions.IsAuthenticated]


class ChallengeViewSet(viewsets.ModelViewSet):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'department' and hasattr(user, 'department'):
            return Challenge.objects.filter(department=user.department)
        if user.role == 'startup':
            return Challenge.objects.filter(status='open')
        # evaluator, admin, department without profile
        return Challenge.objects.all()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsDepartment()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(department=self.request.user.department)
        AuditLog.objects.create(
            actor=self.request.user.username,
            action='Posted challenge',
            target=serializer.instance.title,
        )


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def get_queryset(self):
        user = self.request.user
        challenge_id = self.request.query_params.get('challenge')
        qs = Application.objects.all()

        # Scope by role first
        if user.role == 'startup' and hasattr(user, 'startup'):
            qs = qs.filter(startup=user.startup)
        elif user.role == 'department' and hasattr(user, 'department'):
            qs = qs.filter(challenge__department=user.department)
        elif user.role == 'evaluator':
            qs = qs.filter(status='under_evaluation')
        # admin sees all

        # Additional filter by challenge id if requested
        if challenge_id:
            qs = qs.filter(challenge_id=challenge_id)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'startup' and hasattr(user, 'startup'):
            app = serializer.save(startup=user.startup)
        else:
            app = serializer.save()
        run_eligibility_check(app)
        AuditLog.objects.create(
            actor=user.username,
            action='Submitted application',
            target=f'Challenge #{app.challenge_id}',
        )
        # R3 — first_application badge (always idempotent via get_or_create)
        from .badges import award_badge
        if hasattr(app, 'startup') and app.startup_id:
            award_badge(app.startup, 'first_application')

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        PATCH /api/applications/<id>/update-status/
        Department (scoped to own challenge) can move an application through
        the pipeline: screening → eligible → under_evaluation → shortlisted → rejected
        """
        ALLOWED_TRANSITIONS = {
            'submitted':        ['screening', 'ineligible', 'rejected'],
            'screening':        ['eligible', 'ineligible', 'rejected'],
            'eligible':         ['under_evaluation', 'rejected'],
            'under_evaluation': ['shortlisted', 'rejected'],
            'shortlisted':      ['contracted', 'rejected'],
        }
        user = request.user
        if user.role != 'department' or not hasattr(user, 'department'):
            return Response({'error': 'Department access only.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            app = Application.objects.select_related('challenge__department').get(pk=pk)
        except Application.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if app.challenge.department != user.department:
            return Response({'error': 'Not your challenge.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed = ALLOWED_TRANSITIONS.get(app.status, [])
        if new_status not in allowed:
            return Response(
                {'error': f"Cannot move from '{app.status}' to '{new_status}'. Allowed: {allowed}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        app.status = new_status
        app.save(update_fields=['status'])
        AuditLog.objects.create(
            actor=user.username,
            action=f'Updated application status to {new_status}',
            target=f'Application #{app.id}',
        )
        return Response(ApplicationSerializer(app).data)


class EligibilityResultViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EligibilityResult.objects.all()
    serializer_class = EligibilityResultSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def get_queryset(self):
        qs = EligibilityResult.objects.all()
        app_id = self.request.query_params.get('application')
        if app_id:
            qs = qs.filter(application_id=app_id)
        return qs


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    serializer_class = EvaluationSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def get_queryset(self):
        qs = Evaluation.objects.all()
        app_id = self.request.query_params.get('application')
        if app_id:
            qs = qs.filter(application_id=app_id)
        return qs

    def get_permissions(self):
        if self.action == 'create':
            return [IsEvaluator()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(evaluator=self.request.user)
        AuditLog.objects.create(
            actor=self.request.user.username,
            action='Submitted evaluation',
            target=f'Application #{serializer.instance.application_id}',
        )
        # R3 — prototype_builder badge when first round2 eval is created
        from .badges import award_badge
        ev = serializer.instance
        if ev.round == 'round2_prototype':
            is_first_r2 = Evaluation.objects.filter(
                application=ev.application, round='round2_prototype'
            ).count() == 1
            if is_first_r2:
                award_badge(ev.application.startup, 'prototype_builder')


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def get_queryset(self):
        qs = Contract.objects.all()
        app_id = self.request.query_params.get('application')
        if app_id:
            qs = qs.filter(application_id=app_id)
        return qs

    def perform_create(self, serializer):
        contract = serializer.save()
        app = contract.application
        app.status = 'contracted'
        app.save()
        AuditLog.objects.create(
            actor=self.request.user.username,
            action='Generated contract',
            target=f'Application #{app.id}',
        )
        # R3 — contract_winner badge
        from .badges import award_badge
        award_badge(app.startup, 'contract_winner')
        # Try PDF generation (requires WeasyPrint)
        try:
            self._generate_pdf(contract)
        except Exception as e:
            print(f"PDF generation skipped: {e}")

    def _generate_pdf(self, contract):
        from jinja2 import Environment, FileSystemLoader
        from django.conf import settings
        from weasyprint import HTML

        app = contract.application
        template_dir = os.path.join(settings.BASE_DIR, 'core', 'templates')
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template('contract.html')
        html = template.render(
            department_name=app.challenge.department.name,
            startup_name=app.startup.name,
            challenge_title=app.challenge.title,
            ip_clause_text=contract.ip_clause_text,
            data_clause_text=contract.data_clause_text,
            cybersecurity_checklist_text=contract.cybersecurity_checklist_text,
            milestones=contract.milestones,
        )
        media_dir = os.path.join(settings.MEDIA_ROOT, 'contracts')
        os.makedirs(media_dir, exist_ok=True)
        pdf_path = os.path.join(media_dir, f'contract_{contract.id}.pdf')
        HTML(string=html).write_pdf(pdf_path)
        contract.pdf_file = f'contracts/contract_{contract.id}.pdf'
        contract.save()


class ScaleUpEntryViewSet(viewsets.ModelViewSet):
    queryset = ScaleUpEntry.objects.all()
    serializer_class = ScaleUpEntrySerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def partial_update(self, request, *args, **kwargs):
        """
        PATCH /api/scaleup-entries/<id>/
        If payload contains {"adopted": true}, increment adopted_count and
        append the requesting department to adopting_departments.
        """
        instance = self.get_object()
        if request.data.get('adopted') is True:
            user = request.user
            dept_name = ''
            if user.role == 'department' and hasattr(user, 'department'):
                dept_name = user.department.name
            # Avoid duplicate adoption entries
            existing_names = [
                d.get('name', d) if isinstance(d, dict) else d
                for d in instance.adopting_departments
            ]
            if dept_name and dept_name not in existing_names:
                instance.adopting_departments = list(instance.adopting_departments) + [{'name': dept_name}]
                instance.adopted_count = len(instance.adopting_departments)
                instance.save(update_fields=['adopting_departments', 'adopted_count'])
                AuditLog.objects.create(
                    actor=user.username,
                    action='Adopted scale-up pilot',
                    target=instance.original_challenge_title,
                )
            return Response(ScaleUpEntrySerializer(instance).data)
        return super().partial_update(request, *args, **kwargs)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)
    permission_classes = [permissions.IsAuthenticated]


# ── Supervision Layer ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def supervision_duplicates(request):
    """
    GET /api/supervision/duplicates/?department=<id>
    Compute pairwise TF-IDF cosine similarity across all solution_briefs for
    challenges owned by the requesting department. Returns pairs >= 0.75.
    No DB write — always computed fresh.
    """
    user = request.user
    if user.role != 'department' or not hasattr(user, 'department'):
        return Response({'error': 'Department access only.'}, status=status.HTTP_403_FORBIDDEN)

    dept = user.department
    apps = Application.objects.filter(
        challenge__department=dept
    ).select_related('startup', 'challenge')

    if apps.count() < 2:
        return Response([])

    app_list = list(apps)
    briefs   = [a.solution_brief for a in app_list]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        vec    = TfidfVectorizer(stop_words='english', min_df=1)
        matrix = vec.fit_transform(briefs)
        sims   = cosine_similarity(matrix)
    except ImportError:
        return Response(
            {'error': 'scikit-learn not installed. Run: pip install scikit-learn'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    results = []
    n = len(app_list)
    for i in range(n):
        for j in range(i + 1, n):
            score = float(sims[i, j])
            if score >= 0.75:
                a = app_list[i]
                b = app_list[j]
                earlier = 'application_a' if a.created_at <= b.created_at else 'application_b'
                results.append({
                    'application_a': {
                        'id': a.id,
                        'startup_name': a.startup.name,
                        'submitted_at': a.created_at.isoformat(),
                    },
                    'application_b': {
                        'id': b.id,
                        'startup_name': b.startup.name,
                        'submitted_at': b.created_at.isoformat(),
                    },
                    'similarity': round(score, 4),
                    'earlier': earlier,
                })

    return Response(results)


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def ai_provider_config(request):
    """
    GET /api/ai-provider-config/  — return masked config for this dept
    PUT /api/ai-provider-config/  — save/update provider + api_key + enabled
    """
    user = request.user
    if user.role != 'department' or not hasattr(user, 'department'):
        return Response({'error': 'Department access only.'}, status=status.HTTP_403_FORBIDDEN)

    dept = user.department

    if request.method == 'GET':
        try:
            cfg = AIProviderConfig.objects.get(department=dept)
            return Response(AIProviderConfigSerializer(cfg).data)
        except AIProviderConfig.DoesNotExist:
            return Response(None)

    # PUT
    provider = request.data.get('provider')
    api_key  = request.data.get('api_key', '')
    enabled  = request.data.get('enabled', True)

    if not provider:
        return Response({'detail': 'provider is required.'}, status=status.HTTP_400_BAD_REQUEST)

    cfg, _ = AIProviderConfig.objects.get_or_create(department=dept)
    cfg.provider = provider
    cfg.enabled  = bool(enabled)
    if api_key:          # only update key if a new one was explicitly sent
        cfg.api_key = api_key
    cfg.save()

    AuditLog.objects.create(
        actor=user.username,
        action='Updated AI provider config',
        target=f'Department #{dept.id}',
    )
    return Response(AIProviderConfigSerializer(cfg).data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def novelty_check(request, pk):
    """
    GET  /api/applications/<id>/novelty-check/  — return existing check or null
    POST /api/applications/<id>/novelty-check/  — run AI check and persist result
    """
    import json, requests as http

    try:
        app = Application.objects.select_related(
            'startup', 'challenge__department'
        ).get(pk=pk)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

    # ── GET: return the saved result (or null) ────────────────────────────────
    if request.method == 'GET':
        try:
            nc = NoveltyCheck.objects.get(application=app)
            return Response(NoveltyCheckSerializer(nc).data)
        except NoveltyCheck.DoesNotExist:
            return Response(None)

    # ── POST: call AI provider and persist result ─────────────────────────────
    dept = app.challenge.department
    try:
        cfg = AIProviderConfig.objects.get(department=dept, enabled=True)
    except AIProviderConfig.DoesNotExist:
        return Response(
            {'error': 'No AI provider configured. Add one in Supervision settings.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    prompt = (
        "You are assisting a government innovation-procurement reviewer. "
        "Given this startup solution brief, assess: "
        "(1) Does this already exist as a known commercial product, open-source tool, or published approach? "
        "(2) If yes, name up to 3 examples. "
        "(3) Give a verdict: 'Likely Novel', 'Similar Solutions Exist', or 'Partially Novel'. "
        f"Solution brief: {app.solution_brief}\n"
        "Respond in strict JSON only, no other text: "
        '{"verdict": "...", "similar_products": [...], "explanation": "..."}'
    )

    raw = None
    try:
        if cfg.provider == 'openai':
            resp = http.post(
                'https://api.openai.com/v1/chat/completions',
                headers={'Authorization': f'Bearer {cfg.api_key}',
                         'Content-Type': 'application/json'},
                json={'model': 'gpt-4o-mini',
                      'messages': [{'role': 'user', 'content': prompt}],
                      'response_format': {'type': 'json_object'}},
                timeout=15,
            )
            resp.raise_for_status()
            raw = resp.json()['choices'][0]['message']['content']

        elif cfg.provider == 'anthropic':
            resp = http.post(
                'https://api.anthropic.com/v1/messages',
                headers={'x-api-key': cfg.api_key,
                         'anthropic-version': '2023-06-01',
                         'Content-Type': 'application/json'},
                json={'model': 'claude-3-5-haiku-20241022',
                      'max_tokens': 512,
                      'messages': [{'role': 'user', 'content': prompt}]},
                timeout=15,
            )
            resp.raise_for_status()
            raw = resp.json()['content'][0]['text']

        elif cfg.provider == 'gemini':
            resp = http.post(
                f'https://generativelanguage.googleapis.com/v1beta/models/'
                f'gemini-1.5-flash:generateContent?key={cfg.api_key}',
                headers={'Content-Type': 'application/json'},
                json={'contents': [{'parts': [{'text': prompt}]}]},
                timeout=15,
            )
            resp.raise_for_status()
            raw = resp.json()['candidates'][0]['content']['parts'][0]['text']

        else:
            return Response({'error': f'Unknown provider: {cfg.provider}'},
                            status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response(
            {'error': 'AI provider request failed. Check your API key in Supervision settings.'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    # Parse AI response
    try:
        # Strip markdown fences if present
        clean = raw.strip().lstrip('`').rstrip('`')
        if clean.startswith('json'):
            clean = clean[4:]
        parsed = json.loads(clean)
    except Exception:
        return Response(
            {'error': 'AI returned unparseable response. Try again.'},
            status=status.HTTP_502_BAD_GATEWAY
        )

    # Map verdict to 2-state system
    verdict_map = {
        'likely novel':          'likely_novel',
        'similar solutions exist': 'similar_exists',
        'partially novel':       'similar_exists',
    }
    raw_verdict = parsed.get('verdict', '').lower()
    verdict = verdict_map.get(raw_verdict, 'not_assessed')

    nc, _ = NoveltyCheck.objects.update_or_create(
        application=app,
        defaults={
            'verdict':          verdict,
            'similar_products': parsed.get('similar_products', []),
            'explanation':      parsed.get('explanation', ''),
        }
    )

    AuditLog.objects.create(
        actor=request.user.username,
        action='Ran novelty check',
        target=f'Application #{pk}',
    )
    return Response(NoveltyCheckSerializer(nc).data)


# ── R2: Finalize Round endpoint ───────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def finalize_round(request, challenge_id):
    """
    POST /api/challenges/<id>/finalize-round/
    Body: {"round": "round1_application" | "round2_prototype"}
    Department only, scoped to own challenge.
    """
    from .badges import award_badge, BADGE_CATALOG

    user = request.user
    if user.role != 'department' or not hasattr(user, 'department'):
        return Response({'error': 'Department access only.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        challenge = Challenge.objects.get(pk=challenge_id, department=user.department)
    except Challenge.DoesNotExist:
        return Response({'error': 'Challenge not found or not yours.'}, status=status.HTTP_404_NOT_FOUND)

    round_key = request.data.get('round', 'round1_application')
    if round_key not in ('round1_application', 'round2_prototype'):
        return Response({'error': 'Invalid round.'}, status=status.HTTP_400_BAD_REQUEST)

    # Get all applications with at least one non-COI evaluation for this round
    apps = Application.objects.filter(challenge=challenge).prefetch_related('evaluation_set')

    scored_apps = []
    for app in apps:
        evals = app.evaluation_set.filter(round=round_key, conflict_of_interest=False)
        if not evals.exists():
            continue
        # Skip if already has a RatingHistory row for this challenge+round (idempotency)
        if RatingHistory.objects.filter(application=app, round=round_key).exists():
            continue
        avg = sum(e.total_score for e in evals) / len(evals)
        scored_apps.append({'app': app, 'score': avg, 'evals': list(evals)})

    if not scored_apps:
        return Response({'message': 'No new applications to score for this round.', 'results': []})

    cohort_average = sum(s['score'] for s in scored_apps) / len(scored_apps)

    # Find top impact/innovation for champion badges
    top_impact = max(scored_apps, key=lambda x: max(
        (e.score_impact_sustainability for e in x['evals']), default=0))
    top_innovation = max(scored_apps, key=lambda x: max(
        (e.score_innovation for e in x['evals']), default=0))
    max_impact_score = max(
        (e.score_impact_sustainability for e in top_impact['evals']), default=0)
    max_innovation_score = max(
        (e.score_innovation for e in top_innovation['evals']), default=0)

    results = []
    for item in scored_apps:
        app    = item['app']
        score  = item['score']
        startup = app.startup

        delta = max(0, round(20 * (score - cohort_average) / 50))
        startup.rating += delta
        startup.save(update_fields=['rating'])

        RatingHistory.objects.create(
            startup=startup, application=app, round=round_key,
            score=round(score), cohort_average=cohort_average,
            delta=delta, rating_after=startup.rating,
        )

        # Badges
        if round_key == 'round1_application':
            if score >= cohort_average:
                award_badge(startup, 'round1_qualifier')
            if score >= 40:
                award_badge(startup, 'high_performer')
        elif round_key == 'round2_prototype':
            if score >= cohort_average:
                award_badge(startup, 'round2_qualifier')

        # Champion badges — tied = all get it
        if max_impact_score > 0:
            for s_item in scored_apps:
                if max(
                    (e.score_impact_sustainability for e in s_item['evals']), default=0
                ) == max_impact_score:
                    award_badge(s_item['app'].startup, 'sustainability_champion')

        if max_innovation_score > 0:
            for s_item in scored_apps:
                if max(
                    (e.score_innovation for e in s_item['evals']), default=0
                ) == max_innovation_score:
                    award_badge(s_item['app'].startup, 'innovation_excellence')

        AuditLog.objects.create(
            actor=user.username,
            action=f'Finalized {round_key} — delta +{delta}',
            target=f'Application #{app.id} ({startup.name})',
        )

        results.append({
            'application_id': app.id,
            'startup_name':   startup.name,
            'score':          round(score),
            'delta':          delta,
            'new_rating':     startup.rating,
        })

    return Response({
        'cohort_average': round(cohort_average, 2),
        'results':        results,
    })


# ── R7: Prototype phase endpoints ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_prototype_phase(request, pk):
    """POST /api/applications/<id>/start-prototype-phase/"""
    from datetime import timedelta
    from django.utils import timezone
    from .badges import award_badge

    user = request.user
    if user.role != 'department' or not hasattr(user, 'department'):
        return Response({'error': 'Department access only.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        app = Application.objects.select_related('challenge__department').get(pk=pk)
    except Application.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if app.challenge.department != user.department:
        return Response({'error': 'Not your challenge.'}, status=status.HTTP_403_FORBIDDEN)

    if app.status != 'shortlisted':
        return Response({'error': 'Application must be shortlisted.'}, status=status.HTTP_400_BAD_REQUEST)

    if app.prototype_start_date:
        return Response({'error': 'Prototype phase already started.'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    app.prototype_start_date = now
    app.prototype_deadline   = now + timedelta(days=30)
    app.save(update_fields=['prototype_start_date', 'prototype_deadline'])

    AuditLog.objects.create(
        actor=user.username,
        action='Started prototype phase',
        target=f'Application #{pk}',
    )
    return Response(ApplicationSerializer(app).data)


# ── R3: Startup badges endpoint ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def startup_badges(request, pk):
    """GET /api/startups/<id>/badges/"""
    from .badges import BADGE_CATALOG

    try:
        startup = Startup.objects.get(pk=pk)
    except Startup.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    earned = StartupBadge.objects.filter(startup=startup).order_by('-earned_at')
    result = []
    for sb in earned:
        meta = BADGE_CATALOG.get(sb.badge_key, {})
        result.append({
            'badge_key': sb.badge_key,
            'label':     meta.get('label', sb.badge_key),
            'icon':      meta.get('icon', 'Award'),
            'desc':      meta.get('desc', ''),
            'earned_at': sb.earned_at.isoformat(),
        })
    return Response(result)


# ── R2: Rating history for a startup ──────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def startup_rating_history(request, pk):
    """GET /api/startups/<id>/rating-history/"""
    history = RatingHistory.objects.filter(startup_id=pk).order_by('-created_at')[:20]
    return Response(RatingHistorySerializer(history, many=True).data)


# ── Translation API ────────────────────────────────────────────────────────────

from .translation_service import translate as translate_text
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta


@api_view(['POST'])
def translate_view(request):
    """
    Translate text from source to target language.
    
    Request body:
    {
        "text": "string to translate",
        "source_lang": "en",
        "target_lang": "hi"
    }
    
    Response:
    {
        "translated_text": "अनुवादित पाठ",
        "source": "cache|bhashini|google|fallback",
        "cached": true|false
    }
    
    Rate limiting: 100 requests per user per hour
    """
    # Rate limiting check
    user = request.user
    if user.is_authenticated:
        rate_key = f'translate_rate_limit_{user.id}'
        current_count = cache.get(rate_key, 0)
        
        if current_count >= 100:
            return Response(
                {'error': 'Rate limit exceeded. Maximum 100 translations per hour.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Increment counter
        cache.set(rate_key, current_count + 1, timeout=3600)  # 1 hour
    
    # Validate request
    text = request.data.get('text', '').strip()
    source_lang = request.data.get('source_lang', 'en')
    target_lang = request.data.get('target_lang', 'en')
    
    if not text:
        return Response(
            {'error': 'Text field is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Limit text length to prevent abuse
    if len(text) > 5000:
        return Response(
            {'error': 'Text too long. Maximum 5000 characters.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate language codes
    valid_langs = ['en', 'hi', 'mr', 'bn', 'ta', 'te', 'kn', 'ml']
    if source_lang not in valid_langs or target_lang not in valid_langs:
        return Response(
            {'error': f'Invalid language code. Supported: {", ".join(valid_langs)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Perform translation
    try:
        result = translate_text(text, source_lang, target_lang)
        return Response(result)
    except Exception as e:
        return Response(
            {
                'error': 'Translation failed',
                'detail': str(e),
                'translated_text': text,  # Fallback to original
                'source': 'error_fallback'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def translation_logs_view(request):
    """
    Get translation logs for monitoring (admin only).
    """
    limit = int(request.GET.get('limit', 50))
    logs = TranslationLog.objects.all()[:limit]
    serializer = TranslationLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def translation_stats_view(request):
    """
    Get translation cache statistics.
    """
    from django.db.models import Count
    
    total_cached = TranslationCache.objects.count()
    by_lang = TranslationCache.objects.values('target_lang').annotate(
        count=Count('id')
    ).order_by('-count')
    
    # Get recent failures (last 24 hours)
    yesterday = timezone.now() - timedelta(days=1)
    recent_failures = TranslationLog.objects.filter(
        timestamp__gte=yesterday,
        success=False
    ).count()
    
    return Response({
        'total_cached_translations': total_cached,
        'translations_by_language': list(by_lang),
        'recent_failures_24h': recent_failures
    })
