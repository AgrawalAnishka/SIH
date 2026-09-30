"""
ai_assist/tasks.py
ThreadPoolExecutor-based task runner.
All AI work happens here — analysis, clustering, insight generation.
Short transactions to keep SQLite happy.
"""
import hashlib
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor

from django.utils import timezone

log = logging.getLogger(__name__)

# Global thread pool — max 3 workers (SQLite WAL can handle a few concurrent writers)
_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix='sahayak')


# ── Public entry points ───────────────────────────────────────────────────────

def enqueue_analysis(application_id: int, force: bool = False):
    """
    Submit a per-application analysis job to the thread pool.
    Non-blocking — returns immediately.
    """
    _pool.submit(_run_analysis, application_id, force)


def enqueue_insight(challenge_id: int, force: bool = False):
    """
    Submit a PS-level insight + clustering job.
    Non-blocking — returns immediately.
    """
    _pool.submit(_run_insight, challenge_id, force)


# ── Analysis worker ───────────────────────────────────────────────────────────

def _run_analysis(application_id: int, force: bool):
    """Run in background thread. Creates/updates SubmissionAnalysis rows."""
    # Import inside function — avoids app-registry issues at module load
    from django.conf import settings
    from core.models import Application, AuditLog
    from ai_assist.models import SubmissionAnalysis
    from ai_assist.adapters import get_submission_text, get_submission_meta, get_ps_context, ps_context_to_text
    from ai_assist.llm.registry import get_provider
    from ai_assist.analysis import build_analysis_prompt, validate_and_enrich

    try:
        app = Application.objects.select_related(
            'startup', 'challenge__department'
        ).get(pk=application_id)
    except Application.DoesNotExist:
        log.error('Sahayak: Application #%s not found', application_id)
        return

    text    = get_submission_text(app)
    meta    = get_submission_meta(app)
    ps_ctx  = get_ps_context(app.challenge)
    ps_text = ps_context_to_text(ps_ctx)

    # Compute idempotency hash
    PROMPT_VERSION = 'v1'
    raw = f'{text}|{ps_text}|{PROMPT_VERSION}'
    input_hash = hashlib.sha256(raw.encode()).hexdigest()

    # Skip if already done with same hash (unless forced)
    existing = SubmissionAnalysis.objects.filter(
        application_id=application_id,
        is_current=True
    ).first()
    if existing and existing.input_hash == input_hash and existing.status == 'done' and not force:
        log.debug('Sahayak: Analysis for App #%s unchanged (hash match)', application_id)
        return

    # Mark old analyses as not current
    SubmissionAnalysis.objects.filter(
        application_id=application_id, is_current=True
    ).update(is_current=False)

    version = (existing.version + 1) if existing else 1

    # Create a new pending row
    analysis = SubmissionAnalysis.objects.create(
        application_id=application_id,
        version=version,
        is_current=True,
        status='processing',
        input_hash=input_hash,
        prompt_version=PROMPT_VERSION,
    )

    try:
        provider = get_provider()
        system_prompt, user_prompt = build_analysis_prompt(text, ps_text, meta)
        schema = {
            'cleaned_response': '', 'short_summary': '', 'key_points': [],
            'main_issue': '', 'category': '', 'category_confidence': 0.0,
            'severity': '', 'priority_score': 0, 'priority_reason': '', 'flags': [],
        }
        raw_result = provider.complete_json(system_prompt, user_prompt, schema)
        validated  = validate_and_enrich(raw_result, meta)

        # Save results
        analysis.cleaned_response    = validated.get('cleaned_response', '')
        analysis.short_summary       = validated.get('short_summary', '')
        analysis.key_points          = validated.get('key_points', [])
        analysis.main_issue          = validated.get('main_issue', '')
        analysis.category            = validated.get('category', '')
        analysis.category_confidence = float(validated.get('category_confidence', 0))
        analysis.severity            = validated.get('severity', 'normal')
        analysis.priority_score      = int(validated.get('priority_score', 0))
        analysis.priority            = validated.get('priority', 'low')
        analysis.priority_reason     = validated.get('priority_reason', '')
        analysis.flags               = validated.get('flags', [])
        analysis.flag_details        = validated.get('flag_details', {})
        analysis.model_name          = provider.model_name
        analysis.provider            = provider.__class__.__name__
        analysis.status              = 'done'
        analysis.save()

        # Write to existing audit log
        AuditLog.objects.create(
            actor='Sahayak (AI)',
            action='AI analysis generated',
            target=f'Application #{application_id}',
        )

        # Mark PS insight stale
        from ai_assist.models import PSInsight
        PSInsight.objects.filter(
            challenge_id=app.challenge_id, is_current=True
        ).update(is_stale=True)

        log.info('Sahayak: Analysis done for App #%s (priority=%s)',
                 application_id, analysis.priority)

    except Exception as exc:
        log.error('Sahayak: Analysis failed for App #%s: %s', application_id, exc)
        analysis.status        = 'failed'
        analysis.error_message = str(exc)
        analysis.save(update_fields=['status', 'error_message', 'updated_at'])

        AuditLog.objects.create(
            actor='Sahayak (AI)',
            action='AI analysis failed',
            target=f'Application #{application_id}',
        )


# ── Insight worker ────────────────────────────────────────────────────────────

def _run_insight(challenge_id: int, force: bool):
    """Run in background thread. Builds clustering + PS overview."""
    from core.models import Challenge, AuditLog
    from ai_assist.models import PSInsight, SubmissionAnalysis, ClusterGroup
    from ai_assist.clustering import run_clustering
    from ai_assist.insight import build_stats, build_overview_summary

    try:
        challenge = Challenge.objects.get(pk=challenge_id)
    except Challenge.DoesNotExist:
        log.error('Sahayak: Challenge #%s not found', challenge_id)
        return

    # Get or create current insight row
    insight, _ = PSInsight.objects.get_or_create(
        challenge_id=challenge_id,
        is_current=True,
        defaults={'status': 'pending'}
    )
    insight.status = 'processing'
    insight.save(update_fields=['status', 'updated_at'])

    run_id = str(uuid.uuid4())

    try:
        analyses = list(
            SubmissionAnalysis.objects.filter(
                application__challenge_id=challenge_id,
                is_current=True,
                status='done'
            ).select_related('application__startup')
        )

        # Compute stats
        stats = build_stats(analyses, challenge)

        # Cluster
        clusters = run_clustering(analyses, challenge_id, run_id)

        # Generate overall summary
        overall_summary, top_issues = build_overview_summary(analyses, clusters, challenge)

        insight.overall_summary = overall_summary
        insight.top_issues      = top_issues
        insight.stats           = stats
        insight.is_stale        = False
        insight.status          = 'done'
        insight.run_id          = run_id
        insight.generated_at    = timezone.now()
        insight.save()

        AuditLog.objects.create(
            actor='Sahayak (AI)',
            action='PS insight generated',
            target=f'Challenge #{challenge_id}',
        )
        log.info('Sahayak: Insight done for Challenge #%s', challenge_id)

    except Exception as exc:
        log.error('Sahayak: Insight failed for Challenge #%s: %s', challenge_id, exc)
        insight.status        = 'failed'
        insight.error_message = str(exc)
        insight.save(update_fields=['status', 'error_message', 'updated_at'])
