"""
ai_assist/models.py
Data layer for the Sahayak Evaluator AI Engine.

Foreign keys reference:
  Application -> core.Application  (the startup's proposal)
  Challenge   -> core.Challenge    (the problem statement / PS)
  User        -> settings.AUTH_USER_MODEL
"""
from django.conf import settings
from django.db import models


# ── Constants ─────────────────────────────────────────────────────────────────

ANALYSIS_STATUS = [
    ('pending',    'Pending'),
    ('processing', 'Processing'),
    ('done',       'Done'),
    ('failed',     'Failed'),
]

PRIORITY_CHOICES = [
    ('critical', 'Critical'),
    ('high',     'High'),
    ('medium',   'Medium'),
    ('low',      'Low'),
]

SEVERITY_CHOICES = [
    ('normal',      'Normal'),
    ('concerning',  'Concerning'),
    ('critical',    'Critical'),
]

FLAG_CODES = [
    'incomplete', 'off_topic', 'duplicate_or_near_duplicate',
    'missing_documents', 'unrealistic_claims', 'unclear_response',
    'strong_fit', 'urgent', 'critical_red_flag', 'language_quality_low',
    'ineligible',              # surfaced from EligibilityResult
    'conflict_of_interest',    # surfaced from Evaluation.conflict_of_interest
]

REWRITE_MODES = [
    ('professional',  'Professional'),
    ('concise',       'Concise'),
    ('formal',        'Formal'),
    ('simple',        'Easy to Understand'),
    ('structured',    'Structured'),
]

REWRITE_DECISIONS = [
    ('pending',  'Pending'),
    ('accepted', 'Accepted'),
    ('edited',   'Edited'),
    ('rejected', 'Rejected'),
]

INSIGHT_STATUS = [
    ('pending',    'Pending'),
    ('processing', 'Processing'),
    ('done',       'Done'),
    ('failed',     'Failed'),
]


# ── SubmissionAnalysis ────────────────────────────────────────────────────────

class SubmissionAnalysis(models.Model):
    """One current AI analysis per Application; history kept via version."""
    application  = models.ForeignKey(
        'core.Application', on_delete=models.CASCADE,
        related_name='ai_analyses'
    )
    version      = models.PositiveIntegerField(default=1)
    is_current   = models.BooleanField(default=True, db_index=True)

    # Processing state
    status        = models.CharField(max_length=20, choices=ANALYSIS_STATUS,
                                     default='pending', db_index=True)
    error_message = models.TextField(blank=True, default='')

    # AI outputs
    cleaned_response = models.TextField(blank=True, default='')
    short_summary    = models.TextField(blank=True, default='')
    key_points       = models.JSONField(default=list)
    main_issue       = models.TextField(blank=True, default='')
    category         = models.CharField(max_length=100, blank=True, default='')
    category_confidence = models.FloatField(default=0.0)

    severity         = models.CharField(max_length=20, choices=SEVERITY_CHOICES,
                                        blank=True, default='')
    priority         = models.CharField(max_length=20, choices=PRIORITY_CHOICES,
                                        blank=True, default='', db_index=True)
    priority_score   = models.IntegerField(default=0, db_index=True)
    priority_reason  = models.TextField(blank=True, default='')

    flags            = models.JSONField(default=list)   # list of flag codes
    flag_details     = models.JSONField(default=dict)   # {code: explanation}

    # Provenance — for auditing and idempotency
    input_hash    = models.CharField(max_length=64, blank=True, default='', db_index=True)
    model_name    = models.CharField(max_length=100, blank=True, default='')
    prompt_version = models.CharField(max_length=20, blank=True, default='')
    provider      = models.CharField(max_length=50, blank=True, default='')

    # Evaluator marker (not a decision)
    reviewed_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reviewed_analyses'
    )
    reviewed_at   = models.DateTimeField(null=True, blank=True)

    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['application', 'is_current']),
            models.Index(fields=['priority_score']),
        ]

    def __str__(self):
        return f'Analysis #{self.pk} — App #{self.application_id} v{self.version} [{self.status}]'


# ── EvaluatorOverride ─────────────────────────────────────────────────────────

class EvaluatorOverride(models.Model):
    """Records every time an evaluator changes an AI classification."""
    FIELD_CHOICES = [
        ('category', 'Category'),
        ('priority', 'Priority'),
        ('severity', 'Severity'),
        ('flags',    'Flags'),
    ]
    analysis   = models.ForeignKey(SubmissionAnalysis, on_delete=models.CASCADE,
                                   related_name='overrides')
    evaluator  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    field      = models.CharField(max_length=20, choices=FIELD_CHOICES)
    ai_value   = models.JSONField()   # original AI value (any type)
    new_value  = models.JSONField()   # evaluator's replacement
    reason     = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Override #{self.pk} — {self.field} by {self.evaluator}'


