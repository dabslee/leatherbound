const API_BASE = process.env.REACT_APP_FLASK_URI.replace(/\/$/, '');

function apiFetch(path, options) {
    const base = API_BASE ? `${API_BASE}` : '';
    const url = `${base}${path}`;
    return fetch(url, options);
}

// Build an Error that carries the HTTP status, so callers can tell an expired/invalid
// session (401) apart from a generic failure and react (e.g. prompt a re-login).
function apiError(response, fallback) {
    const err = new Error(fallback);
    err.status = response.status;
    return err;
}

export async function login(username, password) {
    const response = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return response.json();
}

export async function register(username, password) {
    const response = await apiFetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    return response.json();
}

export async function sync(token, data) {
    const response = await apiFetch('/api/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data })
    });
    if (!response.ok) {
        throw apiError(response, 'Sync failed');
    }
    return response.json();
}

// Force pull: fetch the full server-side copy so the caller can replace local data.
export async function pullAll(token) {
    const response = await apiFetch('/api/pull', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        throw apiError(response, 'Force pull failed');
    }
    return response.json();
}

// Force push: replace the entire server-side copy with the provided local data.
export async function pushAll(token, data) {
    const response = await apiFetch('/api/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data })
    });
    if (!response.ok) {
        throw apiError(response, 'Force push failed');
    }
    return response.json();
}

// ---- Personal API tokens (for AI agents / scripts using the mood API) ----

function authHeaders(token) {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function jsonOrThrow(response, fallback) {
    if (!response.ok) {
        let message = fallback;
        try { message = (await response.json()).error || fallback; } catch (e) { /* not JSON */ }
        const err = new Error(message);
        err.status = response.status;
        throw err;
    }
    return response.json();
}

export async function listApiTokens(token) {
    const response = await apiFetch('/api/tokens', { headers: authHeaders(token) });
    return (await jsonOrThrow(response, 'Could not load API tokens')).tokens;
}

export async function createApiToken(token, { name, scopes, expiresInDays }) {
    const response = await apiFetch('/api/tokens', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ name, scopes, expires_in_days: expiresInDays })
    });
    return jsonOrThrow(response, 'Could not create API token');
}

export async function revokeApiToken(token, id) {
    const response = await apiFetch(`/api/tokens/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    return jsonOrThrow(response, 'Could not revoke API token');
}

export const API_BASE_URL = API_BASE;
