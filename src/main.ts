/// <reference lib="dom" />
import { initializeData } from './api.ts';
import { initializeMap } from './map.ts';
import { registerServiceWorker } from './pwa.ts';
import { initializeUI } from './ui.ts';

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  try {
    await registerServiceWorker();

    const { airports, routes } = await initializeData();
    const map = initializeMap(airports, routes);
    initializeUI(airports, map);
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const statsDiv = document.getElementById('airport-count');
    if (statsDiv) statsDiv.innerHTML = 'Error loading airport data. Please refresh the page.';
  }
});
