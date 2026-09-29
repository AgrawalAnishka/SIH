import logging
import threading

from django.db import connection

from .conf import cfg
from .llm import LLMError, complete, parse_json
from .memory import extract_from_message, known_memory_text, looks_memorable, save_memories
from .models import Conversation
from .prompts import SUMMARY_SYSTEM

log = logging.getLogger(__name__)


def fold_and_extract(conv):
    """Fold all but the newest KEEP_RECENT unsummarized messages into conv.summary.
    Also extracts long-term memories from the folded text (same LLM call). Returns True if folded."""
    pending = list(conv.messages.filter(seq__gt=conv.summarized_upto).order_by("seq"))
    if len(pending) < cfg("SUMMARY_TRIGGER"):
        return False
    to_fold = pending[: len(pending) - cfg("KEEP_RECENT")]
    transcript = "\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content[:600]}" for m in to_fold
    )
    raw = complete(
        [
            {"role": "system", "content": SUMMARY_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Existing summary:\n{conv.summary or '(none)'}\n\n"
                    f"Saved user facts:\n{known_memory_text(conv.user)}\n\n"
                    f"New excerpt:\n{transcript}"
                ),
            },
        ],
        max_tokens=350,
        json_mode=True,
    )
    data = parse_json(raw)
    if not isinstance(data, dict) or not isinstance(data.get("summary"), str) or not data["summary"].strip():
        return False
    # Optimistic guard: only apply if nobody else advanced the pointer meanwhile.
    updated = Conversation.objects.filter(pk=conv.pk, summarized_upto=conv.summarized_upto).update(
        summary=data["summary"].strip()[:1200], summarized_upto=to_fold[-1].seq
    )
    if updated:
        save_memories(conv.user, data.get("memories"))
    return bool(updated)


def maintain(conversation_id, last_user_text):
    try:
        conv = Conversation.objects.select_related("user").get(pk=conversation_id)
        fold_and_extract(conv)
        if looks_memorable(last_user_text):
            extract_from_message(conv.user, last_user_text)
    except LLMError:
        pass  # already logged in llm.py; maintenance is best-effort
    except Exception:
        log.exception("KIRA maintenance failed")


def _runner(conversation_id, last_user_text):
    try:
        maintain(conversation_id, last_user_text)
    finally:
        connection.close()  # release this thread's DB connection


def maintain_async(conversation_id, last_user_text):
    threading.Thread(target=_runner, args=(conversation_id, last_user_text), daemon=True).start()
