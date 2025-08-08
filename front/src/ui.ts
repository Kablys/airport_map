/// <reference lib="dom" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SearchControlReact } from './components/SearchControl.tsx';
import type { Airport } from './main.ts';
import { clearItineraryFromUI, setupLocationButton } from './map.ts';
import { calculateFlightDuration, formatFlightDuration, generateFlightNumber } from './utils.ts';

interface FlightPriceData {
  price: number;
  currency: string;
  lastUpdated: number;
  estimated: boolean;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  aircraft: string;
  note: string;
}

interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  flyTo(center: [number, number], zoom: number): void;
  invalidateSize(): void;
  removeLayer(layer: unknown): void;
}

interface LeafletControl {
  onAdd: () => HTMLElement;
  addTo(map: LeafletMap): void;
}

declare const L: {
  control(options: { position: string }): LeafletControl;
  DomUtil: { create(tag: string, className: string): HTMLElement };
  DomEvent: {
    disableClickPropagation(element: HTMLElement): void;
    disableScrollPropagation(element: HTMLElement): void;
  };
};
declare global {
  interface Window {
    ryanairAirports: Airport[];
    airportsByCountry: { [country: string]: Airport[] };
    flyToAirport: (lat: number, lng: number) => void;
  }
}

export function initializeUI(airports: Airport[], map: LeafletMap): void {
  // Make airports data available globally for UI functions
  window.ryanairAirports = airports;
  window.airportsByCountry = {};
  airports.forEach((airport) => {
    if (!window.airportsByCountry[airport.country]) {
      window.airportsByCountry[airport.country] = [];
    }
    window.airportsByCountry[airport.country]?.push(airport);
  });

  initializeSearch(airports, map);
  setupLocationButton();
  addLegend(map);
  addMapStyling();
  updateSelectedAirportInfo(null);
  setupItineraryPanel();
}

function initializeSearch(airports: Airport[], map: LeafletMap): void {
  const searchControl = L.control({ position: 'topright' });
  searchControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'search-control-container');

    // Create React root and render the SearchControlReact component
    const root = createRoot(div);
    root.render(React.createElement(SearchControlReact, { airports, map }));

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };
  searchControl.addTo(map);

  // Keep flyToAirport global for backward compatibility
  window.flyToAirport = (lat: number, lng: number): void => {
    map.flyTo([lat, lng], 10);
  };
}

function addLegend(map: LeafletMap): void {
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'legend');

    const template = document.getElementById('legend-template') as HTMLTemplateElement;
    if (template) {
      const clone = template.content.cloneNode(true);
      div.appendChild(clone);
    }

    return div;
  };
  legend.addTo(map);
}

function addMapStyling(): void {
  // All styling is now handled by CSS custom properties in assets/styles.css
  // This function is kept for compatibility but no longer needed
  console.log('Map styling loaded from CSS custom properties');
}

export function updateSelectedAirportInfo(airport: Airport | null, routeCount?: string | number): void {
  if (airport) {
    toggleFlightPricesSection(true);
    updateLegendItem(airport, routeCount);
  } else {
    toggleFlightPricesSection(false);
    updateLegendItem(null);
  }
}

export function updateLegendItem(
  airport: Airport | null,
  routeCount?: string | number,
  isHover: boolean = false
): void {
  const legendItem = document.querySelector('.legend-item') as HTMLElement;
  if (!legendItem) return;

  if (airport) {
    // Use optimized template for instant updates
    const hoverClass = isHover ? ' hover-state' : '';
    const content = `
      <div class="selected-airport-legend${hoverClass}">
        <div class="airport-header">
          <span class="airport-flag">${airport.flag}</span>
          <strong class="airport-name">${airport.name}</strong>
          <span class="airport-code">(${airport.code})</span>
        </div>
        <div class="airport-location">${airport.city}, ${airport.country}</div>
        <div class="airport-coordinates">📍 ${airport.lat.toFixed(4)}, ${airport.lng.toFixed(4)}</div>
        <div class="airport-route-info">
          <strong>Routes:</strong> ${routeCount || 0} direct destinations
        </div>
      </div>
    `;
    legendItem.innerHTML = content;
  } else {
    // Restore the default legend item with airport count and consistent sizing
    const airportCount = window.ryanairAirports?.length || 0;
    const countryCount = Object.keys(window.airportsByCountry || {}).length;
    legendItem.innerHTML = `
      <div class="default-legend-item">
        <div id="airport-count">
          <strong>${airportCount}</strong> airports across <strong>${countryCount}</strong> countries
        </div>
        <div class="legend-icon-row">
          <div class="legend-icon">12</div>
          <span>Airport with number of outgoing flights</span>
        </div>
      </div>
    `;
  }
}

export function updatePriceRangeDisplay(priceRange: { min: number | null; max: number | null }): void {
  // First restore the original flight prices content
  updateFlightPricesSection();

  // Then update the price range info
  const priceRangeInfo = document.getElementById('price-range-info') as HTMLElement;
  if (priceRangeInfo && priceRange.min !== null && priceRange.max !== null) {
    if (priceRange.min === priceRange.max) {
      priceRangeInfo.innerHTML = `All routes: €${priceRange.min}`;
    } else {
      priceRangeInfo.innerHTML = `Price range: €${priceRange.min} - €${priceRange.max}`;
    }
  } else if (priceRangeInfo) {
    priceRangeInfo.innerHTML = 'Select an airport to see price range';
  }
}

export function toggleFlightPricesSection(show: boolean): void {
  const flightPricesSection = document.getElementById('flight-prices-section') as HTMLElement;
  if (flightPricesSection) {
    // Control visibility through direct style
    flightPricesSection.style.display = show ? 'block' : 'none';
  }
}

export function updateFlightPricesSection(
  sourceAirport: Airport | null = null,
  destAirport: Airport | null = null,
  priceData: FlightPriceData | null = null,
  distance: number = 0
): void {
  const flightPricesSection = document.getElementById('flight-prices-section') as HTMLElement;
  if (!flightPricesSection) return;

  if (sourceAirport && destAirport && priceData) {
    // Show specific flight information
    const flightDuration = calculateFlightDuration(distance);
    const flightNumber = priceData.flightNumber || generateFlightNumber();

    flightPricesSection.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">Flight Information:</div>
      <div style="font-size: 10px; margin-bottom: 2px;">
        <strong>${sourceAirport.code} → ${destAirport.code}</strong> (${flightNumber})
      </div>
      <div style="font-size: 10px; margin-bottom: 2px;">
        ${sourceAirport.city} to ${destAirport.city}
      </div>
      <div style="font-size: 10px;">
        €${priceData.price} • ${distance}km • ${formatFlightDuration(flightDuration).hours}h ${formatFlightDuration(flightDuration).minutes}m
      </div>
    `;
  } else {
    // Restore original flight prices content
    flightPricesSection.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">Flight Prices:</div>
      <div style="display: flex; align-items: center; margin-bottom: 3px;">
        <div class="price-gradient"></div>
        <span style="font-size: 10px;">Dynamic gradient (cheapest → most expensive)</span>
      </div>
      <div id="price-range-info" class="price-range-info">
        Select an airport to see price range
      </div>
    `;
  }
}

function setupItineraryPanel(): void {
  const clearButton = document.getElementById('clear-itinerary-btn') as HTMLButtonElement;
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearItineraryFromUI();
    });
  }
}
