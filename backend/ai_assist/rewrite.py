"""
ai_assist/rewrite.py
Generates RewriteSuggestion for a given Application + mode.
Includes a deterministic fact-drift validator.
"""
import logging
import re

log = logging.getLogger(__name__)

PROMPT_VERSION = 'rewrite-v1'

MODE_DESCRIPTIONS = {
    'professional': 'Rewrite in a clear, professional tone suitable for a government procurement review.',
    'concise':      'Rewrite to be as concise as possible while retaining all key facts and claims.',
    'formal':       'Rewrite in formal, bureaucratic language appropriate for official documentation.',
    'simple':       'Rewrite in plain, easy-to-understand language. Avoid jargon.',
    'structured':   'Rewrite using clear headings and bullet points for easy scanning.',
}


def generate_rewrite(application, mode: str, requester) -> 'RewriteSuggestion':
    """Generate and save a RewriteSuggestion. Returns the saved instance."""
    from ai_assist.models import RewriteSuggestion
    from ai_assist.llm.registry import get_provider

    original_text = application.solution_brief or ''
    mode_desc = MODE_DESCRIPTIONS.get(mode, MODE_DESCRIPTIONS['professional'])

    system = (
        'You are a writing assistant helping government evaluators. '
        'Rewrite the submission text in the requested style. '
        'RULES: Never add facts, numbers, names, or claims that are not in the original. '
        'Never remove facts, numbers, dates, or currency amounts from the original. '
        'Return JSON: {"improved_text": "..."}. No markdown fences.'
    )
    user = (
        f'MODE: {mode}\n'
        f'INSTRUCTION: {mode_desc}\n\n'
        f'ORIGINAL TEXT:\n{original_text[:5000]}'
    )

    provider = get_provider()
    try:
        result = provider.complete_json(
            system=system, user=user,
            schema={'improved_text': ''},
            max_tokens=1000,
        )
        ai_text = result.get('improved_text', original_text)
    except Exception as exc:
        log.warning('Sahayak rewrite failed: %s', exc)
        ai_text = original_text

    warnings = validate_fact_drift(original_text, ai_text)

    suggestion = RewriteSuggestion.objects.create(
        application=application,
        requested_by=requester,
        mode=mode,
        original_text=original_text,
        ai_text=ai_text,
        validation_warnings=warnings,
        model_name=provider.model_name,
        prompt_version=PROMPT_VERSION,
    )
    return suggestion


def validate_fact_drift(original: str, improved: str) -> list[str]:
    """
    Extract numbers, currency amounts, dates from original.
    Warn for any that are missing or altered in the improved text.
    """
    warnings = []

    # Numbers (including decimal)
    orig_numbers = set(re.findall(r'\b\d+(?:\.\d+)?\b', original))
    imp_numbers  = set(re.findall(r'\b\d+(?:\.\d+)?\b', improved))
    missing = orig_numbers - imp_numbers
    added   = imp_numbers - orig_numbers - {'0', '1'}  # ignore trivial
    if missing:
        warnings.append(f'Numbers from original not found in rewrite: {", ".join(sorted(missing))}')
    if added:
        warnings.append(f'New numbers appeared in rewrite (not in original): {", ".join(sorted(added))}')

    # Currency (₹ symbol)
    orig_currency = set(re.findall(r'₹\s*[\d,]+', original))
    imp_currency  = set(re.findall(r'₹\s*[\d,]+', improved))
    if orig_currency - imp_currency:
        warnings.append(f'Currency amounts missing from rewrite: {", ".join(orig_currency - imp_currency)}')

    # Capitalised proper nouns (basic heuristic)
    orig_names = set(re.findall(r'\b[A-Z][a-z]{2,}\b', original))
    imp_names  = set(re.findall(r'\b[A-Z][a-z]{2,}\b', improved))
    missing_names = orig_names - imp_names - {'The', 'Our', 'We', 'This', 'These', 'Their'}
    if len(missing_names) > 3:
        sample = ', '.join(sorted(missing_names)[:5])
        warnings.append(f'Proper nouns from original may be missing: {sample}…')

    return warnings
