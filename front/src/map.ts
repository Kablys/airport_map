/// <reference lib="dom" />
/// <reference types="leaflet" />

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ItineraryPanel } from './components/ItineraryPanel.tsx';
import { Legend } from './components/Legend.tsx';
import { createReactTileSelector } from './components/MapUIComponents.tsx';
import type { Airport, Routes } from './main.ts';
import {
  calculateDistance,
  calculateFlightDuration,
  calculateTotalDuration,
  formatFlightDuration,
  generateCurvedPath,
  generateFlightNumber,
  getPriceColor,
} from './utils.ts';

// Since we're using Leaflet from CDN, declare it as global
declare const L: typeof import('leaflet');

// Extend Leaflet Marker to include tooltip property
interface MarkerWithTooltip extends L.Marker {
  _tooltip?: L.Tooltip;
}

import { ryanairAirports, ryanairRoutes } from './main.ts';
import { updateFlightPricesSection, updatePriceRangeDisplay } from './ui.ts';

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

let map: L.Map;
let airportsByCountry: AirportsByCountry = {};
let currentRouteLines: (L.Polyline | L.Marker)[] = [];
let fadedRouteLines: L.Polyline[] = [];
let selectedAirport: string | null = null;
let airportLookup: AirportLookup = {};
let markers: L.Marker[] = [];
const flightPriceCache = new Map<string, FlightPriceData>();
const PRICE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
let currentPriceRange: PriceRange = { min: null, max: null };
let currentTileLayer: L.TileLayer | null = null;

// Itinerary tracking
interface ItinerarySegment {
  type: 'flight';
  from: Airport;
  to: Airport;
  priceData: FlightPriceData | null;
  distance: number;
  line: L.Polyline;
}

interface ItineraryGap {
  type: 'gap';
  lastAirport: Airport;
  nextAirport: Airport;
}

type ItineraryItem = ItinerarySegment | ItineraryGap;

let currentItinerary: ItineraryItem[] = [];
let itineraryLines: L.Polyline[] = [];
let itineraryRoot: any = null;
let legendRoot: any = null;
let legendContainer: HTMLElement | null = null;

const tileProviders = {
  openstreetmap: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17,
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap contributors',
    maxZoom: 19,
  },
  light: {
    name: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, © OpenStreetMap contributors',
    maxZoom: 19,
  },
};

