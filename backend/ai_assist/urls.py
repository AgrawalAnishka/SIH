from django.urls import path
from . import views

urlpatterns = [
    path('config/',                                    views.config_view,          name='ai-config'),
    path('ps/<int:ps_id>/overview/',                   views.ps_overview,          name='ai-ps-overview'),
    path('ps/<int:ps_id>/queue/',                      views.ps_queue,             name='ai-ps-queue'),
    path('ps/<int:ps_id>/regenerate/',                 views.ps_regenerate,        name='ai-ps-regenerate'),
    path('submissions/<int:app_id>/analysis/',          views.submission_analysis,  name='ai-submission-analysis'),
    path('submissions/<int:app_id>/analyze/',           views.submission_analyze,   name='ai-submission-analyze'),
    path('submissions/<int:app_id>/improve/',           views.improve_submission,   name='ai-improve'),
    path('analyses/<int:analysis_id>/override/',        views.override_analysis,    name='ai-override'),
    path('analyses/<int:analysis_id>/mark-reviewed/',   views.mark_reviewed,        name='ai-mark-reviewed'),
    path('rewrites/<int:rewrite_id>/decision/',         views.rewrite_decision,     name='ai-rewrite-decision'),
]
