/// <reference lib="dom" />
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SearchControlReact } from './components/SearchControl.tsx';
import type { Airport } from './main.ts';
import { setupLocationButton } from './map.ts';

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

// Missing functions that map.ts needs - these were removed during React migration
// These are now stub functions since the functionality moved to React components

export function updatePriceRangeDisplay(priceRange: { min: number | null; max: number | null }): void {
  // This function is now handled by React Legend component
  // For backward compatibility, we'll keep a stub
  console.log('updatePriceRangeDisplay called with:', priceRange);
}

export function updateFlightPricesSection(
  sourceAirport?: Airport | null,
  destAirport?: Airport | null,
  priceData?: any | null,
  distance?: number
): void {
  // This function is now handled by React Legend component
  // For backward compatibility, we'll keep a stub
  console.log('updateFlightPricesSection called with:', { sourceAirport, destAirport, priceData, distance });
}

export function updateSelectedAirportInfo(airport: Airport | null, routeCount?: string | number): void {
  // This function is now handled by React Legend component
  // For backward compatibility, we'll keep a stub
  console.log('updateSelectedAirportInfo called with:', { airport, routeCount });
}

export function updateLegendItem(
  airport: Airport | null,
  routeCount?: string | number,
  isHover: boolean = false
): void {
  // This function is now handled by React Legend component in map.ts
  // The map.ts file should call updateReactLegend instead
  console.log('updateLegendItem called - should use updateReactLegend in map.ts');
}
