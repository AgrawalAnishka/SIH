from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    role = models.CharField(max_length=20, choices=[
        ('department', 'Department'), ('startup', 'Startup'),
        ('evaluator', 'Evaluator'), ('admin', 'Admin')
    ])
    preferred_language = models.CharField(
        max_length=10,
        choices=[
            ('en', 'English'),
            ('hi', 'Hindi'),
            ('mr', 'Marathi'),
            ('bn', 'Bengali'),
            ('ta', 'Tamil'),
            ('te', 'Telugu'),
            ('kn', 'Kannada'),
            ('ml', 'Malayalam'),
        ],
        default='en',
        blank=True
    )


class Department(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    ministry = models.CharField(max_length=200)
    verified = models.BooleanField(default=True)
    def __str__(self): return self.name


class Startup(models.Model):
    REGISTRATION_CHOICES = [
        ('unregistered', 'Unregistered'),
        ('incorporated', 'Incorporated'),
        ('dpiit_recognized', 'DPIIT Recognized'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    dpiit_id = models.CharField(max_length=50, blank=True, default='')
    sector_tags = models.JSONField(default=list)
    team_size = models.IntegerField()
    pitch_summary = models.TextField()
    founded_year = models.IntegerField()
    registration_status = models.CharField(
        max_length=20, choices=REGISTRATION_CHOICES, default='unregistered'
    )
    # R2 — rating (starts at 1000, uncapped, display capped at 2000)
    rating = models.IntegerField(default=1000)

    def __str__(self): return self.name


class Challenge(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    background = models.TextField()
    outcome_metrics = models.TextField()
    constraints = models.TextField()
    budget_ceiling = models.IntegerField()
    timeline_weeks = models.IntegerField()
    eligibility_rules = models.JSONField(default=dict)
    sector_tags = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'), ('open', 'Open'), ('closed', 'Closed')
    ], default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.title


class Application(models.Model):
    startup = models.ForeignKey(Startup, on_delete=models.CASCADE)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    solution_brief = models.TextField()
    proposed_timeline = models.IntegerField(null=True, blank=True)
    budget_quote = models.BigIntegerField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=30, choices=[
        ('submitted', 'Submitted'), ('screening', 'Screening'),
        ('eligible', 'Eligible'), ('ineligible', 'Ineligible'),
        ('under_evaluation', 'Under Evaluation'),
        ('shortlisted', 'Shortlisted'), ('rejected', 'Rejected'),
        ('contracted', 'Contracted')
    ], default='submitted')
    created_at = models.DateTimeField(auto_now_add=True)
    # R7 — prototype phase tracking
    prototype_start_date = models.DateTimeField(null=True, blank=True)
    prototype_deadline   = models.DateTimeField(null=True, blank=True)

    def __str__(self): return f'{self.startup} -> {self.challenge}'


class EligibilityResult(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE)
    rule_name = models.CharField(max_length=100)
    passed = models.BooleanField()
    reason = models.TextField()


# R1 — Refactored Evaluation model (5×10 = 50 max, two rounds)
class Evaluation(models.Model):
    ROUND_CHOICES = [
        ('round1_application', 'Round 1: Application'),
        ('round2_prototype',   'Round 2: Prototype'),
    ]
    application  = models.ForeignKey(Application, on_delete=models.CASCADE)
    evaluator    = models.ForeignKey(User, on_delete=models.CASCADE)
    round        = models.CharField(max_length=20, choices=ROUND_CHOICES,
                                    default='round1_application')
    # 0–10 each, max total = 50
    score_problem_solution_fit  = models.IntegerField(default=0)
    score_innovation             = models.IntegerField(default=0)
    score_feasibility            = models.IntegerField(default=0)  # R1: Feasibility & Technical Readiness / R2: Execution Quality
    score_impact_sustainability  = models.IntegerField(default=0)
    score_presentation           = models.IntegerField(default=0)  # R1: Presentation & Supporting Evidence / R2: Demo & Results
    comments             = models.TextField(blank=True, default='')
    conflict_of_interest = models.BooleanField(default=False)
    submitted_at         = models.DateTimeField(auto_now_add=True)

    @property
    def total_score(self):
        return (self.score_problem_solution_fit + self.score_innovation +
                self.score_feasibility + self.score_impact_sustainability +
                self.score_presentation)

    def __str__(self):
        return f'Eval #{self.pk} — {self.evaluator} on {self.application}'


class Contract(models.Model):
    application = models.OneToOneField(Application, on_delete=models.CASCADE)
    ip_clause_text = models.TextField()
    data_clause_text = models.TextField()
    cybersecurity_checklist_text = models.TextField()
    milestones = models.JSONField(default=list)
    pdf_file = models.FileField(upload_to='contracts/', null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)


class ScaleUpEntry(models.Model):
    original_challenge_title = models.CharField(max_length=200)
    originating_department_name = models.CharField(max_length=200)
    outcome_summary = models.TextField()
    adopting_departments = models.JSONField(default=list)
    # adopted_count tracks how many departments have adopted this pilot
    adopted_count = models.IntegerField(default=0)


class AuditLog(models.Model):
    actor = models.CharField(max_length=200)
    action = models.CharField(max_length=200)
    target = models.CharField(max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-timestamp']


# ── Supervision Layer ──────────────────────────────────────────────────────────

class AIProviderConfig(models.Model):
    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'), ('anthropic', 'Anthropic'), ('gemini', 'Gemini'),
    ]
    department = models.OneToOneField(Department, on_delete=models.CASCADE,
                                      related_name='ai_config')
    provider   = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    api_key    = models.CharField(max_length=500)
    enabled    = models.BooleanField(default=True)
    def __str__(self): return f'{self.department} — {self.provider}'


class NoveltyCheck(models.Model):
    VERDICT_CHOICES = [
        ('likely_novel',   'Likely Novel'),
        ('similar_exists', 'Similar Solutions Exist'),
        ('not_assessed',   'Not Assessed'),
    ]
    application      = models.OneToOneField(Application, on_delete=models.CASCADE,
                                            related_name='novelty_check')
    verdict          = models.CharField(max_length=20, choices=VERDICT_CHOICES,
                                        default='not_assessed')
    similar_products = models.JSONField(default=list)
    explanation      = models.TextField(blank=True, default='')
    checked_at       = models.DateTimeField(auto_now=True)
    def __str__(self): return f'NoveltyCheck #{self.application_id} — {self.verdict}'


# ── Rating & Badge Layer (R2, R3) ─────────────────────────────────────────────

class RatingHistory(models.Model):
    startup        = models.ForeignKey(Startup, on_delete=models.CASCADE)
    application    = models.ForeignKey(Application, on_delete=models.CASCADE)
    round          = models.CharField(max_length=20)
    score          = models.IntegerField()
    cohort_average = models.FloatField()
    delta          = models.IntegerField()
    rating_after   = models.IntegerField()
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'RH #{self.pk} — {self.startup} +{self.delta}'


class StartupBadge(models.Model):
    startup   = models.ForeignKey(Startup, on_delete=models.CASCADE,
                                  related_name='badges')
    badge_key = models.CharField(max_length=40)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('startup', 'badge_key')

    def __str__(self): return f'{self.startup} — {self.badge_key}'


# R3 — Prototype submission tracking
class PrototypeSubmission(models.Model):
    application     = models.ForeignKey(Application, on_delete=models.CASCADE,
                                        related_name='prototype_submissions')
    demo_url        = models.URLField(blank=True, default='')
    repository_url  = models.URLField(blank=True, default='')
    notes           = models.TextField(blank=True, default='')
    submitted_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self): return f'Prototype for App #{self.application_id}'


# ── Multilingual Support ───────────────────────────────────────────────────────

class TranslationCache(models.Model):
    """Cache for translated content to avoid repeated API calls."""
    source_text_hash = models.CharField(max_length=64, db_index=True)
    source_lang = models.CharField(max_length=8, default='en')
    target_lang = models.CharField(max_length=8)
    source_text = models.TextField()
    translated_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('source_text_hash', 'target_lang')
        indexes = [
            models.Index(fields=['source_text_hash', 'target_lang']),
        ]

    def __str__(self):
        return f'Translation {self.source_lang}→{self.target_lang} (hash: {self.source_text_hash[:8]})'


class TranslationLog(models.Model):
    """Log translation API failures for monitoring."""
    timestamp = models.DateTimeField(auto_now_add=True)
    source_text = models.TextField()
    source_lang = models.CharField(max_length=8)
    target_lang = models.CharField(max_length=8)
    provider = models.CharField(max_length=20)  # 'bhashini', 'google', etc.
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        status = 'SUCCESS' if self.success else 'FAILED'
        return f'{status} {self.provider} {self.source_lang}→{self.target_lang} at {self.timestamp}'
