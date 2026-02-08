import { getElectricityReadings, getWaterReadings, getGasReadings, resetConfig, getElectricityCalculations, getWaterCalculations, getGasCalculations } from '../api.js';

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
                <button class="btn-secondary" id="tab-calc">Calc 🔢</button>
                <button class="btn-secondary" id="tab-electricity">Electricity ⚡️</button>
                <button class="btn-secondary" id="tab-water">Water 💧</button>
                <button class="btn-secondary" id="tab-gas">Gas 💨</button>
            </div>
            <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; cursor: pointer; white-space: nowrap; font-size: 0.875rem; min-height: 24px;">
                <input type="checkbox" id="chk-cumulated-water" checked style="cursor: pointer;">
                Cumulated Water
            </label>
            <div id="view-container" style="overflow-x: auto;"></div>
        </div>
    `;

    cumulatedWater = true;

    container.querySelector('#btn-filter').addEventListener('click', () => loadData(container));
    container.querySelector('#btn-reset-filters').addEventListener('click', () => {
        container.querySelector('#filter-start').value = '';
        container.querySelector('#filter-end').value = '';
        loadData(container);
    });

    container.querySelector('#chk-cumulated-water').addEventListener('change', (e) => {
        cumulatedWater = e.target.checked;
        loadData(container, currentTab);
    });

    container.querySelector('#btn-app-reset').addEventListener('click', async () => {
        if (confirm('Are you sure? This will backup the current database and start a fresh setup.')) {
            await resetConfig();
            location.reload();
        }
    });

    const tabs = ['consumption', 'calc', 'electricity', 'water', 'gas'];
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
let cumulatedWater = true;

async function loadData(container, tab = null) {
    if (!tab) {
        if (container.querySelector('#tab-consumption').classList.contains('active')) tab = 'consumption';
        else if (container.querySelector('#tab-calc').classList.contains('active')) tab = 'calc';
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
            renderChart(viewContainer, elecData, waterData, gasData, cumulatedWater);
        } else if (tab === 'calc') {
            const [elecCalc, waterCalc, gasCalc] = await Promise.all([
                getElectricityCalculations(),
                getWaterCalculations(),
                getGasCalculations()
            ]);
            renderCalcTables(viewContainer, elecCalc, waterCalc, gasCalc);
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
    const unit = type === 'electricity' ? 'kWh' : 'm³';
    
    const grouped = {};
    data.forEach(row => {
        const period = row.period;
        if (!grouped[period]) grouped[period] = [];
        grouped[period].push(row);
    });
    
    const sortedPeriods = Object.keys(grouped).sort().reverse();
    
    let html = '<table class="data-table"><thead><tr>';
    
    if (type === 'electricity') {
        html += '<th>Date</th><th>Meter</th><th>Value</th>';
    } else if (type === 'water') {
        html += '<th>Date</th><th>Meter</th><th>Value (m³)</th>';
    } else {
        html += '<th>Date</th><th>Room</th><th>Value</th>';
    }
    
    html += '</tr></thead><tbody>';
    
    sortedPeriods.forEach(period => {
        const rows = grouped[period];
        
        rows.sort((a, b) => {
            const keyA = (a.room || a.meter_name || a.meter || '').toLowerCase();
            const keyB = (b.room || b.meter_name || b.meter || '').toLowerCase();
            return keyA.localeCompare(keyB);
        });
        
        let firstInMonth = true;
        rows.forEach(row => {
            if (firstInMonth) {
                html += `<tr>`;
                firstInMonth = false;
            } else {
                html += '<tr>';
            }
            html += `<td>${row.date || '-'}</td>`;
            
            if (type === 'electricity') {
                html += `<td>${row.meter_name || row.meter || '-'}</td>`;
                html += `<td>${row.value !== null ? row.value.toFixed(2) : '-'} ${unit}</td>`;
            } else if (type === 'water') {
                const emoji = row.is_warm_water ? '🔴' : '🔵';
                html += `<td>${emoji} ${row.room || row.meter || '-'}</td>`;
                html += `<td>${row.value !== null ? row.value.toFixed(2) : '-'} ${unit}</td>`;
            } else {
                html += `<td>${row.room || row.meter || '-'}</td>`;
                html += `<td>${row.value !== null ? row.value.toFixed(2) : '-'} ${unit}</td>`;
            }
            
            html += '</tr>';
        });
        
        html += `<tr class="month-divider"><td colspan="3"></td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderChart(container, elecData, waterData, gasData, cumulatedWater) {
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
        water_warm: {},
        water_cold: {},
        gas: {}
    };

    const allPeriods = new Set();

    function processData(data, type) {
        data.forEach(row => {
            if (row.period) {
                if (type === 'water') {
                    if (row.total_water_consumption !== undefined) {
                        datasets[type][row.period] = (datasets[type][row.period] || 0) + (row.total_water_consumption || 0);
                        if (row.is_warm_water) {
                            datasets.water_warm[row.period] = (datasets.water_warm[row.period] || 0) + (row.total_water_consumption || 0);
                        } else {
                            datasets.water_cold[row.period] = (datasets.water_cold[row.period] || 0) + (row.total_water_consumption || 0);
                        }
                        allPeriods.add(row.period);
                    }
                } else {
                    if (row.calculation_details) {
                        datasets[type][row.period] = (datasets[type][row.period] || 0) + (row.consumption || 0);
                        allPeriods.add(row.period);
                    }
                }
            }
        });
    }

    processData(elecData, 'electricity');
    processData(waterData, 'water');
    processData(gasData, 'gas');

    const sortedPeriods = Array.from(allPeriods).sort();

    const chartDatasets = [
        {
            label: 'Electricity (kWh)',
            data: sortedPeriods.map(p => datasets.electricity[p] || 0),
            borderColor: '#f1c40f',
            backgroundColor: 'rgba(241, 196, 15, 0.2)',
            tension: 0.1
        },
        {
            label: 'Gas (m³)',
            data: sortedPeriods.map(p => datasets.gas[p] || 0),
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.2)',
            tension: 0.1
        }
    ];

    if (cumulatedWater) {
        chartDatasets.push({
            label: 'Water (m³)',
            data: sortedPeriods.map(p => datasets.water[p] || 0),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            tension: 0.1
        });
    } else {
        chartDatasets.push({
            label: 'Warm Water (m³)',
            data: sortedPeriods.map(p => datasets.water_warm[p] || 0),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            tension: 0.1
        });
        chartDatasets.push({
            label: 'Cold Water (m³)',
            data: sortedPeriods.map(p => datasets.water_cold[p] || 0),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
            tension: 0.1
        });
    }

    const chartData = {
        labels: sortedPeriods,
        datasets: chartDatasets
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

function renderCalcTables(container, elecCalc, waterCalc, gasCalc) {
    let html = '';
    
    // Helper to render a table for one energy type
    const renderTable = (title, icon, unit, calcData) => {
        if (!calcData.periods || calcData.periods.length === 0) {
            return `<div class="calc-section"><h3>${icon} ${title}</h3><p class="text-sm">No data available</p></div>`;
        }
        
        // Get all unique meter names
        const allMeters = new Set();
        calcData.periods.forEach(p => {
            p.meters.forEach(m => allMeters.add(m.entity_id));
        });
        const meterList = Array.from(allMeters).sort();
        
        let tableHtml = `<div class="calc-section"><h3>${icon} ${title}</h3>`;
        tableHtml += '<table class="data-table"><thead><tr><th>Period</th>';
        
        // Header columns: Meter + Segs for each meter
        meterList.forEach(meter => {
            let displayMeter = meter;
            // Transform water meter names: use emojis instead of text
            if (title === 'Water') {
                displayMeter = meter.replace(' (Warm)', ' 🔴').replace(' (Cold)', ' 🔵');
            }
            tableHtml += `<th>${displayMeter}</th><th class="seg-col">Segs</th>`;
        });
        
        // Total column
        tableHtml += '<th>Total</th></tr></thead><tbody>';
        
        // Rows by period
        calcData.periods.forEach(periodData => {
            tableHtml += `<tr><td>${periodData.period}</td>`;
            
            // Create a map of meter -> data for this period
            const meterMap = {};
            periodData.meters.forEach(m => {
                meterMap[m.entity_id] = m;
            });
            
            let periodTotal = 0;
            
            // Add cells for each meter (Consumption + Segs)
            meterList.forEach(meter => {
                const meterData = meterMap[meter];
                if (meterData && meterData.consumption !== null) {
                    periodTotal += meterData.consumption;
                    tableHtml += `<td>${meterData.consumption.toFixed(2)} ${unit}</td><td class="seg-col">${meterData.segments}</td>`;
                } else {
                    tableHtml += `<td>-</td><td class="seg-col">-</td>`;
                }
            });
            
            // Total column
            tableHtml += `<td><strong>${periodTotal.toFixed(2)} ${unit}</strong></td>`;
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table></div>';
        return tableHtml;
    };
    
    // Render all three tables
    html += renderTable('Electricity', '⚡️', 'kWh', elecCalc);
    html += renderTable('Water', '💧', 'm³', waterCalc);
    html += renderTable('Gas', '💨', 'm³', gasCalc);
    
    container.innerHTML = html;
}
