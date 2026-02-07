import { reorganizeDatabase } from '../api.js';

export async function render(container) {
    container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <h2 class="section-title">Settings</h2>
            
            <div style="margin-bottom: 2rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                <h3 style="margin-bottom: 0.5rem; color: #374151;">Database Maintenance</h3>
                <p style="color: #6b7280; margin-bottom: 1rem; font-size: 0.9rem;">
                    Creates a backup of your current database, then reorganizes the active database 
                    to store entries with newest dates first. This optimizes performance for recent data queries.
                </p>
                <button class="btn-secondary" id="btn-reorganize" style="width: 100%;">
                    Backup
                </button>
                <div id="reorganize-status" style="margin-top: 1rem; font-size: 0.9rem;"></div>
            </div>

            <div style="padding: 1rem; background: #fef3c7; border-radius: 0.5rem; border: 1px solid #fbbf24;">
                <h3 style="margin-bottom: 0.5rem; color: #92400e;">About</h3>
                <p style="color: #78350f; font-size: 0.9rem;">
                    Energy Consumption Tracker v1.0
                </p>
            </div>
        </div>
    `;

    const btnReorganize = container.querySelector('#btn-reorganize');
    const statusDiv = container.querySelector('#reorganize-status');

    btnReorganize.addEventListener('click', async () => {
        if (!confirm('A backup will be created first, then your current database will be reorganized with newest entries first. Continue?')) {
            return;
        }

        btnReorganize.disabled = true;
        btnReorganize.textContent = 'Creating backup & reorganizing...';
        statusDiv.innerHTML = '<span style="color: #6b7280;">Creating backup and reorganizing database...</span>';

        try {
            const result = await reorganizeDatabase();
            statusDiv.innerHTML = `
                <span style="color: #059669;">✓ ${result.message}</span>
                ${result.backup_created ? `<br><span style="color: #6b7280; font-size: 0.85rem;">Backup created: ${result.backup_created}</span>` : ''}
            `;
        } catch (error) {
            statusDiv.innerHTML = `<span style="color: #dc2626;">✗ Error: ${error.message}</span>`;
        } finally {
            btnReorganize.disabled = false;
            btnReorganize.textContent = 'Backup & Reorganize Current Database';
        }
    });
}
