/**
 * Fare sources besides Ryanair, for the trip CLI (both block or need keys in the browser):
 * - Travelpayouts (Aviasales Data API): cheapest direct fare per day of a month, as seen by Aviasales users in the
 *   last days; any airline, so it prices legs we otherwise estimate. Needs a free partner token.
 * - Kiwi.com's public MCP server: live search for one route and day, no key; used to check a found trip.
 * Answers are kept in JSON files under data/fares, like Ryanair's calendars, so repeated searches cost nothing.
 */

const TRAVELPAYOUTS_API = 'https://api.travelpayouts.com/aviasales/v3/grouped_prices';
const KIWI_MCP = 'https://mcp.kiwi.com';

/** A JSON file of key → value, loaded once, rewritten whole (one line per key) on save. */
export function jsonFile<T>(path: string) {
  let data: Promise<Record<string, T>> | undefined;
  const load = () => {
    const file = Bun.file(path);
    data ??= file.exists().then((exists) => (exists ? (file.json() as Promise<Record<string, T>>) : {}));
    return data;
  };
  return {
    all: load,
    get: async (key: string) => (await load())[key],
    set: async (key: string, value: T) => {
      (await load())[key] = value;
    },
    save: async () => {
      const all = await load();
      const lines = Object.keys(all)
        .sort()
        .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(all[key])}`);
      await Bun.write(path, `{\n${lines.join(',\n')}\n}\n`);
    },
  };
}

/** One day's cheapest direct fare: [EUR price, airline IATA, local departure time]. */
export type FareDay = [price: number, airline: string, departure: string];

export interface StoredMonth {
  savedAt: string;
  days: Record<string, FareDay>;
}

interface TravelpayoutsDay {
  origin_airport?: unknown;
  destination_airport?: unknown;
  price?: unknown;
  airline?: unknown;
  departure_at?: unknown;
  transfers?: unknown;
}

/** Cheapest direct fare per day of `month` (YYYY-MM) for one airport pair, from Aviasales' recent searches. */
export async function travelpayoutsMonth(from: string, to: string, month: string, token: string) {
  const params = new URLSearchParams({
    origin: from,
    destination: to,
    departure_at: month,
    group_by: 'departure_at',
    direct: 'true',
    currency: 'eur',
  });
  const res = await fetch(`${TRAVELPAYOUTS_API}?${params}`, {
    headers: { 'X-Access-Token': token, 'Accept-Encoding': 'gzip, deflate' },
  });
  if (!res.ok) throw new Error(`Travelpayouts answered HTTP ${res.status} for ${from}→${to} ${month}`);
  const body = (await res.json()) as { success?: boolean; data?: Record<string, TravelpayoutsDay>; error?: unknown };
  if (!body.success || typeof body.data !== 'object' || body.data === null) {
    throw new Error(`Travelpayouts ${from}→${to} ${month}: ${String(body.error ?? 'unexpected response')}`);
  }
  const days: Record<string, FareDay> = {};
  for (const [date, d] of Object.entries(body.data)) {
    // A city code like LON can answer for another of its airports; keep only the asked-for pair
    if (d.origin_airport !== from || d.destination_airport !== to || d.transfers !== 0) continue;
    if (typeof d.price !== 'number' || typeof d.airline !== 'string' || typeof d.departure_at !== 'string') continue;
    days[date] = [d.price, d.airline, d.departure_at];
  }
  return days;
}

export interface KiwiFlight {
  price: number;
  airline: string;
  flight: string;
  departure: string;
  url: string;
}

interface KiwiItinerary {
  price: number;
  bookingUrl: string;
  outbound: { route: string[]; departureTime: string; segments: { carrier: string; flightNumber: string }[] };
}

/** Cheapest direct flight on Kiwi.com for one airport pair and day, or null when Kiwi finds none. */
export async function kiwiDirect(from: string, to: string, date: string): Promise<KiwiFlight | null> {
  const [y, m, d] = date.split('-');
  const call = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search-flight',
      arguments: {
        flyFrom: from,
        flyTo: to,
        departureDate: `${d}/${m}/${y}`,
        max_sector_stopovers: 0,
        currency: 'EUR',
      },
    },
  };
  const res = await fetch(KIWI_MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify(call),
  });
  if (!res.ok) throw new Error(`Kiwi answered HTTP ${res.status} for ${from}→${to} ${date}`);
  // Streamable HTTP: the JSON-RPC answer comes as one server-sent event
  const text = await res.text();
  const event = text.split('\n').find((line) => line.startsWith('data: '));
  const answer = JSON.parse(event ? event.slice(6) : text) as {
    result?: { isError?: boolean; content?: { text?: string }[] };
    error?: { message?: string };
  };
  const content = answer.result?.content?.[0]?.text;
  if (answer.error || answer.result?.isError || !content) {
    throw new Error(`Kiwi ${from}→${to} ${date}: ${answer.error?.message ?? content ?? 'unexpected response'}`);
  }
  const { itineraries } = JSON.parse(content) as { itineraries?: KiwiItinerary[] };
  if (!Array.isArray(itineraries)) throw new Error(`Kiwi ${from}→${to} ${date}: no itineraries in the answer`);
  const direct = itineraries
    .filter((i) => i.outbound?.route?.join('-') === `${from}-${to}`)
    .sort((a, b) => a.price - b.price)[0];
  const segment = direct?.outbound.segments[0];
  if (!direct || !segment) return null;
  return {
    price: direct.price,
    airline: segment.carrier,
    flight: segment.flightNumber, // already prefixed, e.g. FR2871
    departure: direct.outbound.departureTime,
    url: direct.bookingUrl,
  };
}
