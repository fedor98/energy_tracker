import { getElectricityReadings, getWaterReadings, getGasReadings, resetConfig } from '../api.js';

export async function render(container) {
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
                <button class="btn-primary active" id="tab-consumption">Consumption 📈</button>
                <button class="btn-secondary" id="tab-electricity">Strom ⚡️</button>
                <button class="btn-secondary" id="tab-water">Wasser 💧</button>
                <button class="btn-secondary" id="tab-gas">Gas 💨</button>
            </div>
            <div id="view-container" style="overflow-x: auto;"></div>
        </div>
    `;

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

    const tabs = ['consumption', 'electricity', 'water', 'gas'];
    let currentTab = 'consumption';

    tabs.forEach(t => {
        const tabBtn = container.querySelector(`#tab-${t}`);
        tabBtn.addEventListener('click', () => {
            tabs.forEach(x => {
                const btn = container.querySelector(`#tab-${x}`);
                btn.classList.remove('active', 'btn-primary');
                btn.classList.add('btn-secondary');
            });
            tabBtn.classList.remove('btn-secondary');
            tabBtn.classList.add('btn-primary', 'active');

            currentTab = t;
            loadData(container, currentTab);
        });
    });

    const now = new Date();
    const endStr = now.toISOString().slice(0, 7);
    const start = new Date(now.setFullYear(now.getFullYear() - 1));
    const startStr = start.toISOString().slice(0, 7);

    container.querySelector('#filter-start').value = startStr;
    container.querySelector('#filter-end').value = endStr;

    loadData(container, 'consumption');
}

let chartInstance = null;

async function loadData(container, tab = null) {
    if (!tab) {
        if (container.querySelector('#tab-consumption').classList.contains('active')) tab = 'consumption';
        else if (container.querySelector('#tab-electricity').classList.contains('active')) tab = 'electricity';
        else if (container.querySelector('#tab-water').classList.contains('active')) tab = 'water';
        else if (container.querySelector('#tab-gas').classList.contains('active')) tab = 'gas';
    }

    const start = container.querySelector('#filter-start').value;
    const end = container.querySelector('#filter-end').value;
    const viewContainer = container.querySelector('#view-container');

    try {
        if (tab === 'consumption') {
            const [elecData, waterData, gasData] = await Promise.all([
                getElectricityReadings({ start, end }),
                getWaterReadings({ start, end }),
                getGasReadings({ start, end })
            ]);
            renderChart(viewContainer, elecData, waterData, gasData);
        } else if (tab === 'electricity') {
            const data = await getElectricityReadings({ start, end });
            renderTable(viewContainer, data, tab);
        } else if (tab === 'water') {
            const data = await getWaterReadings({ start, end });
            renderTable(viewContainer, data, tab);
        } else if (tab === 'gas') {
            const data = await getGasReadings({ start, end });
            renderTable(viewContainer, data, tab);
        }
    } catch (e) {
        viewContainer.innerHTML = `<p class="error">Error loading data: ${e.message}</p>`;
    }
}

function renderTable(container, data, type) {
    if (data.length === 0) {
        container.innerHTML = '<p>No data found for this period.</p>';
        return;
    }

    const unit = type === 'electricity' ? 'kWh' : 'm³';
    
    let html = '<table class="data-table"><thead><tr>';
    
    if (type === 'electricity') {
        html += '<th>Period</th><th>Date</th><th>Meter</th><th>Value</th>';
    } else if (type === 'water') {
        html += '<th>Period</th><th>Date</th><th>Room</th><th>Warm (m³)</th><th>Cold (m³)</th>';
    } else {
        html += '<th>Period</th><th>Date</th><th>Room</th><th>Value</th>';
    }
    
    html += '</tr></thead><tbody>';

    data.forEach(row => {
        html += '<tr>';
        html += `<td>${row.period}</td>`;
        html += `<td>${row.date || '-'}</td>`;
        
        if (type === 'electricity') {
            html += `<td>${row.meter_name || row.meter || '-'}</td>`;
            html += `<td>${row.value !== null ? row.value.toFixed(2) : '-'} ${unit}</td>`;
        } else if (type === 'water') {
            html += `<td>${row.room || row.meter || '-'}</td>`;
            html += `<td>${row.warm_value !== null ? row.warm_value.toFixed(2) : '-'}</td>`;
            html += `<td>${row.cold_value !== null ? row.cold_value.toFixed(2) : '-'}</td>`;
        } else {
            html += `<td>${row.room || row.meter || '-'}</td>`;
            html += `<td>${row.value !== null ? row.value.toFixed(2) : '-'} ${unit}</td>`;
        }
        
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderChart(container, elecData, waterData, gasData) {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const allData = [...elecData, ...waterData, ...gasData];
    
    if (allData.length === 0) {
        container.innerHTML = '<p>No data available for chart.</p>';
        return;
    }

    container.innerHTML = '<div class="chart-container"><canvas id="consumption-chart"></canvas></div>';
    const ctx = container.querySelector('#consumption-chart').getContext('2d');

    const datasets = {
        electricity: {},
        water: {},
        gas: {}
    };

    const allPeriods = new Set();

    function processData(data, type) {
        data.forEach(row => {
            if (row.period) {
                allPeriods.add(row.period);
                if (!datasets[type][row.period]) datasets[type][row.period] = 0;
                if (type === 'water') {
                    datasets[type][row.period] += (row.warm_consumption || 0) + (row.cold_consumption || 0);
                } else {
                    datasets[type][row.period] += row.consumption || 0;
                }
            }
        });
    }

    processData(elecData, 'electricity');
    processData(waterData, 'water');
    processData(gasData, 'gas');

    const sortedPeriods = Array.from(allPeriods).sort();

    const chartData = {
        labels: sortedPeriods,
        datasets: [
            {
                label: 'Electricity (kWh)',
                data: sortedPeriods.map(p => datasets.electricity[p] || 0),
                borderColor: '#f1c40f',
                backgroundColor: 'rgba(241, 196, 15, 0.2)',
                tension: 0.1
            },
            {
                label: 'Water (m³)',
                data: sortedPeriods.map(p => datasets.water[p] || 0),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.1
            },
            {
                label: 'Gas (m³)',
                data: sortedPeriods.map(p => datasets.gas[p] || 0),
                borderColor: '#e74c3c',
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
