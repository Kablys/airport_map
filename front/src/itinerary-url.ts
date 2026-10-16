/**
 * The itinerary in the page URL, so back, reload and bookmarks keep it:
 * ?legs=VNO-DUB,DUB-TFS,TFS-BGY,BGY-VNO&start=2026-11-13&nights=2,5,3
 * `nights[i]` is the stay after leg i; legs without a direct route are restored as gaps.
 */
export interface SavedItinerary {
  legs: [from: string, to: string][];
  /** YYYY-MM-DD, or '' when the itinerary has no dates. */
  start: string;
  nights: number[];
}

const LEG = /^([A-Z]{3})-([A-Z]{3})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NIGHTS = 60;

/** `search` with the itinerary params replaced (or removed when there are no legs); other params are kept. */
export function itineraryToSearch(saved: SavedItinerary, search: string): string {
  const params = new URLSearchParams(search);
  for (const key of ['legs', 'start', 'nights']) params.delete(key);
  if (saved.legs.length > 0) {
    params.set('legs', saved.legs.map(([from, to]) => `${from}-${to}`).join(','));
    if (saved.start) params.set('start', saved.start);
    params.set('nights', saved.nights.join(','));
  }
  // Commas are fine in a query and keep the URL readable
  const query = params.toString().replaceAll('%2C', ',');
  return query ? `?${query}` : '';
}

/** The itinerary in `search`, or undefined when there is none or it is malformed (the URL is user input). */
export function itineraryFromSearch(search: string): SavedItinerary | undefined {
  const params = new URLSearchParams(search);
  const legsParam = params.get('legs');
  if (!legsParam) return;
  const legs = legsParam.split(',').map((leg) => LEG.exec(leg));
  if (legs.some((m) => !m)) {
    console.warn(`Ignoring malformed itinerary in URL: legs=${legsParam}`);
    return;
  }
  const start = params.get('start') ?? '';
  const nightsParam = params.get('nights');
  const nights = nightsParam ? nightsParam.split(',').map(Number) : [];
  return {
    legs: legs.flatMap((m) => (m?.[1] && m[2] ? [[m[1], m[2]] as [string, string]] : [])),
    start: DATE.test(start) ? start : '',
    nights: nights.map((n) => (Number.isInteger(n) && n >= 0 && n <= MAX_NIGHTS ? n : 0)),
  };
}
