"""
ai_assist/adapters.py
Thin adapter layer: translates core GovLaunch models into plain dicts/strings
so nothing else in ai_assist references core field names directly.

Based on Phase 0 audit:
  Application.solution_brief  — main proposal text
  Challenge.background + outcome_metrics + constraints — PS context
  NoveltyCheck.verdict / .explanation — existing duplicate detection
  EligibilityResult rows — existing eligibility screening
  Evaluation.conflict_of_interest — existing COI tracking
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.models import Application, Challenge


def get_submission_text(application) -> str:
    """Return the full submittable text for an Application."""
    parts = [application.solution_brief or '']
    # Include pitch summary from the startup for richer context
    if hasattr(application, 'startup') and application.startup:
        pitch = application.startup.pitch_summary
        if pitch:
            parts.append(f'\n\nStartup Pitch Summary:\n{pitch}')
    return '\n'.join(p for p in parts if p).strip()


def get_submission_meta(application) -> dict:
    """Return safe metadata about an Application (no PII)."""
    startup = application.startup
    challenge = application.challenge
    meta = {
        'application_id':  application.id,
        'status':          application.status,
        'created_at':      application.created_at.isoformat(),
        'proposed_timeline_weeks': application.proposed_timeline,
        'budget_quote':    application.budget_quote,
        'startup_name':    startup.name if startup else '',
        'startup_sector_tags': startup.sector_tags if startup else [],
        'registration_status': startup.registration_status if startup else '',
        'challenge_id':    challenge.id if challenge else None,
        'challenge_title': challenge.title if challenge else '',
    }

    # Existing eligibility results
    elig_results = list(application.eligibilityresult_set.values(
        'rule_name', 'passed', 'reason'
    ))
    meta['eligibility_results'] = elig_results
    meta['is_ineligible'] = any(not r['passed'] for r in elig_results)

    # Existing novelty check
    try:
        nc = application.novelty_check
        meta['novelty_verdict'] = nc.verdict
        meta['novelty_explanation'] = nc.explanation
    except Exception:
        meta['novelty_verdict'] = None
        meta['novelty_explanation'] = ''

    # Existing COI
    coi_exists = application.evaluation_set.filter(
        conflict_of_interest=True
    ).exists()
    meta['conflict_of_interest'] = coi_exists

    return meta


def get_ps_context(challenge) -> dict:
    """Return the relevant fields of a Challenge for prompt context."""
    return {
        'id':              challenge.id,
        'title':           challenge.title,
        'background':      challenge.background,
        'outcome_metrics': challenge.outcome_metrics,
        'constraints':     challenge.constraints,
        'budget_ceiling':  challenge.budget_ceiling,
        'timeline_weeks':  challenge.timeline_weeks,
        'sector_tags':     challenge.sector_tags,
        'status':          challenge.status,
    }


def ps_context_to_text(ps_ctx: dict) -> str:
    """Render a PS context dict as a readable string for LLM prompts."""
    return (
        f"Title: {ps_ctx['title']}\n"
        f"Background: {ps_ctx['background']}\n"
        f"Outcome Metrics: {ps_ctx['outcome_metrics']}\n"
        f"Constraints: {ps_ctx['constraints']}\n"
        f"Budget Ceiling: ₹{ps_ctx.get('budget_ceiling', 'N/A')}\n"
        f"Timeline: {ps_ctx.get('timeline_weeks', 'N/A')} weeks\n"
        f"Sector Tags: {', '.join(ps_ctx.get('sector_tags', []))}"
    )
