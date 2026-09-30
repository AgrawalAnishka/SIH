"""
ai_assist/llm/base.py
Abstract provider interface. Every concrete provider implements these two methods.
"""
from abc import ABC, abstractmethod


class LLMProvider(ABC):

    @abstractmethod
    def complete_json(self, system: str, user: str, schema: dict,
                      max_tokens: int = 800) -> dict:
        """
        Send a chat request expecting a JSON response.
        Returns a Python dict validated against `schema` keys.
        Raises LLMError on unrecoverable failure.
        """

    @abstractmethod
    def complete_text(self, system: str, user: str,
                      max_tokens: int = 600) -> str:
        """
        Send a chat request expecting plain text.
        Raises LLMError on unrecoverable failure.
        """

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Human-readable model identifier stored on every output row."""


class LLMError(Exception):
    """Raised for unrecoverable provider failures. Message is safe to log."""