# ── RewriteSuggestion ─────────────────────────────────────────────────────────

class RewriteSuggestion(models.Model):
    """Stores an AI rewrite of a solution_brief in one of five modes."""
    application   = models.ForeignKey(
        'core.Application', on_delete=models.CASCADE,
        related_name='rewrite_suggestions'
    )
    requested_by  = models.ForeignKey(settings.AUTH_USER_MODEL,
                                      on_delete=models.CASCADE)
    mode          = models.CharField(max_length=20, choices=REWRITE_MODES)
    original_text = models.TextField()
    ai_text       = models.TextField()
    validation_warnings = models.JSONField(default=list)  # list of warning strings

    decision      = models.CharField(max_length=20, choices=REWRITE_DECISIONS,
                                     default='pending')
    final_text    = models.TextField(blank=True, default='')
    decided_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='rewrite_decisions'
    )
    decided_at    = models.DateTimeField(null=True, blank=True)

    model_name     = models.CharField(max_length=100, blank=True, default='')
    prompt_version = models.CharField(max_length=20, blank=True, default='')

    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Rewrite #{self.pk} — {self.mode} for App #{self.application_id}'


# ── ClusterGroup ──────────────────────────────────────────────────────────────

class ClusterGroup(models.Model):
    """A cluster of similar applications within one Challenge (PS)."""
    challenge              = models.ForeignKey('core.Challenge',
                                               on_delete=models.CASCADE,
                                               related_name='clusters')
    label                  = models.CharField(max_length=200, blank=True, default='')
    description            = models.TextField(blank=True, default='')
    member_analyses        = models.ManyToManyField(SubmissionAnalysis,
                                                    related_name='cluster_memberships',
                                                    blank=True)
    size                   = models.IntegerField(default=0)
    representative_analysis = models.ForeignKey(
        SubmissionAnalysis, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='representative_of'
    )
    avg_priority_score     = models.FloatField(default=0.0)
    run_id                 = models.CharField(max_length=36, blank=True, default='')  # UUID of the insight run
    created_at             = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Cluster #{self.pk} — {self.label} ({self.size} members) for Challenge #{self.challenge_id}'


# ── PSInsight ─────────────────────────────────────────────────────────────────

class PSInsight(models.Model):
    """Aggregated AI overview for one Challenge (PS). One current row per Challenge."""
    challenge        = models.ForeignKey('core.Challenge', on_delete=models.CASCADE,
                                         related_name='ai_insights')
    overall_summary  = models.TextField(blank=True, default='')
    top_issues       = models.JSONField(default=list)   # [{label, count, example_ids}]
    stats            = models.JSONField(default=dict)   # see spec section 9
    is_stale         = models.BooleanField(default=False, db_index=True)
    is_current       = models.BooleanField(default=True, db_index=True)
    status           = models.CharField(max_length=20, choices=INSIGHT_STATUS,
                                        default='pending', db_index=True)
    error_message    = models.TextField(blank=True, default='')
    run_id           = models.CharField(max_length=36, blank=True, default='')
    generated_at     = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'PSInsight #{self.pk} — Challenge #{self.challenge_id} [{self.status}]'


# ── AIActionLog ───────────────────────────────────────────────────────────────

class AIActionLog(models.Model):
    """Appended to the existing AuditLog entries via signals; also stored here for detail."""
    ACTION_CHOICES = [
        ('analysis_generated',  'Analysis Generated'),
        ('analysis_failed',     'Analysis Failed'),
        ('rewrite_generated',   'Rewrite Generated'),
        ('rewrite_decision',    'Rewrite Decision'),
        ('override',            'Override'),
        ('insight_generated',   'Insight Generated'),
        ('mark_reviewed',       'Marked Reviewed'),
    ]
    actor       = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL)
    action      = models.CharField(max_length=40, choices=ACTION_CHOICES, db_index=True)
    object_type = models.CharField(max_length=50)   # 'SubmissionAnalysis', 'RewriteSuggestion', etc.
    object_id   = models.IntegerField()
    metadata    = models.JSONField(default=dict)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'AILog #{self.pk} — {self.action} on {self.object_type} #{self.object_id}'
