from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
from .views import google_auth_view

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'startups', StartupViewSet)
router.register(r'challenges', ChallengeViewSet)
router.register(r'applications', ApplicationViewSet)
router.register(r'eligibility-results', EligibilityResultViewSet)
router.register(r'evaluations', EvaluationViewSet)
router.register(r'contracts', ContractViewSet)
router.register(r'scaleup-entries', ScaleUpEntryViewSet)
router.register(r'audit-logs', AuditLogViewSet)

urlpatterns = [
    path('auth/login/',      login_view,            name='login'),
    path('auth/logout/',     logout_view,           name='logout'),
    path('auth/me/',         me_view,               name='me'),
    path('auth/signup/',     signup_view,           name='signup'),
    path('auth/google/',     google_auth_view,      name='google-auth'),
    path('auth/complete-profile/', complete_oauth_profile_view, name='complete-oauth-profile'),
    path('translate/',       translate_view,        name='translate'),
    path('translation-logs/', translation_logs_view, name='translation-logs'),
    path('translation-stats/', translation_stats_view, name='translation-stats'),
    path('applications/<int:pk>/log-view/',         log_application_view,  name='log-application-view'),
    path('applications/<int:pk>/novelty-check/',    novelty_check,         name='novelty-check'),
    path('applications/<int:pk>/start-prototype-phase/', start_prototype_phase, name='start-prototype-phase'),
    path('challenges/<int:challenge_id>/finalize-round/', finalize_round,   name='finalize-round'),
    path('startups/<int:pk>/badges/',               startup_badges,        name='startup-badges'),
    path('startups/<int:pk>/rating-history/',       startup_rating_history, name='startup-rating-history'),
    path('supervision/duplicates/',                 supervision_duplicates, name='supervision-duplicates'),
    path('ai-provider-config/',                     ai_provider_config,    name='ai-provider-config'),
    path('health/',          health_view,           name='health'),
    path('stats/',           public_stats_view,     name='public-stats'),
    path('challenges/public/', public_challenges_view, name='public-challenges'),
    path('admin/reset-demo/', reset_demo_view,      name='reset-demo'),
    path('', include(router.urls)),
]