export function initializeMap(airports: Airport[], routes: Routes): L.Map {
  map = L.map('map', { zoomControl: false }).setView([50.0, 10.0], 4);

  // Detect user's color scheme preference and set default tile
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const defaultProvider = prefersDark ? tileProviders.dark : tileProviders.light;

  currentTileLayer = L.tileLayer(defaultProvider.url, {
    attribution: defaultProvider.attribution,
    maxZoom: defaultProvider.maxZoom,
  }).addTo(map);

  // Add tile selector control
  addTileSelector(prefersDark ? 'dark' : 'light');

  // Add React legend
  addReactLegend();

  // Location control is now integrated into search panel

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

    // Store airport code on the marker for easy lookup
    (marker as L.Marker & { airportCode: string }).airportCode = airport.code;

    marker.on('click', async (_e: L.LeafletMouseEvent) => {
      // Check if this is an itinerary continuation (clicking on a destination airport)
      if (selectedAirport && selectedAirport !== airport.code && isDestinationAirport(airport.code)) {
        await addToItinerary(selectedAirport, airport.code);
        return;
      }

      // Check if this is a gap (clicking on a faded airport that's not connected)
      if (selectedAirport && selectedAirport !== airport.code && !isDestinationAirport(airport.code)) {
        await addItineraryGap(selectedAirport, airport.code);
        return;
      }

      if (selectedAirport === airport.code) {
        clearRouteLines();
        selectedAirport = null;
        updateReactLegend(null);
      } else {
        updateReactLegend(airport, 'Loading...');
        const routeCount = await showRoutesFromAirport(airport.code);
        selectedAirport = airport.code;
        updateReactLegend(airport, routeCount);
        updateAirportTransparency(airport.code);
      }
    });

    marker.on('mouseover', async (e: L.LeafletMouseEvent) => {
      if (selectedAirport !== airport.code) {
        showFadedRoutes(airport.code);
        // Update legend with hovered airport info
        const routeCount = ryanairRoutes[airport.code]?.length || 0;
        updateReactLegend(airport, routeCount, true);

        // If there's a selected airport and this is a destination, show flight info and enhance route
        if (selectedAirport && ryanairRoutes[selectedAirport]?.includes(airport.code)) {
          const selectedAirportData = airportLookup[selectedAirport];
          if (selectedAirportData) {
            const priceData = await getFlightPrice(selectedAirport, airport.code);
            const distance = calculateDistance(selectedAirportData, airport);
            updateFlightPricesSection(selectedAirportData, airport, priceData, distance);

            // Enhance the route elements when hovering over destination marker
            enhanceRouteElements(airport.code);
          }
        }
      }
      const tooltip = L.tooltip({
        permanent: false,
        direction: 'top',
        offset: [0, -10],
      })
        .setContent(`${airport.flag} ${airport.name}`)
        .setLatLng(e.latlng);

      tooltip.addTo(map);

      (marker as MarkerWithTooltip)._tooltip = tooltip;
    });

    marker.on('mouseout', () => {
      if (selectedAirport !== airport.code) {
        clearFadedRoutes();
        restoreLegendToSelectedAirport();
        updateFlightPricesSection();

        // Restore route elements when leaving destination marker
        if (selectedAirport && ryanairRoutes[selectedAirport]?.includes(airport.code)) {
          restoreRouteElements(airport.code);
        }
      }
      const markerWithTooltip = marker as MarkerWithTooltip;
      if (markerWithTooltip._tooltip) {
        map.removeLayer(markerWithTooltip._tooltip);
        markerWithTooltip._tooltip = undefined;
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

function createAirportIcon(
  flightCount: number,
  markerType: 'default' | 'itinerary' | 'current-destination' = 'default'
): L.DivIcon | null {
  // Use React component approach
  const markerClass = `airport-icon${markerType === 'itinerary' ? ' itinerary' : ''}${markerType === 'current-destination' ? ' current-destination' : ''}`;
  const html = `<div class="${markerClass}">${flightCount}</div>`;

  return L.divIcon({
    className: 'ryanair-marker',
    html: html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function clearRouteLines(): void {
  currentRouteLines.forEach((line) => map.removeLayer(line));
  currentRouteLines = [];
  currentPriceRange = { min: null, max: null };

  // Clear route elements map
  routeElementsMap.clear();

  updatePriceRangeDisplay(currentPriceRange);
  updateAirportTransparency(null);
}

function restoreLegendToSelectedAirport(): void {
  if (selectedAirport) {
    const selectedAirportData = airportLookup[selectedAirport];
    if (selectedAirportData) {
      const selectedRouteCount = ryanairRoutes[selectedAirport]?.length || 0;
      updateReactLegend(selectedAirportData, selectedRouteCount, false);
    } else {
      updateReactLegend(null);
    }
  } else {
    updateReactLegend(null);
  }
}

export function clearItineraryFromUI(): void {
  clearItinerary();
}

function isDestinationAirport(airportCode: string): boolean {
  if (!selectedAirport || !ryanairRoutes[selectedAirport]) return false;
  return ryanairRoutes[selectedAirport]?.includes(airportCode) || false;
}

async function addToItinerary(fromCode: string, toCode: string): Promise<void> {
  const fromAirport = airportLookup[fromCode];
  const toAirport = airportLookup[toCode];

  if (!fromAirport || !toAirport) return;

  const priceData = await getFlightPrice(fromCode, toCode);
  const distance = calculateDistance(fromAirport, toAirport);

  // Create a curved line for the itinerary segment
  const curvedPath = generateCurvedPath(fromAirport.lat, fromAirport.lng, toAirport.lat, toAirport.lng);
  const itineraryLine = L.polyline(curvedPath, {
    color: '#003d82',
    weight: 2,
    opacity: 0.6,
    dashArray: '5, 5',
    pane: 'overlayPane',
  }).addTo(map);

  const segment: ItinerarySegment = {
    type: 'flight',
    from: fromAirport,
    to: toAirport,
    priceData,
    distance,
    line: itineraryLine,
  };

  currentItinerary.push(segment);
  itineraryLines.push(itineraryLine);

  // Update marker styles to reflect itinerary changes
  updateMarkerStyles();

  // Update itinerary UI
  updateItineraryDisplay();

  // Show routes from the new destination
  updateReactLegend(toAirport, 'Loading...');
  const routeCount = await showRoutesFromAirport(toCode);
  selectedAirport = toCode;
  updateReactLegend(toAirport, routeCount);
  updateAirportTransparency(toCode);
}

async function addItineraryGap(fromCode: string, toCode: string): Promise<void> {
  const fromAirport = airportLookup[fromCode];
  const toAirport = airportLookup[toCode];

  if (!fromAirport || !toAirport) return;

  // Add a gap marker to show disconnection
  const gap: ItineraryGap = {
    type: 'gap',
    lastAirport: fromAirport,
    nextAirport: toAirport,
  };

  currentItinerary.push(gap);

  // Update marker styles to reflect itinerary changes
  updateMarkerStyles();

  // Update itinerary UI
  updateItineraryDisplay();

  // Show routes from the new destination
  updateReactLegend(toAirport, 'Loading...');
  const routeCount = await showRoutesFromAirport(toCode);
  selectedAirport = toCode;
  updateReactLegend(toAirport, routeCount);
  updateAirportTransparency(toCode);
}

function clearItinerary(): void {
  itineraryLines.forEach((line) => map.removeLayer(line));
  itineraryLines = [];
  currentItinerary = [];

  // Reset all marker styles to default
  updateMarkerStyles();

  updateItineraryDisplay();
}

function highlightItinerarySegment(segmentIndex: number, highlight: boolean): void {
  if (segmentIndex >= currentItinerary.length) return;

  const item = currentItinerary[segmentIndex];
  if (!item || item.type !== 'flight') return;

  const segment = item as ItinerarySegment;
  if (!segment.line) return;

  // Update line appearance
  const line = segment.line as L.Polyline;
  if (line.setStyle) {
    if (highlight) {
      line.setStyle({
        weight: 4,
        opacity: 1,
        color: '#ff0066',
        dashArray: '10, 5',
      });
      // Bring to front
      if (line.bringToFront) line.bringToFront();
    } else {
      line.setStyle({
        weight: 2,
        opacity: 0.6,
        color: '#003d82',
        dashArray: '5, 5',
      });
    }
  }
}

function showItinerarySegmentPopup(segment: ItinerarySegment): void {
  if (!segment.priceData) return;

  // Just center map on the route - no popup
  const midLat = (segment.from.lat + segment.to.lat) / 2;
  const midLng = (segment.from.lng + segment.to.lng) / 2;
  map.flyTo([midLat, midLng], Math.max(map.getZoom(), 6));
}

// DOM creation functions moved to React components - ItineraryPanel.tsx

interface ItineraryStructure {
  airports: Airport[];
  connectionsAfter: ('flight' | 'gap' | null)[];
  connectionDataAfter: (ItinerarySegment | ItineraryGap | null)[];
}

interface ItineraryTotals {
  totalPrice: number;
  totalDistance: number;
  totalDuration: number;
  flightCount: number;
}

function buildItineraryStructure(itinerary: ItineraryItem[]): ItineraryStructure {
  const airports: Airport[] = [];
  const connectionsAfter: ('flight' | 'gap' | null)[] = [];
  const connectionDataAfter: (ItinerarySegment | ItineraryGap | null)[] = [];

  // First pass: collect all unique airports in order
  itinerary.forEach((item) => {
    if (item.type === 'flight') {
      const segment = item as ItinerarySegment;
      addAirportIfNew(airports, segment.from);
      addAirportIfNew(airports, segment.to);
    } else if (item.type === 'gap') {
      const gap = item as ItineraryGap;
      addAirportIfNew(airports, gap.lastAirport);
      addAirportIfNew(airports, gap.nextAirport);
    }
  });

  // Initialize connections arrays
  for (let i = 0; i < airports.length; i++) {
    connectionsAfter.push(null);
    connectionDataAfter.push(null);
  }

  // Fill in the connections based on itinerary items
  itinerary.forEach((item) => {
    const fromIndex = getAirportIndex(airports, item);
    if (fromIndex !== -1) {
      connectionsAfter[fromIndex] = item.type;
      connectionDataAfter[fromIndex] = item;
    }
  });

  return { airports, connectionsAfter, connectionDataAfter };
}

function addAirportIfNew(airports: Airport[], airport: Airport): void {
  if (airports.length === 0 || airports[airports.length - 1]?.code !== airport.code) {
    airports.push(airport);
  }
}

function getAirportIndex(airports: Airport[], item: ItineraryItem): number {
  if (item.type === 'flight') {
    const segment = item as ItinerarySegment;
    return airports.findIndex((airport) => airport.code === segment.from.code);
  } else if (item.type === 'gap') {
    const gap = item as ItineraryGap;
    return airports.findIndex((airport) => airport.code === gap.lastAirport.code);
  }
  return -1;
}

function calculateItineraryTotals(itinerary: ItineraryItem[]): ItineraryTotals {
  let totalPrice = 0;
  let totalDistance = 0;
  let totalDuration = 0;
  let flightCount = 0;

  itinerary.forEach((item) => {
    if (item.type === 'flight') {
      const segment = item as ItinerarySegment;
      const price = segment.priceData?.price || 0;
      const duration = calculateFlightDuration(segment.distance);
      totalPrice += price;
      totalDistance += segment.distance;
      totalDuration += duration;
      flightCount++;
    }
  });

  return { totalPrice, totalDistance, totalDuration, flightCount };
}

function updateItineraryDisplay(): void {
  const itineraryContainer = document.getElementById('itinerary-panel-container');
  if (!itineraryContainer) return;

  // Initialize React root if not already done
  if (!itineraryRoot) {
    itineraryRoot = createRoot(itineraryContainer);
  }

  // Render React component
  itineraryRoot.render(
    React.createElement(ItineraryPanel, {
      itinerary: currentItinerary,
      onClearItinerary: clearItinerary,
      onSegmentHover: highlightItinerarySegment,
      onSegmentClick: showItinerarySegmentPopup,
    })
  );
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
      const curvedPath = generateCurvedPath(
        sourceAirport.lat,
        sourceAirport.lng,
        destAirport.lat,
        destAirport.lng,
        15 // Fewer points for faded routes to improve performance
      );
      const line = L.polyline(curvedPath, {
        color: '#003d82',
        weight: 1,
        opacity: 0.3,
        pane: 'overlayPane',
      }).addTo(map);
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

async function fetchRealFlightPrice(fromCode: string, toCode: string): Promise<FlightPriceData | null> {
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
    const flightDuration = calculateFlightDuration(distance);

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

interface RouteInfo {
  sourceAirport: Airport;
  destAirport: Airport;
  priceData: FlightPriceData | null;
  distance: number;
}

interface RouteElements {
  line: L.Polyline;
  priceLabel: L.Marker;
  destinationMarker: L.Marker;
  destinationCode: string;
}

// Store route elements for coordinated hover effects
const routeElementsMap = new Map<string, RouteElements>();

function enhanceRouteElements(destinationCode: string): void {
  const routeElements = routeElementsMap.get(destinationCode);
  if (!routeElements) return;

  // Enhance the flight line
  routeElements.line.setStyle({
    weight: 5,
    opacity: 0.9,
  });

  // Enhance the price label
  const priceLabelElement = routeElements.priceLabel.getElement();
  if (priceLabelElement) {
    const labelDiv = priceLabelElement.querySelector('div');
    if (labelDiv) {
      labelDiv.style.transform = 'scale(1.2)';
      labelDiv.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.4)';
      labelDiv.style.zIndex = '1000';
    }
  }

  // Enhance the destination marker
  const destinationMarkerElement = routeElements.destinationMarker.getElement();
  if (destinationMarkerElement) {
    const markerDiv = destinationMarkerElement.querySelector('div');
    if (markerDiv) {
      markerDiv.style.transform = 'scale(1.3)';
      markerDiv.style.zIndex = '1000';
    }
  }
}

function restoreRouteElements(destinationCode: string): void {
  const routeElements = routeElementsMap.get(destinationCode);
  if (!routeElements) return;

  // Restore the flight line
  routeElements.line.setStyle({
    weight: 3,
    opacity: 0.6,
  });

  // Restore the price label
  const priceLabelElement = routeElements.priceLabel.getElement();
  if (priceLabelElement) {
    const labelDiv = priceLabelElement.querySelector('div');
    if (labelDiv) {
      labelDiv.style.transform = 'scale(1)';
      labelDiv.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
      labelDiv.style.zIndex = 'auto';
    }
  }

  // Restore the destination marker
  const destinationMarkerElement = routeElements.destinationMarker.getElement();
  if (destinationMarkerElement) {
    const markerDiv = destinationMarkerElement.querySelector('div');
    if (markerDiv) {
      markerDiv.style.transform = 'scale(1)';
      markerDiv.style.zIndex = 'auto';
    }
  }
}

function getMarkerByAirportCode(airportCode: string): L.Marker | null {
  return (
    markers.find((marker) => {
      const markerWithCode = marker as L.Marker & { airportCode: string };
      return markerWithCode.airportCode === airportCode;
    }) || null
  );
}

function createRouteVisualization(routeInfo: RouteInfo): void {
  const { sourceAirport, destAirport, priceData, distance } = routeInfo;

  let lineColor = '#ff0066';
  if (priceData && currentPriceRange.min !== null && currentPriceRange.max !== null) {
    lineColor = getPriceColor(priceData.price, currentPriceRange.min, currentPriceRange.max);
  }

  const curvedPath = generateCurvedPath(sourceAirport.lat, sourceAirport.lng, destAirport.lat, destAirport.lng);
  const line = L.polyline(curvedPath, {
    color: lineColor,
    weight: 3,
    opacity: 0.6,
    pane: 'overlayPane',
  }).addTo(map);

  if (priceData) {
    // Create price label and get reference to destination marker
    const priceLabel = createPriceLabel(sourceAirport, destAirport, priceData, lineColor);
    const destinationMarker = getMarkerByAirportCode(destAirport.code);

    if (priceLabel && destinationMarker) {
      // Store route elements for coordinated hover effects
      routeElementsMap.set(destAirport.code, {
        line,
        priceLabel,
        destinationMarker,
        destinationCode: destAirport.code,
      });

      // Add coordinated hover events to route line
      line.on('mouseover', () => {
        enhanceRouteElements(destAirport.code);
        updateFlightPricesSection(sourceAirport, destAirport, priceData, distance);
      });

      line.on('mouseout', () => {
        restoreRouteElements(destAirport.code);
        updateFlightPricesSection(); // Restore original content
      });
    }
  }

  currentRouteLines.push(line);
}

function createPriceLabel(
  sourceAirport: Airport,
  destAirport: Airport,
  priceData: FlightPriceData,
  lineColor: string
): L.Marker | null {
  // Position price label very close to destination airport (90% of the way from source to destination)
  const labelLat = sourceAirport.lat + (destAirport.lat - sourceAirport.lat) * 0.9;
  const labelLng = sourceAirport.lng + (destAirport.lng - sourceAirport.lng) * 0.9;

  const priceText = `€${priceData.price}`;
  const textWidth = priceText.length * 6 + 8;
  const textHeight = 18;

  // Use React component approach - create HTML directly
  const priceLabelHTML = `
    <div class="price-label" 
         style="background-color: ${lineColor}; 
                width: ${Math.max(textWidth, 40)}px; 
                height: ${textHeight}px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 3px;
                color: white;
                font-size: 11px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                cursor: pointer;
                user-select: none;
                transition: transform 0.2s ease, box-shadow 0.2s ease;"
         data-dest-code="${destAirport.code}">
      ${priceText}
    </div>
  `;

  const priceLabel = L.marker([labelLat, labelLng], {
    icon: L.divIcon({
      className: 'price-label-marker',
      html: priceLabelHTML,
      iconSize: [Math.max(textWidth, 40), textHeight],
      iconAnchor: [Math.max(textWidth, 40) / 2, textHeight / 2],
    }),
  }).addTo(map);

  priceLabel.on('click', async () => {
    if (selectedAirport && selectedAirport !== destAirport.code) {
      await addToItinerary(selectedAirport, destAirport.code);
    }
  });

  // Add coordinated hover events to price label
  const distance = calculateDistance(sourceAirport, destAirport);
  priceLabel.on('mouseover', () => {
    enhanceRouteElements(destAirport.code);
    updateFlightPricesSection(sourceAirport, destAirport, priceData, distance);
  });

  priceLabel.on('mouseout', () => {
    restoreRouteElements(destAirport.code);
    updateFlightPricesSection(); // Restore original content
  });

  currentRouteLines.push(priceLabel);
  return priceLabel;
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
    createRouteVisualization(routeInfo);
    validRoutes++;
  });

  return validRoutes;
}

function updateAirportTransparency(selectedAirportCode: string | null): void {
  if (!selectedAirportCode) {
    // Reset all airports to full opacity
    markers.forEach((marker) => {
      const markerElement = marker.getElement();
      if (markerElement) {
        const markerDiv = markerElement.querySelector('div');
        if (markerDiv) {
          markerDiv.style.opacity = '1';
        }
      }
    });
    return;
  }

  const connectedAirports = ryanairRoutes[selectedAirportCode] || [];
  const connectedSet = new Set([selectedAirportCode, ...connectedAirports]);

  markers.forEach((marker) => {
    // Use the stored airport code instead of coordinate comparison
    const airportCode = (marker as L.Marker & { airportCode: string }).airportCode;

    if (airportCode) {
      const markerElement = marker.getElement();
      if (markerElement) {
        const markerDiv = markerElement.querySelector('div');
        if (markerDiv) {
          const opacity = connectedSet.has(airportCode) ? '1' : '0.2';
          markerDiv.style.opacity = opacity;
        }
      }
    }
  });
}

function getItineraryAirports(): Set<string> {
  const itineraryAirports = new Set<string>();

  currentItinerary.forEach((item) => {
    if (item.type === 'flight') {
      const segment = item as ItinerarySegment;
      itineraryAirports.add(segment.from.code);
      itineraryAirports.add(segment.to.code);
    } else if (item.type === 'gap') {
      const gap = item as ItineraryGap;
      itineraryAirports.add(gap.lastAirport.code);
      itineraryAirports.add(gap.nextAirport.code);
    }
  });

  return itineraryAirports;
}

function getCurrentDestination(): string | null {
  if (currentItinerary.length === 0) return null;

  const lastItem = currentItinerary[currentItinerary.length - 1];
  if (lastItem?.type === 'flight') {
    return (lastItem as ItinerarySegment).to.code;
  } else if (lastItem?.type === 'gap') {
    return (lastItem as ItineraryGap).nextAirport.code;
  }

  return null;
}

function updateMarkerStyles(): void {
  const itineraryAirports = getItineraryAirports();
  const currentDestination = getCurrentDestination();

  markers.forEach((marker) => {
    const airportCode = (marker as L.Marker & { airportCode: string }).airportCode;
    if (!airportCode) return;

    const airport = airportLookup[airportCode];
    if (!airport) return;

    const routeCount = ryanairRoutes[airportCode]?.length || 0;
    let markerType: 'default' | 'itinerary' | 'current-destination' = 'default';

    if (currentDestination === airportCode) {
      markerType = 'current-destination';
    } else if (itineraryAirports.has(airportCode)) {
      markerType = 'itinerary';
    }

    // Create new icon with appropriate style
    const newIcon = createAirportIcon(routeCount, markerType);
    if (newIcon) {
      marker.setIcon(newIcon);
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

// Popup functionality removed

function addTileSelector(defaultValue: string): void {
  // Use React component for tile selector
  const tileControl = createReactTileSelector(changeTileLayer, defaultValue);
  tileControl.addTo(map);
}

function addReactLegend(): void {
  const legend = L.control({ position: 'bottomleft' });

  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'react-legend-container');
    legendContainer = div;

    // Initialize React root for legend
    legendRoot = createRoot(div);

    // Render initial legend
    const totalCountries = new Set(ryanairAirports.map((a) => a.country)).size;
    legendRoot.render(
      React.createElement(Legend, {
        totalAirports: ryanairAirports.length,
        totalCountries: totalCountries,
        showFlightPrices: false,
      })
    );

    return div;
  };

  legend.addTo(map);
}

function updateReactLegend(selectedAirport: Airport | null, routeCount?: number, isHover: boolean = false): void {
  if (!legendRoot) return;

  const totalCountries = new Set(ryanairAirports.map((a) => a.country)).size;

  legendRoot.render(
    React.createElement(Legend, {
      selectedAirport,
      routeCount,
      isHover,
      totalAirports: ryanairAirports.length,
      totalCountries: totalCountries,
      showFlightPrices: !!selectedAirport,
    })
  );
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

export function setupLocationButton(): void {
  // Set up the location button functionality (now integrated in search panel)
  const locationButton = document.getElementById('location-button') as HTMLButtonElement;
  if (locationButton) {
    locationButton.addEventListener('click', () => {
      requestUserLocation();
    });
  }
}

function requestUserLocation(): void {
  const locationButton = document.getElementById('location-button') as HTMLButtonElement;

  if (!locationButton) return;

  // Update button to show loading state
  const originalText = locationButton.textContent;
  locationButton.textContent = '🔄';
  locationButton.disabled = true;

  if (!navigator.geolocation) {
    // Reset button first
    locationButton.textContent = originalText;
    locationButton.disabled = false;
    // Fallback: ask user to enter location manually
    promptForManualLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const currentZoom = map.getZoom ? map.getZoom() : 4;

      // Center map on user's location without changing zoom
      map.setView([latitude, longitude], currentZoom);

      // Reset button
      locationButton.textContent = originalText;
      locationButton.disabled = false;
    },
    (error) => {
      console.log('Geolocation error:', error);
      // Fallback: ask user to enter location manually
      promptForManualLocation();
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    }
  );
}

function promptForManualLocation(): void {
  const locationButton = document.getElementById('location-button') as HTMLButtonElement;

  if (!locationButton) return;

  const location = prompt('Enter your city or location (e.g., "Paris", "London", "Berlin"):');

  // Reset button state
  const originalText = '📍';
  locationButton.textContent = originalText;
  locationButton.disabled = false;

  if (!location || location.trim() === '') {
    return;
  }

  // Simple geocoding using a basic approach
  // Try to find matching airport first
  const searchTerm = location.toLowerCase().trim();
  const matchingAirport = ryanairAirports.find(
    (airport) =>
      airport.city.toLowerCase().includes(searchTerm) ||
      airport.country.toLowerCase().includes(searchTerm) ||
      airport.name.toLowerCase().includes(searchTerm)
  );

  if (matchingAirport) {
    const currentZoom = map.getZoom ? map.getZoom() : 4;
    map.setView([matchingAirport.lat, matchingAirport.lng], currentZoom);
    return;
  }

  // If no airport match, try basic city coordinates
  const cityCoordinates = getCityCoordinates(searchTerm);
  if (cityCoordinates) {
    const currentZoom = map.getZoom ? map.getZoom() : 4;
    map.setView(cityCoordinates, currentZoom);
  } else {
    alert(`Sorry, couldn't find location "${location}". Try entering a major European city.`);
  }
}

function getCityCoordinates(city: string): [number, number] | null {
  // Basic hardcoded coordinates for major European cities
  const cities: { [key: string]: [number, number] } = {
    london: [51.5074, -0.1278],
    paris: [48.8566, 2.3522],
    berlin: [52.52, 13.405],
    madrid: [40.4168, -3.7038],
    rome: [41.9028, 12.4964],
    amsterdam: [52.3676, 4.9041],
    vienna: [48.2082, 16.3738],
    prague: [50.0755, 14.4378],
    budapest: [47.4979, 19.0402],
    warsaw: [52.2297, 21.0122],
    stockholm: [59.3293, 18.0686],
    copenhagen: [55.6761, 12.5683],
    oslo: [59.9139, 10.7522],
    helsinki: [60.1699, 24.9384],
    dublin: [53.3498, -6.2603],
    lisbon: [38.7223, -9.1393],
    barcelona: [41.3851, 2.1734],
    milan: [45.4642, 9.19],
    munich: [48.1351, 11.582],
    zurich: [47.3769, 8.5417],
    brussels: [50.8503, 4.3517],
    athens: [37.9838, 23.7275],
    istanbul: [41.0082, 28.9784],
  };

  for (const [cityName, coords] of Object.entries(cities)) {
    if (cityName.includes(city) || city.includes(cityName)) {
      return coords;
    }
  }

  return null;
}
