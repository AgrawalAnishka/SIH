"""
ai_assist/llm/gemini_provider.py
Gemini-backed provider using google-genai SDK.
Selected when LLM_PROVIDER=gemini and GEMINI_API_KEY is set.
"""
import json
import logging
import re

from .base import LLMError, LLMProvider

log = logging.getLogger(__name__)
_MODEL = 'gemini-3.8-flash'


class GeminiProvider(LLMProvider):

    def __init__(self, api_key: str):
        try:
            from google import genai
            from google.genai import types as gtypes
            self._client = genai.Client(api_key=api_key)
            self._types = gtypes
        except ImportError as exc:
            raise LLMError('google-genai package not installed') from exc

    @property
    def model_name(self) -> str:
        return _MODEL

    def _call(self, system: str, user: str, max_tokens: int,
              json_mode: bool = False) -> str:
        from google.genai import types as gtypes
        contents = [gtypes.Content(role='user', parts=[gtypes.Part(text=user)])]
        cfg_kwargs = {
            'max_output_tokens': max_tokens,
            'temperature': 0.3,
            'system_instruction': system,
        }
        if json_mode:
            cfg_kwargs['response_mime_type'] = 'application/json'
        try:
            resp = self._client.models.generate_content(
                model=_MODEL,
                contents=contents,
                config=gtypes.GenerateContentConfig(**cfg_kwargs),
            )
            return resp.text or ''
        except Exception as exc:
            log.error('GeminiProvider error: %s', exc)
            raise LLMError(str(exc)) from exc

    def complete_json(self, system: str, user: str, schema: dict,
                      max_tokens: int = 800) -> dict:
        raw = self._call(system, user, max_tokens, json_mode=True)
        # Strip markdown fences if any
        raw = re.sub(r'^```[a-z]*\n?', '', raw.strip())
        raw = re.sub(r'\n?```$', '', raw.strip())
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            # One retry without json_mode
            log.warning('GeminiProvider: JSON decode failed, retrying as text')
            raw2 = self._call(system, user + '\n\nRespond with valid JSON only.',
                              max_tokens, json_mode=False)
            raw2 = re.sub(r'^```[a-z]*\n?', '', raw2.strip())
            raw2 = re.sub(r'\n?```$', '', raw2.strip())
            try:
                return json.loads(raw2)
            except json.JSONDecodeError as exc2:
                raise LLMError(f'JSON parse failed after retry: {exc2}') from exc2

    def complete_text(self, system: str, user: str,
                      max_tokens: int = 600) -> str:
        return self._call(system, user, max_tokens, json_mode=False)
