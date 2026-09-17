from django.conf import settings


def validate_email_domain(email: str, role: str) -> bool:
    """
    Validates an email domain against strict role-based domain policies.

    Rules
    ─────
    - role='department' : ONLY .gov.in / .nic.in addresses (and their subdomains)
    - role='startup'    : government domains are FORBIDDEN

    Subdomain tree matching is used rather than naive substring matching to
    prevent evasion via domains like 'notgov.in' or 'evil-gov.in':
        domain == 'gov.in'              → accepted (exact root match)
        domain == 'dept.health.gov.in'  → accepted (subdomain of gov.in)
        domain == 'notgov.in'           → rejected (does not equal or end with '.gov.in')
    """
    if '@' not in email:
        return False

    domain = email.split('@')[-1].lower()

    # Strip the leading dot once so comparisons are clean
    is_gov = any(
        domain == gov_domain.lstrip('.') or domain.endswith('.' + gov_domain.lstrip('.'))
        for gov_domain in settings.GOV_EMAIL_DOMAINS
    )

    if role == 'department':
        return is_gov
    elif role == 'startup':
        return not is_gov

    # Any other role value fails validation
    return False
