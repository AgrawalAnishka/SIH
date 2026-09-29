import logging
import re

from .conf import cfg
from .llm import complete, parse_json
from .models import UserMemory
from .prompts import MEMORY_SYSTEM

log = logging.getLogger(__name__)

MEMORY_HINTS = re.compile(
    r"\b(my name is|call me|i am called|i prefer|i'd prefer|i would prefer|always (?:reply|answer|respond)|"
    r"(?:reply|respond|answer|speak|talk) (?:to me )?in|remember (?:that|this)|don't forget|"
    r"i work (?:at|for|on|in)|i'm working on|i am working on|my (?:project|team|department|startup|company) (?:is|are))\b",
    re.I,
)

SENSITIVE = re.compile(
    r"\b\d{10,}\b|\b\d{5}[ -]?\d{5}\b|\b\d{4}[ -]?\d{4}[ -]?\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b|"
    r"[\w.+-]+@[\w-]+\.[\w.]+|\bsk-[\w-]{10,}|password|passwd|\botp\b|api[_ -]?key|secret|token",
    re.I,
)

_KEY_CLEAN = re.compile(r"[^a-z0-9_]+")


def looks_memorable(text):
    return bool(MEMORY_HINTS.search(text or ""))


def clean_key(raw):
    return _KEY_CLEAN.sub("_", str(raw or "").strip().lower()).strip("_")[:40]


def prompt_memories(user):
    return list(
        UserMemory.objects.filter(user=user).order_by("-importance", "-updated_at")[
            : cfg("MAX_MEMORIES_IN_PROMPT")
        ]
    )


def known_memory_text(user):
    return "\n".join(f"{m.key}: {m.value}" for m in prompt_memories(user)) or "(none)"


def save_memories(user, items):
    if not isinstance(items, list):
        return
    for item in items[:3]:
        if not isinstance(item, dict):
            continue
        key = clean_key(item.get("key"))
        value = " ".join(str(item.get("value", "")).split())[:300]
        if not key or not value or SENSITIVE.search(value) or SENSITIVE.search(key):
            continue
        try:
            importance = min(5, max(1, int(item.get("importance", 3))))
        except (TypeError, ValueError):
            importance = 3
        UserMemory.objects.update_or_create(
            user=user, key=key, defaults={"value": value, "importance": importance}
        )
    _enforce_cap(user)


def _enforce_cap(user):
    cap = cfg("MAX_MEMORIES_PER_USER")
    total = UserMemory.objects.filter(user=user).count()
    if total > cap:
        ids = list(
            UserMemory.objects.filter(user=user)
            .order_by("importance", "updated_at")
            .values_list("id", flat=True)[: total - cap]
        )
        UserMemory.objects.filter(id__in=ids).delete()


def extract_from_message(user, text):
    raw = complete(
        [
            {"role": "system", "content": MEMORY_SYSTEM},
            {
                "role": "user",
                "content": f"Existing facts:\n{known_memory_text(user)}\n\nMessage:\n{text[:1000]}",
            },
        ],
        max_tokens=150,
        json_mode=True,
    )
    data = parse_json(raw)
    if isinstance(data, dict):
        save_memories(user, data.get("memories"))
