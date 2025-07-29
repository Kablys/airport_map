/// <reference lib="dom" />

import type { Airport, Routes } from './main.ts';
import { ryanairAirports, ryanairRoutes } from './main.ts';
import { updatePriceRangeDisplay, updateSelectedAirportInfo } from './ui.ts';

interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  flyTo(center: [number, number], zoom: number): void;
  invalidateSize(): void;
  removeLayer(layer: unknown): void;
}

interface LeafletMarker {
  on(event: string, handler: (e: LeafletEvent) => void): void;
  getElement(): HTMLElement | null;
  getLatLng(): { lat: number; lng: number };
  bindPopup(content: string): void;
  addTo(map: LeafletMap): LeafletMarker;
  _tooltip?: unknown;
}

interface LeafletEvent {
  latlng: { lat: number; lng: number };
}

interface LeafletIcon {
  className: string;
  html: string;
  iconSize: [number, number];
  iconAnchor: [number, number];
}

interface LeafletControl {
  onAdd: () => HTMLElement;
  addTo(map: LeafletMap): void;
}

interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
  bindPopup(content: string): LeafletLayer;
}

interface LeafletTooltip {
  setContent(content: string): LeafletTooltip;
  setLatLng(coords: { lat: number; lng: number }): LeafletTooltip;
  addTo(map: LeafletMap): void;
}

declare const L: {
  map(id: string): LeafletMap;
  tileLayer(url: string, options: Record<string, unknown>): LeafletLayer;
  marker(coords: [number, number], options: { icon: LeafletIcon | null }): LeafletMarker;
  polyline(
    coords: [number, number][],
    options: Record<string, unknown>
  ): LeafletLayer;
  tooltip(options: Record<string, unknown>): LeafletTooltip;
  divIcon(options: LeafletIcon): LeafletIcon;
  control(options: { position: string }): LeafletControl;
  DomUtil: { create(tag: string, className: string): HTMLElement };
  DomEvent: {
    disableClickPropagation(element: HTMLElement): void;
    disableScrollPropagation(element: HTMLElement): void;
  };
};

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

interface PriceRange {
  min: number | null;
  max: number | null;
}

interface AirportsByCountry {
  [country: string]: Airport[];
}

interface AirportLookup {
  [code: string]: Airport;
}

let map: LeafletMap;
let airportsByCountry: AirportsByCountry = {};
let currentRouteLines: unknown[] = [];
let fadedRouteLines: unknown[] = [];
let selectedAirport: string | null = null;
let airportLookup: AirportLookup = {};
let markers: LeafletMarker[] = [];
const flightPriceCache = new Map<string, FlightPriceData>();
const PRICE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
let currentPriceRange: PriceRange = { min: null, max: null };
let currentTileLayer: unknown = null;

const tileProviders = {
  openstreetmap: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 18
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap contributors',
    maxZoom: 19
  },
  light: {
    name: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap contributors',
    maxZoom: 19
  }
};

export function initializeMap(airports: Airport[], routes: Routes): LeafletMap {
  map = L.map('map').setView([50.0, 10.0], 4);

  // Detect user's color scheme preference and set default tile
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const defaultProvider = prefersDark ? tileProviders.dark : tileProviders.light;

  currentTileLayer = L.tileLayer(defaultProvider.url, {
    attribution: defaultProvider.attribution,
    maxZoom: defaultProvider.maxZoom,
  }).addTo(map);

  // Add tile selector control
  addTileSelector(prefersDark ? 'dark' : 'light');

  airportsByCountry = {};
  airports.forEach((airport) => {
    if (!airportsByCountry[airport.country]) {
      airportsByCountry[airport.country] = [];
    }
    airportsByCountry[airport.country]?.push(airport);
  });

  airportLookup = {};
  airports.forEach((airport) => {
    airportLookup[airport.code] = airport;
  });

  markers = [];
  airports.forEach((airport) => {
    const routeCount = routes[airport.code]?.length || 0;

    const icon = createAirportIcon(routeCount);
    if (!icon) return; // Skip if icon creation failed

    const marker = L.marker([airport.lat, airport.lng], {
      icon: icon,
    }).addTo(map);

    marker.on('click', async (_e: LeafletEvent) => {
      if (selectedAirport === airport.code) {
        clearRouteLines();
        selectedAirport = null;
        updateSelectedAirportInfo(null);
      } else {
        updateSelectedAirportInfo(airport, 'Loading...');
        const routeCount = await showRoutesFromAirport(airport.code);
        selectedAirport = airport.code;
        updateSelectedAirportInfo(airport, routeCount);
        updateAirportTransparency(airport.code);
      }
    });

    marker.on('mouseover', (e: LeafletEvent) => {
      if (selectedAirport !== airport.code) {
        showFadedRoutes(airport.code);
      }
      const tooltip = L.tooltip({
        permanent: false,
        direction: 'top',
        offset: [0, -10],
      })
        .setContent(`${airport.flag} ${airport.name}`)
        .setLatLng(e.latlng);

      tooltip.addTo(map);

      marker._tooltip = tooltip;
    });

    marker.on('mouseout', () => {
      if (selectedAirport !== airport.code) {
        clearFadedRoutes();
      }
      if (marker._tooltip) {
        map.removeLayer(marker._tooltip);
        marker._tooltip = null;
      }
    });

    markers.push(marker);
  });

  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize();
  });

  const mapElement = document.getElementById('map');
  if (mapElement) {
    resizeObserver.observe(mapElement);
  }

  return map;
}

