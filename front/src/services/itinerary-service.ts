import L from 'leaflet';
import type { Airline, Airport, ItinerarySegment } from '../types.ts';
import { generateCurvedPath } from '../utils.ts';

const MULTI_AIRLINE_CASING = '#334155';
const STRIPE = 12;

/**
 * A trip leg in its airline's colors: primary line on a secondary-colored casing.
 * Legs flown by several airlines get alternating stripes of each primary on a neutral casing.
 */
export function createItineraryLine(from: Airport, to: Airport, airlines: Airline[]): L.FeatureGroup {
  const path = generateCurvedPath(from.lat, from.lng, to.lat, to.lng);
  const only = airlines.length === 1 ? airlines[0] : undefined;
  const style = { interactive: false, className: 'itinerary-line' };
  const casing = L.polyline(path, { ...style, color: only?.colors.secondary ?? MULTI_AIRLINE_CASING, weight: 7 });
  const stripes = airlines.map((airline, i) =>
    L.polyline(path, {
      ...style,
      color: airline.colors.primary,
      weight: 4,
      opacity: 1,
      ...(airlines.length > 1 && {
        dashArray: `${STRIPE} ${STRIPE * (airlines.length - 1)}`,
        dashOffset: `${i * STRIPE}`,
      }),
    })
  );
  return L.featureGroup([casing, ...stripes]);
}

export function highlightSegment(segment: ItinerarySegment, highlight: boolean): void {
  segment.line.eachLayer((layer) =>
    (layer as L.Path).getElement()?.classList.toggle('itinerary-line--hover', highlight)
  );
  if (highlight) segment.line.bringToFront();
}

export function focusSegment(map: L.Map, segment: ItinerarySegment): void {
  const midLat = (segment.from.lat + segment.to.lat) / 2;
  const midLng = (segment.from.lng + segment.to.lng) / 2;
  map.flyTo([midLat, midLng], Math.max(map.getZoom(), 6));
}
