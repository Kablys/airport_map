import L from 'leaflet';
import type { Airport } from '../types.ts';
import { calculateDistance, generateCurvedPath } from '../utils.ts';

interface RouteElements {
  line: L.Polyline;
  label: L.Marker;
  tooltip: L.Tooltip;
  midpoint: L.LatLngTuple;
  /** Shared airport marker owned by map.ts; only its CSS class is touched here. */
  destinationMarker: L.Marker | undefined;
}

const routes = new Map<string, RouteElements>();
const routeLayer = L.layerGroup();

function priceLabelIcon(price: number, color: string): L.DivIcon {
  const text = `€${price}`;
  const width = Math.max(text.length * 6 + 8, 40);
  return L.divIcon({
    className: 'price-label-marker',
    html: `<div class="price-label" style="--label-bg:${color};--label-width:${width}px">${text}</div>`,
    iconSize: [width, 18],
    iconAnchor: [width / 2, 9],
  });
}

function routeTooltipContent(source: Airport, dest: Airport, price: number, airlines: string[]): HTMLElement {
  const el = document.createElement('div');
  el.className = 'destination-tooltip';
  const title = document.createElement('div');
  title.className = 'destination-tooltip__title';
  title.textContent = `${source.city} (${source.code}) → ${dest.city} (${dest.code})`;
  el.append(title);
  for (const [label, value] of [
    ['Airlines', airlines.join(', ')],
    ['Est. price', `€${price}`],
    ['Distance', `${calculateDistance(source, dest)} km`],
  ]) {
    const row = document.createElement('div');
    row.className = 'destination-tooltip__row';
    const labelEl = document.createElement('span');
    labelEl.className = 'destination-tooltip__label';
    labelEl.textContent = label ?? '';
    row.append(labelEl, value ?? '');
    el.append(row);
  }
  return el;
}

export function drawRoute(
  map: L.Map,
  source: Airport,
  dest: Airport,
  price: number,
  color: string,
  airlines: string[],
  destinationMarker: L.Marker | undefined
): void {
  routeLayer.addTo(map);
  const path = generateCurvedPath(source.lat, source.lng, dest.lat, dest.lng);
  const line = L.polyline(path, { color, weight: 3, opacity: 0.6, className: 'route-line' }).addTo(routeLayer);
  const labelPosition = path[Math.round((path.length - 1) * 0.9)] ?? [dest.lat, dest.lng];
  const label = L.marker(labelPosition, { icon: priceLabelIcon(price, color) }).addTo(routeLayer);
  const tooltip = L.tooltip({ direction: 'auto', className: 'route-tooltip', opacity: 0.95, offset: [0, -8] });
  tooltip.setContent(routeTooltipContent(source, dest, price, airlines));

  routes.set(dest.code, {
    line,
    label,
    tooltip,
    midpoint: path[Math.floor(path.length / 2)] ?? labelPosition,
    destinationMarker,
  });
  for (const layer of [line, label]) {
    layer.on('mouseover', () => setRouteHover(dest.code, true));
    layer.on('mouseout', () => setRouteHover(dest.code, false));
  }
}

/** Highlight a drawn route and show its tooltip (at `at`, or the route midpoint). */
export function setRouteHover(destinationCode: string, hover: boolean, at?: L.LatLngExpression): void {
  const route = routes.get(destinationCode);
  if (!route) return;
  route.line.getElement()?.classList.toggle('route-line--hover', hover);
  route.label.getElement()?.querySelector('.price-label')?.classList.toggle('price-label--hover', hover);
  route.destinationMarker
    ?.getElement()
    ?.querySelector('.airport-icon')
    ?.classList.toggle('airport-marker--hover', hover);
  if (hover) {
    route.tooltip.setLatLng(at ?? route.midpoint);
    routeLayer.addLayer(route.tooltip);
  } else {
    routeLayer.removeLayer(route.tooltip);
  }
}

export function clearRoutes(): void {
  for (const code of routes.keys()) setRouteHover(code, false);
  routeLayer.clearLayers();
  routes.clear();
}