function createAirportIcon(flightCount: number): LeafletIcon | null {
  const template = document.getElementById('airport-icon-template') as HTMLTemplateElement;
  if (!template) return null;
  const clone = template.content.cloneNode(true) as DocumentFragment;
  const div = clone.querySelector('div');
  if (div) {
    div.textContent = flightCount.toString();
    return L.divIcon({
      className: 'ryanair-marker',
      html: div.outerHTML,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }
  return null;
}

function clearRouteLines(): void {
  currentRouteLines.forEach((line) => map.removeLayer(line));
  currentRouteLines = [];
  currentPriceRange = { min: null, max: null };
  updatePriceRangeDisplay(currentPriceRange);
  updateAirportTransparency(null);
}

function showFadedRoutes(airportCode: string): void {
  clearFadedRoutes();
  const sourceAirport = airportLookup[airportCode];
  if (!sourceAirport || !ryanairRoutes[airportCode]) {
    return;
  }

  const routes = ryanairRoutes[airportCode];
  routes.forEach((destinationCode) => {
    const destAirport = airportLookup[destinationCode];
    if (destAirport) {
      const line = L.polyline(
        [
          [sourceAirport.lat, sourceAirport.lng],
          [destAirport.lat, destAirport.lng],
        ],
        {
          color: '#003d82',
          weight: 1,
          opacity: 0.3,
          pane: 'overlayPane',
        }
      ).addTo(map);
      fadedRouteLines.push(line);
    }
  });
}

function clearFadedRoutes(): void {
  fadedRouteLines.forEach((line) => map.removeLayer(line));
  fadedRouteLines = [];
}

async function getFlightPrice(fromCode: string, toCode: string): Promise<FlightPriceData | null> {
  const routeKey = `${fromCode}-${toCode}`;

  const cached = flightPriceCache.get(routeKey);
  if (cached && Date.now() - cached.lastUpdated < PRICE_CACHE_DURATION) {
    return cached;
  }

  try {
    const priceData = await fetchRealFlightPrice(fromCode, toCode);
    if (priceData) {
      flightPriceCache.set(routeKey, priceData);
      return priceData;
    }

    return null;
  } catch (error) {
    console.error('Error fetching flight price:', error);
    return null;
  }
}

async function fetchRealFlightPrice(
  fromCode: string,
  toCode: string
): Promise<FlightPriceData | null> {
  await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

  try {
    const sourceAirport = airportLookup[fromCode];
    const destAirport = airportLookup[toCode];

    if (!sourceAirport || !destAirport) {
      return null;
    }

    const distance = calculateDistance(sourceAirport, destAirport);

    let basePrice: number;
    let priceVariation: number;

    if (distance < 500) {
      basePrice = 25;
      priceVariation = 35;
    } else if (distance < 1000) {
      basePrice = 40;
      priceVariation = 45;
    } else if (distance < 2000) {
      basePrice = 60;
      priceVariation = 70;
    } else {
      basePrice = 80;
      priceVariation = 100;
    }

    const routeHash = (fromCode + toCode).split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const routeModifier = Math.abs(routeHash % 100) / 100;
    const finalPrice = Math.round(basePrice + priceVariation * routeModifier);

    const flightNumber = `FR${Math.floor(1000 + (Math.abs(routeHash) % 8000))}`;

    const departureHour = 6 + Math.floor(routeModifier * 16);
    const departureMinute = Math.floor(routeModifier * 60);
    const flightDuration = Math.round((distance / 800) * 60);

    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 1);
    departureDate.setHours(departureHour, departureMinute, 0, 0);

    const arrivalDate = new Date(departureDate);
    arrivalDate.setMinutes(arrivalDate.getMinutes() + flightDuration);

    return {
      price: finalPrice,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
      flightNumber: flightNumber,
      departureTime: departureDate.toISOString(),
      arrivalTime: arrivalDate.toISOString(),
      departureDate: new Date().toISOString().split('T')[0] || '',
      aircraft: 'Boeing 737-800',
      note: 'Development stub data',
    };
  } catch (error) {
    console.error('Error in flight price stub:', error);
    return null;
  }
}

function calculateDistance(airport1: Airport, airport2: Airport): number {
  const R = 6371;
  const dLat = ((airport2.lat - airport1.lat) * Math.PI) / 180;
  const dLng = ((airport2.lng - airport1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((airport1.lat * Math.PI) / 180) *
    Math.cos((airport2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function showRoutesFromAirport(airportCode: string): Promise<number> {
  clearRouteLines();

  const sourceAirport = airportLookup[airportCode];
  if (!sourceAirport || !ryanairRoutes[airportCode]) {
    return 0;
  }

  const routes = ryanairRoutes[airportCode];
  let validRoutes = 0;

  const routePromises = routes.map(async (destinationCode) => {
    const destAirport = airportLookup[destinationCode];
    if (!destAirport) return null;

    const priceData = await getFlightPrice(airportCode, destinationCode);
    const distance = calculateDistance(sourceAirport, destAirport);

    return {
      sourceAirport,
      destAirport,
      priceData,
      distance,
      destinationCode,
    };
  });

  const routeResults = await Promise.all(routePromises);

  const prices = routeResults
    .filter((r) => r?.priceData)
    .map((r) => r?.priceData?.price)
    .filter((price): price is number => price !== undefined);
  updatePriceRange(prices);

  routeResults.forEach((routeInfo) => {
    if (!routeInfo) return;

    const { sourceAirport, destAirport, priceData, distance } = routeInfo;

    let lineColor = '#ff0066';

    if (priceData && currentPriceRange.min !== null && currentPriceRange.max !== null) {
      lineColor = getPriceColor(priceData.price, currentPriceRange.min, currentPriceRange.max);
    }

    const line = L.polyline(
      [
        [sourceAirport.lat, sourceAirport.lng],
        [destAirport.lat, destAirport.lng],
      ],
      {
        color: lineColor,
        weight: 3,
        opacity: 0.6,
        pane: 'overlayPane',
      }
    ).addTo(map);

    if (priceData) {
      const popupContent = createPopupContent(
        sourceAirport,
        destAirport,
        priceData,
        distance,
        lineColor
      );
      line.bindPopup(popupContent);
    }
    if (priceData) {
      const midLat = (sourceAirport.lat + destAirport.lat) / 2;
      const midLng = (sourceAirport.lng + destAirport.lng) / 2;

      const priceText = `€${priceData.price}`;
      const textWidth = priceText.length * 6 + 8;
      const textHeight = 18;

      const template = document.getElementById('price-label-template') as HTMLTemplateElement;
      if (!template) return validRoutes;
      const clone = template.content.cloneNode(true) as DocumentFragment;
      const div = clone.querySelector('div');
      if (!div) return validRoutes;

      // Use CSS custom properties for dynamic styling
      div.style.setProperty('--dynamic-line-color', lineColor);
      div.style.setProperty('--dynamic-width', `${Math.max(textWidth, 40)}px`);

      div.setAttribute('data-dest-code', destAirport.code);
      div.textContent = priceText;

      const priceLabel = L.marker([midLat, midLng], {
        icon: L.divIcon({
          className: 'price-label',
          html: div.outerHTML,
          iconSize: [Math.max(textWidth, 40), textHeight],
          iconAnchor: [Math.max(textWidth, 40) / 2, textHeight / 2],
        }),
      }).addTo(map);
      if (priceData) {
        const popupContent = createPopupContent(
          sourceAirport,
          destAirport,
          priceData,
          distance,
          lineColor
        );
        priceLabel.bindPopup(popupContent);
      }
      currentRouteLines.push(priceLabel);
    }

    currentRouteLines.push(line);
    validRoutes++;
  });

  return validRoutes;
}

function getPriceColor(price: number, min: number, max: number): string {
  if (min === max) {
    return '#ff8800';
  }

  const factor = (price - min) / (max - min);

  const cheapColor = '#00cc44';
  const midColor = '#ff8800';
  const expensiveColor = '#ff0066';

  if (factor <= 0.5) {
    return interpolateColor(cheapColor, midColor, factor * 2);
  } else {
    return interpolateColor(midColor, expensiveColor, (factor - 0.5) * 2);
  }
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex2rgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const rgb2hex = (r: number, g: number, b: number): string => {
    return (
      '#' +
      ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
        .toString(16)
        .slice(1)
    );
  };

  const [r1, g1, b1] = hex2rgb(color1);
  const [r2, g2, b2] = hex2rgb(color2);

  const r = r1 + factor * (r2 - r1);
  const g = g1 + factor * (g2 - g1);
  const b = b1 + factor * (b2 - b1);

  return rgb2hex(r, g, b);
}

function updateAirportTransparency(selectedAirportCode: string | null): void {
  if (!selectedAirportCode) {
    // Reset all airports to full opacity using CSS custom properties
    if (document.documentElement) {
      document.documentElement.style.setProperty('--dynamic-opacity', '1');
    }
    markers.forEach((marker) => {
      const markerElement = marker.getElement();
      if (markerElement) {
        const markerDiv = markerElement.querySelector('div');
        if (markerDiv) {
          markerDiv.style.setProperty('--dynamic-opacity', '1');
        }
      }
    });
    return;
  }

  const connectedAirports = ryanairRoutes[selectedAirportCode] || [];
  const connectedSet = new Set([selectedAirportCode, ...connectedAirports]);

  markers.forEach((marker) => {
    const markerLatLng = marker.getLatLng();

    const airport = ryanairAirports.find(
      (a) =>
        Math.abs(a.lat - markerLatLng.lat) < 0.001 && Math.abs(a.lng - markerLatLng.lng) < 0.001
    );

    if (airport) {
      const markerElement = marker.getElement();
      if (markerElement) {
        const markerDiv = markerElement.querySelector('div');
        if (markerDiv) {
          const opacity = connectedSet.has(airport.code) ? '1' : '0.2';
          markerDiv.style.setProperty('--dynamic-opacity', opacity);
        }
      }
    }
  });
}

function updatePriceRange(prices: number[]): void {
  const validPrices = prices.filter((p) => p !== null && p !== undefined);
  if (validPrices.length === 0) return;

  currentPriceRange.min = Math.min(...validPrices);
  currentPriceRange.max = Math.max(...validPrices);
  updatePriceRangeDisplay(currentPriceRange);
}

function createPopupContent(
  sourceAirport: Airport,
  destAirport: Airport,
  priceData: FlightPriceData,
  distance: number,
  lineColor: string
): string {
  const flightDuration = Math.round((distance / 800) * 60);
  const departureTime = priceData?.departureTime || new Date().toISOString().split('T')[0] || '';
  const arrivalTime = priceData?.arrivalTime || null;
  const flightNumber = priceData?.flightNumber || `FR${Math.floor(Math.random() * 9000) + 1000}`;

  const template = document.getElementById('flight-popup-template') as HTMLTemplateElement;
  if (!template) return '';
  const clone = template.content.cloneNode(true) as DocumentFragment;

  // Fill in the data
  const routeCodes = clone.querySelector('.route-codes');
  if (routeCodes) routeCodes.textContent = `${sourceAirport.code} → ${destAirport.code}`;

  const routeCities = clone.querySelector('.route-cities');
  if (routeCities) routeCities.textContent = `${sourceAirport.city} to ${destAirport.city}`;

  const departureName = clone.querySelector('.departure-name');
  if (departureName) departureName.textContent = `${sourceAirport.flag} ${sourceAirport.name}`;

  const arrivalName = clone.querySelector('.arrival-name');
  if (arrivalName) arrivalName.textContent = `${destAirport.flag} ${destAirport.name}`;

  const flightNumberEl = clone.querySelector('.flight-number');
  if (flightNumberEl) flightNumberEl.textContent = `Flight ${flightNumber}`;

  const priceDisplay = clone.querySelector('.price-display') as HTMLElement;
  if (priceDisplay) priceDisplay.style.setProperty('--dynamic-price-color', lineColor);

  if (priceDisplay) {
    if (priceData.estimated) {
      priceDisplay.innerHTML = `€${priceData.price} <span style="cursor: help; color: var(--price-medium);" title="📊 Estimated Price - Based on route distance. Actual prices may vary by date and availability">ⓘ</span>`;
    } else {
      priceDisplay.textContent = `€${priceData.price}`;
    }
  }

  const distanceEl = clone.querySelector('.distance');
  if (distanceEl) distanceEl.textContent = `${distance} km`;

  const durationEl = clone.querySelector('.duration');
  if (durationEl)
    durationEl.textContent = `${Math.floor(flightDuration / 60)}h ${flightDuration % 60}m`;

  // Handle live price info
  const livePriceInfo = clone.querySelector('.live-price-info') as HTMLElement;
  if (priceData && !priceData.estimated && livePriceInfo) {
    livePriceInfo.removeAttribute('style'); // Remove inline display: none
    const updateTime = clone.querySelector('.update-time');
    if (updateTime) {
      updateTime.textContent = new Date(priceData.lastUpdated).toLocaleTimeString();
    }
    const flightTimes = arrivalTime
      ? `Departure: ${new Date(departureTime).toLocaleTimeString()} | Arrival: ${new Date(arrivalTime).toLocaleTimeString()}`
      : `Next departure: ${new Date().toISOString().split('T')[0] || ''}`;
    const flightTimesEl = clone.querySelector('.flight-times');
    if (flightTimesEl) flightTimesEl.textContent = flightTimes;
  }

  // Set up button handlers
  const bookButton = clone.querySelector('.book-button') as HTMLButtonElement;
  if (bookButton) {
    bookButton.onclick = () => {
      window.open(
        `https://www.ryanair.com/gb/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${new Date().toISOString().split('T')[0] || ''}&originIata=${sourceAirport.code}&destinationIata=${destAirport.code}&isConnectedFlight=false&discount=0`,
        '_blank'
      );
    };
  }

  const copyButton = clone.querySelector('.copy-button') as HTMLButtonElement;
  if (copyButton) {
    copyButton.onclick = () => {
      navigator.clipboard?.writeText(
        `${sourceAirport.code} to ${destAirport.code} - €${priceData?.price || 'N/A'} - Flight ${flightNumber}`
      );
    };
  }

  // Return the HTML string
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(clone);
  return tempDiv.innerHTML;
}

function addTileSelector(defaultValue: string): void {
  const tileControl = L.control({ position: 'topleft' });
  tileControl.onAdd = () => {
    const div = L.DomUtil.create('div', 'tile-selector-control');

    const template = document.getElementById('tile-selector-template') as HTMLTemplateElement;
    if (template) {
      const clone = template.content.cloneNode(true);
      div.appendChild(clone);
    }

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };
  tileControl.addTo(map);

  // Set up the selector functionality and set default value
  const selector = document.getElementById('tile-selector') as HTMLSelectElement;
  if (selector) {
    selector.value = defaultValue;
    selector.addEventListener('change', function (this: HTMLSelectElement) {
      changeTileLayer(this.value);
    });

    // Listen for system color scheme changes
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.addEventListener('change', (e) => {
        const newDefault = e.matches ? 'dark' : 'light';
        // Only auto-switch if user hasn't manually selected a different tile
        if (selector.value === 'dark' || selector.value === 'light') {
          selector.value = newDefault;
          changeTileLayer(newDefault);
        }
      });
    }
  }
}

function changeTileLayer(providerKey: string): void {
  const provider = tileProviders[providerKey as keyof typeof tileProviders];
  if (!provider) return;

  // Remove current tile layer
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer);
  }

  // Add new tile layer
  currentTileLayer = L.tileLayer(provider.url, {
    attribution: provider.attribution,
    maxZoom: provider.maxZoom,
  }).addTo(map);
}
