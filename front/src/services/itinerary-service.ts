import L from 'leaflet';
import type { Airline, Airport, ItinerarySegment } from '../types.ts';
import { generateCurvedPath } from '../utils.ts';

const MULTI_AIRLINE_CASING = '#334155';
const PREVIEW_COLOR = '#475569';
export const PREVIEW_PANE = 'trip-preview';
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Pixels per chevron, matching the letter spacing in styles.css. */
const CHEVRON_PITCH = 14;

interface ChevronColor {
  fill: string;
  stroke: string;
}

const chevronText = (path: Element) => document.getElementById(`${path.id}-chevrons`);

/**
 * A leg drawn as a run of > glyphs that follow the line's own SVG path, so they always point toward `to`.
 * The path itself is invisible; glyphs cycle through `colors` (one per airline) and are re-counted
 * whenever Leaflet redraws the path on zoom or pan.
 */
function chevronLine(from: Airport, to: Airport, colors: ChevronColor[], className: string, pane?: string) {
  const line = L.polyline(generateCurvedPath(from.lat, from.lng, to.lat, to.lng), {
    interactive: false,
    opacity: 0,
    className,
    ...(pane && { pane }),
  });
  let observer: MutationObserver | undefined;
  line.on('add', () => {
    const path = line.getElement();
    if (!(path instanceof SVGPathElement)) throw new Error('Chevron lines need the SVG renderer');
    path.id = `leg-${L.Util.stamp(line)}`;
    const text = document.createElementNS(SVG_NS, 'text');
    text.id = `${path.id}-chevrons`;
    text.setAttribute('class', `chevron-line ${className}`);
    const textPath = document.createElementNS(SVG_NS, 'textPath');
    textPath.setAttribute('href', `#${path.id}`);
    text.append(textPath);
    path.after(text);
    const fill = () => {
      const count = Math.max(1, Math.floor(path.getTotalLength() / CHEVRON_PITCH));
      textPath.replaceChildren(
        ...Array.from({ length: count }, (_, i) => {
          const color = colors[i % colors.length] ?? { fill: MULTI_AIRLINE_CASING, stroke: '#ffffff' };
          const glyph = document.createElementNS(SVG_NS, 'tspan');
          glyph.setAttribute('fill', color.fill);
          glyph.setAttribute('stroke', color.stroke);
          glyph.textContent = '>';
          return glyph;
        })
      );
    };
    fill();
    observer = new MutationObserver(fill);
    observer.observe(path, { attributes: true, attributeFilter: ['d'] });
  });
  line.on('remove', () => {
    observer?.disconnect();
    const path = line.getElement();
    if (path) chevronText(path)?.remove();
  });
  return line;
}

/** A greyed-out leg for previewing a trip under the real itinerary. */
export function createPreviewLine(from: Airport, to: Airport): L.Polyline {
  return chevronLine(from, to, [{ fill: PREVIEW_COLOR, stroke: '#ffffff' }], 'trip-preview-line', PREVIEW_PANE);
}

/** A trip leg as chevrons in its airline's colors; legs flown by several airlines alternate their colors. */
export function createItineraryLine(from: Airport, to: Airport, airlines: Airline[]): L.Polyline {
  const colors = airlines.map((a) => ({ fill: a.colors.primary, stroke: a.colors.secondary }));
  return chevronLine(from, to, colors, 'itinerary-line');
}

export function highlightSegment(segment: ItinerarySegment, highlight: boolean): void {
  const path = segment.line.getElement();
  if (!path) return;
  if (highlight) segment.line.bringToFront();
  const text = chevronText(path);
  if (!text) return;
  path.after(text); // bringToFront moved only the path
  text.classList.toggle('itinerary-line--hover', highlight);
}

export function focusSegment(map: L.Map, segment: ItinerarySegment): void {
  const midLat = (segment.from.lat + segment.to.lat) / 2;
  const midLng = (segment.from.lng + segment.to.lng) / 2;
  map.flyTo([midLat, midLng], Math.max(map.getZoom(), 6));
}
