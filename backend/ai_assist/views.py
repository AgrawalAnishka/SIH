"""
ai_assist/views.py
DRF views for the Sahayak AI Engine API.
All endpoints under /api/ai/
"""
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.throttling import UserRateThrottle

from core.permissions import IsEvaluator, IsAdmin
from rest_framework.permissions import IsAuthenticated


class CsrfExemptSessionAuth(SessionAuthentication):
    def enforce_csrf(self, request):
        return


class AiAnalyzeThrottle(UserRateThrottle):
    rate = '10/min'

class AiRewriteThrottle(UserRateThrottle):
    rate = '20/hour'


def _is_evaluator_or_admin(request):
    return request.user.is_authenticated and request.user.role in ('evaluator', 'admin')


# ── Config endpoint ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def config_view(request):
    """GET /api/ai/config/ — returns assistant name, mode, thresholds."""
    provider_name = getattr(settings, 'LLM_PROVIDER', 'mock')
    is_mock = provider_name == 'mock' or not getattr(settings, 'LLM_API_KEY', '')
    return Response({
        'assistant_name': getattr(settings, 'AI_ASSISTANT_NAME', 'Sahayak'),
        'mode': 'demo' if is_mock else 'live',
        'provider': provider_name,
        'enabled': getattr(settings, 'AI_ENABLED', True),
        'priority_thresholds': getattr(settings, 'PRIORITY_THRESHOLDS',
                                       {'critical': 85, 'high': 65, 'medium': 35}),
    })


