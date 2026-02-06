import { initConfig } from '../api.js';

let state = {
    electricity: { meters: ['Main Meter'] },
    water: [],
    gas: { rooms: [] }
};

let step = 0; // 0: Intro, 1: Electricity, 2: Water, 3: Gas, 4: Finish

export async function render(container, onComplete) {
    // Helper to render the current step
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
                <div style="text-align: center;">
                    <button id="btn-start" class="btn-primary" style="width: 100%;">Get Started</button>
                </div>
            `;
        } else if (step === 1) {
            title = '⚡ Electricity';
            content = `
                <p class="text-sm" style="margin-bottom: 1rem;">
                    We track a main electricity meter by default.
                </p>
                <div class="setup-list-item">
                    <span>Main Meter</span>
                    <span style="color: var(--success-color); font-size: 0.8rem;">✓ Included</span>
                </div>
            `;
        } else if (step === 2) {
            title = '💧 Water';
            content = `
                <p class="text-sm" style="margin-bottom: 1rem;">Add rooms or taps (e.g., Kitchen, Bathroom).</p>
                <div class="form-group" style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
                    <label>Add New Point</label>
                    <input type="text" id="water-room" placeholder="Room Name" style="margin-bottom: 0.5rem;">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <label style="font-weight: normal; font-size: 0.9rem;"><input type="checkbox" id="water-warm" checked> Warm</label>
                        <label style="font-weight: normal; font-size: 0.9rem;"><input type="checkbox" id="water-cold" checked> Cold</label>
                    </div>
                    <button class="btn-secondary" id="btn-add-water" style="width: 100%;">+ Add Room</button>
                </div>
                <div id="water-list" style="margin-top: 1rem;"></div>
            `;
        } else if (step === 3) {
            title = '🔥 Gas / Heating';
            content = `
                <p class="text-sm" style="margin-bottom: 1rem;">Add gas meters or radiators per room.</p>
                <div class="form-group" style="background: #f9fafb; padding: 1rem; border-radius: 0.5rem;">
                    <label>Add New Point</label>
                    <div class="flex-row">
                        <input type="text" id="gas-room" placeholder="Room Name">
                        <button class="btn-secondary" id="btn-add-gas">Add</button>
                    </div>
                </div>
                <div id="gas-list" style="margin-top: 1rem;"></div>
            `;
        }

        // Navigation Buttons (skip for Intro)
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
            <div class="card" style="${widthClass}">
                <h2 class="section-title" style="text-align: center; border-bottom: none;">${title}</h2>
                <div style="height: 4px; background: #e5e7eb; margin-bottom: 2rem; border-radius: 2px; overflow: hidden;">
                    <div style="width: ${step * 33.3}%; height: 100%; background: var(--primary-color); transition: width 0.3s ease;"></div>
                </div>
                ${content}
                ${navButtons}
            </div>
        `;

        // Bind Events
        if (step === 0) {
            container.querySelector('#btn-start').onclick = () => { step++; renderStep(); };
        } else {
            container.querySelector('#btn-prev').onclick = () => { step--; renderStep(); };
            container.querySelector('#btn-next').onclick = async () => {
                if (step === 3) {
                    await save();
                } else {
                    step++;
                    renderStep();
                }
            };
        }

        // Specific Logic
        if (step === 2) {
            renderWaterList(container);
            container.querySelector('#btn-add-water').onclick = () => {
                const room = container.querySelector('#water-room').value;
                const warm = container.querySelector('#water-warm').checked;
                const cold = container.querySelector('#water-cold').checked;
                if (room && (warm || cold)) {
                    state.water.push({ room, has_warm: warm, has_cold: cold });
                    renderStep(); // Re-render to clear inputs and update list
                }
            };
        } else if (step === 3) {
            renderGasList(container);
            container.querySelector('#btn-add-gas').onclick = () => {
                const room = container.querySelector('#gas-room').value;
                if (room) {
                    state.gas.rooms.push(room);
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
        list.innerHTML = state.water.map((w, i) => `
            <div class="setup-list-item">
                <span style="font-weight: 500;">${w.room} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.85rem;">(${w.has_warm ? 'Warm' : ''} ${w.has_cold ? 'Cold' : ''})</span></span>
                <button class="btn-danger btn-sm" data-idx="${i}">Remove</button>
            </div>
        `).join('');

        list.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                state.water.splice(btn.dataset.idx, 1);
                renderStep();
            };
        });
    }

    function renderGasList(container) {
        const list = container.querySelector('#gas-list');
        if (!list) return;
        list.innerHTML = state.gas.rooms.map((r, i) => `
            <div class="setup-list-item">
                <span style="font-weight: 500;">${r}</span>
                <button class="btn-danger btn-sm" data-idx="${i}">Remove</button>
            </div>
        `).join('');

        list.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                state.gas.rooms.splice(btn.dataset.idx, 1);
                renderStep();
            };
        });
    }

    renderStep();
}
