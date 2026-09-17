const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Get the CSRF token from cookie (set by Django on first GET request)
function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// Ensure we have a CSRF cookie before any state-changing request
async function ensureCsrf() {
  if (!getCsrfToken()) {
    // Hit a safe GET endpoint so Django sets the csrftoken cookie
    await fetch(`${BASE_URL}/api/health/`, { credentials: 'include' });
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || 'GET';

  // For state-changing requests, make sure we have a CSRF token first
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    await ensureCsrf();
  }

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/api/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    request('/api/auth/logout/', { method: 'POST' }),
  me: () =>
    request('/api/auth/me/'),
  googleAuth: (credential, role) =>
    request('/api/auth/google/', { method: 'POST', body: JSON.stringify({ credential, role }) }),
  completeOAuthProfile: (data) =>
    request('/api/auth/complete-profile/', { method: 'POST', body: JSON.stringify(data) }),

  // Departments
  getDepartments: () => request('/api/departments/'),
  getDepartment: (id) => request(`/api/departments/${id}/`),

  // Startups
  getStartups: () => request('/api/startups/'),
  getStartup: (id) => request(`/api/startups/${id}/`),

  // Challenges
  getChallenges: () => request('/api/challenges/'),
  getChallenge: (id) => request(`/api/challenges/${id}/`),
  createChallenge: (data) =>
    request('/api/challenges/', { method: 'POST', body: JSON.stringify(data) }),
  updateChallenge: (id, data) =>
    request(`/api/challenges/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Applications
  getApplications: (params = '') => request(`/api/applications/${params ? '?' + params : ''}`),
  getApplication: (id) => request(`/api/applications/${id}/`),
  createApplication: (data) =>
    request('/api/applications/', { method: 'POST', body: JSON.stringify(data) }),
  // Startup's own applications — viewset already scopes by logged-in startup
  getMyApplications: () => request('/api/applications/'),
  logApplicationView: (applicationId) =>
    request(`/api/applications/${applicationId}/log-view/`, { method: 'POST' }),
  updateApplicationStatus: (applicationId, newStatus) =>
    request(`/api/applications/${applicationId}/update-status/`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) }),

  // Auth - signup
  signup: (data) =>
    request('/api/auth/signup/', { method: 'POST', body: JSON.stringify(data) }),

  // Eligibility Results
  getEligibilityResults: (params = '') => request(`/api/eligibility-results/${params ? '?' + params : ''}`),

  // Evaluations
  getEvaluations: (params = '') => request(`/api/evaluations/${params ? '?' + params : ''}`),
  createEvaluation: (data) =>
    request('/api/evaluations/', { method: 'POST', body: JSON.stringify(data) }),

  // Contracts
  getContracts: () => request('/api/contracts/'),
  getContract: (id) => request(`/api/contracts/${id}/`),
  createContract: (data) =>
    request('/api/contracts/', { method: 'POST', body: JSON.stringify(data) }),

  // Scale-up entries
  getScaleUpEntries: () => request('/api/scaleup-entries/'),
  updateScaleUpEntry: (id, data) =>
    request(`/api/scaleup-entries/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Audit logs
  getAuditLogs: () => request('/api/audit-logs/'),

  // Health
  health: () => request('/api/health/'),

  // Public stats — no auth required
  getPublicStats: () => request('/api/stats/'),
  getPublicChallenges: () => request('/api/challenges/public/'),

  // Supervision
  getSupervisionDuplicates: () => request('/api/supervision/duplicates/'),
  getAIProviderConfig: () => request('/api/ai-provider-config/'),
  saveAIProviderConfig: (data) =>
    request('/api/ai-provider-config/', { method: 'PUT', body: JSON.stringify(data) }),
  runNoveltyCheck: (applicationId) =>
    request(`/api/applications/${applicationId}/novelty-check/`, { method: 'POST' }),
  getNoveltyCheck: (applicationId) =>
    request(`/api/applications/${applicationId}/novelty-check/`).catch(() => null),

  // R2 — Rating
  finalizeRound: (challengeId, round) =>
    request(`/api/challenges/${challengeId}/finalize-round/`, { method: 'POST', body: JSON.stringify({ round }) }),
  getStartupRatingHistory: (startupId) =>
    request(`/api/startups/${startupId}/rating-history/`),

  // R3 — Badges
  getStartupBadges: (startupId) =>
    request(`/api/startups/${startupId}/badges/`),

  // R7 — Prototype
  startPrototypePhase: (applicationId) =>
    request(`/api/applications/${applicationId}/start-prototype-phase/`, { method: 'POST' }),

  // Admin
  resetDemo: () => request('/api/admin/reset-demo/', { method: 'POST' }),
};
