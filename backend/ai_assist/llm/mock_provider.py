"""
ai_assist/llm/mock_provider.py
Deterministic MockProvider — no API key needed, never fails.
Used for demos, tests, and when no LLM_PROVIDER key is configured.

Heuristics:
  - Priority/severity derived from text length + keyword signals.
  - Category chosen from taxonomy by first matching keyword.
  - Summary = first 2 sentences of the text (capped at 180 chars).
  - Flags triggered by deterministic rules.
  - Rewrite = prefix-annotated original text (shows the mode).
"""
import hashlib
import json
import re

from .base import LLMError, LLMProvider

_MODEL = 'mock-v1'
_PROMPT_VERSION = 'mock-v1'

# Keyword → flag mappings (checked in order)
_FLAG_SIGNALS = [
    (r'\b(we will|we plan|we intend|propose to|will develop)\b', 'incomplete'),
    (r'\b(garden|garbage|waste|roads|school|traffic)\b',         'off_topic'),
    (r'\b(no data|no evidence|no pilot|no testing)\b',           'missing_documents'),
    (r'\b(100%|zero defect|perfect|guaranteed|unlimited)\b',     'unrealistic_claims'),
    (r'\b(see above|refer to|as mentioned|etc\.?\s*$)\b',        'unclear_response'),
    (r'\b(strong|excellent|proven|validated|deployed|pilot)\b',  'strong_fit'),
    (r'\b(urgent|critical|emergency|immediately|asap)\b',        'urgent'),
    (r'\b(illegal|fraud|scam|bribe|violat)\b',                   'critical_red_flag'),
]

_CATEGORY_SIGNALS = [
    (['health', 'medical', 'hospital', 'patient', 'clinic', 'diagnos', 'triage'],
     'Healthcare Technology'),
    (['agri', 'farm', 'crop', 'soil', 'irrigation', 'harvest'],
     'Agricultural Technology'),
    (['water', 'sanitation', 'cleantech', 'pollution', 'environment', 'clean'],
     'Clean Technology'),
    (['defence', 'defense', 'surveillance', 'security', 'border', 'drone'],
     'Defence Technology'),
    (['finance', 'payment', 'banking', 'loan', 'fintech', 'upi'],
     'Financial Technology'),
    (['education', 'school', 'learning', 'student', 'teacher'],
     'Education Technology'),
    (['infrastructure', 'road', 'bridge', 'transport', 'logistics'],
     'Infrastructure'),
]


def _detect_flags(text: str) -> list[dict]:
    flags = []
    lower = text.lower()
    for pattern, code in _FLAG_SIGNALS:
        if re.search(pattern, lower):
            flags.append({'code': code,
                          'explanation': f'Detected signal for "{code}" in submission text.'})
    return flags


def _detect_category(text: str) -> tuple[str, float]:
    lower = text.lower()
    for keywords, cat in _CATEGORY_SIGNALS:
        if any(kw in lower for kw in keywords):
            return cat, 0.72
    return 'Other', 0.40


def _short_summary(text: str) -> str:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    summary = ' '.join(sentences[:2])
    return (summary[:177] + '…') if len(summary) > 180 else summary


