const API_BASE = '/api';

export function generateMeterUUID() {
    return 'xxxxxxxx'.replace(/[x]/g, function(c) {
        const r = Math.random() * 16 | 0;
        return r.toString(16).toUpperCase();
    });
}

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

export async function saveReadings(readings) {
    const res = await fetch(`${API_BASE}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readings)
    });
    if (!res.ok) throw new Error('Failed to save readings');
    return res.json();
}

// Migration API
export async function getMigrationStatus() {
    const res = await fetch(`${API_BASE}/migration/status`);
    if (!res.ok) throw new Error('Failed to fetch migration status');
    return res.json();
}

export async function runMigration() {
    const res = await fetch(`${API_BASE}/migration/run`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to run migration');
    return res.json();
}

// Monthly Readings API
export async function getMonthlyReadings(period) {
    const res = await fetch(`${API_BASE}/readings/monthly/${period}`);
    if (!res.ok) throw new Error('Failed to fetch monthly readings');
    return res.json();
}

// Electricity API
export async function getElectricityReadings(params = {}) {
    const query = new URLSearchParams();
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    if (params.meter) query.append('meter', params.meter);
    if (params.meter_id) query.append('meter_id', params.meter_id);

    const res = await fetch(`${API_BASE}/readings/electricity?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch electricity readings');
    return res.json();
}

export async function getElectricityReading(id) {
    const res = await fetch(`${API_BASE}/readings/electricity/${id}`);
    if (!res.ok) throw new Error('Failed to fetch electricity reading');
    return res.json();
}

export async function createElectricityReading(reading) {
    const res = await fetch(`${API_BASE}/readings/electricity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
    });
    if (!res.ok) throw new Error('Failed to create electricity reading');
    return res.json();
}

export async function updateElectricityReading(id, reading) {
    const res = await fetch(`${API_BASE}/readings/electricity/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
    });
    if (!res.ok) throw new Error('Failed to update electricity reading');
    return res.json();
}

export async function deleteElectricityReading(id) {
    const res = await fetch(`${API_BASE}/readings/electricity/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete electricity reading');
    return res.json();
}

// Water API
export async function getWaterReadings(params = {}) {
    const query = new URLSearchParams();
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    if (params.room) query.append('room', params.room);
    if (params.meter_id) query.append('meter_id', params.meter_id);

    const res = await fetch(`${API_BASE}/readings/water?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch water readings');
    return res.json();
}

export async function getWaterReading(id) {
    const res = await fetch(`${API_BASE}/readings/water/${id}`);
    if (!res.ok) throw new Error('Failed to fetch water reading');
    return res.json();
}

export async function createWaterReading(reading) {
    const res = await fetch(`${API_BASE}/readings/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
    });
    if (!res.ok) throw new Error('Failed to create water reading');
    return res.json();
}

export async function updateWaterReading(id, reading) {
    const res = await fetch(`${API_BASE}/readings/water/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
    });
    if (!res.ok) throw new Error('Failed to update water reading');
    return res.json();
}

export async function deleteWaterReading(id) {
    const res = await fetch(`${API_BASE}/readings/water/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete water reading');
    return res.json();
}

// Gas API
export async function getGasReadings(params = {}) {
    const query = new URLSearchParams();
    if (params.start) query.append('start', params.start);
    if (params.end) query.append('end', params.end);
    if (params.room) query.append('room', params.room);
    if (params.meter_id) query.append('meter_id', params.meter_id);

    const res = await fetch(`${API_BASE}/readings/gas?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch gas readings');
    return res.json();
}

export async function getGasReading(id) {
    const res = await fetch(`${API_BASE}/readings/gas/${id}`);
    if (!res.ok) throw new Error('Failed to fetch gas reading');
    return res.json();
}

export async function createGasReading(reading) {
    const res = await fetch(`${API_BASE}/readings/gas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
    });
    if (!res.ok) throw new Error('Failed to create gas reading');
    return res.json();
}

export async function updateGasReading(id, reading) {
    const res = await fetch(`${API_BASE}/readings/gas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
    });
    if (!res.ok) throw new Error('Failed to update gas reading');
    return res.json();
}

export async function deleteGasReading(id) {
    const res = await fetch(`${API_BASE}/readings/gas/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete gas reading');
    return res.json();
}

// Maintenance API
export async function reorganizeDatabase() {
    const res = await fetch(`${API_BASE}/maintenance/reorganize`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reorganize database');
    return res.json();
}
