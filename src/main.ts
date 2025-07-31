/// <reference lib="dom" />
import { initializeMap } from './map.ts';
import { registerServiceWorker } from './pwa.ts';
import { initializeUI } from './ui.ts';
import airportsData from '../data/airports.json';
import routesData from '../data/routes.json';

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
}

export interface Routes {
  [airportCode: string]: string[];
}

export const ryanairAirports: Airport[] = airportsData as Airport[];
export const ryanairRoutes: Routes = routesData as Routes;

// Log data loading for debugging
console.log(`Loaded ${ryanairAirports.length} airports from JSON`);
console.log(`Loaded routes for ${Object.keys(ryanairRoutes).length} airports from JSON`);

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await registerServiceWorker();

    const map = initializeMap(ryanairAirports, ryanairRoutes);
    initializeUI(ryanairAirports, map);
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const statsDiv = document.getElementById('airport-count');
    if (statsDiv) statsDiv.innerHTML = 'Error loading airport data. Please refresh the page.';
  }
});
