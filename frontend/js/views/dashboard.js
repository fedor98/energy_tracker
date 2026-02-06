import { getReadings, resetConfig } from '../api.js';

let chartInstance = null;
let viewMode = 'consumption'; // 'consumption' or 'meter'

function updateToggleUI(container) {
    const toggleSwitch = container.querySelector('#view-toggle');
    const labelMeter = container.querySelector('#label-meter');
    
    if (viewMode === 'meter') {
        toggleSwitch.classList.add('active');
        labelMeter.classList.add('active');
    } else {
        toggleSwitch.classList.remove('active');
        labelMeter.classList.remove('active');
    }
}

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
            <div id="view-toggle-wrapper" style="display: none;">
                <div class="view-toggle-container">
                    <div class="toggle-switch ${viewMode === 'meter' ? 'active' : ''}" id="view-toggle">
                        <div class="toggle-slider"></div>
                    </div>
                    <span class="view-toggle-label ${viewMode === 'meter' ? 'active' : ''}" id="label-meter">Zählerstände</span>
                </div>
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
            
            // Reset view mode to consumption when switching tabs
            viewMode = 'consumption';
            updateToggleUI(container);
            
            // Show/hide toggle for water and gas only
            const toggleWrapper = container.querySelector('#view-toggle-wrapper');
            if (t === 'water' || t === 'gas') {
                toggleWrapper.style.display = 'block';
            } else {
                toggleWrapper.style.display = 'none';
            }
            
            loadData(container, currentTab);
        });
    });

    // View Toggle Click Handler
    const toggleSwitch = container.querySelector('#view-toggle');
    if (toggleSwitch) {
        toggleSwitch.addEventListener('click', () => {
            viewMode = viewMode === 'consumption' ? 'meter' : 'consumption';
            updateToggleUI(container);
            loadData(container, currentTab);
        });
    }

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
            renderGroupedTable(viewContainer, data, tab, viewMode);
        }
    } catch (e) {
        viewContainer.innerHTML = `<p class="error">Error loading data: ${e.message}</p>`;
    }
}

function renderGroupedTable(container, data, type, mode = 'consumption') {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (data.length === 0) {
        container.innerHTML = '<p>No data found for this period.</p>';
        return;
    }

    // Sort periods desc (newest first)
    const periods = [...new Set(data.map(row => row.period))].sort().reverse();

    // Header Unit
    const unit = type === 'electricity' ? 'kWh' : 'm³';

    // Check if mobile
    const isMobile = window.innerWidth <= 768;

    if (type === 'water') {
        // Water: Special grouping by room with warm/cold
        const waterGrouped = groupWaterByPeriodAndRoom(data, mode);
        if (isMobile) {
            renderWaterCards(container, waterGrouped, periods, mode);
        } else {
            renderWaterCards(container, waterGrouped, periods, mode);
        }
    } else if (type === 'gas') {
        // Gas: Standard grouping with view mode support
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

        if (isMobile) {
            renderMobileCards(container, grouped, periods, unit, type, mode);
        } else {
            renderDesktopCards(container, grouped, periods, unit, type, mode);
        }
    } else {
        // Electricity: Standard grouping (always consumption mode)
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

        if (isMobile) {
            renderMobileCards(container, grouped, periods, unit, type, 'consumption');
        } else {
            renderDesktopCards(container, grouped, periods, unit, type, 'consumption');
        }
    }
}

