import L from 'leaflet';
import type { Airline, Airport, ItinerarySegment } from '../types.ts';
import { generateCurvedPath, readableTextColor } from '../utils.ts';

const MULTI_AIRLINE_CASING = '#334155';
const PREVIEW_COLOR = '#475569';
const STRIPE = 12;
export const PREVIEW_PANE = 'trip-preview';

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** Arrow badges a third and two thirds along `path`, pointing toward its end. */
function directionArrows(path: [number, number][], fill: string, ring: string, pane?: string): L.Marker[] {
  return [1 / 3, 2 / 3].flatMap((fraction) => {
    const i = Math.round((path.length - 1) * fraction);
    const [prev, at, next] = [path[i - 1], path[i], path[i + 1]];
    if (!prev || !at || !next) return [];
    // Screen angle: x grows east, y grows south, so Mercator y is flipped
    const angle = (Math.atan2(mercatorY(prev[0]) - mercatorY(next[0]), toRadians(next[1] - prev[1])) * 180) / Math.PI;
    const icon = L.divIcon({
      className: 'direction-arrow',
      html: `<span style="background:${fill};border-color:${ring};color:${readableTextColor(fill)};transform:rotate(${angle.toFixed(1)}deg)">➤</span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    return [L.marker(at, { icon, interactive: false, keyboard: false, ...(pane && { pane }) })];
  });
}

/** A greyed-out, dashed leg for previewing a trip under the real itinerary. */
export function createPreviewLine(from: Airport, to: Airport): L.FeatureGroup {
  const path = generateCurvedPath(from.lat, from.lng, to.lat, to.lng);
  const line = L.polyline(path, {
    pane: PREVIEW_PANE,
    interactive: false,
    color: PREVIEW_COLOR,
    weight: 3,
    opacity: 0.7,
    dashArray: '8 6',
  });
  return L.featureGroup([line, ...directionArrows(path, PREVIEW_COLOR, '#ffffff', PREVIEW_PANE)]);
}

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
  const arrows = directionArrows(
    path,
    only?.colors.primary ?? MULTI_AIRLINE_CASING,
    only?.colors.secondary ?? '#ffffff'
  );
  return L.featureGroup([casing, ...stripes, ...arrows]);
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
