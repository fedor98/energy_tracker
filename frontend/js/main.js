import { getConfig } from './api.js';
import * as SetupView from './views/setup.js';
import * as DashboardView from './views/dashboard.js';
import * as AddReadingView from './views/add_reading.js';

const appContainer = document.getElementById('app-container');
const nav = document.getElementById('main-nav');
const navDashboard = document.getElementById('nav-dashboard');
const navAdd = document.getElementById('nav-add');
const navSettings = document.getElementById('nav-settings'); // Not really a view, maybe just Setup again or Reset logic?

// Simple Router
async function navigate(view) {
    appContainer.innerHTML = '<div id="loading">Loading...</div>';

    // Reset Nav
    [navDashboard, navAdd, navSettings].forEach(b => b.classList.remove('active'));

    if (view === 'setup') {
        nav.classList.add('hidden'); // Hide nav during setup
        await SetupView.render(appContainer, () => {
            // On success
            window.location.reload();
        });
    } else if (view === 'dashboard') {
        nav.classList.remove('hidden');
        navDashboard.classList.add('active');
        await DashboardView.render(appContainer);
    } else if (view === 'add') {
        nav.classList.remove('hidden');
        navAdd.classList.add('active');
        await AddReadingView.render(appContainer, () => {
            navigate('dashboard');
        });
    }
}

// Initial Load
async function init() {
    try {
        const config = await getConfig();
        if (!config || (config.gas.rooms.length === 0 && config.water.length === 0 && config.electricity.meters.length === 0)) {
            // Not setup
            navigate('setup');
        } else {
            // Setup done
            navigate('dashboard');
        }
    } catch (e) {
        appContainer.innerHTML = `<p class="error">Failed to load configuration. Is the server running? (${e.message})</p>`;
    }
}

// Event Listeners
navDashboard.addEventListener('click', () => navigate('dashboard'));
navAdd.addEventListener('click', () => navigate('add'));
navSettings.addEventListener('click', () => {
    // For now, re-use setup as a "Settings" view or just alert
    // The prompt asked for "Neuinitialisierung" which is handled in Dashboard reset.
    // Maybe Settings just shows the Config?
    // Let's just alert for now or direct to Dashboard
    alert("To reset the application, use the 'Reset App Data' button in the Dashboard.");
});

init();
