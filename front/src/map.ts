/// <reference lib="dom" />
/// <reference types="leaflet" />

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createAirportIconFromReact } from './components/AirportMarker.tsx';
import { ReactMapUIManager } from './components/CompleteMapUI.tsx';
import { ItineraryPanel } from './components/ItineraryPanel.tsx';
import {
  addGap as addItineraryGapService,
  clearItinerary as clearItineraryService,
  createItineraryLine,
  highlightItinerarySegment as highlightItinerarySegmentService,
  pushItinerarySegment,
  showItinerarySegmentPopup as showItinerarySegmentPopupService,
} from './services/itinerary-service.ts';
import { createTileLayer, getDefaultProviderKey, tileProviders } from './services/map-service.ts';
import {
  drawRoute,
  enhanceRouteElements,
  removeAllRouteElements,
  restoreRouteElements,
} from './services/route-service.ts';
import type { Airport, Routes } from './types.ts';
import { calculateDistance, calculateFlightDuration, generateCurvedPath } from './utils.ts';

// Since we're using Leaflet from CDN, declare it as global
declare const L: typeof import('leaflet');

// Extend Leaflet Marker to include tooltip property
interface MarkerWithTooltip extends L.Marker {
  _tooltip?: L.Tooltip;
}

import { ryanairAirports, ryanairRoutes } from './data.ts';

import type { FlightPriceData, ItineraryGap, ItineraryItem, ItinerarySegment } from './types.ts';

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
let uiManager: ReactMapUIManager | null = null;

// Itinerary tracking

const currentItinerary: ItineraryItem[] = [];
const itineraryLines: L.Polyline[] = [];
let itineraryRoot: any = null;
// Legacy legend React root/container removed; legend is managed by ReactMapUIManager

// Tile providers moved to services/map-service.ts

export function initializeMap(airports: Airport[], routes: Routes): L.Map {
  console.debug('[initializeMap] start');
  try {
    map = L.map('map', { zoomControl: false }).setView([50.0, 10.0], 4);

    // Detect user's color scheme preference and set default tile
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const defaultKey = getDefaultProviderKey(!!prefersDark);
    console.debug('[initializeMap] tile default =', defaultKey);
    const initialLayer = createTileLayer(defaultKey);
    if (initialLayer) {
      currentTileLayer = initialLayer.addTo(map);
    }

    // Wire React-driven UI controls via manager
    console.debug('[initializeMap] creating UI manager');
    uiManager = new ReactMapUIManager(map as unknown as L.Map, ryanairAirports);
    uiManager.addSearchControl();
    uiManager.addTileSelector(changeTileLayer, prefersDark ? 'dark' : 'light');
    uiManager.addLegend();

    // Location control is now integrated into search panel

    airportsByCountry = {};
    console.debug('[initializeMap] creating markers for', airports.length, 'airports');
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

      const icon = createAirportIconFromReact(routeCount);
      if (!icon) return; // Skip if icon creation failed

      const marker = L.marker([airport.lat, airport.lng], {
        icon: icon,
      }).addTo(map);
      // Ensure a stable selector for tests regardless of Leaflet internals
      try {
        (marker as any).getElement?.()?.classList?.add('ryanair-marker');
      } catch {}

      // Store airport code on the marker for easy lookup
      (marker as L.Marker & { airportCode: string }).airportCode = airport.code;

      marker.on('click', async (_e: L.LeafletMouseEvent) => {
        // Clicking the same airport toggles off
        if (selectedAirport === airport.code) {
          clearRouteLines();
          selectedAirport = null;
          updateReactLegend(null);
          return;
        }

        // If a different airport is selected currently
        if (selectedAirport && selectedAirport !== airport.code) {
          if (isDestinationAirport(airport.code)) {
            await addToItinerary(selectedAirport, airport.code);
            return;
          }
          // Not a direct destination from current selection -> add a gap
          await addItineraryGap(selectedAirport, airport.code);
          return;
        }

        // No airport selected yet -> select this one and show its routes
        updateReactLegend(airport, 'Loading...');
        const routeCount = await showRoutesFromAirport(airport.code);
        selectedAirport = airport.code;
        updateReactLegend(airport, routeCount);
        updateAirportTransparency(airport.code);
      });

      marker.on('mouseover', async (e: L.LeafletMouseEvent) => {
        if (selectedAirport !== airport.code) {
          showFadedRoutes(airport.code);
          // Update legend with hovered airport info
          const routeCountHover = ryanairRoutes[airport.code]?.length || 0;
          updateReactLegend(airport, routeCountHover, true);

          // If there's a selected airport and this is a destination, enhance route
          if (selectedAirport && ryanairRoutes[selectedAirport]?.includes(airport.code)) {
            enhanceRouteElements(airport.code);
          }
        }

        // Tooltip showing airport name
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
      // Guard against early/late callbacks where map panes aren't initialized
      if (!map) return;
      const anyMap = map as any;
      if (!anyMap._mapPane) return;
      // Batch to next frame to avoid layout thrash
      requestAnimationFrame(() => {
        try {
          map.invalidateSize();
        } catch {}
      });
    });

    const mapElement = document.getElementById('map');
    if (mapElement) {
      // Wait until map is fully ready so panes are initialized
      map.whenReady(() => {
        if (mapElement.isConnected) {
          try {
            resizeObserver.observe(mapElement);
          } catch {}
        }
      });
      // Ensure observer is cleaned up when the map unloads
      map.on('unload', () => {
        try {
          resizeObserver.disconnect();
        } catch {}
      });
    }

    console.debug('[initializeMap] done');
    return map;
  } catch (err: any) {
    console.error('[initializeMap] failed:', err?.stack || err);
    throw err;
  }
}

