// Itinerary service: helpers to manage itinerary visuals and data mutations
// Leaflet provided globally
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const L: typeof import('leaflet');

import type { Airport, ItineraryGap, ItineraryItem, ItinerarySegment } from '../types.ts';
import { generateCurvedPath } from '../utils.ts';

export function createItineraryLine(
  map: L.Map,
  fromAirport: Airport,
  toAirport: Airport
): L.Polyline {
  const curvedPath = generateCurvedPath(
    fromAirport.lat,
    fromAirport.lng,
    toAirport.lat,
    toAirport.lng
  );
  const itineraryLine = L.polyline(curvedPath, {
    color: '#003d82',
    weight: 2,
    opacity: 0.6,
    dashArray: '5, 5',
    pane: 'overlayPane',
  }).addTo(map);
  return itineraryLine;
}

export function pushItinerarySegment(
  segment: ItinerarySegment,
  currentItinerary: ItineraryItem[],
  itineraryLines: L.Polyline[],
  updateMarkerStyles: () => void,
  updateItineraryDisplay: () => void
): void {
  currentItinerary.push(segment);
  if (segment.line) itineraryLines.push(segment.line as L.Polyline);
  updateMarkerStyles();
  updateItineraryDisplay();
}

export function addGap(
  gap: ItineraryGap,
  currentItinerary: ItineraryItem[],
  updateMarkerStyles: () => void,
  updateItineraryDisplay: () => void
): void {
  currentItinerary.push(gap);
  updateMarkerStyles();
  updateItineraryDisplay();
}

export function clearItinerary(
  map: L.Map,
  itineraryLines: L.Polyline[],
  currentItinerary: ItineraryItem[],
  updateMarkerStyles: () => void,
  updateItineraryDisplay: () => void
): void {
  itineraryLines.forEach((line) => map.removeLayer(line));
  itineraryLines.length = 0;
  currentItinerary.length = 0;
  updateMarkerStyles();
  updateItineraryDisplay();
}

export function highlightItinerarySegment(
  currentItinerary: ItineraryItem[],
  segmentIndex: number,
  highlight: boolean
): void {
  if (segmentIndex >= currentItinerary.length) return;
  const item = currentItinerary[segmentIndex];
  if (!item || item.type !== 'flight') return;

  const segment = item as ItinerarySegment;
  const line = segment.line as L.Polyline | undefined;
  if (!line || !line.setStyle) return;

  if (highlight) {
    line.setStyle({
      weight: 4,
      opacity: 1,
      color: '#ff0066',
      dashArray: '10, 5',
    });
    if ((line as any).bringToFront) (line as any).bringToFront();
  } else {
    line.setStyle({
      weight: 2,
      opacity: 0.6,
      color: '#003d82',
      dashArray: '5, 5',
    });
  }
}

export function showItinerarySegmentPopup(
  map: L.Map,
  segment: ItinerarySegment
): void {
  if (!segment.priceData) return;
  const midLat = (segment.from.lat + segment.to.lat) / 2;
  const midLng = (segment.from.lng + segment.to.lng) / 2;
  map.flyTo([midLat, midLng], Math.max(map.getZoom(), 6));
}
