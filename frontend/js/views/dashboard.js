import { getReadings, resetConfig } from '../api.js';

let chartInstance = null;

export async function render(container) {
    // Basic Layout
    container.innerHTML = `
        <div class="card">
            <div class="filters">
                <div class="form-group" style="margin-bottom:0;">
                    <label>Start Month</label>
                    <input type="month" id="filter-start">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>End Month</label>
                    <input type="month" id="filter-end">
                </div>
                <button class="btn-primary" id="btn-filter">Apply</button>
                <button class="btn-secondary" id="btn-reset-filters">Last 12 Months</button>
                <div style="flex-grow: 1;"></div>
                <button class="btn-danger" id="btn-app-reset">Reset App Data</button>
            </div>
        </div>

        <div class="card">
            <div class="dashboard-tabs">
                <button class="btn-secondary active" id="tab-consumption">Consumption 📈</button>
                <button class="btn-secondary" id="tab-electricity"><span class="tab-label">Electricity</span> ⚡️</button>
                <button class="btn-secondary" id="tab-water"><span class="tab-label">Water</span> 💧</button>
                <button class="btn-secondary" id="tab-gas"><span class="tab-label">Gas</span> 💨</button>
            </div>
            <div id="view-container" style="overflow-x: auto;"></div>
        </div>
    `;

    // Event Listeners
    container.querySelector('#btn-filter').addEventListener('click', () => loadData(container));
    container.querySelector('#btn-reset-filters').addEventListener('click', () => {
        container.querySelector('#filter-start').value = '';
        container.querySelector('#filter-end').value = '';
        loadData(container);
    });

    container.querySelector('#btn-app-reset').addEventListener('click', async () => {
        if (confirm('Are you sure? This will backup the current database and start a fresh setup.')) {
            await resetConfig();
            location.reload();
        }
    });

    // Tabs
    const tabs = ['consumption', 'electricity', 'water', 'gas'];
    let currentTab = 'consumption';

    tabs.forEach(t => {
        container.querySelector(`#tab-${t}`).addEventListener('click', (e) => {
            // Update UI
            tabs.forEach(x => container.querySelector(`#tab-${x}`).classList.remove('active', 'btn-primary'));
            tabs.forEach(x => container.querySelector(`#tab-${x}`).classList.add('btn-secondary'));
            e.target.classList.remove('btn-secondary');
            e.target.classList.add('btn-primary', 'active');

            currentTab = t;
            loadData(container, currentTab);
        });
    });

    // Initial Load - Last 12 Months
    const now = new Date();
    const endStr = now.toISOString().slice(0, 7);
    const start = new Date(now.setFullYear(now.getFullYear() - 1));
    const startStr = start.toISOString().slice(0, 7);

    container.querySelector('#filter-start').value = startStr;
    container.querySelector('#filter-end').value = endStr;

    // Style active tab (handled by HTML init, but good to ensure logic matches)
    // Consumption is active by default HTML.
    container.querySelector('#tab-consumption').classList.remove('btn-secondary');
    container.querySelector('#tab-consumption').classList.add('btn-primary');

    loadData(container, 'consumption');
}

async function loadData(container, tab = null) {
    if (!tab) {
        // Find active tab
        if (container.querySelector('#tab-consumption').classList.contains('active')) tab = 'consumption';
        else if (container.querySelector('#tab-electricity').classList.contains('active')) tab = 'electricity';
        else if (container.querySelector('#tab-water').classList.contains('active')) tab = 'water';
        else if (container.querySelector('#tab-gas').classList.contains('active')) tab = 'gas';
    }

    const start = container.querySelector('#filter-start').value;
    const end = container.querySelector('#filter-end').value;
    const viewContainer = container.querySelector('#view-container');

    // If Consumption tab, fetch all. Else fetch specific type.
    const apiType = tab === 'consumption' ? null : tab;

    try {
        const data = await getReadings({ start, end, type: apiType });

        if (tab === 'consumption') {
            renderChart(viewContainer, data);
        } else {
            renderGroupedTable(viewContainer, data, tab);
        }
    } catch (e) {
        viewContainer.innerHTML = `<p class="error">Error loading data: ${e.message}</p>`;
    }
}

function renderGroupedTable(container, data, type) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (data.length === 0) {
        container.innerHTML = '<p>No data found for this period.</p>';
        return;
    }

    // Group by Period (Month)
    const grouped = {};
    data.forEach(row => {
        if (!grouped[row.period]) {
            grouped[row.period] = {
                period: row.period,
                readings: [],
                totalConsumption: 0
            };
        }
        grouped[row.period].readings.push(row);
        if (row.consumption !== null) {
            grouped[row.period].totalConsumption += row.consumption;
        }
    });

    // Sort periods desc (newest first)
    const periods = Object.keys(grouped).sort().reverse();

    // Header Unit
    const unit = type === 'electricity' ? 'kWh' : 'm³';

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Readings (${unit})</th>
                    <th>Total Consumption (${unit})</th>
                </tr>
            </thead>
            <tbody>
    `;

    periods.forEach(p => {
        const group = grouped[p];

        // Extract date from the first reading if available
        const dateDisplay = group.readings.length > 0 && group.readings[0].date
            ? `<div style="font-size: 0.8em; color: #666; font-weight: normal; margin-top: 4px;">(${group.readings[0].date})</div>`
            : '';

        // Format readings: "Meter: Value"
        const readingsStr = group.readings.map(r => {
            const label = r.meter + (r.channel ? ` (${r.channel})` : '');
            return `<div style="margin-bottom: 0.3rem;">
                <div><strong>${label}:</strong> ${r.value}</div>
            </div>`;
        }).join('');

        const consumptionStr = group.totalConsumption.toFixed(2);

        html += `
            <tr>
                <td>${p}${dateDisplay}</td>
                <td>${readingsStr}</td>
                <td><strong>${consumptionStr}</strong> ${unit}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderChart(container, data) {
    if (data.length === 0) {
        container.innerHTML = '<p>No data available for chart.</p>';
        return;
    }

    container.innerHTML = '<div class="chart-container"><canvas id="consumption-chart"></canvas></div>';
    const ctx = container.querySelector('#consumption-chart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Prepare Data
    // We need 3 datasets: Electricity, Water, Gas.
    // X-Axis: All unique periods sorted.

    const datasets = {
        electricity: {},
        water: {},
        gas: {}
    };

    const allPeriods = new Set();

    data.forEach(row => {
        if (row.consumption !== null) {
            allPeriods.add(row.period);
            if (!datasets[row.type][row.period]) datasets[row.type][row.period] = 0;
            datasets[row.type][row.period] += row.consumption;
        }
    });

    const sortedPeriods = Array.from(allPeriods).sort();

    const chartData = {
        labels: sortedPeriods,
        datasets: [
            {
                label: 'Electricity (kWh)',
                data: sortedPeriods.map(p => datasets.electricity[p] || 0),
                borderColor: '#f1c40f', // Yellow
                backgroundColor: 'rgba(241, 196, 15, 0.2)',
                tension: 0.1
            },
            {
                label: 'Water (m³)',
                data: sortedPeriods.map(p => datasets.water[p] || 0),
                borderColor: '#3498db', // Blue
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.1
            },
            {
                label: 'Gas (m³)',
                data: sortedPeriods.map(p => datasets.gas[p] || 0),
                borderColor: '#e74c3c', // Red
                backgroundColor: 'rgba(231, 76, 60, 0.2)',
                tension: 0.1
            }
        ]
    };

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