def _priority_score(text: str, flags: list[dict]) -> int:
    """Deterministic score 0-100 based on text length and flag signals."""
    flag_codes = {f['code'] for f in flags}
    score = 30  # baseline
    # Length bonus: longer, more detailed proposals
    words = len(text.split())
    score += min(words // 20, 25)
    # Flag adjustments
    if 'critical_red_flag' in flag_codes:
        score += 40
    if 'strong_fit' in flag_codes:
        score += 20
    if 'urgent' in flag_codes:
        score += 15
    if 'incomplete' in flag_codes or 'off_topic' in flag_codes:
        score -= 20
    if 'unrealistic_claims' in flag_codes:
        score -= 10
    return max(0, min(100, score))


def _score_to_priority(score: int) -> str:
    if score >= 85: return 'critical'
    if score >= 65: return 'high'
    if score >= 35: return 'medium'
    return 'low'


def _score_to_severity(score: int, flags: list[dict]) -> str:
    flag_codes = {f['code'] for f in flags}
    if 'critical_red_flag' in flag_codes or score >= 85:
        return 'critical'
    if score >= 55 or 'urgent' in flag_codes:
        return 'concerning'
    return 'normal'


class MockProvider(LLMProvider):

    @property
    def model_name(self) -> str:
        return _MODEL

    def complete_json(self, system: str, user: str, schema: dict,
                      max_tokens: int = 800) -> dict:
        """
        Detect which call this is from schema keys and return appropriate mock.
        """
        keys = set(schema.keys()) if schema else set()

        # ── Analysis call ──────────────────────────────────────────────────
        if 'short_summary' in keys:
            return self._mock_analysis(user)

        # ── Summary/memory extraction (used by insight map-reduce) ─────────
        if 'summary' in keys:
            return {'summary': _short_summary(user[:500]), 'top_issues': []}

        # ── Cluster labelling call ─────────────────────────────────────────
        if 'label' in keys:
            return self._mock_cluster_label(user)

        # ── Rewrite call ───────────────────────────────────────────────────
        if 'improved_text' in keys:
            return self._mock_rewrite(user)

        # ── PS overview call ───────────────────────────────────────────────
        if 'overall_summary' in keys:
            return self._mock_overview(user)

        # Fallback
        return {}

    def complete_text(self, system: str, user: str,
                      max_tokens: int = 600) -> str:
        return _short_summary(user[:600])

    # ── Internal helpers ───────────────────────────────────────────────────

    def _mock_analysis(self, user_prompt: str) -> dict:
        # Extract the submission text from the prompt (between markers)
        match = re.search(
            r'SUBMISSION TEXT \(UNTRUSTED[^)]*\):\s*(.+?)(?:\n\nAnalyse|$)',
            user_prompt, re.S
        )
        if not match:
            # fallback: everything after last marker
            parts = re.split(r'SUBMISSION TEXT[^\n]*\n', user_prompt)
            text = parts[-1].strip()[:2000] if len(parts) > 1 else user_prompt[:1000]
        else:
            text = match.group(1).strip()[:2000]

        flags = _detect_flags(text)
        category, confidence = _detect_category(text)
        score = _priority_score(text, flags)
        priority = _score_to_priority(score)
        severity = _score_to_severity(score, flags)
        summary = _short_summary(text)
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())

        key_points = []
        for s in sentences[1:5]:
            s = s.strip()
            if len(s) > 20:
                key_points.append(s[:200])
        key_points = key_points[:5] or [summary]

        flag_details = {f['code']: f['explanation'] for f in flags}

        return {
            'cleaned_response': text,
            'short_summary': summary,
            'key_points': key_points,
            'main_issue': sentences[0][:300] if sentences else summary,
            'category': category,
            'category_confidence': confidence,
            'severity': severity,
            'priority_score': score,
            'priority_reason': (
                f'Mock scoring: {score}/100 based on content signals. '
                f'Flags detected: {[f["code"] for f in flags] or "none"}.'
            ),
            'flags': flags,
            'flag_details': flag_details,
        }

    def _mock_cluster_label(self, user_prompt: str) -> dict:
        # Use a hash for a stable label in tests
        h = hashlib.md5(user_prompt[:200].encode()).hexdigest()[:6]
        category, _ = _detect_category(user_prompt)
        return {
            'label': f'{category} Group',
            'description': (
                f'A cluster of submissions related to {category.lower()} solutions. '
                f'(Mock label {h})'
            ),
        }

    def _mock_rewrite(self, user_prompt: str) -> dict:
        # Extract mode and original text
        mode_match = re.search(r'MODE:\s*(\w+)', user_prompt, re.I)
        mode = mode_match.group(1).lower() if mode_match else 'professional'
        text_match = re.search(r'ORIGINAL TEXT:(.+)$', user_prompt, re.S)
        text = text_match.group(1).strip() if text_match else user_prompt

        prefixes = {
            'professional': '[Professional rewrite — Mock] ',
            'concise':      '[Concise rewrite — Mock] ',
            'formal':       '[Formal rewrite — Mock] ',
            'simple':       '[Simplified rewrite — Mock] ',
            'structured':   '## Summary\n[Structured rewrite — Mock]\n\n',
        }
        prefix = prefixes.get(mode, '[Rewrite — Mock] ')
        return {'improved_text': prefix + text}

    def _mock_overview(self, user_prompt: str) -> dict:
        return {
            'overall_summary': (
                'Mock overview: Submissions span multiple categories. '
                'Several proposals demonstrate strong alignment with the challenge. '
                'Common themes include scalability and integration with existing infrastructure.'
            ),
            'top_issues': [
                {'label': 'Integration challenges', 'count': 2, 'example_ids': []},
                {'label': 'Cost concerns',          'count': 1, 'example_ids': []},
            ],
        }
