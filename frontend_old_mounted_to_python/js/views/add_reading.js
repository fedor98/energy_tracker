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
                    <label>${m.name} (kWh)</label>
                    <input type="number" step="0.01" class="reading-input" data-type="electricity" data-meter="${m.name}" data-meter-id="${m.meter_id}" data-channel="default">
                </div>
            `).join('');
        } else if (step === 2) {
            title = 'Step 3: Water 💧';
            const waterMeters = config.water?.meters || (Array.isArray(config.water) ? config.water : []);
            content = waterMeters.map(w => `
                <div class="form-group">
                    <label>${w.room} ${w.is_warm_water ? '(Hot)' : '(Cold)'} Water (m³)</label>
                    <input type="number" step="0.001" class="reading-input" data-type="water" data-meter="${w.room}" data-meter-id="${w.meter_id}" data-channel="${w.is_warm_water ? 'warm' : 'cold'}">
                </div>
            `).join('');
        } else if (step === 3) {
            title = 'Step 4: Gas 💨';
            // config.gas.meters is list of {room, meter_id}
            content = config.gas.meters.map(m => `
                <div class="form-group">
                    <label>${m.room} Heater (m³ / units)</label>
                    <input type="number" step="0.01" class="reading-input" data-type="gas" data-meter="${m.room}" data-meter-id="${m.meter_id}" data-channel="default">
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
                            meter_id: input.dataset.meterId || null,
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
