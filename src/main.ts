/// <reference lib="dom" />
import { initializeMap } from './map.ts';
import { registerServiceWorker } from './pwa.ts';
import { initializeUI } from './ui.ts';
import { initializeInfoPage } from './info.ts';
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

// Make map available globally for navigation
declare global {
  interface Window {
    map: any;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await registerServiceWorker();

    // Initialize based on current page
    const isInfoPage = window.location.pathname.includes('info.html');
    
    if (isInfoPage) {
      // Info page initialization
      initializeInfoPage(ryanairAirports, ryanairRoutes);
      setupInfoNavigation();
    } else {
      // Map page initialization
      const map = initializeMap(ryanairAirports, ryanairRoutes);
      window.map = map; // Make map globally available
      initializeUI(ryanairAirports, map);
      setupMapNavigation();
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const statsDiv = document.getElementById('airport-count');
    if (statsDiv) statsDiv.innerHTML = 'Error loading airport data. Please refresh the page.';
  }
});

function setupNavigation(): void {
  const mapNav = document.getElementById('nav-map');
  const infoNav = document.getElementById('nav-info');
  
  if (mapNav && infoNav) {
    mapNav.addEventListener('click', () => {
      window.switchToMapPage();
    });
    
    infoNav.addEventListener('click', () => {
      window.switchToInfoPage();
    });
  }
}
