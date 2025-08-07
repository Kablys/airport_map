/// <reference lib="dom" />
/// <reference types="leaflet" />

// Since we're using Leaflet from CDN, declare it as global
declare const L: typeof import('leaflet');

import airportsData from '../../data/airports.json';
import routesData from '../../data/routes.json';
import { initializeInfoPage } from './info.ts';
import { initializeMap } from './map.ts';

import { initializeUI } from './ui.ts';

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
    map: L.Map;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize based on current page
    const isInfoPage = window.location.pathname.includes('info.html');

    // Always initialize navigation
    setupNavigation();

    if (isInfoPage) {
      // Info page initialization
      initializeInfoPage(ryanairAirports, ryanairRoutes);
      const infoPage = document.getElementById('info-page');
      if (infoPage) {
        infoPage.setAttribute('data-initialized', 'true');
      }
    } else {
      // Map page initialization
      const map = initializeMap(ryanairAirports, ryanairRoutes);
      window.map = map; // Make map globally available
      initializeUI(ryanairAirports, map);
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
      switchToMapPage();
    });

    infoNav.addEventListener('click', () => {
      switchToInfoPage();
    });
  }
}

function switchToMapPage(): void {
  const mapPage = document.getElementById('map-page');
  const infoPage = document.getElementById('info-page');
  const mapNav = document.getElementById('nav-map');
  const infoNav = document.getElementById('nav-info');

  if (mapPage && infoPage && mapNav && infoNav) {
    mapPage.classList.add('active');
    infoPage.classList.remove('active');
    mapNav.classList.add('active');
    infoNav.classList.remove('active');

    // Trigger map resize after switching
    setTimeout(() => {
      if (window.map?.invalidateSize) {
        window.map.invalidateSize();
      }
    }, 100);
  }
}

function switchToInfoPage(): void {
  const mapPage = document.getElementById('map-page');
  const infoPage = document.getElementById('info-page');
  const mapNav = document.getElementById('nav-map');
  const infoNav = document.getElementById('nav-info');

  if (mapPage && infoPage && mapNav && infoNav) {
    mapPage.classList.remove('active');
    infoPage.classList.add('active');
    mapNav.classList.remove('active');
    infoNav.classList.add('active');

    // Initialize info page if not already done
    if (!infoPage.hasAttribute('data-initialized')) {
      initializeInfoPage(ryanairAirports, ryanairRoutes);
      infoPage.setAttribute('data-initialized', 'true');
    }
  }
}

// Make functions available globally
declare global {
  interface Window {
    switchToInfoPage: () => void;
    switchToMapPage: () => void;
  }
}

window.switchToInfoPage = switchToInfoPage;
window.switchToMapPage = switchToMapPage;
