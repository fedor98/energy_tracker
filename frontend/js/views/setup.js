import { initConfig, generateMeterUUID } from '../api.js';

let state = {
    use_custom_meter_ids: false,
    electricity: { meters: [{ name: 'Main Meter', meter_id: null }] },
    water: { meters: [] },
    gas: { meters: [] },
    isWarmWater: false
};

let step = 0; // 0: Intro, 1: Electricity, 2: Water, 3: Gas, 4: Finish

export async function render(container, onComplete) {
    function renderStep() {
        let content = '';
        let title = '';
        let widthClass = 'max-width: 600px; margin: 0 auto;';

        if (step === 0) {
            title = 'Welcome!';
            content = `
                <p style="margin-bottom: 1.5rem; color: #4b5563;">
                    Let's set up your energy tracker. We will configure your Electricity, Water, and Gas meters in a few simple steps.
                </p>
                <div style="background: #f9fafb; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600; color: #111827;">Use custom meter numbers</span>
                        <div class="toggle-switch ${state.use_custom_meter_ids ? 'active' : ''}" id="toggle-meter-ids">
                            <div class="toggle-slider"></div>
                        </div>
                    </div>
                    <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem;">
                        ${state.use_custom_meter_ids 
                            ? 'You will be able to enter custom meter numbers for each device.' 
                            : 'Automatically generated IDs will be assigned to each meter.'}
                    </p>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="text" 
                            id="meter-id-preview" 
                            value="${generateMeterUUID()}" 
                            disabled
                            style="background: #e5e7eb; color: #6b7280; cursor: not-allowed; font-family: monospace; font-size: 0.85rem; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; width: 120px; text-align: center;">
                        <span style="font-size: 0.8rem; color: #9ca3af;">Example ID (auto-generated)</span>
                    </div>
                </div>
                <div style="text-align: center;">
                    <button id="btn-start" class="btn-primary" style="width: 100%;">Get Started</button>
                </div>
            `;
        } else if (step === 1) {
            title = '⚡ Electricity';
            content = `
                <p class="text-sm" style="margin-bottom: 1rem;">
                    ${state.use_custom_meter_ids 
                        ? 'Configure your electricity meters with custom numbers.' 
                        : 'Configure your electricity meters. Each meter gets an automatic ID.'}
                </p>
                <div class="setup-list-item" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-weight: 500;">Meter Name</span>
                        ${state.use_custom_meter_ids ? '<span style="font-size: 0.8rem; color: #6b7280;">Meter ID</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem; width: 100%;">
                        <input type="text" id="elec-name" value="${state.electricity.meters[0]?.name || ''}" placeholder="Meter Name" style="flex: 1;">
                        ${state.use_custom_meter_ids ? `
                            <input type="text" id="elec-id" value="${state.electricity.meters[0]?.meter_id || ''}" placeholder="ID (optional)" style="width: 120px;">
                        ` : ''}
                    </div>
                    ${!state.use_custom_meter_ids && state.electricity.meters[0]?.meter_id ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; width: 100%;">
                            <input type="text" value="${state.electricity.meters[0].meter_id}" disabled style="background: #f3f4f6; color: #6b7280; cursor: not-allowed; font-family: monospace; font-size: 0.8rem; padding: 0.4rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; flex: 1;">
                            <span style="font-size: 0.75rem; color: #9ca3af;">Auto-generated</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (step === 2) {
            title = '💧 Water';
            content = `
                <p class="text-sm" style="margin-bottom: 1rem;">Add separate water meters for warm and cold water.</p>
                <div class="form-group" style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
                    <label>Add New Meter</label>
                    <input type="text" id="water-room" placeholder="Room Name (e.g., Kitchen)" style="margin-bottom: 0.5rem;">
                    <div style="margin-bottom: 0.75rem;">
                        <div class="ios-toggle water-toggle" id="water-toggle" style="cursor: pointer;">
                            <span class="toggle-label ${!state.isWarmWater ? 'active bold' : 'faded'}" data-value="cold">Cold</span>
                            <div class="toggle-switch ${state.isWarmWater ? 'active' : ''}">
                                <div class="toggle-slider"></div>
                            </div>
                            <span class="toggle-label ${state.isWarmWater ? 'active bold' : 'faded'}" data-value="hot">Hot</span>
                        </div>
                    </div>
                    ${state.use_custom_meter_ids ? `
                        <input type="text" id="water-id" placeholder="Meter ID (optional)" style="margin-bottom: 0.5rem;">
                    ` : ''}
                    <button class="btn-secondary" id="btn-add-water" style="width: 100%;">+ Add Meter</button>
                </div>
                <div id="water-list" style="margin-top: 1rem;"></div>
            `;
        } else if (step === 3) {
            title = '🔥 Gas / Heating';
            content = `
                <p class="text-sm" style="margin-bottom: 1rem;">Add gas meters per room.</p>
                <div class="form-group" style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
                    <label>Add New Meter</label>
                    <input type="text" id="gas-room" placeholder="Room Name (e.g., Living Room)" style="margin-bottom: 0.5rem;">
                    ${state.use_custom_meter_ids ? `
                        <input type="text" id="gas-id" placeholder="Meter ID (optional)" style="margin-bottom: 0.5rem;">
                    ` : ''}
                    <button class="btn-secondary" id="btn-add-gas" style="width: 100%;">+ Add Meter</button>
                </div>
                <div id="gas-list" style="margin-top: 1rem;"></div>
            `;
        }

        let navButtons = '';
        if (step > 0) {
            navButtons = `
                <div style="margin-top: 2rem; display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                    <button id="btn-prev" class="btn-secondary">Back</button>
                    <button id="btn-next" class="btn-primary">${step === 3 ? 'Finish Setup' : 'Next'}</button>
                </div>
            `;
        }

        container.innerHTML = `
            <style>
                .ios-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 0.5rem;
                    background: #f3f4f6;
                    border-radius: 2rem;
                }
                .toggle-label {
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                    min-width: 3rem;
                    text-align: center;
                }
                .toggle-label.active.bold {
                    font-weight: 700;
                    opacity: 1;
                }
                .toggle-label.faded {
                    opacity: 0.4;
                }
                .toggle-switch {
                    width: 2.75rem;
                    height: 1.5rem;
                    background: #d1d5db;
                    border-radius: 1.5rem;
                    position: relative;
                    transition: background 0.2s ease;
                    cursor: pointer;
                }
                .toggle-switch.active {
                    background: #22c55e;
                }
                .water-toggle .toggle-switch {
                    background: #3b82f6;
                }
                .water-toggle .toggle-switch.active {
                    background: #ef4444;
                }
                .toggle-slider {
                    width: 1.25rem;
                    height: 1.25rem;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 0.125rem;
                    left: 0.125rem;
                    transition: transform 0.2s ease;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                .toggle-switch.active .toggle-slider {
                    transform: translateX(1.25rem);
                }
            </style>
            <div class="card" style="${widthClass}">
                <h2 class="section-title" style="text-align: center; border-bottom: none;">${title}</h2>
                <div style="height: 4px; background: #e5e7eb; margin-bottom: 2rem; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${step * 33.3}%; height: 100%; background: var(--primary-color); transition: width 0.3s ease;"></div>
                </div>
                ${content}
                ${navButtons}
            </div>
        `;

        if (step === 0) {
            const toggle = container.querySelector('#toggle-meter-ids');
            toggle.onclick = () => {
                state.use_custom_meter_ids = !state.use_custom_meter_ids;
                renderStep();
            };
            container.querySelector('#btn-start').onclick = () => {
                step++;
                renderStep();
            };
        } else {
            container.querySelector('#btn-prev').onclick = () => {
                step--;
                renderStep();
            };
            container.querySelector('#btn-next').onclick = async () => {
                if (step === 1) {
                    const name = container.querySelector('#elec-name').value;
                    const meterId = state.use_custom_meter_ids 
                        ? (container.querySelector('#elec-id').value || generateMeterUUID())
                        : generateMeterUUID();
                    state.electricity.meters = [{ name, meter_id: meterId }];
                }
                if (step === 3) {
                    await save();
                } else {
                    step++;
                    renderStep();
                }
            };
        }

        if (step === 1) {
            const idInput = container.querySelector('#elec-id');
            if (idInput) {
                idInput.onchange = () => {
                    if (!idInput.value) {
                        idInput.value = generateMeterUUID();
                    }
                };
            }
        } else if (step === 2) {
            renderWaterList(container);
            renderWaterToggle(container);
            container.querySelector('#btn-add-water').onclick = () => {
                const room = container.querySelector('#water-room').value;
                const meterId = state.use_custom_meter_ids
                    ? (container.querySelector('#water-id')?.value || generateMeterUUID())
                    : generateMeterUUID();
                if (room) {
                    state.water.meters.push({ room, is_warm_water: state.isWarmWater, meter_id: meterId });
                    renderStep();
                }
            };
        } else if (step === 3) {
            renderGasList(container);
            container.querySelector('#btn-add-gas').onclick = () => {
                const room = container.querySelector('#gas-room').value;
                const meterId = state.use_custom_meter_ids
                    ? (container.querySelector('#gas-id')?.value || generateMeterUUID())
                    : generateMeterUUID();
                if (room) {
                    state.gas.meters.push({ room, meter_id: meterId });
                    renderStep();
                }
            };
        }
    }

    async function save() {
        try {
            await initConfig(state);
            alert('Setup successfully completed!');
            window.router.navigate('/');
        } catch (e) {
            alert('Error saving setup: ' + e.message);
        }
    }

    function renderWaterList(container) {
        const list = container.querySelector('#water-list');
        if (!list) return;
        list.innerHTML = state.water.meters.map((w, i) => `
            <div class="setup-list-item">
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-weight: 500;">${w.room} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.85rem;">(${w.is_warm_water ? 'Hot' : 'Cold'} Water)</span></span>
                    ${w.meter_id ? `<span style="font-family: monospace; font-size: 0.75rem; color: #6b7280;">ID: ${w.meter_id}</span>` : ''}
                </div>
                <button class="btn-danger btn-sm" data-idx="${i}">Remove</button>
            </div>
        `).join('');

        list.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                state.water.meters.splice(btn.dataset.idx, 1);
                renderStep();
            };
        });
    }

    function renderWaterToggle(container) {
        const toggle = container.querySelector('#water-toggle');
        if (!toggle) return;
        
        const switchEl = toggle.querySelector('.toggle-switch');
        const labels = toggle.querySelectorAll('.toggle-label');
        const coldLabel = labels[0];
        const hotLabel = labels[1];
        
        function updateVisualState() {
            if (state.isWarmWater) {
                switchEl.classList.add('active');
                coldLabel.classList.remove('active', 'bold');
                coldLabel.classList.add('faded');
                hotLabel.classList.add('active', 'bold');
                hotLabel.classList.remove('faded');
            } else {
                switchEl.classList.remove('active');
                coldLabel.classList.add('active', 'bold');
                coldLabel.classList.remove('faded');
                hotLabel.classList.remove('active', 'bold');
                hotLabel.classList.add('faded');
            }
        }
        
        updateVisualState();
        
        toggle.onclick = () => {
            state.isWarmWater = !state.isWarmWater;
            updateVisualState();
        };
    }

    function renderGasList(container) {
        const list = container.querySelector('#gas-list');
        if (!list) return;
        list.innerHTML = state.gas.meters.map((m, i) => `
            <div class="setup-list-item">
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-weight: 500;">${m.room}</span>
                    ${m.meter_id ? `<span style="font-family: monospace; font-size: 0.75rem; color: #6b7280;">ID: ${m.meter_id}</span>` : ''}
                </div>
                <button class="btn-danger btn-sm" data-idx="${i}">Remove</button>
            </div>
        `).join('');

        list.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                state.gas.meters.splice(btn.dataset.idx, 1);
                renderStep();
            };
        });
    }

    renderStep();
}