# ── PS-level endpoints ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ps_overview(request, ps_id):
    """GET /api/ai/ps/<ps_id>/overview/ — PSInsight + clusters + stats."""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from core.models import Challenge
    from ai_assist.models import PSInsight, ClusterGroup, SubmissionAnalysis
    from ai_assist.serializers import PSInsightSerializer, ClusterGroupSerializer

    try:
        challenge = Challenge.objects.get(pk=ps_id)
    except Challenge.DoesNotExist:
        return Response({'error': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)

    insight = PSInsight.objects.filter(
        challenge=challenge, is_current=True
    ).first()

    clusters = ClusterGroup.objects.filter(
        challenge=challenge
    ).prefetch_related('member_analyses').order_by('-avg_priority_score')

    # Count pending analyses
    pending_count = SubmissionAnalysis.objects.filter(
        application__challenge=challenge,
        is_current=True,
        status__in=('pending', 'processing')
    ).count()

    return Response({
        'challenge_id': ps_id,
        'challenge_title': challenge.title,
        'insight': PSInsightSerializer(insight).data if insight else None,
        'clusters': ClusterGroupSerializer(clusters, many=True).data,
        'pending_analyses': pending_count,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ps_regenerate(request, ps_id):
    """POST /api/ai/ps/<ps_id>/regenerate/ — re-run clustering + insight."""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from ai_assist.tasks import enqueue_insight
    enqueue_insight(ps_id, force=True)
    return Response({'detail': 'Insight regeneration queued.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ps_queue(request, ps_id):
    """
    GET /api/ai/ps/<ps_id>/queue/
    Paginated, filterable queue of applications with analyses.
    Query params: priority, severity, category, flag, reviewed, sort, page, page_size
    """
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)

    from core.models import Challenge
    from ai_assist.models import SubmissionAnalysis
    from ai_assist.serializers import QueueItemSerializer

    try:
        challenge = Challenge.objects.get(pk=ps_id)
    except Challenge.DoesNotExist:
        return Response({'error': 'Challenge not found.'}, status=status.HTTP_404_NOT_FOUND)

    qs = SubmissionAnalysis.objects.filter(
        application__challenge=challenge,
        is_current=True,
    ).select_related('application__startup', 'application__challenge')

    # Filters
    priority = request.query_params.get('priority')
    if priority:
        qs = qs.filter(priority=priority)

    severity = request.query_params.get('severity')
    if severity:
        qs = qs.filter(severity=severity)

    category = request.query_params.get('category')
    if category:
        qs = qs.filter(category=category)

    reviewed = request.query_params.get('reviewed')
    if reviewed == 'true':
        qs = qs.exclude(reviewed_by=None)
    elif reviewed == 'false':
        qs = qs.filter(reviewed_by=None)

    flag = request.query_params.get('flag')
    # Flag filtering is done in Python (JSON field)
    analyses = list(qs.order_by('-priority_score', 'reviewed_by'))

    if flag:
        analyses = [
            a for a in analyses
            if flag in [(f['code'] if isinstance(f, dict) else f)
                        for f in (a.flags or [])]
        ]

    # Pagination
    page_size = min(int(request.query_params.get('page_size', 20)), 100)
    page      = max(int(request.query_params.get('page', 1)), 1)
    start     = (page - 1) * page_size
    end       = start + page_size
    total     = len(analyses)
    page_data = analyses[start:end]

    return Response({
        'count':    total,
        'page':     page,
        'pages':    (total + page_size - 1) // page_size,
        'results':  QueueItemSerializer(page_data, many=True).data,
    })


# ── Per-submission endpoints ──────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def submission_analysis(request, app_id):
    """GET /api/ai/submissions/<app_id>/analysis/"""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from ai_assist.models import SubmissionAnalysis
    from ai_assist.serializers import SubmissionAnalysisSerializer

    analysis = SubmissionAnalysis.objects.filter(
        application_id=app_id, is_current=True
    ).first()
    if not analysis:
        return Response({'detail': 'No analysis available yet.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(SubmissionAnalysisSerializer(analysis).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AiAnalyzeThrottle])
def submission_analyze(request, app_id):
    """POST /api/ai/submissions/<app_id>/analyze/ — trigger or re-trigger analysis."""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from ai_assist.tasks import enqueue_analysis
    from ai_assist.models import SubmissionAnalysis

    # Mark existing as pending so UI shows progress
    SubmissionAnalysis.objects.filter(
        application_id=app_id, is_current=True, status='done'
    ).update(status='pending')

    enqueue_analysis(app_id, force=True)
    return Response({'detail': 'Analysis queued.'})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def override_analysis(request, analysis_id):
    """PATCH /api/ai/analyses/<analysis_id>/override/"""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from ai_assist.models import SubmissionAnalysis, EvaluatorOverride
    from core.models import AuditLog

    try:
        analysis = SubmissionAnalysis.objects.get(pk=analysis_id)
    except SubmissionAnalysis.DoesNotExist:
        return Response({'error': 'Analysis not found.'}, status=status.HTTP_404_NOT_FOUND)

    field     = request.data.get('field')
    new_value = request.data.get('new_value')
    reason    = request.data.get('reason', '')

    ALLOWED_FIELDS = {'category', 'priority', 'severity', 'flags'}
    if field not in ALLOWED_FIELDS:
        return Response({'error': f'field must be one of: {ALLOWED_FIELDS}'},
                        status=status.HTTP_400_BAD_REQUEST)
    if new_value is None:
        return Response({'error': 'new_value is required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Store original AI value
    ai_value = getattr(analysis, field)

    # Create override record (preserves original AI value)
    EvaluatorOverride.objects.create(
        analysis=analysis,
        evaluator=request.user,
        field=field,
        ai_value=ai_value,
        new_value=new_value,
        reason=reason,
    )

    # Apply override to analysis
    setattr(analysis, field, new_value)
    analysis.save(update_fields=[field, 'updated_at'])

    # Audit log
    AuditLog.objects.create(
        actor=request.user.username,
        action=f'AI override: {field}',
        target=f'Analysis #{analysis_id} (App #{analysis.application_id})',
    )

    return Response({'detail': f'{field} overridden successfully.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_reviewed(request, analysis_id):
    """POST /api/ai/analyses/<analysis_id>/mark-reviewed/"""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from ai_assist.models import SubmissionAnalysis
    from core.models import AuditLog

    try:
        analysis = SubmissionAnalysis.objects.get(pk=analysis_id)
    except SubmissionAnalysis.DoesNotExist:
        return Response({'error': 'Analysis not found.'}, status=status.HTTP_404_NOT_FOUND)

    analysis.reviewed_by = request.user
    analysis.reviewed_at = timezone.now()
    analysis.save(update_fields=['reviewed_by', 'reviewed_at', 'updated_at'])

    AuditLog.objects.create(
        actor=request.user.username,
        action='Marked AI analysis as reviewed',
        target=f'Application #{analysis.application_id}',
    )
    return Response({'detail': 'Marked as reviewed.'})


# ── Improve Response (Rewrite) ────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AiRewriteThrottle])
def improve_submission(request, app_id):
    """POST /api/ai/submissions/<app_id>/improve/ — generate a rewrite suggestion."""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from core.models import Application
    from ai_assist.models import RewriteSuggestion
    from ai_assist.rewrite import generate_rewrite
    from ai_assist.serializers import RewriteSuggestionSerializer

    mode = request.data.get('mode', 'professional')
    VALID_MODES = {'professional', 'concise', 'formal', 'simple', 'structured'}
    if mode not in VALID_MODES:
        return Response({'error': f'mode must be one of: {VALID_MODES}'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        app = Application.objects.get(pk=app_id)
    except Application.DoesNotExist:
        return Response({'error': 'Application not found.'}, status=status.HTTP_404_NOT_FOUND)

    suggestion = generate_rewrite(app, mode, request.user)
    return Response(RewriteSuggestionSerializer(suggestion).data,
                    status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rewrite_decision(request, rewrite_id):
    """POST /api/ai/rewrites/<rewrite_id>/decision/"""
    if not _is_evaluator_or_admin(request):
        return Response({'error': 'Evaluator or Admin access only.'},
                        status=status.HTTP_403_FORBIDDEN)
    from ai_assist.models import RewriteSuggestion
    from ai_assist.serializers import RewriteSuggestionSerializer
    from core.models import AuditLog

    try:
        suggestion = RewriteSuggestion.objects.get(pk=rewrite_id)
    except RewriteSuggestion.DoesNotExist:
        return Response({'error': 'Rewrite not found.'}, status=status.HTTP_404_NOT_FOUND)

    action      = request.data.get('action')
    edited_text = request.data.get('edited_text', '')

    VALID_ACTIONS = {'accept', 'edit', 'reject'}
    if action not in VALID_ACTIONS:
        return Response({'error': f'action must be one of: {VALID_ACTIONS}'},
                        status=status.HTTP_400_BAD_REQUEST)

    suggestion.decision   = action if action != 'edit' else 'edited'
    suggestion.decided_by = request.user
    suggestion.decided_at = timezone.now()
    if action == 'accept':
        suggestion.final_text = suggestion.ai_text
    elif action == 'edit':
        suggestion.final_text = edited_text
    suggestion.save()

    AuditLog.objects.create(
        actor=request.user.username,
        action=f'Rewrite decision: {action}',
        target=f'Application #{suggestion.application_id}',
    )
    return Response(RewriteSuggestionSerializer(suggestion).data)
