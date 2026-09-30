"""
ai_assist/clustering.py
TF-IDF + agglomerative clustering of SubmissionAnalysis rows for one Challenge.
Produces ClusterGroup rows. Labels each cluster with the LLM.
"""
import logging

log = logging.getLogger(__name__)

MIN_CLUSTER_SIZE = 2
MAX_CLUSTERS = 8


def run_clustering(analyses: list, challenge_id: int, run_id: str) -> list:
    """
    Cluster a list of SubmissionAnalysis objects by their short_summary text.
    Returns a list of ClusterGroup instances (saved to DB).
    """
    from ai_assist.models import ClusterGroup

    # Delete old clusters for this challenge + run
    ClusterGroup.objects.filter(challenge_id=challenge_id).delete()

    if len(analyses) < 2:
        return []

    texts = [
        (a.short_summary or '') + ' ' + ' '.join(a.key_points or [])
        for a in analyses
    ]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.cluster import AgglomerativeClustering
        import numpy as np

        vec    = TfidfVectorizer(stop_words='english', min_df=1, max_features=500)
        matrix = vec.fit_transform(texts).toarray()

        n_clusters = min(MAX_CLUSTERS, max(1, len(analyses) // 2))
        if len(analyses) < 4:
            n_clusters = 1

        model = AgglomerativeClustering(n_clusters=n_clusters)
        labels = model.fit_predict(matrix)

    except ImportError:
        log.warning('Sahayak: scikit-learn not installed — single cluster fallback')
        labels = [0] * len(analyses)

    # Group analyses by cluster label
    from collections import defaultdict
    groups: dict[int, list] = defaultdict(list)
    for analysis, label in zip(analyses, labels):
        groups[int(label)].append(analysis)

    clusters = []
    for cluster_id, members in groups.items():
        if len(members) < 1:
            continue
        avg_score = sum(m.priority_score for m in members) / len(members)
        # Representative = highest priority_score in the cluster
        rep = max(members, key=lambda m: m.priority_score)
        label_text = _label_cluster(members)

        cg = ClusterGroup.objects.create(
            challenge_id=challenge_id,
            label=label_text,
            description='',
            size=len(members),
            representative_analysis=rep,
            avg_priority_score=round(avg_score, 1),
            run_id=run_id,
        )
        cg.member_analyses.set(members)
        clusters.append(cg)

    return clusters


def _label_cluster(members: list) -> str:
    """Generate a label for a cluster using the LLM."""
    from ai_assist.llm.registry import get_provider

    summaries = '\n'.join(
        f'- {m.short_summary}' for m in members[:6] if m.short_summary
    )
    if not summaries:
        return 'Cluster'

    try:
        provider = get_provider()
        result = provider.complete_json(
            system=(
                'You label clusters of similar submissions for a government procurement platform. '
                'Return JSON: {"label": "3-6 word label", "description": "one sentence description"}. '
                'No markdown, no commentary.'
            ),
            user=f'Cluster summaries:\n{summaries}',
            schema={'label': '', 'description': ''},
            max_tokens=80,
        )
        return result.get('label', 'Cluster') or 'Cluster'
    except Exception as exc:
        log.warning('Sahayak: Cluster label failed: %s', exc)
        return 'Cluster'
