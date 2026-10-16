import L from 'leaflet';
import { createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ItineraryPanel } from './components/ItineraryPanel.tsx';
import { Legend, type LegendProps } from './components/Legend.tsx';
import { SearchControl } from './components/SearchControl.tsx';
import { systemTileProvider, TileSelector } from './components/TileSelector.tsx';
import { TripPlanner } from './components/TripPlanner.tsx';
import type { Trip } from './planner.ts';
import { legFare } from './services/fare-service.ts';
import { createItineraryLine, focusSegment, highlightSegment } from './services/itinerary-service.ts';
import { createTileLayer, type TileProviderKey } from './services/map-service.ts';
import { clearRoutes, drawRoute, setRouteHover } from './services/route-service.ts';
import type { Airport, ItineraryItem, LiveFare, PriceRange, Routes } from './types.ts';
import {
  addDays,
  calculateDistance,
  daysBetween,
  estimateFlightPrice,
  generateCurvedPath,
  getPriceColor,
} from './utils.ts';

const DEFAULT_NIGHTS = 2;

type MarkerType = 'default' | 'itinerary' | 'current-destination';

function airportIcon(routeCount: number, type: MarkerType): L.DivIcon {
  const typeClass = type === 'default' ? '' : ` ${type}`;
  return L.divIcon({
    className: 'ryanair-marker',
    html: `<div class="airport-icon ryanair-marker${typeClass}">${routeCount}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function addReactControl(map: L.Map, position: L.ControlPosition, element: ReactElement): Root {
  const container = L.DomUtil.create('div');
  L.DomEvent.disableClickPropagation(container);
  L.DomEvent.disableScrollPropagation(container);
  const control = new L.Control({ position });
  control.onAdd = () => container;
  control.addTo(map);
  const root = createRoot(container);
  root.render(element);
  return root;
}

export function initializeMap(container: HTMLElement, airports: Airport[], routes: Routes): L.Map {
  const map = L.map(container, { zoomControl: false }).setView([50.0, 10.0], 4);
  let tileLayer = createTileLayer(systemTileProvider()).addTo(map);
  const changeTileLayer = (key: TileProviderKey) => {
    tileLayer.remove();
    tileLayer = createTileLayer(key).addTo(map);
  };

  const airportByCode = new Map(airports.map((a) => [a.code, a]));
  const markers = new Map<string, L.Marker>();
  const routeCount = (code: string) => routes[code]?.length ?? 0;
  const fadedRoutes = L.layerGroup().addTo(map);
  const itineraryLayer = L.featureGroup().addTo(map);
  const itinerary: ItineraryItem[] = [];
  /** YYYY-MM-DD of the first leg; empty = no dates, estimated prices. */
  let startDate = '';
  let selected: Airport | null = null;
  let priceRange: PriceRange | null = null;

  const flyTo = (lat: number, lng: number) => map.flyTo([lat, lng], 10);
  addReactControl(map, 'topright', createElement(SearchControl, { airports, flyTo }));
  addReactControl(map, 'topleft', createElement(TileSelector, { onTileChange: changeTileLayer }));
  addReactControl(map, 'topleft', createElement(TripPlanner, { airports, routes, onTripSelect: loadTrip }));
  const legendBase = { totalAirports: airports.length, totalCountries: new Set(airports.map((a) => a.country)).size };
  const legendRoot = addReactControl(map, 'bottomleft', createElement(Legend, legendBase));
  const itineraryRoot = addReactControl(map, 'bottomright', createElement(ItineraryPanel, itineraryProps()));

  function updateLegend(props: Omit<LegendProps, keyof typeof legendBase> = {}) {
    legendRoot.render(createElement(Legend, { ...legendBase, ...props }));
  }

  function showSelectedInLegend() {
    updateLegend(selected ? { airport: selected, routeCount: routeCount(selected.code), priceRange } : {});
  }

  function itineraryProps() {
    return {
      itinerary: [...itinerary],
      startDate,
      onStartDateChange: (date: string) => {
        startDate = date;
        updateItinerary();
      },
      onNightsChange: (index: number, nights: number) => {
        const item = itinerary[index];
        if (item) item.nights = nights;
        updateItinerary();
      },
      onClear: clearItinerary,
      onSegmentHover: highlightSegment,
      onSegmentClick: (segment: Parameters<typeof focusSegment>[1]) => focusSegment(map, segment),
    };
  }

  /** Date every leg from the start date and fetch live fares for legs whose date changed. */
  function refreshDatesAndFares() {
    let date = startDate;
    for (const item of itinerary) {
      item.date = date || undefined;
      if (date) date = addDays(date, item.nights);
      if (item.type !== 'flight') continue;
      const legDate = item.date;
      if (!legDate) {
        item.liveFare = undefined;
        continue;
      }
      if (item.liveFare?.date === legDate) continue;
      item.liveFare = { date: legDate, status: 'loading' };
      const done = (fare: LiveFare) => {
        if (item.liveFare?.date !== legDate) return; // date changed while loading
        item.liveFare = fare;
        updateItinerary();
      };
      legFare(item.from.code, item.to.code, legDate).then(
        (result) => done({ date: legDate, status: 'found', ...result }),
        (error) => {
          console.error(`Fare lookup failed for ${item.from.code}→${item.to.code} on ${legDate}`, error);
          done({ date: legDate, status: 'error' });
        }
      );
    }
  }

  function updateItinerary() {
    refreshDatesAndFares();
    const last = itinerary.at(-1);
    const inItinerary = new Set(itinerary.flatMap((item) => [item.from.code, item.to.code]));
    for (const [code, marker] of markers) {
      const type: MarkerType =
        last?.to.code === code ? 'current-destination' : inItinerary.has(code) ? 'itinerary' : 'default';
      marker.setIcon(airportIcon(routeCount(code), type));
    }
    itineraryRoot.render(createElement(ItineraryPanel, itineraryProps()));
  }

  function addFlight(from: Airport, to: Airport, nights = DEFAULT_NIGHTS) {
    itinerary.push({
      type: 'flight',
      from,
      to,
      nights,
      priceData: estimateFlightPrice(from, to),
      distance: calculateDistance(from, to),
      line: createItineraryLine(from, to).addTo(itineraryLayer),
    });
  }

  function clearItinerary() {
    itineraryLayer.clearLayers();
    itinerary.length = 0;
    updateItinerary();
  }

  /** Replace the itinerary with a planned trip, dated so the panel fetches its live fares. */
  function loadTrip(trip: Trip) {
    itineraryLayer.clearLayers();
    itinerary.length = 0;
    trip.legs.forEach((leg, i) => {
      const from = airportByCode.get(leg.from);
      const to = airportByCode.get(leg.to);
      if (!from || !to) throw new Error(`Planned trip uses an unknown airport: ${leg.from}→${leg.to}`);
      const next = trip.legs[i + 1];
      addFlight(from, to, next ? daysBetween(leg.date, next.date) : 0);
    });
    startDate = trip.legs[0]?.date ?? '';
    select(null);
    updateItinerary();
    map.flyToBounds(itineraryLayer.getBounds(), { padding: [40, 40] });
  }

  function showRoutesFrom(source: Airport) {
    clearRoutes();
    const destinations = (routes[source.code] ?? []).flatMap((code) => airportByCode.get(code) ?? []);
    const priced = destinations.map((dest) => ({ dest, price: estimateFlightPrice(source, dest).price }));
    const prices = priced.map((p) => p.price);
    priceRange = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
    for (const { dest, price } of priced) {
      const color = priceRange ? getPriceColor(price, priceRange.min, priceRange.max) : '#ff0066';
      drawRoute(map, source, dest, price, color, markers.get(dest.code));
    }
  }

  function setMarkerOpacity(connectedTo: string | null) {
    const connected = new Set(connectedTo ? [connectedTo, ...(routes[connectedTo] ?? [])] : []);
    for (const [code, marker] of markers) marker.setOpacity(!connectedTo || connected.has(code) ? 1 : 0.2);
  }

  function select(airport: Airport | null) {
    selected = airport;
    if (airport) {
      showRoutesFrom(airport);
    } else {
      clearRoutes();
      priceRange = null;
    }
    setMarkerOpacity(airport?.code ?? null);
    showSelectedInLegend();
  }

  function onAirportClick(airport: Airport) {
    if (selected?.code === airport.code) return select(null);
    if (selected) {
      const isDirect = routes[selected.code]?.includes(airport.code) ?? false;
      if (isDirect) addFlight(selected, airport);
      else itinerary.push({ type: 'gap', from: selected, to: airport, nights: DEFAULT_NIGHTS });
      updateItinerary();
    }
    select(airport);
  }

  function onAirportHover(airport: Airport, hover: boolean) {
    if (selected?.code === airport.code) return;
    const isDestination = selected ? (routes[selected.code]?.includes(airport.code) ?? false) : false;
    if (isDestination) setRouteHover(airport.code, hover, [airport.lat, airport.lng]);
    fadedRoutes.clearLayers();
    if (!hover) return showSelectedInLegend();

    for (const code of routes[airport.code] ?? []) {
      const dest = airportByCode.get(code);
      if (!dest) continue;
      L.polyline(generateCurvedPath(airport.lat, airport.lng, dest.lat, dest.lng, 15), {
        color: '#003d82',
        weight: 1,
        opacity: 0.3,
      }).addTo(fadedRoutes);
    }
    updateLegend({ airport, routeCount: routeCount(airport.code), isHover: true, priceRange });
  }

  for (const airport of airports) {
    const marker = L.marker([airport.lat, airport.lng], { icon: airportIcon(routeCount(airport.code), 'default') })
      .bindTooltip(`${airport.flag} ${airport.name}`, { direction: 'top', offset: [0, -10] })
      .on('click', () => onAirportClick(airport))
      .on('mouseover', () => onAirportHover(airport, true))
      .on('mouseout', () => onAirportHover(airport, false))
      .addTo(map);
    markers.set(airport.code, marker);
  }

  return map;
}