// Using shared icon factory from components/AirportMarker.tsx

function clearRouteLines(): void {
  // Remove lines added through direct tracking
  currentRouteLines.forEach((line) => map.removeLayer(line));
  currentRouteLines = [];
  currentPriceRange = { min: null, max: null };

  // Remove all registered route layers and clear registry
  removeAllRouteElements(map);

  // React legend derives price range when needed.
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
  const itineraryLine = createItineraryLine(map, fromAirport, toAirport);

  const segment: ItinerarySegment = {
    type: 'flight',
    from: fromAirport,
    to: toAirport,
    priceData,
    distance,
    line: itineraryLine,
  };

  pushItinerarySegment(segment, currentItinerary, itineraryLines, updateMarkerStyles, updateItineraryDisplay);

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

  addItineraryGapService(gap, currentItinerary, updateMarkerStyles, updateItineraryDisplay);

  // Show routes from the new destination
  updateReactLegend(toAirport, 'Loading...');
  const routeCount = await showRoutesFromAirport(toCode);
  selectedAirport = toCode;
  updateReactLegend(toAirport, routeCount);
  updateAirportTransparency(toCode);
}

function clearItinerary(): void {
  clearItineraryService(map, itineraryLines, currentItinerary, updateMarkerStyles, updateItineraryDisplay);
}

function highlightItinerarySegment(segmentIndex: number, highlight: boolean): void {
  highlightItinerarySegmentService(currentItinerary, segmentIndex, highlight);
}

function showItinerarySegmentPopup(segment: ItinerarySegment): void {
  showItinerarySegmentPopupService(map, segment);
}

// DOM creation functions moved to React components - ItineraryPanel.tsx

function updateItineraryDisplay(): void {
  let itineraryContainer = document.getElementById('itinerary-panel-container');
  if (!itineraryContainer) {
    // Create container dynamically if it doesn't exist (e.g., during tests or refactors)
    const div = document.createElement('div');
    div.id = 'itinerary-panel-container';
    document.body.appendChild(div);
    itineraryContainer = div;
  }

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

  const routes: string[] = ryanairRoutes[airportCode];
  routes.forEach((destinationCode: string) => {
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
  if (cached && typeof cached.lastUpdated === 'number' && Date.now() - cached.lastUpdated < PRICE_CACHE_DURATION) {
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

// Route elements helpers moved to services/route-service.ts

function getMarkerByAirportCode(airportCode: string): L.Marker | null {
  return (
    markers.find((marker) => {
      const markerWithCode = marker as L.Marker & { airportCode: string };
      return markerWithCode.airportCode === airportCode;
    }) || null
  );
}

async function showRoutesFromAirport(airportCode: string): Promise<number> {
  clearRouteLines();

  const sourceAirport = airportLookup[airportCode];
  if (!sourceAirport || !ryanairRoutes[airportCode]) {
    return 0;
  }

  const routes: string[] = ryanairRoutes[airportCode];
  let validRoutes = 0;

  const routePromises: Promise<{
    sourceAirport: Airport;
    destAirport: Airport;
    priceData: FlightPriceData | null;
    distance: number;
    destinationCode: string;
  } | null>[] = routes.map(async (destinationCode: string) => {
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

  const prices: number[] = routeResults
    .filter((r): r is NonNullable<typeof r> => !!r && !!r.priceData)
    .map((r) => r.priceData?.price)
    .filter((price): price is number => price !== undefined);
  updatePriceRange(prices);

  routeResults.forEach(
    (
      routeInfo: {
        sourceAirport: Airport;
        destAirport: Airport;
        priceData: FlightPriceData | null;
        distance: number;
        destinationCode: string;
      } | null
    ) => {
      if (!routeInfo) return;
      const line = drawRoute(map, routeInfo, getMarkerByAirportCode, currentPriceRange);
      currentRouteLines.push(line);
      validRoutes++;
    }
  );

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
    const newIcon = createAirportIconFromReact(routeCount, markerType);
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
  // React legend reads price range from state where applicable. No direct DOM update here.
}

// Popup functionality removed

function updateReactLegend(
  selectedAirport: Airport | null,
  routeCount?: string | number,
  isHover: boolean = false
): void {
  if (!uiManager) return;
  uiManager.updateLegend(selectedAirport, typeof routeCount === 'number' ? routeCount : undefined, isHover);
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
