const API_BASE = process.env.REACT_APP_FLASK_URI.replace(/\/$/, '');

function apiFetch(path, options) {
    const base = API_BASE ? `${API_BASE}` : '';
    const url = `${base}${path}`;
    return fetch(url, options);
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
        throw new Error('Sync failed');
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
        throw new Error('Force pull failed');
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
        throw new Error('Force push failed');
    }
    return response.json();
}
