/// <reference lib="dom" />
/// <reference types="leaflet" />

// Since we're using Leaflet from CDN, declare it as global
declare const L: typeof import('leaflet');

import React from 'react';
import { createRoot } from 'react-dom/client';
import airportsData from '../../data/airports.json';
import routesData from '../../data/routes.json';
import { InfoPage } from './components/InfoPage.tsx';
import { initializeMap } from './map.ts';
import { CompleteMapUI } from './components/CompleteMapUI.tsx';
import { AppProvider } from './state/AppContext.tsx';

import type { Airport, Routes } from './types.ts';

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

let infoPageRoot: any = null;


function initializeReactMap(map: L.Map): void {
  const uiContainer = document.getElementById('react-ui-container');
  if (!uiContainer) {
    console.error('UI container not found!');
    return;
  }

  const root = createRoot(uiContainer);
  root.render(
    React.createElement(AppProvider, null,
      React.createElement(CompleteMapUI, {
        airports: ryanairAirports,
        map: map,
        itinerary: [],
        onTileChange: () => {},
        onClearItinerary: () => {},
        onSegmentHover: () => {},
        onSegmentClick: () => {},
      })
    )
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize based on current page
    const isInfoPage = window.location.pathname.includes('info.html');

    // Always initialize navigation
    setupNavigation();

    if (isInfoPage) {
      // Info page initialization with React
      initializeReactInfoPage();
      const infoPage = document.getElementById('info-page');
      if (infoPage) {
        infoPage.setAttribute('data-initialized', 'true');
      }
    } else {
      // Map page initialization
      const map = initializeMap(ryanairAirports, ryanairRoutes);
      window.map = map; // Make map globally available
      initializeReactMap(map);

      // Handle URL parameters for airport navigation
      handleURLParameters(map);
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

    // Initialize React info page if not already done
    if (!infoPage.hasAttribute('data-initialized')) {
      initializeReactInfoPage();
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

function initializeReactInfoPage(): void {
  const infoContainer = document.getElementById('info-page-container');
  if (!infoContainer) {
    console.error('Info page container not found!');
    return;
  }

  // Initialize React root if not already done
  if (!infoPageRoot) {
    infoPageRoot = createRoot(infoContainer);
  }

  // Handle airport click from info page
  const handleAirportClick = (airport: Airport) => {
    // Switch to map page without page reload
    if (window.switchToMapPage) {
      window.switchToMapPage();

      // Wait for map to be ready, then zoom to airport
      setTimeout(() => {
        if (window.map && window.map.flyTo) {
          window.map.flyTo([airport.lat, airport.lng], 10);
        }
      }, 100);
    }
  };

  // Render React component
  infoPageRoot.render(
    React.createElement(InfoPage, {
      airports: ryanairAirports,
      routes: ryanairRoutes,
      onAirportClick: handleAirportClick,
    })
  );
}

function handleURLParameters(map: L.Map): void {
  const urlParams = new URLSearchParams(window.location.search);
  const lat = urlParams.get('lat');
  const lng = urlParams.get('lng');
  const airportCode = urlParams.get('airport');

  if (lat && lng) {
    // Zoom to the specified coordinates
    setTimeout(() => {
      map.flyTo([parseFloat(lat), parseFloat(lng)], 10);

      // If airport code is provided, try to select that airport
      if (airportCode) {
        // Find the airport and simulate a click on it
        const airport = ryanairAirports.find((a) => a.code === airportCode);
        if (airport) {
          // This would trigger the airport selection logic
          console.log(`Navigated to airport: ${airport.name} (${airport.code})`);
        }
      }

      // Clear URL parameters after navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('lat');
      newUrl.searchParams.delete('lng');
      newUrl.searchParams.delete('airport');
      window.history.replaceState({}, '', newUrl.toString());
    }, 500); // Give map time to initialize
  }
}
