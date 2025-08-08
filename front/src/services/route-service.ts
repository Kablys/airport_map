// Route service: manages route visual elements and coordinated hover effects
// Leaflet is provided globally via CDN
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const L: typeof import('leaflet');
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

export function enhanceRouteElements(destinationCode: string): void {
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

  const curvedPath = generateCurvedPath(
    sourceAirport.lat,
    sourceAirport.lng,
    destAirport.lat,
    destAirport.lng
  );
  const line = L.polyline(curvedPath, {
    color: lineColor,
    weight: 3,
    opacity: 0.6,
    pane: 'overlayPane',
  }).addTo(map);

  if (priceData) {
    const priceLabel = createPriceLabel(map, sourceAirport, destAirport, priceData, lineColor);
    const destinationMarker = getMarkerByAirportCode(destAirport.code);

    if (priceLabel && destinationMarker) {
      registerRouteElements(destAirport.code, {
        line,
        priceLabel,
        destinationMarker,
        destinationCode: destAirport.code,
      });

      line.on('mouseover', () => {
        enhanceRouteElements(destAirport.code);
      });

      line.on('mouseout', () => {
        restoreRouteElements(destAirport.code);
      });
    }
  }

  return line;
}

function createPriceLabel(
  map: L.Map,
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
                user-select: none;">
      ${priceText}
    </div>
  `;

  const priceLabelIcon = L.divIcon({
    html: priceLabelHTML,
    className: 'price-label-container',
    iconSize: [Math.max(textWidth, 40), textHeight],
    iconAnchor: [Math.max(textWidth, 40) / 2, textHeight / 2],
  });

  const priceLabel = L.marker([labelLat, labelLng], {
    icon: priceLabelIcon,
    zIndexOffset: 1000,
  }).addTo(map);

  priceLabel.on('mouseover', () => {
    enhanceRouteElements(destAirport.code);
  });

  priceLabel.on('mouseout', () => {
    restoreRouteElements(destAirport.code);
  });

  return priceLabel;
}

export function restoreRouteElements(destinationCode: string): void {
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
