import os

_DEFAULTS = {
    "MODEL": "gpt-4o-mini",
    "TOKEN_PARAM": "max_tokens",  # some newer OpenAI models require "max_completion_tokens"
    "MAX_REPLY_TOKENS": 450,
    "KEEP_RECENT": 10,
    "SUMMARY_TRIGGER": 24,
    "MAX_MEMORIES_IN_PROMPT": 12,
    "MAX_MEMORIES_PER_USER": 50,
}


def cfg(name):
    """Read config at call time so env vars loaded by settings are respected."""
    if name == "API_KEY":
        return os.environ.get("OPENAI_API_KEY", "")
    if name == "BASE_URL":
        return os.environ.get("KIRA_BASE_URL") or None  # optional: any OpenAI-compatible provider
    if name == "MODEL":
        return os.environ.get("KIRA_MODEL") or _DEFAULTS["MODEL"]
    if name == "TOKEN_PARAM":
        return os.environ.get("KIRA_TOKEN_PARAM") or _DEFAULTS["TOKEN_PARAM"]
    return _DEFAULTS[name]
