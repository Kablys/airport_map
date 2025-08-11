// Route service: manages route visual elements and coordinated hover effects
// Leaflet is provided globally via CDN
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const L: typeof import('leaflet');

import { createDestinationTooltip } from '../components/DestinationTooltip.tsx';
import { createPriceLabelMarker } from '../components/PriceLabel.tsx';
import type { Airport, FlightPriceData } from '../types.ts';
import { generateCurvedPath, getPriceColor } from '../utils.ts';

export interface RouteElements {
  line: L.Polyline;
  priceLabel: L.Marker;
  destinationMarker: L.Marker;
  destinationCode: string;
}

export const routeElementsMap = new Map<string, RouteElements>();

export function registerRouteElements(destinationCode: string, elements: RouteElements): void {
  routeElementsMap.set(destinationCode, elements);
}

export function clearRouteElements(): void {
  routeElementsMap.clear();
}

// Remove all registered route layers (lines, price labels, destination markers) from the map
export function removeAllRouteElements(map: L.Map): void {
  for (const { line, priceLabel, destinationMarker } of routeElementsMap.values()) {
    try {
      map.removeLayer(line);
    } catch {}
    try {
      map.removeLayer(priceLabel);
    } catch {}
    try {
      map.removeLayer(destinationMarker);
    } catch {}
  }
  routeElementsMap.clear();
}

export function enhanceRouteElements(destinationCode: string): void {
  const routeElements = routeElementsMap.get(destinationCode);
  if (!routeElements) return;

  // Enhance the flight line via CSS class
  const lineEl = routeElements.line.getElement();
  if (lineEl) {
    lineEl.classList.add('route-line--hover');
  }

  // Enhance the price label
  const priceLabelElement = routeElements.priceLabel.getElement();
  if (priceLabelElement) {
    const labelDiv = priceLabelElement.querySelector('.price-label') as HTMLElement | null;
    if (labelDiv) {
      labelDiv.classList.add('price-label--hover');
    }
  }

  // Enhance the destination marker
  const destinationMarkerElement = routeElements.destinationMarker.getElement();
  if (destinationMarkerElement) {
    const markerDiv = destinationMarkerElement.querySelector('div');
    if (markerDiv) {
      markerDiv.classList.add('airport-marker--hover');
    }
  }
}

export interface RouteInfo {
  sourceAirport: Airport;
  destAirport: Airport;
  priceData: FlightPriceData | null;
  distance: number;
}

export function drawRoute(
  map: L.Map,
  routeInfo: RouteInfo,
  getMarkerByAirportCode: (code: string) => L.Marker | null,
  currentPriceRange: { min: number | null; max: number | null }
): L.Polyline {
  const { sourceAirport, destAirport, priceData } = routeInfo;

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
    className: 'route-line',
  }).addTo(map);

  // Prepare tooltip at the midpoint of the curve
  const midIndex = Math.floor(curvedPath.length / 2);
  const midLatLng = curvedPath[midIndex] as [number, number];
  let tooltip: L.Tooltip | null = null;

  if (priceData) {
    const priceLabel = createPriceLabelMarker(
      sourceAirport,
      destAirport,
      priceData,
      lineColor,
      undefined,
      (isHovering) => {
        if (isHovering) {
          enhanceRouteElements(destAirport.code);
        } else {
          restoreRouteElements(destAirport.code);
        }
      }
    );
    if (priceLabel) priceLabel.addTo(map);
    const destinationMarker = getMarkerByAirportCode(destAirport.code);

    if (priceLabel && destinationMarker) {
      registerRouteElements(destAirport.code, {
        line,
        priceLabel,
        destinationMarker,
        destinationCode: destAirport.code,
      });

      line.on('mouseover', () => {
        // Show React tooltip on hover
        if (!tooltip) {
          tooltip = createDestinationTooltip(midLatLng, {
            source: sourceAirport,
            dest: destAirport,
            price: priceData?.price,
            currency: priceData?.currency,
            distanceKm: routeInfo.distance,
            flightNumber: priceData?.flightNumber,
          });
        }
        tooltip.setLatLng(midLatLng).addTo(map);
        enhanceRouteElements(destAirport.code);
      });

      line.on('mouseout', () => {
        if (tooltip) {
          map.removeLayer(tooltip);
        }
        restoreRouteElements(destAirport.code);
      });

      // Also wire destination marker hover for the same tooltip
      destinationMarker.on('mouseover', () => {
        if (!tooltip) {
          tooltip = createDestinationTooltip([destAirport.lat, destAirport.lng], {
            source: sourceAirport,
            dest: destAirport,
            price: priceData?.price,
            currency: priceData?.currency,
            distanceKm: routeInfo.distance,
            flightNumber: priceData?.flightNumber,
          });
        }
        tooltip.setLatLng([destAirport.lat, destAirport.lng]).addTo(map);
        enhanceRouteElements(destAirport.code);
      });

      destinationMarker.on('mouseout', () => {
        if (tooltip) {
          map.removeLayer(tooltip);
        }
        restoreRouteElements(destAirport.code);
      });
    }
  }

  return line;
}

// Price label creation moved to React helper in components/PriceLabel.tsx

export function restoreRouteElements(destinationCode: string): void {
  const routeElements = routeElementsMap.get(destinationCode);
  if (!routeElements) return;

  // Restore the flight line via CSS class
  const lineEl = routeElements.line.getElement();
  if (lineEl) {
    lineEl.classList.remove('route-line--hover');
  }

  // Restore the price label
  const priceLabelElement = routeElements.priceLabel.getElement();
  if (priceLabelElement) {
    const labelDiv = priceLabelElement.querySelector('.price-label') as HTMLElement | null;
    if (labelDiv) {
      labelDiv.classList.remove('price-label--hover');
    }
  }

  // Restore the destination marker
  const destinationMarkerElement = routeElements.destinationMarker.getElement();
  if (destinationMarkerElement) {
    const markerDiv = destinationMarkerElement.querySelector('div');
    if (markerDiv) {
      markerDiv.classList.remove('airport-marker--hover');
    }
  }
}
