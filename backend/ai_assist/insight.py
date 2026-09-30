"""
ai_assist/insight.py
Deterministic stats computation + LLM overview summary for a Challenge (PS).
"""
import logging
from collections import Counter

log = logging.getLogger(__name__)


def build_stats(analyses: list, challenge) -> dict:
    """
    Build the statistics dict for PSInsight.stats.
    Purely deterministic — no LLM call.
    """
    from core.models import Application

    total_apps = Application.objects.filter(challenge=challenge).count()
    analysed   = len(analyses)
    done       = sum(1 for a in analyses if a.status == 'done')
    failed     = sum(1 for a in analyses if a.status == 'failed')
    reviewed   = sum(1 for a in analyses if a.reviewed_by_id is not None)

    priority_dist = Counter(a.priority for a in analyses if a.priority)
    severity_dist = Counter(a.severity for a in analyses if a.severity)
    category_dist = Counter(a.category for a in analyses if a.category)

    all_flags = []
    for a in analyses:
        all_flags.extend(f['code'] if isinstance(f, dict) else f
                         for f in (a.flags or []))
    flag_dist = dict(Counter(all_flags))

    avg_priority = (
        round(sum(a.priority_score for a in analyses) / len(analyses), 1)
        if analyses else 0
    )

    needs_attention = [
        a.application_id for a in analyses
        if a.priority in ('critical', 'high') and not a.reviewed_by_id
    ]

    duplicates = [
        a.application_id for a in analyses
        if 'duplicate_or_near_duplicate' in [
            (f['code'] if isinstance(f, dict) else f) for f in (a.flags or [])
        ]
    ]

    return {
        'total_applications':    total_apps,
        'analysed_count':        analysed,
        'done_count':            done,
        'failed_count':          failed,
        'reviewed_count':        reviewed,
        'priority_distribution': dict(priority_dist),
        'severity_distribution': dict(severity_dist),
        'category_distribution': dict(category_dist),
        'flag_distribution':     flag_dist,
        'average_priority_score': avg_priority,
        'needs_attention_ids':   needs_attention,
        'potential_duplicate_ids': duplicates,
    }


def build_overview_summary(
    analyses: list, clusters: list, challenge
) -> tuple[str, list]:
    """
    Generate an overall summary using the LLM (map-reduce over cluster summaries).
    Returns (overall_summary_text, top_issues_list).
    """
    if not analyses:
        return 'No analyses available yet.', []

    from ai_assist.llm.registry import get_provider

    # Build cluster summaries for the map step
    cluster_summaries = []
    for cl in clusters:
        members = list(cl.member_analyses.all()[:5])
        bullet_pts = '\n'.join(
            f'  - {m.short_summary}' for m in members if m.short_summary
        )
        cluster_summaries.append(
            f'Cluster: {cl.label} ({cl.size} submissions)\n{bullet_pts}'
        )

    if not cluster_summaries:
        # Fallback: use individual summaries
        cluster_summaries = [
            f'- {a.short_summary}' for a in analyses[:10] if a.short_summary
        ]

    combined = '\n\n'.join(cluster_summaries[:8])
    ps_title = challenge.title

    try:
        provider = get_provider()
        result = provider.complete_json(
            system=(
                'You generate a concise overview for a government evaluator. '
                'Input is a set of cluster summaries from startup proposals. '
                f'The challenge is: "{ps_title}". '
                'Return JSON: {"overall_summary": "2-4 sentences", '
                '"top_issues": [{"label": str, "count": int, "example_ids": []}]}. '
                'No markdown, no commentary, no invented facts.'
            ),
            user=combined,
            schema={'overall_summary': '', 'top_issues': []},
            max_tokens=400,
        )
        summary = result.get('overall_summary', '')
        top_issues = result.get('top_issues', [])
    except Exception as exc:
        log.warning('Sahayak: Overview summary failed: %s', exc)
        summary = (
            f'{len(analyses)} submission(s) received for "{ps_title}". '
            f'{len(clusters)} cluster(s) identified.'
        )
        top_issues = []

    # Enrich top_issues with real application IDs from clusters
    if clusters and top_issues:
        for issue in top_issues[:5]:
            label = issue.get('label', '')
            # Find best matching cluster
            for cl in clusters:
                if label.lower() in cl.label.lower() or cl.label.lower() in label.lower():
                    member_ids = list(
                        cl.member_analyses.values_list('application_id', flat=True)[:3]
                    )
                    issue['example_ids'] = member_ids
                    issue['count'] = cl.size
                    break

    return summary, top_issues