function groupWaterByPeriodAndRoom(data, mode = 'consumption') {
    const grouped = {};
    const sortedPeriods = [...new Set(data.map(row => row.period))].sort();
    
    data.forEach(row => {
        if (!grouped[row.period]) {
            grouped[row.period] = {
                period: row.period,
                rooms: {},
                totalWarm: 0,
                totalCold: 0,
                totalConsumption: 0,
                totalWarmValue: 0,
                totalColdValue: 0,
                totalValue: 0
            };
        }
        
        const room = row.meter || 'Unknown';
        if (!grouped[row.period].rooms[room]) {
            grouped[row.period].rooms[room] = {
                warm: { value: 0, consumption: 0, current_value: null, previous_value: null },
                cold: { value: 0, consumption: 0, current_value: null, previous_value: null }
            };
        }
        
        // Determine if warm or cold based on channel or meter name
        const isWarm = row.channel === 'warm' || 
                       (row.meter && row.meter.toLowerCase().includes('warm')) ||
                       (row.channel && row.channel.toLowerCase().includes('warm'));
        
        if (isWarm) {
            grouped[row.period].rooms[room].warm.value = row.value || 0;
            grouped[row.period].rooms[room].warm.consumption = row.consumption || 0;
            grouped[row.period].rooms[room].warm.current_value = row.warm_current_value || row.value || 0;
            grouped[row.period].rooms[room].warm.previous_value = row.warm_previous_value || 0;
            grouped[row.period].totalWarm += row.consumption || 0;
            grouped[row.period].totalWarmValue += row.value || 0;
        } else {
            grouped[row.period].rooms[room].cold.value = row.value || 0;
            grouped[row.period].rooms[room].cold.consumption = row.consumption || 0;
            grouped[row.period].rooms[room].cold.current_value = row.cold_current_value || row.value || 0;
            grouped[row.period].rooms[room].cold.previous_value = row.cold_previous_value || 0;
            grouped[row.period].totalCold += row.consumption || 0;
            grouped[row.period].totalColdValue += row.value || 0;
        }
        
        if (row.consumption !== null) {
            grouped[row.period].totalConsumption += row.consumption;
        }
        if (row.value !== null) {
            grouped[row.period].totalValue += row.value;
        }
    });
    
    // Calculate meter reading differences for meter mode
    if (mode === 'meter') {
        sortedPeriods.forEach((period, index) => {
            if (index > 0) {
                const prevPeriod = sortedPeriods[index - 1];
                const current = grouped[period];
                const previous = grouped[prevPeriod];
                
                if (current && previous) {
                    // Calculate differences for each room
                    Object.keys(current.rooms).forEach(room => {
                        const currRoom = current.rooms[room];
                        const prevRoom = previous.rooms[room];
                        
                        if (prevRoom) {
                            if (currRoom.warm.value > 0 && prevRoom.warm.value > 0) {
                                currRoom.warm.diff = currRoom.warm.value - prevRoom.warm.value;
                            }
                            if (currRoom.cold.value > 0 && prevRoom.cold.value > 0) {
                                currRoom.cold.diff = currRoom.cold.value - prevRoom.cold.value;
                            }
                        }
                    });
                    
                    // Calculate total differences
                    if (current.totalWarmValue > 0 && previous.totalWarmValue > 0) {
                        current.totalWarmDiff = current.totalWarmValue - previous.totalWarmValue;
                    }
                    if (current.totalColdValue > 0 && previous.totalColdValue > 0) {
                        current.totalColdDiff = current.totalColdValue - previous.totalColdValue;
                    }
                    if (current.totalValue > 0 && previous.totalValue > 0) {
                        current.totalDiff = current.totalValue - previous.totalValue;
                    }
                }
            }
        });
    }
    
    return grouped;
}

