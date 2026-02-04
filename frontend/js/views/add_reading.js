import { saveReadings, getConfig } from '../api.js';

export async function render(container, onComplete) {
    const config = await getConfig();
    if (!config) {
        container.innerHTML = '<p>Error: Configuration not found.</p>';
        return;
    }

    let step = 0; // 0: Date, 1: Electricity, 2: Water, 3: Gas
    let readings = [];

    const now = new Date();
    let period = now.toISOString().slice(0, 7); // Default YYYY-MM
    let date = now.toISOString().slice(0, 10); // Default YYYY-MM-DD

    function renderStep() {
        let content = '';
        let title = '';

        if (step === 0) {
            title = 'Step 1: Select Date';
            content = `
                <div class="form-group">
                    <label>Billing Period (Month)</label>
                    <input type="month" id="reading-period" value="${period}">
                    <small>The month this reading defines consumption for/ends.</small>
                </div>
                <div class="form-group">
                    <label>Measurement Date</label>
                    <input type="date" id="reading-date" value="${date}">
                </div>
            `;
        } else if (step === 1) {
            title = 'Step 2: Electricity ⚡️';
            content = config.electricity.meters.map((m, i) => `
                <div class="form-group">
                    <label>${m} (kWh)</label>
                    <input type="number" step="0.01" class="reading-input" data-type="electricity" data-meter="${m}" data-channel="default">
                </div>
            `).join('');
        } else if (step === 2) {
            title = 'Step 3: Water 💧';
            // config.water is list of {room, has_warm, has_cold}
            content = config.water.map(w => {
                let html = `<div class="section-title" style="font-size: 1rem; border:none;">${w.room}</div>`;
                if (w.has_cold) {
                    html += `
                    <div class="form-group">
                        <label>Cold Water (m³)</label>
                        <input type="number" step="0.001" class="reading-input" data-type="water" data-meter="${w.room}" data-channel="cold">
                    </div>`;
                }
                if (w.has_warm) {
                    html += `
                    <div class="form-group">
                        <label>Warm Water (m³)</label>
                        <input type="number" step="0.001" class="reading-input" data-type="water" data-meter="${w.room}" data-channel="warm">
                    </div>`;
                }
                return html;
            }).join('');
        } else if (step === 3) {
            title = 'Step 4: Gas 💨';
            // config.gas.rooms is list of rooms
            content = config.gas.rooms.map(r => `
                <div class="form-group">
                    <label>${r} Heater (m³ / units)</label>
                    <input type="number" step="0.01" class="reading-input" data-type="gas" data-meter="${r}" data-channel="default">
                </div>
            `).join('');
        }

        container.innerHTML = `
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <h2 class="section-title">${title}</h2>
                ${content}
                <div style="margin-top: 2rem; display: flex; justify-content: space-between;">
                    ${step > 0 ? '<button id="btn-back" class="btn-secondary">Back</button>' : '<div></div>'}
                    <button id="btn-next" class="btn-primary">${step === 3 ? 'Finish' : 'Next'}</button>
                </div>
            </div>
        `;

        // Bind events
        const nextBtn = container.querySelector('#btn-next');
        const backBtn = container.querySelector('#btn-back');
        const periodInput = container.querySelector('#reading-period');
        const dateInput = container.querySelector('#reading-date');

        if (periodInput) {
            periodInput.addEventListener('change', (e) => period = e.target.value);
        }
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                date = e.target.value;
                // Auto-update period if user hasn't touched it? 
                // Simple logic: just update var.
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                step--;
                renderStep();
            });
        }

        nextBtn.addEventListener('click', async () => {
            // Collect data from current step if not step 0 (Date)
            if (step > 0) {
                const inputs = container.querySelectorAll('.reading-input');
                inputs.forEach(input => {
                    const value = parseFloat(input.value);
                    if (!isNaN(value)) {
                        readings.push({
                            period: period,
                            date: date,
                            type: input.dataset.type,
                            meter: input.dataset.meter,
                            channel: input.dataset.channel,
                            value: value
                        });
                    }
                });
            }

            if (step === 3) {
                // Submit
                try {
                    await saveReadings(readings);
                    alert('Readings saved successfully!');
                    onComplete();
                } catch (e) {
                    alert('Error saving readings: ' + e.message);
                }
            } else {
                step++;
                renderStep();
            }
        });
    }

    renderStep();
}
