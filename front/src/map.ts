import L from 'leaflet';
import { createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AirlineFilter } from './components/AirlineFilter.tsx';
import { ItineraryPanel } from './components/ItineraryPanel.tsx';
import { Legend, type LegendProps } from './components/Legend.tsx';
import { SearchControl } from './components/SearchControl.tsx';
import { systemTileProvider } from './components/TileSelector.tsx';
import { TripPlanner } from './components/TripPlanner.tsx';
import { itineraryFromSearch, itineraryToSearch } from './itinerary-url.ts';
import type { Trip } from './planner.ts';
import { legFare } from './services/fare-service.ts';
import {
  createItineraryLine,
  createPreviewLine,
  focusSegment,
  highlightSegment,
  PREVIEW_PANE,
} from './services/itinerary-service.ts';
import { createTileLayer, type TileProviderKey } from './services/map-service.ts';
import { clearRoutes, drawRoute, setRouteHover } from './services/route-service.ts';
import type { Airline, Airport, ItineraryItem, ItinerarySegment, LiveFare, PriceRange, RouteNetwork } from './types.ts';
import {
  addDays,
  calculateDistance,
  daysBetween,
  estimateFlightPrice,
  filterRoutes,
  generateCurvedPath,
  getPriceColor,
} from './utils.ts';

const DEFAULT_NIGHTS = 2;

/** Set each step's travel day from the start date and the nights before it. */
function dateItinerary(itinerary: ItineraryItem[], startDate: string) {
  let date = startDate;
  for (const item of itinerary) {
    item.date = date || undefined;
    if (date) date = addDays(date, item.nights);
  }
}

type MarkerType = 'default' | 'itinerary' | 'current-destination';

