import { initializeData } from './api.js';
import { initializeMap } from './map.js';
import { initializeUI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { airports, routes } = await initializeData();
        const map = initializeMap(airports, routes);
        initializeUI(airports, map);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        const statsDiv = document.getElementById('airport-count');
        if (statsDiv) {
            statsDiv.innerHTML = 'Error loading airport data. Please refresh the page.';
        }
    }
});
