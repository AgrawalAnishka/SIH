"""
llm.py — OpenAI-powered engine for the GovLaunch KIRA chatbot.

Uses OPENAI_API_KEY from .env via kira/conf.py.
Falls back to the rule-based engine if the key is missing or the call fails.
"""

import json
import logging
import re

from .conf import cfg

log = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised for unrecoverable failures."""


# ---------------------------------------------------------------------------
# Rule-based fallback (used when OpenAI is unavailable)
# ---------------------------------------------------------------------------

_QA: list[tuple[str, str]] = [
    # ── Greetings ──────────────────────────────────────────────────────────
    (r"\b(hi+|hello+|hey+|namaste|howdy|sup|greetings|good\s*(morning|afternoon|evening|day))\b",
     "Hello! I'm KIRA, the GovLaunch AI assistant. I can help you with:\n"
     "• Discovering and posting challenges\n"
     "• Submitting and tracking applications\n"
     "• Evaluation, contracts, and the Scale-Up Catalog\n"
     "• Ratings, badges, and platform roles\n\n"
     "What would you like to know?"),

    # ── What can you do / capabilities ────────────────────────────────────
    (r"what\s+(can|do|r|are)\s+(u|you|i)\s*(do|help|know|assist|use)"
     r"|what.*capabilit|what.*feature|what.*help"
     r"|how.*help|tell me.*about.*you|what.*purpose|your (job|role|function)"
     r"|capabilities|what\s+u\s+do",
     "I'm KIRA — the GovLaunch AI assistant. Here's what I can help with:\n\n"
     "🏛️ **Challenges** — how to post, discover, and browse open challenges\n"
     "📋 **Applications** — how to apply, track status, and understand eligibility\n"
     "⚖️ **Evaluation** — scoring criteria, rounds, and how applications are judged\n"
     "📄 **Contracts** — how contracts are generated after shortlisting\n"
     "🚀 **Scale-Up Catalog** — how successful pilots can be adopted by other departments\n"
     "🏅 **Ratings & Badges** — how startup ratings and achievements work\n"
     "👥 **Roles** — what Department, Startup, Evaluator, and Admin users can do\n\n"
     "Just ask me anything!"),

    # ── What is GovLaunch ──────────────────────────────────────────────────
    (r"what\s+is\s+gov|about\s+gov|what\s+does\s+gov|this\s+(website|site|platform|app|portal)"
     r"|explain\s+gov|tell.*govlaunch|govlaunch.*mean|what.*govlaunch",
     "GovLaunch is an innovation-procurement platform that connects Indian government "
     "departments with startups.\n\n"
     "🏛️ **Departments** post real, outcome-based challenges\n"
     "🚀 **Startups** discover challenges, apply, and compete on merit\n"
     "⚖️ **Evaluators** score applications across two rounds\n"
     "📈 **Successful pilots** get contracted and scaled nationally via the Scale-Up Catalog\n\n"
     "Every bid is timestamped and every contract is auto-drafted — fully transparent."),

    # ── Posting a challenge ────────────────────────────────────────────────
    (r"post.*challenge|create.*challenge|new.*challenge|publish.*challenge|add.*challenge|how.*challenge",
     "To post a challenge (Department users only):\n"
     "1. Go to **My Challenges** → **Post Challenge** (or visit /challenges/new)\n"
     "2. Fill in: Title, Background, Outcome Metrics, Constraints\n"
     "3. Set Budget Ceiling, Timeline (weeks), Sector Tags, Eligibility Rules\n"
     "4. Save as **Draft** or publish as **Open**\n\n"
     "Only Department-role users can create challenges."),

    # ── Show / list challenges ──────────────────────────────────────────────
    (r"show.*challenge|list.*challenge|see.*challenge|view.*challenge|current.*challenge"
     r"|active.*challenge|latest.*challenge|available.*challenge",
     "You can browse all open challenges at **/discover** in the sidebar. "
     "Challenges are filterable by sector tag. Click any challenge to read the full brief and apply.\n\n"
     "As a Department user, your own challenges are at **/challenges**."),

    # ── Discover / find challenges ─────────────────────────────────────────
    (r"discover|find.*challenge|browse.*challenge|search.*challenge|open.*challenge",
     "Go to **Discover Challenges** (/discover) to browse all open government challenges. "
     "Filter by sector and click any challenge to read the brief and apply."),

    # ── Applying ──────────────────────────────────────────────────────────
    (r"how.*apply|submit.*application|apply.*challenge|apply.*how|want.*apply",
     "To apply to a challenge:\n"
     "1. Go to **Discover** (/discover) and click a challenge\n"
     "2. Click **Apply**\n"
     "3. Fill in: Solution Brief, Proposed Timeline (weeks), Budget Quote\n"
     "4. Submit — your status starts as **submitted**\n\n"
     "💡 Pre-DPIIT startups (Innovator Track) can apply too. "
     "DPIIT recognition is only required before final contracting."),

    # ── Application status ─────────────────────────────────────────────────
    (r"application.*status|track.*application|my.*application|status.*application|where.*application",
     "Application statuses in order:\n"
     "**submitted → screening → eligible/ineligible → under_evaluation → shortlisted/rejected → contracted**\n\n"
     "Track all your applications at **My Applications** (/my-applications). "
     "Click any application to see eligibility results, evaluation scores, and full status history."),

    # ── Eligibility ────────────────────────────────────────────────────────
    (r"eligib|dpiit|blacklist|team.?size|qualify|requirement",
     "Eligibility rules are set per challenge. Common ones:\n"
     "• **requires_dpiit** — must hold valid DPIIT recognition\n"
     "• **min_team_size** — minimum team members required\n"
     "• **requires_no_blacklist** — startup must not be blacklisted\n\n"
     "Results are shown on the application detail page. "
     "Pre-DPIIT startups can still apply via the Innovator Track."),

    # ── Evaluation ────────────────────────────────────────────────────────
    (r"evaluat|scoring|score|how.*judg|how.*assess|criteria|judg",
     "Applications are evaluated on 5 dimensions (0–10 each, max 50 total):\n"
     "1. Problem-Solution Fit\n"
     "2. Innovation\n"
     "3. Feasibility\n"
     "4. Impact & Sustainability\n"
     "5. Presentation\n\n"
     "There are two rounds: **Round 1** (Application) and **Round 2** (Prototype). "
     "Evaluators access their queue at /evaluate."),

    # ── Contract ──────────────────────────────────────────────────────────
    (r"contract|pdf|agreement|ip.*clause|milestone|sign.*deal",
     "Once an application is shortlisted and the prototype approved, a Department user "
     "can generate a contract PDF at **/applications/<id>/contract**. "
     "It includes IP clauses, data clauses, cybersecurity checklist, and milestones."),

    # ── Scale-Up Catalog ──────────────────────────────────────────────────
    (r"scale.?up|catalog|adopt|replicate|other.*department|expand",
     "The **Scale-Up Catalog** (/catalog) lists successfully piloted challenges. "
     "Any department can discover and adopt these to avoid duplication and "
     "enable cross-government collaboration. Startups can also browse for opportunities."),

    # ── Rating ────────────────────────────────────────────────────────────
    (r"\brating\b|startup.*rating|how.*rating.*work|points|leaderboard",
     "Startup ratings start at **1000** and update after each evaluation round "
     "based on scores relative to the cohort average. Displayed on your Dashboard. "
     "The display is capped at 2000."),

    # ── Badges ────────────────────────────────────────────────────────────
    (r"\bbadge|achievement|unlock|milestone.*badge|award",
     "Startups earn **badges** for key milestones — for example, "
     "**first_application** when you submit your first application. "
     "View your badges on the Startup Dashboard."),

    # ── Roles ─────────────────────────────────────────────────────────────
    (r"\brole|who can|permission|access|department.*do|startup.*do|evaluator.*do|admin.*do",
     "GovLaunch has four roles:\n"
     "• 🏛️ **Department** — post challenges, manage applications, generate contracts\n"
     "• 🚀 **Startup** — discover challenges, apply, track applications\n"
     "• ⚖️ **Evaluator** — score applications in two rounds\n"
     "• 🔑 **Admin** — view audit trail, manage platform data"),

    # ── Dashboard ─────────────────────────────────────────────────────────
    (r"dashboard|home.*page|overview|my.*page",
     "The **Startup Dashboard** (/dashboard) shows:\n"
     "• Relevant open challenges for you\n"
     "• Your submitted applications and current statuses\n"
     "• Your startup rating and earned badges"),

    # ── Login / signup ─────────────────────────────────────────────────────
    (r"login|log\s*in|sign\s*(in|up)|register|creat.*account|password|account",
     "Log in at **/login** with username & password or use **Google OAuth**.\n"
     "Sign up at:\n"
     "• /signup/startup — for startups\n"
     "• /signup/department — for government departments"),

    # ── Prototype ─────────────────────────────────────────────────────────
    (r"prototype|demo.*url|repositor|submit.*prototype|phase.?2",
     "After shortlisting, a Department starts the **Prototype phase** from the "
     "application detail page. Startups submit a demo URL, repository URL, and notes. "
     "Evaluators then score the prototype in Round 2."),

    # ── Audit trail ───────────────────────────────────────────────────────
    (r"audit|log|history|trail|track.*action",
     "Admin users can view the full **Audit Trail** at /audit — "
     "all actor actions and timestamps across the entire platform."),

    # ── Thanks / goodbye ──────────────────────────────────────────────────
    (r"\b(thanks|thank\s*you|thx|ty|cheers|bye|goodbye|see\s*you|cya)\b",
     "You're welcome! Feel free to ask anytime. Good luck on GovLaunch! 🚀"),
]

_COMPILED = [(re.compile(p, re.I), a) for p, a in _QA]

_FALLBACK = (
    "I'm not sure about that. I can help with challenges, applications, eligibility, "
    "evaluation, contracts, the scale-up catalog, ratings, badges, and platform roles. "
    "What would you like to know?"
)


def _rule_based(messages: list[dict]) -> str:
    text = next(
        (m.get("content", "") for m in reversed(messages) if m.get("role") == "user"),
        ""
    )
    for pattern, answer in _COMPILED:
        if pattern.search(text):
            return answer
    return _FALLBACK


# ---------------------------------------------------------------------------
# OpenAI call
# ---------------------------------------------------------------------------

def complete(messages: list[dict], max_tokens: int = 450, json_mode: bool = False) -> str:
    """
    Call OpenAI if a key is configured, otherwise fall back to rule-based.
    json_mode=True is used for summary/memory extraction by other kira modules.
    """
    api_key = cfg("API_KEY")

    if not api_key:
        log.warning("KIRA: OPENAI_API_KEY not set — using rule-based fallback.")
        if json_mode:
            return json.dumps({"summary": "", "memories": []})
        return _rule_based(messages)

    try:
        from openai import OpenAI  # lazy import — only when key is present

        client = OpenAI(
            api_key=api_key,
            base_url=cfg("BASE_URL"),  # None = default OpenAI endpoint
        )

        kwargs = {
            "model":    cfg("MODEL"),
            "messages": messages,
            cfg("TOKEN_PARAM"): max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    except Exception as exc:
        log.error("KIRA OpenAI call failed: %s", exc)
        if json_mode:
            return json.dumps({"summary": "", "memories": []})
        # Degrade gracefully to rule-based
        return _rule_based(messages)


def parse_json(text: str):
    """Parse JSON from a string, with fallback regex extraction."""
    try:
        return json.loads(text)
    except ValueError:
        match = re.search(r"\{.*\}", text, re.S)
        if match:
            try:
                return json.loads(match.group(0))
            except ValueError:
                return None
    return None
