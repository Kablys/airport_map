import type { Airport, FlightPriceData, RouteNetwork, Routes } from './types.ts';

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance between two airports in kilometers (rounded). */
export function calculateDistance(airport1: Airport, airport2: Airport): number {
  const R = 6371;
  const dLat = toRad(airport2.lat - airport1.lat);
  const dLng = toRad(airport2.lng - airport1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(airport1.lat)) * Math.cos(toRad(airport2.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Flight duration in minutes at an average 800 km/h. */
export function calculateFlightDuration(distance: number): number {
  return Math.round((distance / 800) * 60);
}

export function formatFlightDuration(durationMinutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(durationMinutes / 60),
    minutes: durationMinutes % 60,
  };
}

// shortcut: deterministic distance-based estimate, no live fares; replace with a fare API when one is available
export function estimateFlightPrice(from: Airport, to: Airport): FlightPriceData {
  const distance = calculateDistance(from, to);
  const [basePrice, variation] =
    distance < 500 ? [25, 35] : distance < 1000 ? [40, 45] : distance < 2000 ? [60, 70] : [80, 100];
  let hash = 0;
  for (const char of from.code + to.code) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  const routeModifier = Math.abs(hash % 100) / 100;
  return { price: Math.round(basePrice + variation * routeModifier), currency: 'EUR', estimated: true };
}

/** Direct routes flown by at least one of the enabled airlines. */
export function filterRoutes(network: RouteNetwork, enabledAirlines: ReadonlySet<string>): Routes {
  const routes: Routes = {};
  for (const [origin, destinations] of Object.entries(network)) {
    const reachable = Object.keys(destinations).filter((dest) =>
      destinations[dest]?.some((airline) => enabledAirlines.has(airline))
    );
    if (reachable.length) routes[origin] = reachable;
  }
  return routes;
}

/** Green → orange → pink color for a price within [min, max]. */
export function getPriceColor(price: number, min: number, max: number): string {
  if (min === max) return '#ff8800';
  const factor = (price - min) / (max - min);
  return factor <= 0.5
    ? interpolateColor('#00cc44', '#ff8800', factor * 2)
    : interpolateColor('#ff8800', '#ff0066', (factor - 0.5) * 2);
}

export function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex2rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const c1 = hex2rgb(color1);
  const c2 = hex2rgb(color2);
  const rgb = c1.map((v, i) => Math.round(v + factor * ((c2[i] ?? v) - v)));
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Points along the great circle between two coordinates, as [lat, lng] pairs. */
export function generateCurvedPath(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  numPoints = 20
): [number, number][] {
  const lat1Rad = toRad(lat1);
  const lng1Rad = toRad(lng1);
  const lat2Rad = toRad(lat2);
  const lng2Rad = toRad(lng2);

  const a =
    Math.sin((lat2Rad - lat1Rad) / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin((lng2Rad - lng1Rad) / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (angularDistance < 0.001) {
    return [
      [lat1, lng1],
      [lat2, lng2],
    ];
  }

  const path: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    // Spherical linear interpolation
    const A = Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance);
    const B = Math.sin(fraction * angularDistance) / Math.sin(angularDistance);
    const x = A * Math.cos(lat1Rad) * Math.cos(lng1Rad) + B * Math.cos(lat2Rad) * Math.cos(lng2Rad);
    const y = A * Math.cos(lat1Rad) * Math.sin(lng1Rad) + B * Math.cos(lat2Rad) * Math.sin(lng2Rad);
    const z = A * Math.sin(lat1Rad) + B * Math.sin(lat2Rad);
    path.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return path;
}
