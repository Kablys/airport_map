import L from 'leaflet';
import { createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AirlineFilter } from './components/AirlineFilter.tsx';
import { ItineraryPanel } from './components/ItineraryPanel.tsx';
import { Legend, type LegendProps } from './components/Legend.tsx';
import { SearchControl } from './components/SearchControl.tsx';
import { systemTileProvider, TileSelector } from './components/TileSelector.tsx';
import { createItineraryLine, focusSegment, highlightSegment } from './services/itinerary-service.ts';
import { createTileLayer, type TileProviderKey } from './services/map-service.ts';
import { clearRoutes, drawRoute, setRouteHover } from './services/route-service.ts';
import type { Airline, Airport, ItineraryItem, PriceRange, RouteNetwork } from './types.ts';
import { calculateDistance, estimateFlightPrice, filterRoutes, generateCurvedPath, getPriceColor } from './utils.ts';

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
  const airlineName = new Map(airlines.map((a) => [a.code, a.name]));
  let enabledAirlines = new Set(airlines.map((a) => a.code));
  let routes = filterRoutes(network, enabledAirlines);
  const routeCount = (code: string) => routes[code]?.length ?? 0;
  const routeAirlines = (from: string, to: string) =>
    (network[from]?.[to] ?? [])
      .filter((code) => enabledAirlines.has(code))
      .map((code) => airlineName.get(code) ?? code);
  const fadedRoutes = L.layerGroup().addTo(map);
  const itineraryLayer = L.layerGroup().addTo(map);
  const itinerary: ItineraryItem[] = [];
  let selected: Airport | null = null;
  let priceRange: PriceRange | null = null;

  const flyTo = (lat: number, lng: number) => map.flyTo([lat, lng], 10);
  addReactControl(map, 'topright', createElement(SearchControl, { airports, flyTo }));
  addReactControl(map, 'topleft', createElement(TileSelector, { onTileChange: changeTileLayer }));
  if (airlines.length > 1) {
    addReactControl(map, 'topleft', createElement(AirlineFilter, { airlines, onChange: changeAirlines }));
  }
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
      onClear: clearItinerary,
      onSegmentHover: highlightSegment,
      onSegmentClick: (segment: Parameters<typeof focusSegment>[1]) => focusSegment(map, segment),
    };
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
    refreshMarkers();
    itineraryRoot.render(createElement(ItineraryPanel, itineraryProps()));
  }

  function changeAirlines(enabled: Set<string>) {
    enabledAirlines = enabled;
    routes = filterRoutes(network, enabledAirlines);
    refreshMarkers();
    select(selected);
  }

  function clearItinerary() {
    itineraryLayer.clearLayers();
    itinerary.length = 0;
    updateItinerary();
  }

  function showRoutesFrom(source: Airport) {
    clearRoutes();
    const destinations = (routes[source.code] ?? []).flatMap((code) => airportByCode.get(code) ?? []);
    const priced = destinations.map((dest) => ({ dest, price: estimateFlightPrice(source, dest).price }));
    const prices = priced.map((p) => p.price);
    priceRange = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
    for (const { dest, price } of priced) {
      const color = priceRange ? getPriceColor(price, priceRange.min, priceRange.max) : '#ff0066';
      drawRoute(map, source, dest, price, color, routeAirlines(source.code, dest.code), markers.get(dest.code));
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
      if (isDirect) {
        const line = createItineraryLine(selected, airport).addTo(itineraryLayer);
        itinerary.push({
          type: 'flight',
          from: selected,
          to: airport,
          priceData: estimateFlightPrice(selected, airport),
          airlines: routeAirlines(selected.code, airport.code),
          distance: calculateDistance(selected, airport),
          line,
        });
      } else {
        itinerary.push({ type: 'gap', from: selected, to: airport });
      }
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
      .on('mouseout', () => onAirportHover(airport, false));
    markers.set(airport.code, marker);
  }
  refreshMarkers();

  return map;
}