function airportIcon(routeCount: number, type: MarkerType): L.DivIcon {
  const typeClass = type === 'default' ? '' : ` ${type}`;
  return L.divIcon({
    className: 'airport-marker',
    html: `<div class="airport-icon${typeClass}">${routeCount}</div>`,
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

export function initializeMap(
  container: HTMLElement,
  airports: Airport[],
  network: RouteNetwork,
  airlines: Airline[]
): L.Map {
  const map = L.map(container, { zoomControl: false }).setView([50.0, 10.0], 4);
  let tileLayer = createTileLayer(systemTileProvider()).addTo(map);
  const changeTileLayer = (key: TileProviderKey) => {
    tileLayer.remove();
    tileLayer = createTileLayer(key).addTo(map);
  };

  const airportByCode = new Map(airports.map((a) => [a.code, a]));
  const markers = new Map<string, L.Marker>();
  const airlineByCode = new Map(airlines.map((a) => [a.code, a]));
  let enabledAirlines = new Set(airlines.map((a) => a.code));
  let routes = filterRoutes(network, enabledAirlines);
  const routeCount = (code: string) => routes[code]?.length ?? 0;
  const routeAirlines = (from: string, to: string) =>
    (network[from]?.[to] ?? [])
      .filter((code) => enabledAirlines.has(code))
      .flatMap((code) => airlineByCode.get(code) ?? []);
  const fadedRoutes = L.layerGroup().addTo(map);
  // Below the overlay pane (400) so a previewed trip never covers the real itinerary
  map.createPane(PREVIEW_PANE).style.zIndex = '390';
  const previewLayer = L.layerGroup().addTo(map);
  const itineraryLayer = L.featureGroup().addTo(map);
  const itinerary: ItineraryItem[] = [];
  /** YYYY-MM-DD of the first leg; empty = no dates, estimated prices. */
  let startDate = '';
  let selected: Airport | null = null;
  let priceRange: PriceRange | null = null;

  const flyTo = (lat: number, lng: number) => map.flyTo([lat, lng], 10);
  addReactControl(
    map,
    'topright',
    createElement(
      'div',
      { className: 'panel search-panel' },
      createElement(SearchControl, { airports, flyTo }),
      airlines.length > 1 && createElement(AirlineFilter, { airlines, onChange: changeAirlines })
    )
  );
  const plannerRoot = addReactControl(map, 'topleft', createElement(TripPlanner, plannerProps()));
  const legendBase = {
    totalAirports: airports.length,
    totalCountries: new Set(airports.map((a) => a.country)).size,
    onTileChange: changeTileLayer,
  };
  const legendRoot = addReactControl(map, 'bottomleft', createElement(Legend, legendBase));
  const itineraryRoot = addReactControl(map, 'bottomright', createElement(ItineraryPanel, itineraryProps()));

  function updateLegend(props: Omit<LegendProps, keyof typeof legendBase> = {}) {
    legendRoot.render(createElement(Legend, { ...legendBase, ...props }));
  }

  function showSelectedInLegend() {
    updateLegend(selected ? { airport: selected, routeCount: routeCount(selected.code), priceRange } : {});
  }

  function estimate(from: string, to: string) {
    const a = airportByCode.get(from);
    const b = airportByCode.get(to);
    return a && b ? estimateFlightPrice(a, b).price : undefined;
  }

  function plannerProps() {
    return { airports, airlines, network, enabledAirlines, onTripSelect: loadTrip, onTripHover: previewTrip };
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

  /** Look up the live fare of a leg for `date`, ignoring the answer if the leg was re-dated meanwhile. */
  function fetchLiveFare(item: ItinerarySegment, date: string) {
    item.liveFare = { date, status: 'loading' };
    const done = (fare: LiveFare) => {
      if (item.liveFare?.date !== date) return;
      item.liveFare = fare;
      updateItinerary();
    };
    const codes = item.airlines.map((a) => a.code);
    legFare(item.from.code, item.to.code, date, codes, estimate).then(
      (result) => done({ date, status: 'found', ...result }),
      (error) => {
        console.error(`Fare lookup failed for ${item.from.code}→${item.to.code} on ${date}`, error);
        done({ date, status: 'error' });
      }
    );
  }

  /** Date every leg from the start date and fetch fares for legs whose date changed. */
  function refreshDatesAndFares() {
    dateItinerary(itinerary, startDate);
    for (const leg of itinerary) {
      if (leg.type !== 'flight') continue;
      if (!leg.date) leg.liveFare = undefined;
      else if (leg.liveFare?.date !== leg.date) fetchLiveFare(leg, leg.date);
    }
  }

  /** Restyle markers for the itinerary and hide airports no enabled airline serves. */
  function refreshMarkers() {
    const last = itinerary.at(-1);
    const inItinerary = new Set(itinerary.flatMap((item) => [item.from.code, item.to.code]));
    for (const [code, marker] of markers) {
      const type: MarkerType =
        last?.to.code === code ? 'current-destination' : inItinerary.has(code) ? 'itinerary' : 'default';
      marker.setIcon(airportIcon(routeCount(code), type));
      if (routeCount(code) > 0 || inItinerary.has(code)) marker.addTo(map);
      else marker.remove();
    }
  }

  function updateItinerary() {
    refreshDatesAndFares();
    refreshMarkers();
    itineraryRoot.render(createElement(ItineraryPanel, itineraryProps()));
    saveItineraryInUrl();
  }

  // replaceState, not pushState: the URL tracks the current plan without adding a history entry per click
  function saveItineraryInUrl() {
    const search = itineraryToSearch(
      {
        legs: itinerary.map((item) => [item.from.code, item.to.code]),
        start: startDate,
        nights: itinerary.slice(0, -1).map((item) => item.nights),
      },
      location.search
    );
    history.replaceState(history.state, '', `${location.pathname}${search}${location.hash}`);
  }

  function restoreItineraryFromUrl() {
    const saved = itineraryFromSearch(location.search);
    if (!saved) return;
    for (const [i, [fromCode, toCode]] of saved.legs.entries()) {
      const from = airportByCode.get(fromCode);
      const to = airportByCode.get(toCode);
      if (!from || !to) {
        console.warn(`Ignoring itinerary in URL: unknown airport in ${fromCode}-${toCode}`);
        return clearItinerary();
      }
      const nights = saved.nights[i] ?? DEFAULT_NIGHTS;
      if (network[fromCode]?.[toCode]) addFlight(from, to, routeAirlines(fromCode, toCode), nights);
      else itinerary.push({ type: 'gap', from, to, nights });
    }
    startDate = saved.start;
    updateItinerary();
    map.fitBounds(itineraryLayer.getBounds(), { padding: [40, 40] });
  }

  function addFlight(from: Airport, to: Airport, legAirlines: Airline[], nights = DEFAULT_NIGHTS) {
    itinerary.push({
      type: 'flight',
      from,
      to,
      nights,
      priceData: estimateFlightPrice(from, to),
      airlines: legAirlines,
      distance: calculateDistance(from, to),
      line: createItineraryLine(from, to, legAirlines).addTo(itineraryLayer),
    });
  }

  function changeAirlines(enabled: Set<string>) {
    enabledAirlines = enabled;
    routes = filterRoutes(network, enabledAirlines);
    plannerRoot.render(createElement(TripPlanner, plannerProps()));
    refreshMarkers();
    select(selected);
  }

  function clearItinerary() {
    itineraryLayer.clearLayers();
    itinerary.length = 0;
    updateItinerary();
  }

  function previewTrip(trip: Trip | null) {
    previewLayer.clearLayers();
    for (const leg of trip?.legs ?? []) {
      const from = airportByCode.get(leg.from);
      const to = airportByCode.get(leg.to);
      if (from && to) createPreviewLine(from, to).addTo(previewLayer);
    }
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
      const airline = airlineByCode.get(leg.airline);
      addFlight(from, to, airline ? [airline] : [], next ? daysBetween(leg.date, next.date) : 0);
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
      const color = getPriceColor(price, priceRange?.min ?? price, priceRange?.max ?? price);
      const names = routeAirlines(source.code, dest.code).map((a) => a.name);
      drawRoute(map, source, dest, price, color, names, markers.get(dest.code));
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
      if (isDirect) addFlight(selected, airport, routeAirlines(selected.code, airport.code));
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
        color: '#475569',
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
      .on('mouseout', () => onAirportHover(airport, false));
    markers.set(airport.code, marker);
  }
  refreshMarkers();
  restoreItineraryFromUrl();

  return map;
}
