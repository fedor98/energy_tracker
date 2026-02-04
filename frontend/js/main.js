import { getConfig } from './api.js';
import * as SetupView from './views/setup.js';
import * as DashboardView from './views/dashboard.js';
import * as AddReadingView from './views/add_reading.js';

const appContainer = document.getElementById('app-container');
const nav = document.getElementById('main-nav');
const navDashboard = document.getElementById('nav-dashboard');
const navAdd = document.getElementById('nav-add');
const navSettings = document.getElementById('nav-settings'); // Not really a view, maybe just Setup again or Reset logic?

// Router
const routes = {
    '/': { view: 'dashboard', render: DashboardView.render, navId: 'nav-dashboard' },
    '/add': {
        view: 'add', render: async (container) => {
            await AddReadingView.render(container, () => navigateTo('/'));
        }, navId: 'nav-add'
    },
    '/settings': {
        view: 'settings', render: async (container) => {
            // Reuse setup for now or create distinct settings view later
            // For now, let's just show a simple message or reuse setup
            appContainer.innerHTML = '<h2>Settings</h2><p>Settings view implementation pending.</p>';
        }, navId: 'nav-settings'
    },
    '/setup': {
        view: 'setup', render: async (container) => {
            nav.classList.add('hidden');
            await SetupView.render(container, () => {
                window.location.reload();
            });
        }, navId: ''
    }
};

async function router() {
    const path = window.location.pathname;
    const route = routes[path] || routes['/'];

    // reset nav
    [navDashboard, navAdd, navSettings].forEach(b => b.classList.remove('active'));

    if (route.navId) {
        const navEl = document.getElementById(route.navId);
        if (navEl) navEl.classList.add('active');
        nav.classList.remove('hidden');
    }

    appContainer.innerHTML = '<div id="loading">Loading...</div>';

    await route.render(appContainer);
}

function navigateTo(url) {
    history.pushState(null, null, url);
    router();
}

window.addEventListener('popstate', router);

// Initial Load
async function init() {
    try {
        const config = await getConfig();
        if (!config || (config.gas.rooms.length === 0 && config.water.length === 0 && config.electricity.meters.length === 0)) {
            // Not setup
            if (window.location.pathname !== '/setup') {
                navigateTo('/setup');
            } else {
                router();
            }
        } else {
            // Setup done
            router();
        }
    } catch (e) {
        appContainer.innerHTML = `<p class="error">Failed to load configuration. Is the server running? (${e.message})</p>`;
    }
}

// Event Listeners
navDashboard.addEventListener('click', () => navigateTo('/'));
navAdd.addEventListener('click', () => navigateTo('/add'));
navSettings.addEventListener('click', () => navigateTo('/settings'));

init();
