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
