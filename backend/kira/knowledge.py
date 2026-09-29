# Static, verified platform knowledge. KIRA has NO access to live data, so nothing here
# may be user-specific. Every sentence must be verifiable in the repo docs or UI.

COMMON_GUIDE = """GovLaunch connects Indian government departments with startups through a structured innovation-procurement process. There are four roles: Department, Startup, Evaluator and Admin.

The end-to-end workflow is: Government posts a Challenge → Startups discover and apply → Applications are screened for eligibility → Eligible applications go Under Evaluation → Evaluators score them → Shortlisted startups enter a Prototype phase → Successful prototypes are Contracted → Contracted solutions can be adopted by other departments via the Scale-Up Catalog.

Application statuses (in order): submitted → screening → eligible / ineligible → under_evaluation → shortlisted / rejected → contracted.

Eligibility rules are set per challenge. Common rules include: requires valid DPIIT recognition, minimum team size, no blacklist record. Results are shown on the application detail page.

Evaluation uses five scored dimensions (0–10 each, max total 50): Problem-Solution Fit, Innovation, Feasibility, Impact & Sustainability, Presentation. There are two evaluation rounds: Round 1 (Application) and Round 2 (Prototype).

The Scale-Up Catalog lists successfully piloted challenges that other departments can discover, adopt or enhance, enabling cross-government collaboration and avoiding duplication.

The Innovator Track allows pre-DPIIT startups (incorporated or unregistered) to apply and be evaluated. DPIIT recognition is required before final contracting, not at application time.

Startups earn a rating (starting at 1000, display capped at 2000) updated after each evaluation round based on scores relative to cohort average.

Startups earn badges for milestones such as first application submitted."""

# Keys must match the lowercase role values: "department", "startup", "evaluator", "admin".
ROLE_GUIDES = {
    "department": """As a Department user you can:
- View and manage your challenges at /challenges. Challenges have statuses: draft, open, closed.
- Post a new outcome-based challenge at /challenges/new. Set title, background, outcome metrics, constraints, budget ceiling, timeline (weeks), sector tags, and eligibility rules.
- View challenge details and all applications for your challenges at /challenges/<id>.
- Update an application's status (e.g. move to shortlisted, contracted) from the application detail page.
- Generate a contract PDF for a contracted application at /applications/<id>/contract.
- Use the Supervision page (/supervision) to run AI-powered novelty/duplicate checks on applications. You can configure your AI provider key there.
- Finalize an evaluation round to update startup ratings via the challenge detail page.
- Start the Prototype phase for a shortlisted application from the application detail page.
- Browse the Scale-Up Catalog (/catalog) to discover successful challenges from other departments and adopt them.""",

    "startup": """As a Startup user you can:
- View your personalised dashboard at /dashboard showing relevant challenges, your applications and their statuses.
- Discover open challenges at /discover, filtered by sector tags.
- Apply to a challenge at /discover/<id>. Submit a solution brief, proposed timeline and budget quote.
- Track all your applications at /my-applications. See eligibility results, evaluation scores and status updates.
- View full application details at /applications/<id>.
- Browse the Scale-Up Catalog (/catalog) for scale-up opportunities.
- Your startup has a rating (starts at 1000) updated after each evaluation round.
- Badges are earned for milestones, e.g. first_application. View badges on your dashboard.
- Pre-DPIIT startups (Innovator Track) can apply; DPIIT recognition is required before contracting.""",

    "evaluator": """As an Evaluator you can:
- View all applications assigned for your review at /evaluate.
- Score an application at /evaluate/<id>. Rate five dimensions (0–10 each): Problem-Solution Fit, Innovation, Feasibility, Impact & Sustainability, Presentation. Add comments and declare conflict of interest if applicable.
- There are two evaluation rounds: Round 1 (Application review) and Round 2 (Prototype review).
- Browse the Scale-Up Catalog (/catalog).""",

    "admin": """As an Admin you can:
- View the full Audit Trail at /audit showing all actor actions and timestamps.
- Reset the demo data via the admin API (this deletes all users and data and re-seeds from scratch).
- Browse the Scale-Up Catalog (/catalog).""",
}
