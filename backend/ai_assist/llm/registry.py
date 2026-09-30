"""
ai_assist/llm/registry.py
Factory that returns the configured LLMProvider singleton.
Reads LLM_PROVIDER and GEMINI_API_KEY (or LLM_API_KEY) from env/settings.
Falls back to MockProvider with a console warning if no key is found.
"""
import logging
import os

from .base import LLMProvider
from .mock_provider import MockProvider

log = logging.getLogger(__name__)

_provider_instance: LLMProvider | None = None


def get_provider() -> LLMProvider:
    """Return the configured LLMProvider (singleton, lazy-init)."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance
    _provider_instance = _build_provider()
    return _provider_instance


def _build_provider() -> LLMProvider:
    provider_name = os.environ.get('LLM_PROVIDER', '').lower()
    api_key = (
        os.environ.get('LLM_API_KEY', '') or
        os.environ.get('GEMINI_API_KEY', '')
    )

    if provider_name == 'gemini' and api_key:
        try:
            from .gemini_provider import GeminiProvider
            log.info('Sahayak: using GeminiProvider (%s)', 'gemini-3.8-flash')
            return GeminiProvider(api_key)
        except Exception as exc:
            log.error('Sahayak: GeminiProvider init failed (%s), falling back to mock', exc)

    if provider_name and provider_name != 'mock':
        log.warning(
            'Sahayak: LLM_PROVIDER=%r with no valid key or unsupported provider — '
            'using MockProvider (demo mode)', provider_name
        )

    log.info('Sahayak: using MockProvider (demo/offline mode)')
    return MockProvider()


def reset_provider():
    """Force re-initialisation (useful in tests)."""
    global _provider_instance
    _provider_instance = None
