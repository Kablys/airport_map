/// <reference lib="dom" />
import type { Airport } from './main.ts';

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
  addLegend(map);
  addMapStyling();
  updateSelectedAirportInfo(null);
}

function initializeSearch(airports: Airport[], map: LeafletMap): void {
  const searchControl = L.control({ position: 'topright' });
  searchControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'search-control');

    const template = document.getElementById('search-control-template') as HTMLTemplateElement;
    if (template) {
      const clone = template.content.cloneNode(true);
      div.appendChild(clone);
    }

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };
  searchControl.addTo(map);

  const searchInput = document.getElementById('airport-search') as HTMLInputElement;
  const searchResults = document.getElementById('search-results') as HTMLElement;

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', function (this: HTMLInputElement) {
      const query = this.value.toLowerCase().trim();

      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      const matches = airports
        .filter(
          (airport) =>
            airport.name.toLowerCase().includes(query) ||
            airport.city.toLowerCase().includes(query) ||
            airport.country.toLowerCase().includes(query) ||
            airport.code.toLowerCase().includes(query)
        )
        .slice(0, 10);

      if (matches.length === 0) {
        searchResults.innerHTML = '<div style="padding: 5px; color: #666;">No airports found</div>';
        return;
      }

      const template = document.getElementById('search-result-template') as HTMLTemplateElement;
      if (!template) return;
      searchResults.innerHTML = '';

      matches.forEach((airport) => {
        const clone = template.content.cloneNode(true) as DocumentFragment;
        const div = clone.querySelector('div') as HTMLElement;

        // Use slots for dynamic content
        const nameCodeSlot = document.createElement('span');
        nameCodeSlot.slot = 'airport-name-code';
        nameCodeSlot.textContent = `${airport.name} (${airport.code})`;
        div.querySelector('.airport-name-code')?.replaceWith(nameCodeSlot);

        const locationSlot = document.createElement('span');
        locationSlot.slot = 'airport-location';
        locationSlot.textContent = `${airport.city}, ${airport.flag} ${airport.country}`;
        div.querySelector('.airport-location')?.replaceWith(locationSlot);

        div.onclick = () => window.flyToAirport(airport.lat, airport.lng);
        searchResults.appendChild(clone);
      });
    });
  }

  window.flyToAirport = (lat: number, lng: number): void => {
    map.flyTo([lat, lng], 10);

    const searchInput = document.getElementById('airport-search') as HTMLInputElement;
    const searchResults = document.getElementById('search-results') as HTMLElement;
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
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

export function updateSelectedAirportInfo(
  airport: Airport | null,
  routeCount?: string | number
): void {
  const statsDiv = document.getElementById('airport-count') as HTMLElement;
  if (!statsDiv) return;

  if (airport) {
    toggleFlightPricesSection(true);
    const template = document.getElementById(
      'selected-airport-info-template'
    ) as HTMLTemplateElement;
    if (!template) return;
    const clone = template.content.cloneNode(true) as DocumentFragment;
    const container = document.createElement('div');
    container.appendChild(clone);

    // Use slots for dynamic content
    const nameSlot = document.createElement('span');
    nameSlot.slot = 'airport-name';
    nameSlot.textContent = `${airport.flag} ${airport.name}`;
    container.querySelector('.airport-name')?.replaceWith(nameSlot);

    // Add code slot
    const codeSlot = document.createElement('span');
    codeSlot.slot = 'airport-code';
    codeSlot.textContent = airport.code;
    container.querySelector('.airport-code')?.replaceWith(codeSlot);

    const routeCountSlot = document.createElement('span');
    routeCountSlot.slot = 'route-count';
    routeCountSlot.textContent = String(routeCount || '');
    container.querySelector('.route-count')?.replaceWith(routeCountSlot);

    statsDiv.innerHTML = container.innerHTML;
  } else {
    toggleFlightPricesSection(false);
    statsDiv.innerHTML = `<strong>${window.ryanairAirports.length}</strong> airports across <strong>${Object.keys(window.airportsByCountry).length}</strong> countries`;
  }
}

export function updatePriceRangeDisplay(priceRange: {
  min: number | null;
  max: number | null;
}): void {
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
    // Control visibility through CSS custom properties and direct style
    flightPricesSection.style.setProperty('--dynamic-display', show ? 'block' : 'none');
    flightPricesSection.style.display = show ? 'block' : 'none';
  }
}
