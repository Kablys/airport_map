import { initializeData } from './api.js';
import { initializeMap } from './map.js';
import { initializeUI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { airports, routes } = await initializeData();
        initializeUI(airports, initializeMap(airports, routes));
    } catch (error) {
        console.error('Failed to initialize application:', error);
        const statsDiv = document.getElementById('airport-count');
        if (statsDiv) statsDiv.innerHTML = 'Error loading airport data. Please refresh the page.';
    }
});
