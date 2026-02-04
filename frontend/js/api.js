const API_BASE = '/api';

export async function getConfig() {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return res.json();
}

export async function initConfig(config) {
    const res = await fetch(`${API_BASE}/config/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('Failed to save config');
    return res.json();
}

export async function resetConfig() {
    const res = await fetch(`${API_BASE}/config/reset`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reset');
    return res.json();
}

export async function getReadings(params = {}) {
    // Build query string
    const query = new URLSearchParams();
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    if (params.type) query.append('type', params.type);

    const res = await fetch(`${API_BASE}/readings?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch readings');
    return res.json();
}

export async function saveReadings(readings) {
    const res = await fetch(`${API_BASE}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readings)
    });
    if (!res.ok) throw new Error('Failed to save readings');
    return res.json();
}