function renderWaterCards(container, grouped, periods, mode = 'consumption') {
    let html = '<div class="mobile-cards">';

    periods.forEach(p => {
        const group = grouped[p];
        const rooms = Object.keys(group.rooms).sort();
        
        let roomRows;
        let totalDisplay;
        
        if (mode === 'meter') {
            // Meter reading mode: show only meter readings (no consumption in brackets)
            roomRows = rooms.map(room => {
                const roomData = group.rooms[room];
                const warmVal = roomData.warm.value > 0 ? roomData.warm.value.toFixed(2) : '-';
                const coldVal = roomData.cold.value > 0 ? roomData.cold.value.toFixed(2) : '-';
                
                return `<div class="reading-item">
                    <span class="reading-label">${room}:</span>
                    <span class="reading-value">
                        <span style="color: #e74c3c;">${warmVal}</span> | 
                        <span style="color: #3498db;">${coldVal}</span>
                    </span>
                </div>`;
            }).join('');
            
            // Build mathematical formula for total with real previous values and colored brackets
            const formulaParts = [];
            rooms.forEach(room => {
                const roomData = group.rooms[room];
                if (roomData.warm.value > 0) {
                    const current = roomData.warm.current_value ? roomData.warm.current_value.toFixed(2) : roomData.warm.value.toFixed(2);
                    const previous = roomData.warm.previous_value ? roomData.warm.previous_value.toFixed(2) : '-';
                    formulaParts.push(`<span style="color: #e74c3c;">(${current} - ${previous})</span>`);
                }
                if (roomData.cold.value > 0) {
                    const current = roomData.cold.current_value ? roomData.cold.current_value.toFixed(2) : roomData.cold.value.toFixed(2);
                    const previous = roomData.cold.previous_value ? roomData.cold.previous_value.toFixed(2) : '-';
                    formulaParts.push(`<span style="color: #3498db;">(${current} - ${previous})</span>`);
                }
            });
            
            const formulaStr = formulaParts.join(' + ');
            
            totalDisplay = `
                <span class="consumption-value">
                    ${formulaStr} = ${group.totalConsumption.toFixed(2)} m³
                </span>
            `;
        } else {
            // Consumption mode: show consumption only (original behavior)
            roomRows = rooms.map(room => {
                const roomData = group.rooms[room];
                const warmStr = roomData.warm.consumption > 0 ? `<span style="color: #e74c3c;">${roomData.warm.consumption.toFixed(2)}</span>` : '<span style="color: #e74c3c;">-</span>';
                const coldStr = roomData.cold.consumption > 0 ? `<span style="color: #3498db;">${roomData.cold.consumption.toFixed(2)}</span>` : '<span style="color: #3498db;">-</span>';
                return `<div class="reading-item">
                    <span class="reading-label">${room}:</span>
                    <span class="reading-value">${warmStr} | ${coldStr}</span>
                </div>`;
            }).join('');
            
            totalDisplay = `
                <span class="consumption-value">
                    🟥 ${group.totalWarm.toFixed(2)} + 🟦 ${group.totalCold.toFixed(2)} = ${group.totalConsumption.toFixed(2)} m³
                </span>
            `;
        }

        html += `
            <div class="mobile-card" data-period="${p}">
                <div class="card-header">
                    <div class="card-title">
                        <span class="period">${p}</span>
                    </div>
                    <button class="btn-icon btn-edit" data-period="${p}" title="Edit">
                        ✏️
                    </button>
                </div>
                <div class="card-readings">
                    ${roomRows}
                </div>
                <div class="card-footer" style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;">
                    <span class="consumption-label">Total:</span>
                    ${totalDisplay}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for edit buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const period = btn.dataset.period;
            window.router.navigate(`/edit/${period}`);
        });
    });

    // Add click handler for cards
    container.querySelectorAll('.mobile-card').forEach(card => {
        card.addEventListener('click', () => {
            const period = card.dataset.period;
            window.router.navigate(`/edit/${period}`);
        });
    });
}

function renderDesktopCards(container, grouped, periods, unit, type, mode = 'consumption') {
    let html = '<div class="mobile-cards">';

    // For meter mode, we need to calculate differences
    const sortedPeriods = [...periods].sort();
    
    periods.forEach(p => {
        const group = grouped[p];

        let readingsStr;
        let totalDisplay;
        
        if (mode === 'meter' && type === 'gas') {
            // Meter reading mode for gas: show meter values
            readingsStr = group.readings.map(r => {
                const label = r.meter + (r.channel ? ` (${r.channel})` : '');
                return `<div class="reading-item">
                    <span class="reading-label">${label}:</span>
                    <span class="reading-value">${r.value !== null ? r.value.toFixed(2) : '-'} ${unit}</span>
                </div>`;
            }).join('');

            // Build mathematical formula for total with real previous values
            const formulaParts = group.readings.map(r => {
                const current = r.current_value !== null ? r.current_value.toFixed(2) : '-';
                const previous = r.previous_value !== null ? r.previous_value.toFixed(2) : '-';
                return `(${current} - ${previous})`;
            });
            const formulaStr = formulaParts.join(' + ');
            
            totalDisplay = `<span class="consumption-value">${formulaStr} = ${group.totalConsumption.toFixed(2)} ${unit}</span>`;
        } else {
            // Consumption mode: show consumption values
            readingsStr = group.readings.map(r => {
                const label = r.meter + (r.channel ? ` (${r.channel})` : '');
                const consumptionValue = r.consumption !== null ? r.consumption.toFixed(2) : '-';
                return `<div class="reading-item">
                    <span class="reading-label">${label}:</span>
                    <span class="reading-value">${consumptionValue} ${unit}</span>
                </div>`;
            }).join('');

            const consumptionStr = group.totalConsumption.toFixed(2);
            totalDisplay = `<span class="consumption-value">${consumptionStr} ${unit}</span>`;
        }

        html += `
            <div class="mobile-card" data-period="${p}">
                <div class="card-header">
                    <div class="card-title">
                        <span class="period">${p}</span>
                    </div>
                    <button class="btn-icon btn-edit" data-period="${p}" title="Edit">
                        ✏️
                    </button>
                </div>
                <div class="card-readings">
                    ${readingsStr}
                </div>
                <div class="card-footer" style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;">
                    <span class="consumption-label">Total:</span>
                    ${totalDisplay}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for edit buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const period = btn.dataset.period;
            window.router.navigate(`/edit/${period}`);
        });
    });

    // Add click handler for cards
    container.querySelectorAll('.mobile-card').forEach(card => {
        card.addEventListener('click', () => {
            const period = card.dataset.period;
            window.router.navigate(`/edit/${period}`);
        });
    });
}

