import { getMonthlyReadings, updateElectricityReading, updateWaterReading, updateGasReading, deleteElectricityReading, deleteWaterReading, deleteGasReading } from '../api.js';

export async function render(container, params) {
    const { period } = params;
    
    container.innerHTML = `
        <div class="edit-page">
            <header class="edit-header">
                <button class="btn-back" id="btn-back">← Back</button>
                <h1>Edit Readings: ${period}</h1>
            </header>
            
            <div class="edit-loading" id="loading">
                <div class="spinner"></div>
                <p>Loading readings...</p>
            </div>
            
            <div class="edit-content" id="edit-content" style="display: none;">
                <div class="edit-accordion">
                    <!-- Electricity Section -->
                    <div class="accordion-item" id="accordion-electricity">
                        <button class="accordion-header" data-section="electricity">
                            <div class="accordion-title">
                                <span class="icon">⚡</span>
                                <span>Electricity</span>
                            </div>
                            <span class="accordion-icon">▼</span>
                        </button>
                        <div class="accordion-content" id="section-electricity">
                            <div id="electricity-forms"></div>
                        </div>
                    </div>
                    
                    <!-- Water Section -->
                    <div class="accordion-item" id="accordion-water">
                        <button class="accordion-header" data-section="water">
                            <div class="accordion-title">
                                <span class="icon">💧</span>
                                <span>Water</span>
                            </div>
                            <span class="accordion-icon">▼</span>
                        </button>
                        <div class="accordion-content" id="section-water">
                            <div id="water-forms"></div>
                        </div>
                    </div>
                    
                    <!-- Gas Section -->
                    <div class="accordion-item" id="accordion-gas">
                        <button class="accordion-header" data-section="gas">
                            <div class="accordion-title">
                                <span class="icon">🔥</span>
                                <span>Gas</span>
                            </div>
                            <span class="accordion-icon">▼</span>
                        </button>
                        <div class="accordion-content" id="section-gas">
                            <div id="gas-forms"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="edit-actions" id="edit-actions" style="display: none;">
                <button class="btn-danger" id="btn-delete-period">Delete Period</button>
                <div style="flex-grow: 1;"></div>
                <button class="btn-secondary" id="btn-cancel">Cancel</button>
                <button class="btn-primary btn-save-all" id="btn-save-all">
                    Save All Changes
                </button>
            </div>
        </div>
    `;

    // Load data
    let readingsData = null;
    let hasChanges = false;
    
    try {
        readingsData = await getMonthlyReadings(period);
        container.querySelector('#loading').style.display = 'none';
        container.querySelector('#edit-content').style.display = 'block';
        container.querySelector('#edit-actions').style.display = 'flex';
        
        renderForms(container, readingsData);
        setupAccordion(container);
        setupEventListeners(container, readingsData);
    } catch (e) {
        container.querySelector('#loading').innerHTML = `
            <p class="error">Error loading readings: ${e.message}</p>
            <button class="btn-secondary" id="btn-retry">Retry</button>
        `;
        container.querySelector('#btn-retry').addEventListener('click', () => {
            render(container, params);
        });
    }

    function renderForms(container, data) {
        // Render Electricity Forms
        const electricityContainer = container.querySelector('#electricity-forms');
        if (data.electricity && data.electricity.length > 0) {
            electricityContainer.innerHTML = data.electricity.map(r => `
                <div class="form-section" data-id="${r.id}" data-type="electricity">
                    <h4>${r.meter_name}</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Reading Date</label>
                            <input type="date" class="input-date" value="${r.date || ''}" data-field="date">
                        </div>
                        <div class="form-group">
                            <label>Value (kWh)</label>
                            <input type="number" step="0.01" class="input-value" value="${r.value}" data-field="value" required>
                        </div>
                    </div>
                    ${r.consumption !== null ? `
                        <div class="consumption-info">
                            <span class="consumption-label">Consumption:</span>
                            <span class="consumption-value">${r.consumption.toFixed(2)} kWh</span>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } else {
            electricityContainer.innerHTML = '<p class="no-data">No electricity readings for this period.</p>';
        }

        // Render Water Forms
        const waterContainer = container.querySelector('#water-forms');
        if (data.water && data.water.length > 0) {
            waterContainer.innerHTML = data.water.map(r => `
                <div class="form-section" data-id="${r.id}" data-type="water">
                    <h4>${r.room}</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Reading Date</label>
                            <input type="date" class="input-date" value="${r.date || ''}" data-field="date">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Warm Water (m³)</label>
                            <input type="number" step="0.01" class="input-warm" value="${r.warm_value || ''}" data-field="warm_value" placeholder="No data">
                        </div>
                        <div class="form-group">
                            <label>Cold Water (m³)</label>
                            <input type="number" step="0.01" class="input-cold" value="${r.cold_value || ''}" data-field="cold_value" placeholder="No data">
                        </div>
                    </div>
                    <div class="consumption-row">
                        ${r.warm_consumption !== null ? `
                            <div class="consumption-info">
                                <span class="consumption-label">Warm:</span>
                                <span class="consumption-value">${r.warm_consumption.toFixed(2)} m³</span>
                            </div>
                        ` : ''}
                        ${r.cold_consumption !== null ? `
                            <div class="consumption-info">
                                <span class="consumption-label">Cold:</span>
                                <span class="consumption-value">${r.cold_consumption.toFixed(2)} m³</span>
                            </div>
                        ` : ''}
                        ${r.total_consumption !== null ? `
                            <div class="consumption-info total">
                                <span class="consumption-label">Total:</span>
                                <span class="consumption-value">${r.total_consumption.toFixed(2)} m³</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            waterContainer.innerHTML = '<p class="no-data">No water readings for this period.</p>';
        }

        // Render Gas Forms
        const gasContainer = container.querySelector('#gas-forms');
        if (data.gas && data.gas.length > 0) {
            gasContainer.innerHTML = data.gas.map(r => `
                <div class="form-section" data-id="${r.id}" data-type="gas">
                    <h4>${r.room}</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Reading Date</label>
                            <input type="date" class="input-date" value="${r.date || ''}" data-field="date">
                        </div>
                        <div class="form-group">
                            <label>Value (m³)</label>
                            <input type="number" step="0.01" class="input-value" value="${r.value}" data-field="value" required>
                        </div>
                    </div>
                    ${r.consumption !== null ? `
                        <div class="consumption-info">
                            <span class="consumption-label">Consumption:</span>
                            <span class="consumption-value">${r.consumption.toFixed(2)} m³</span>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } else {
            gasContainer.innerHTML = '<p class="no-data">No gas readings for this period.</p>';
        }

        // Mark all sections as changed when inputs change
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                hasChanges = true;
                input.closest('.form-section').classList.add('modified');
            });
        });
    }

    function setupAccordion(container) {
        const headers = container.querySelectorAll('.accordion-header');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.dataset.section;
                const content = container.querySelector(`#section-${section}`);
                const item = header.closest('.accordion-item');
                const icon = header.querySelector('.accordion-icon');
                
                // Toggle active state
                const isActive = item.classList.contains('active');
                
                // Close all
                container.querySelectorAll('.accordion-item').forEach(i => {
                    i.classList.remove('active');
                    i.querySelector('.accordion-icon').textContent = '▼';
                });
                
                // Open clicked if it was closed
                if (!isActive) {
                    item.classList.add('active');
                    icon.textContent = '▲';
                }
            });
        });

        // Open first section by default
        const firstSection = container.querySelector('.accordion-item');
        if (firstSection) {
            firstSection.classList.add('active');
            firstSection.querySelector('.accordion-icon').textContent = '▲';
        }
    }

    function setupEventListeners(container, data) {
        // Back button
        container.querySelector('#btn-back').addEventListener('click', () => {
            if (hasChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    window.router.navigate('/');
                }
            } else {
                window.router.navigate('/');
            }
        });

        // Cancel button
        container.querySelector('#btn-cancel').addEventListener('click', () => {
            if (hasChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                    window.router.navigate('/');
                }
            } else {
                window.router.navigate('/');
            }
        });

        // Delete period button
        container.querySelector('#btn-delete-period').addEventListener('click', async () => {
            if (!confirm(`Are you sure you want to delete all readings for ${period}? This action cannot be undone.`)) {
                return;
            }

            const btn = container.querySelector('#btn-delete-period');
            const originalText = btn.textContent;

            try {
                btn.disabled = true;
                btn.textContent = 'Deleting...';

                // Delete all readings for this period
                const deletePromises = [];

                // Delete electricity readings
                if (readingsData.electricity) {
                    readingsData.electricity.forEach(r => {
                        deletePromises.push(deleteElectricityReading(r.id));
                    });
                }

                // Delete water readings
                if (readingsData.water) {
                    readingsData.water.forEach(r => {
                        deletePromises.push(deleteWaterReading(r.id));
                    });
                }

                // Delete gas readings
                if (readingsData.gas) {
                    readingsData.gas.forEach(r => {
                        deletePromises.push(deleteGasReading(r.id));
                    });
                }

                await Promise.all(deletePromises);

                btn.textContent = 'Deleted!';
                setTimeout(() => {
                    window.router.navigate('/');
                }, 1000);

            } catch (e) {
                btn.textContent = 'Error!';
                alert(`Failed to delete: ${e.message}`);
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            }
        });

        // Save all button
        container.querySelector('#btn-save-all').addEventListener('click', async () => {
            const btn = container.querySelector('#btn-save-all');
            const originalText = btn.textContent;
            
            try {
                btn.disabled = true;
                btn.textContent = 'Saving...';
                
                // Collect all modified readings
                const updates = [];
                
                // Electricity updates
                container.querySelectorAll('[data-type="electricity"].modified').forEach(section => {
                    const id = parseInt(section.dataset.id);
                    const reading = data.electricity.find(r => r.id === id);
                    if (reading) {
                        updates.push({
                            type: 'electricity',
                            id: id,
                            data: {
                                period: period,
                                date: section.querySelector('.input-date').value || null,
                                meter_name: reading.meter_name,
                                value: parseFloat(section.querySelector('.input-value').value)
                            }
                        });
                    }
                });
                
                // Water updates
                container.querySelectorAll('[data-type="water"].modified').forEach(section => {
                    const id = parseInt(section.dataset.id);
                    const reading = data.water.find(r => r.id === id);
                    if (reading) {
                        const warmInput = section.querySelector('.input-warm');
                        const coldInput = section.querySelector('.input-cold');
                        
                        updates.push({
                            type: 'water',
                            id: id,
                            data: {
                                period: period,
                                date: section.querySelector('.input-date').value || null,
                                room: reading.room,
                                warm_value: warmInput.value ? parseFloat(warmInput.value) : null,
                                cold_value: coldInput.value ? parseFloat(coldInput.value) : null
                            }
                        });
                    }
                });
                
                // Gas updates
                container.querySelectorAll('[data-type="gas"].modified').forEach(section => {
                    const id = parseInt(section.dataset.id);
                    const reading = data.gas.find(r => r.id === id);
                    if (reading) {
                        updates.push({
                            type: 'gas',
                            id: id,
                            data: {
                                period: period,
                                date: section.querySelector('.input-date').value || null,
                                room: reading.room,
                                value: parseFloat(section.querySelector('.input-value').value)
                            }
                        });
                    }
                });
                
                // Execute updates
                for (const update of updates) {
                    if (update.type === 'electricity') {
                        await updateElectricityReading(update.id, update.data);
                    } else if (update.type === 'water') {
                        await updateWaterReading(update.id, update.data);
                    } else if (update.type === 'gas') {
                        await updateGasReading(update.id, update.data);
                    }
                }
                
                hasChanges = false;
                btn.textContent = 'Saved!';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
                
                // Refresh data to show updated consumption
                render(container, params);
                
            } catch (e) {
                btn.textContent = 'Error!';
                alert(`Failed to save: ${e.message}`);
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 1500);
            }
        });
    }
}
