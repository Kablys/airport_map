import L from 'leaflet';
import type { Airport, ItinerarySegment } from '../types.ts';
import { generateCurvedPath } from '../utils.ts';

const normalStyle: L.PathOptions = { weight: 2, opacity: 0.6, color: '#003d82', dashArray: '5, 5' };
const highlightStyle: L.PathOptions = { weight: 4, opacity: 1, color: '#ff0066', dashArray: '10, 5' };

export function createItineraryLine(from: Airport, to: Airport): L.Polyline {
  return L.polyline(generateCurvedPath(from.lat, from.lng, to.lat, to.lng), normalStyle);
}

export function highlightSegment(segment: ItinerarySegment, highlight: boolean): void {
  segment.line.setStyle(highlight ? highlightStyle : normalStyle);
  if (highlight) segment.line.bringToFront();
}

export function focusSegment(map: L.Map, segment: ItinerarySegment): void {
  const midLat = (segment.from.lat + segment.to.lat) / 2;
  const midLng = (segment.from.lng + segment.to.lng) / 2;
  map.flyTo([midLat, midLng], Math.max(map.getZoom(), 6));
}
