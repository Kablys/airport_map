import { initializeData } from './api.js';
import { initializeMap } from './map.js';
import { initializeUI } from './ui.js';
import { registerServiceWorker } from './pwa.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Register service worker for PWA functionality
        await registerServiceWorker();
        
        // Initialize the application data and UI
        const { airports, routes } = await initializeData();
        const map = initializeMap(airports, routes);
        initializeUI(airports, map);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        const statsDiv = document.getElementById('airport-count');
        if (statsDiv) statsDiv.innerHTML = 'Error loading airport data. Please refresh the page.';
    }
});
