"""
llm.py — Local rule-based engine for the GovLaunch AI Chatbot.

No external API key required. Answers are generated from the verified
platform knowledge base (knowledge.py) using keyword matching and
a curated Q&A table. Falls back to a helpful "I don't know" response.

The public interface (complete / parse_json / LLMError) is identical to
the original OpenAI version so all other modules work unchanged.
"""

import json
import logging
import re

log = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised for unrecoverable failures. Message is safe to log, never to show."""


# ---------------------------------------------------------------------------
# Curated Q&A patterns  (pattern, answer)
# Patterns are matched case-insensitively against the LAST user message.
# More specific patterns should come before more general ones.
# ---------------------------------------------------------------------------

_QA: list[tuple[str, str]] = [
    # ── Greetings ──────────────────────────────────────────────────────────
    (r"\b(hi|hello|hey|namaste|hii+|helo)\b",
     "Hello! I'm the GovLaunch AI Chatbot. I can help you navigate the platform — "
     "posting challenges, applying, evaluation, contracts and more. What would you like to know?"),

    # ── What is GovLaunch ──────────────────────────────────────────────────
    (r"what is govlaunch|about govlaunch|what does govlaunch do|platform.*about",
     "GovLaunch is an innovation-procurement platform that connects Indian government "
     "departments with startups. Departments post outcome-based challenges; startups "
     "discover, apply and get evaluated; successful pilots can be contracted and "
     "scaled across other departments via the Scale-Up Catalog."),

    # ── Posting a challenge ────────────────────────────────────────────────
    (r"post.*challenge|create.*challenge|new.*challenge|how.*challenge.*creat|publish.*challenge",
     "To post a challenge:\n"
     "1. Go to **My Challenges** in the sidebar (or visit /challenges).\n"
     "2. Click **Post Challenge** (or go to /challenges/new).\n"
     "3. Fill in: Title, Background, Outcome Metrics, Constraints, Budget Ceiling, "
     "Timeline (weeks), Sector Tags, and Eligibility Rules.\n"
     "4. Save as Draft or publish directly as Open.\n\n"
     "Only Department-role users can post challenges."),

    # ── Discover / find challenges ─────────────────────────────────────────
    (r"discover|find.*challenge|browse.*challenge|search.*challenge|open.*challenge",
     "Startups can discover open government challenges at **/discover** in the sidebar. "
     "Challenges can be filtered by sector tags. Click any challenge to read the full "
     "brief and apply."),

    # ── Applying ──────────────────────────────────────────────────────────
    (r"how.*apply|submit.*application|apply.*challenge|application.*submit",
     "To apply to a challenge:\n"
     "1. Go to **Discover Challenges** (/discover) and click on a challenge.\n"
     "2. Click **Apply**.\n"
     "3. Fill in: Solution Brief, Proposed Timeline (weeks), and Budget Quote.\n"
     "4. Submit — your application status will start as **submitted**.\n\n"
     "Note: Pre-DPIIT startups (Innovator Track) can also apply; DPIIT recognition "
     "is only required before final contracting."),

    # ── Application status / track ─────────────────────────────────────────
    (r"application.*status|track.*application|my.*application|status.*application",
     "Application statuses in order:\n"
     "**submitted → screening → eligible / ineligible → under_evaluation → "
     "shortlisted / rejected → contracted**\n\n"
     "Track your applications at **My Applications** (/my-applications). "
     "Click any application to see eligibility results, evaluation scores and status history."),

    # ── Eligibility ────────────────────────────────────────────────────────
    (r"eligib|dpiit|blacklist|team size",
     "Eligibility rules are set per challenge. Common rules:\n"
     "• **requires_dpiit** — startup must hold valid DPIIT recognition\n"
     "• **min_team_size** — minimum number of team members\n"
     "• **requires_no_blacklist** — startup must not be blacklisted\n\n"
     "Results are shown on the application detail page. "
     "Pre-DPIIT (Innovator Track) startups can still apply; recognition is checked at contracting time."),

    # ── Evaluation ────────────────────────────────────────────────────────
    (r"evaluat|score|scoring|review.*application|how.*judged",
     "Applications are evaluated on five dimensions (0–10 each, max total 50):\n"
     "1. Problem-Solution Fit\n2. Innovation\n3. Feasibility\n"
     "4. Impact & Sustainability\n5. Presentation\n\n"
     "There are two rounds: **Round 1 (Application)** and **Round 2 (Prototype)**.\n"
     "Evaluators access their queue at /evaluate and score each application at /evaluate/<id>."),

    # ── Contract ──────────────────────────────────────────────────────────
    (r"contract|pdf|agreement|ip clause|milestone",
     "Once an application is shortlisted and a prototype is approved, a Department "
     "user can generate a contract PDF at **/applications/<id>/contract**. "
     "The contract includes IP clauses, data clauses, cybersecurity checklist and milestones."),

    # ── Scale-Up Catalog ──────────────────────────────────────────────────
    (r"scale.?up|catalog|adopt.*challenge|other.*department|replicate",
     "The **Scale-Up Catalog** (/catalog) lists successfully piloted challenges. "
     "Any department can discover, adopt or enhance these to avoid duplication and "
     "enable cross-government collaboration. Startups can also browse it for opportunities."),

    # ── Supervision / novelty check ────────────────────────────────────────
    (r"supervis|novelty|duplicate|ai.*check|supervision",
     "Department users have a **Supervision** page (/supervision) where they can:\n"
     "• Run AI-powered novelty/duplicate checks on applications\n"
     "• Configure their AI provider key\n"
     "This adds an independent quality checkpoint before solutions progress."),

    # ── Dashboard ─────────────────────────────────────────────────────────
    (r"dashboard",
     "Startup users have a personalised **Dashboard** (/dashboard) showing:\n"
     "• Relevant open challenges\n"
     "• Your submitted applications and their current status\n"
     "• Your startup rating and badges"),

    # ── Rating ────────────────────────────────────────────────────────────
    (r"\brating\b|startup.*rating|rating.*startup|score.*startup",
     "Startups have a **rating** that starts at 1000 and is updated after each "
     "evaluation round based on scores relative to the cohort average. "
     "The display is capped at 2000. View your rating on the Startup Dashboard."),

    # ── Badges ────────────────────────────────────────────────────────────
    (r"\bbadge|achievement|milestone.*badge",
     "Startups earn **badges** for key milestones, for example **first_application** "
     "when you submit your first application. Badges are visible on the Startup Dashboard."),

    # ── Roles ─────────────────────────────────────────────────────────────
    (r"\brole|who can|department.*role|startup.*role|evaluator.*role|admin.*role",
     "GovLaunch has four roles:\n"
     "• **Department** — post challenges, manage applications, generate contracts\n"
     "• **Startup** — discover challenges, apply, track applications\n"
     "• **Evaluator** — score applications in two rounds\n"
     "• **Admin** — view audit trail, manage platform data"),

    # ── Audit trail ───────────────────────────────────────────────────────
    (r"audit|log|history|trail",
     "Admin users can view the full **Audit Trail** at /audit, showing all actor "
     "actions and timestamps across the platform."),

    # ── Prototype ─────────────────────────────────────────────────────────
    (r"prototype|demo.*url|repository|submit.*prototype",
     "After shortlisting, a Department can start the **Prototype phase** from the "
     "application detail page. Startups then submit a demo URL, repository URL and "
     "notes. Evaluators score the prototype in Round 2."),

    # ── Innovator Track ────────────────────────────────────────────────────
    (r"innovator.*track|pre.?dpiit|unregistered|incorporated",
     "The **Innovator Track** allows startups that are unregistered or incorporated "
     "(but not yet DPIIT recognised) to apply and be evaluated. DPIIT recognition "
     "is required only before final contracting — not at application time."),

    # ── Login / signup ─────────────────────────────────────────────────────
    (r"login|sign.*in|sign.*up|register|account|password",
     "You can log in at **/login** with your username and password, or use **Google OAuth**. "
     "To create an account go to /signup/startup (for startups) or /signup/department "
     "(for government departments)."),

    # ── Help / what can you do ─────────────────────────────────────────────
    (r"help|what can you|what do you|capabilities|feature",
     "I can help you with:\n"
     "• Posting or finding challenges\n"
     "• Submitting and tracking applications\n"
     "• Understanding eligibility rules\n"
     "• Evaluation process and scoring\n"
     "• Contracts and prototype phase\n"
     "• Scale-Up Catalog\n"
     "• Roles and permissions\n\n"
     "Just ask me anything about the GovLaunch platform!"),
]

# Pre-compile patterns
_COMPILED: list[tuple[re.Pattern, str]] = [
    (re.compile(p, re.I), a) for p, a in _QA
]

_FALLBACK = (
    "I'm sorry, I don't have specific information about that. "
    "I can help with: posting challenges, applying to challenges, "
    "eligibility rules, evaluation, contracts, scale-up catalog, "
    "ratings, badges, and platform roles. What would you like to know?"
)


def _extract_last_user_message(messages: list[dict]) -> str:
    """Return the content of the last user message."""
    for m in reversed(messages):
        if m.get("role") == "user":
            return m.get("content", "")
    return ""


def _match_answer(text: str) -> str:
    for pattern, answer in _COMPILED:
        if pattern.search(text):
            return answer
    return _FALLBACK


def complete(messages: list[dict], max_tokens: int = 450, json_mode: bool = False) -> str:
    """
    Main entry point. Accepts the same signature as the OpenAI version.
    When json_mode=True (used for summary/memory extraction) returns a
    minimal valid JSON so the caller degrades gracefully without errors.
    """
    if json_mode:
        # Summary / memory extraction calls — return empty but valid JSON
        return json.dumps({"summary": "", "memories": []})

    user_text = _extract_last_user_message(messages)
    answer = _match_answer(user_text)
    return answer


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