function renderMobileCards(container, grouped, periods, unit, type, mode = 'consumption') {
    let html = '<div class="mobile-cards">';

    // For meter mode, we need to calculate differences
    const sortedPeriods = [...periods].sort();

    periods.forEach(p => {
        const group = grouped[p];

        // Extract date from the first reading if available
        const dateDisplay = group.readings.length > 0 && group.readings[0].date
            ? `<div class="card-date">${group.readings[0].date}</div>`
            : '';

        let readingsStr;
        let totalDisplay;
        let labelText;
        
        if (mode === 'meter' && type === 'gas') {
            // Meter reading mode for gas: show meter values
            readingsStr = group.readings.map(r => {
                const label = r.meter + (r.channel ? ` (${r.channel})` : '');
                return `<div class="reading-item">
                    <span class="reading-label">${label}:</span>
                    <span class="reading-value">${r.value !== null ? r.value.toFixed(2) : '-'}</span>
                </div>`;
            }).join('');

            // Build mathematical formula for total with real previous values
            const formulaParts = group.readings.map(r => {
                const current = r.current_value !== null ? r.current_value.toFixed(2) : '-';
                const previous = r.previous_value !== null ? r.previous_value.toFixed(2) : '-';
                return `(${current} - ${previous})`;
            });
            const formulaStr = formulaParts.join(' + ');
            
            labelText = 'Total:';
            totalDisplay = `<span class="consumption-value">${formulaStr} = ${group.totalConsumption.toFixed(2)} ${unit}</span>`;
        } else {
            // Consumption mode: show consumption values
            readingsStr = group.readings.map(r => {
                const label = r.meter + (r.channel ? ` (${r.channel})` : '');
                const consumptionValue = r.consumption !== null ? r.consumption.toFixed(2) : '-';
                return `<div class="reading-item">
                    <span class="reading-label">${label}:</span>
                    <span class="reading-value">${consumptionValue}</span>
                </div>`;
            }).join('');

            const consumptionStr = group.totalConsumption.toFixed(2);
            labelText = 'Consumption:';
            totalDisplay = `<span class="consumption-value">${consumptionStr} ${unit}</span>`;
        }

        html += `
            <div class="mobile-card" data-period="${p}">
                <div class="card-header">
                    <div class="card-title">
                        <span class="period">${p}</span>
                        ${dateDisplay}
                    </div>
                    <button class="btn-icon btn-edit" data-period="${p}" title="Edit">
                        ✏️
                    </button>
                </div>
                <div class="card-readings">
                    ${readingsStr}
                </div>
                <div class="card-footer">
                    <span class="consumption-label">${labelText}</span>
                    ${totalDisplay}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for edit buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const period = btn.dataset.period;
            window.router.navigate(`/edit/${period}`);
        });
    });

    // Add click handler for cards
    container.querySelectorAll('.mobile-card').forEach(card => {
        card.addEventListener('click', () => {
            const period = card.dataset.period;
            window.router.navigate(`/edit/${period}`);
        });
    });
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
