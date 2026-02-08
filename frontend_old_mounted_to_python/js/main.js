import { getConfig } from './api.js';
import * as SetupView from './views/setup.js';
import * as DashboardView from './views/dashboard.js';
import * as AddReadingView from './views/add_reading.js';
import * as SettingsView from './views/settings.js';

const appContainer = document.getElementById('app-container');
const nav = document.getElementById('main-nav');
const navDashboard = document.getElementById('nav-dashboard');
const navAdd = document.getElementById('nav-add');
const navSettings = document.getElementById('nav-settings');

// Router with parameter support
const routes = [
    { 
        path: '/', 
        view: 'dashboard', 
        render: DashboardView.render, 
        navId: 'nav-dashboard' 
    },
    { 
        path: '/add', 
        view: 'add', 
        render: async (container) => {
            await AddReadingView.render(container, () => navigateTo('/'));
        }, 
        navId: 'nav-add' 
    },
    { 
        path: '/settings', 
        view: 'settings', 
        render: SettingsView.render, 
        navId: 'nav-settings' 
    },
    { 
        path: '/setup', 
        view: 'setup', 
        render: async (container) => {
            nav.classList.add('hidden');
            await SetupView.render(container, () => {
                window.location.reload();
            });
        }, 
        navId: '' 
    },
    {
        path: '/edit/:period',
        view: 'edit',
        render: async (container, params) => {
            nav.classList.remove('hidden');
            navDashboard.classList.add('active');
            const EditView = await import('./views/edit_reading.js');
            await EditView.render(container, params);
        },
        navId: ''
    }
];

function matchRoute(path) {
    for (const route of routes) {
        // Check for exact match first
        if (route.path === path) {
            return { route, params: {} };
        }
        
        // Check for parameterized route
        if (route.path.includes(':')) {
            const routeParts = route.path.split('/');
            const pathParts = path.split('/');
            
            if (routeParts.length === pathParts.length) {
                const params = {};
                let match = true;
                
                for (let i = 0; i < routeParts.length; i++) {
                    if (routeParts[i].startsWith(':')) {
                        const paramName = routeParts[i].substring(1);
                        params[paramName] = decodeURIComponent(pathParts[i]);
                    } else if (routeParts[i] !== pathParts[i]) {
                        match = false;
                        break;
                    }
                }
                
                if (match) {
                    return { route, params };
                }
            }
        }
    }
    
    // Return default route
    return { route: routes[0], params: {} };
}

async function router() {
    const path = window.location.pathname;
    const { route, params } = matchRoute(path);

    // reset nav
    [navDashboard, navAdd, navSettings].forEach(b => b.classList.remove('active'));

    if (route.navId) {
        const navEl = document.getElementById(route.navId);
        if (navEl) navEl.classList.add('active');
        nav.classList.remove('hidden');
    } else if (route.view !== 'setup') {
        // For edit page, show nav but don't highlight anything
        nav.classList.remove('hidden');
    }

    appContainer.innerHTML = '<div id="loading">Loading...</div>';

    await route.render(appContainer, params);
}

function navigateTo(url) {
    history.pushState(null, null, url);
    router();
}

// Expose router globally for use in views
window.router = { navigate: navigateTo };

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
