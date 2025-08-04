/// <reference lib="dom" />
import type { Airport } from './main.ts';
import { clearJourneyFromUI, setupLocationButton } from './map.ts';

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
  setupJourneyPanel();
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

export function updatePriceRangeDisplay(priceRange: {
  min: number | null;
  max: number | null;
}): void {
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
    const flightDuration = Math.round((distance / 800) * 60);
    const flightNumber = priceData.flightNumber || `FR${Math.floor(Math.random() * 9000) + 1000}`;

    flightPricesSection.innerHTML = `
      <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">Flight Information:</div>
      <div style="font-size: 10px; margin-bottom: 2px;">
        <strong>${sourceAirport.code} → ${destAirport.code}</strong> (${flightNumber})
      </div>
      <div style="font-size: 10px; margin-bottom: 2px;">
        ${sourceAirport.city} to ${destAirport.city}
      </div>
      <div style="font-size: 10px;">
        €${priceData.price} • ${distance}km • ${Math.floor(flightDuration / 60)}h ${flightDuration % 60}m
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

function setupJourneyPanel(): void {
  const clearButton = document.getElementById('clear-journey-btn') as HTMLButtonElement;
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearJourneyFromUI();
    });
  }
}
