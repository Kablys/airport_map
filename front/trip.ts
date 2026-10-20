/**
 * Trip search from the command line, on the production data, with Ryanair fares through the data/fares store.
 *
 *   bun trip.ts query.json [--limit 10] [--max-fetch 200 | --offline] [--check]
 *   bun trip.ts '{"places": [...]}'
 *
 * The query is a TripQuery (src/planner.ts); `via`, `distinctCountries` and `avoid` have defaults.
 * Fares are fetched only for the legs of the leading trips, a few rounds until those are all priced, because every
 * possible leg can be thousands of calendars and Ryanair blocks after a few thousand requests: Ryanair calendars for
 * its routes, Travelpayouts months (with TRAVELPAYOUTS_TOKEN set) or else Kiwi.com days for the rest.
 * --check looks every shown leg up on Kiwi.com.
 */
import { parseArgs } from 'node:util';
import airportsJson from '../data/prod/airports.json';
import wizzJson from '../data/prod/fares-W6.json';
import networkJson from '../data/prod/routes.json';
import { fareStore } from './fare-store.ts';
import {
  type FareDay,
  jsonFile,
  type KiwiFlight,
  kiwiDirect,
  type StoredMonth,
  travelpayoutsMonth,
} from './providers.ts';
import { itineraryToSearch } from './src/itinerary-url.ts';
import {
  type FareLookup,
  searchTrips,
  type Trip,
  type TripQuery,
  tripFaresToFetch,
  tripQueryProblem,
} from './src/planner.ts';
import {
  createFareBook,
  type FareCalendar,
  type PrefetchedFares,
  type Schedules,
  toCalendar,
} from './src/services/fare-service.ts';
import type { Airport, RouteNetwork } from './src/types.ts';
import { daysBetween, estimateFlightPrice, filterRoutes, formatDay } from './src/utils.ts';

const MAP_URL = 'https://kablys.github.io/airport_map/';
const FARES_DIR = new URL('../data/fares', import.meta.url).pathname;
const SCHEDULES = new URL('../data/prod/schedules.json', import.meta.url).pathname;
const MAX_CONCURRENT = 6;

export interface TripData {
  airports: Airport[];
  network: RouteNetwork;
  wizz: PrefetchedFares | undefined;
  /** Weekdays flown per route and month, for airlines without fares (data/prod/schedules.json). */
  schedules?: Schedules;
  faresDir: string;
  /** Most fare calendars to fetch in one search; 0 = cached fares only. */
  maxFetch: number;
  /** Aviasales Data API token; without it, legs not flown by Ryanair stay estimated unless cached. */
  travelpayoutsToken?: string;
}

/** Query JSON from the user with defaults filled in; throws with the reason when it can't be searched. */
export function parseQuery(json: unknown, airportByCode: Map<string, Airport>): TripQuery {
  if (typeof json !== 'object' || json === null) throw new Error('The query must be a JSON object');
  const query = {
    places: [],
    via: { stops: [0, 2], nights: [1, 3] },
    distinctCountries: false,
    avoid: [],
    ...json,
  } as TripQuery;
  const problem = tripQueryProblem(query, airportByCode);
  if (problem) throw new Error(problem);
  return query;
}

/** Run `load` for each "FROM-TO-YYYY-MM" key, a few at a time, stopping at the first failure. */
async function fetchEach(keys: string[], load: (from: string, to: string, month: string) => Promise<void>) {
  let fetched = 0;
  let failed = 0;
  for (let i = 0; i < keys.length && failed === 0; i += MAX_CONCURRENT) {
    const batch = keys.slice(i, i + MAX_CONCURRENT).map((key) => {
      const [from = '', to = '', ...month] = key.split('-');
      return load(from, to, month.join('-'));
    });
    for (const result of await Promise.allSettled(batch)) {
      if (result.status === 'fulfilled') {
        fetched++;
      } else {
        // Ryanair blocks after too many requests; more would only extend the block
        failed++;
        console.error(`Fare lookup failed: ${result.reason}`);
      }
    }
  }
  return { fetched, failed };
}

const monthKey = (leg: { from: string; to: string; date: string }) => `${leg.from}-${leg.to}-${leg.date.slice(0, 7)}`;

/**
 * Cheapest trips. Legs use fares saved in data/fares; a leg without them is estimated until its trip ranks among
 * the leading ones, then its month is fetched (and saved) and the search runs again: Ryanair's calendar on its
 * routes, Travelpayouts on the others.
 */
export async function findTrips(query: TripQuery, data: TripData, limit: number) {
  const airportByCode = new Map(data.airports.map((a) => [a.code, a]));
  const enabled = new Set(Object.values(data.network).flatMap((dests) => Object.values(dests).flat()));
  const routes = filterRoutes(data.network, enabled);
  const airlinesOf = (from: string, to: string) => data.network[from]?.[to] ?? [];
  const isRyanair = (leg: { from: string; to: string }) => airlinesOf(leg.from, leg.to).includes('FR');
  const estimate = (from: string, to: string) => {
    const a = airportByCode.get(from);
    const b = airportByCode.get(to);
    return a && b ? estimateFlightPrice(a, b).price : undefined;
  };

  const store = fareStore(data.faresDir);
  const tpStore = jsonFile<StoredMonth>(`${data.faresDir}/travelpayouts.json`);
  const calendars = new Map<string, FareCalendar>();
  const tpMonths = new Map<string, Record<string, FareDay>>();
  for (const leg of tripFaresToFetch(query, routes, airportByCode)) {
    const key = `${leg.from}-${leg.to}-${leg.month}`;
    const stored = (await store.load(leg.month))[`${leg.from}-${leg.to}`];
    if (stored) calendars.set(key, toCalendar(leg.from, leg.to, stored.fares));
    const tp = await tpStore.get(key);
    if (tp) tpMonths.set(key, tp.days);
  }
  const loadRyanair = async (from: string, to: string, month: string) => {
    calendars.set(`${from}-${to}-${month}`, toCalendar(from, to, await store.calendar(from, to, month)));
  };
  const kiwiStore = jsonFile<{ savedAt: string; flight: KiwiFlight | null }>(`${data.faresDir}/kiwi.json`);
  const kiwiDays = new Map(Object.entries(await kiwiStore.all()).map(([key, v]) => [key, v.flight]));
  const loadKiwi = async (from: string, to: string, date: string) => {
    const flight = await kiwiDirect(from, to, date);
    kiwiDays.set(`${from}-${to}-${date}`, flight);
    await kiwiStore.set(`${from}-${to}-${date}`, { savedAt: new Date().toISOString(), flight });
  };
  const loadTravelpayouts = async (from: string, to: string, month: string) => {
    const days = await travelpayoutsMonth(from, to, month, data.travelpayoutsToken ?? '');
    tpMonths.set(`${from}-${to}-${month}`, days);
    await tpStore.set(`${from}-${to}-${month}`, { savedAt: new Date().toISOString(), days });
  };

  let fetched = 0;
  let failed = 0;
  while (true) {
    const book = createFareBook(calendars, data.wizz, estimate, data.schedules);
    const fare: FareLookup = (from, to, date) => {
      const quote = book.quote(from, to, date, airlinesOf(from, to));
      if (quote && !quote.estimated) return quote;
      const day = tpMonths.get(monthKey({ from, to, date }))?.[date];
      if (day) return { price: day[0], airline: day[1], estimated: false, source: 'travelpayouts' };
      const kiwi = kiwiDays.get(`${from}-${to}-${date}`);
      if (kiwi === undefined) return quote;
      return kiwi ? { price: kiwi.price, airline: kiwi.airline, estimated: false, source: 'kiwi' } : undefined;
    };
    // Look past the shown trips, so a cheap guess there doesn't hide a real fare just below
    const trips = searchTrips(query, routes, airportByCode, fare, limit * 2);
    const guessed = trips.flatMap((t) => t.legs.filter((l) => l.estimated));
    const ryanair = new Set(
      guessed
        .filter(isRyanair)
        .map(monthKey)
        .filter((k) => !calendars.has(k))
    );
    const others = guessed.filter((l) => !isRyanair(l));
    const tp = new Set(data.travelpayoutsToken ? others.map(monthKey).filter((k) => !tpMonths.has(k)) : []);
    // Without Travelpayouts, or where it has nothing for that day, ask Kiwi about the exact day
    const kiwi = new Set(
      others
        .filter((l) => !data.travelpayoutsToken || tpMonths.has(monthKey(l)))
        .map((l) => `${l.from}-${l.to}-${l.date}`)
        .filter((k) => !kiwiDays.has(k))
    );
    const unpriced = ryanair.size + tp.size + kiwi.size;
    if (unpriced === 0 || failed > 0 || fetched + unpriced > data.maxFetch) {
      return { trips: trips.slice(0, limit), calendars: calendars.size + tpMonths.size, fetched, failed, unpriced };
    }
    console.error(`Fetching ${ryanair.size} Ryanair, ${tp.size} Travelpayouts and ${kiwi.size} Kiwi fares…`);
    for (const [keys, load] of [
      [ryanair, loadRyanair],
      [tp, loadTravelpayouts],
      [kiwi, loadKiwi],
    ] as const) {
      const result = await fetchEach([...keys], load);
      fetched += result.fetched;
      failed += result.failed;
    }
    await Promise.all([tpStore.save(), kiwiStore.save()]);
  }
}

/** Each leg's cheapest direct flight on Kiwi.com, keyed "FROM-TO-YYYY-MM-DD"; cached in data/fares/kiwi.json. */
export async function checkOnKiwi(trips: Trip[], faresDir: string): Promise<Map<string, KiwiFlight | null>> {
  const cache = jsonFile<{ savedAt: string; flight: KiwiFlight | null }>(`${faresDir}/kiwi.json`);
  const keys = [...new Set(trips.flatMap((t) => t.legs.map((l) => `${l.from}-${l.to}-${l.date}`)))];
  const found = new Map<string, KiwiFlight | null>();
  for (const key of keys) {
    const cached = await cache.get(key);
    if (cached) found.set(key, cached.flight);
  }
  const { failed } = await fetchEach(
    keys.filter((k) => !found.has(k)),
    async (from, to, date) => {
      const flight = await kiwiDirect(from, to, date);
      found.set(`${from}-${to}-${date}`, flight);
      await cache.set(`${from}-${to}-${date}`, { savedAt: new Date().toISOString(), flight });
    }
  );
  await cache.save();
  if (failed) console.error('Kiwi lookups stopped after a failure; unchecked legs show no Kiwi price');
  return found;
}

/** The trip in the map's URL format, so it opens as an itinerary with live fares. */
export function mapLink(trip: Trip): string {
  const nights = trip.legs.map((leg, i) => {
    const next = trip.legs[i + 1];
    return next ? daysBetween(leg.date, next.date) : 0;
  });
  const legs = trip.legs.map((l) => [l.from, l.to] as [string, string]);
  return MAP_URL + itineraryToSearch({ legs, start: trip.legs[0]?.date ?? '', nights }, '');
}

function format(
  trip: Trip,
  rank: number,
  airportByCode: Map<string, Airport>,
  kiwi?: Map<string, KiwiFlight | null>
): string {
  const city = (code: string) => airportByCode.get(code)?.city.trim() ?? code;
  const estimated = trip.legs.filter((l) => l.estimated).length;
  const lines = trip.legs.map((l, i) => {
    const next = trip.legs[i + 1];
    const stay = next ? `  ${daysBetween(l.date, next.date)}n in ${city(l.to)}` : '';
    const price = `${l.estimated ? '~' : ''}€${Math.round(l.price)}${l.source ? '*' : ''}`;
    const line = `   ${formatDay(l.date).padEnd(11)} ${l.from}→${l.to}  ${l.airline}  ${price.padStart(6)}${stay}`;
    if (!kiwi) return line;
    const k = kiwi.get(`${l.from}-${l.to}-${l.date}`);
    const checked =
      k === undefined ? 'not checked' : k ? `€${Math.round(k.price)} ${k.flight} ${k.url}` : 'no direct flight';
    return `${line}\n${' '.repeat(16)}Kiwi: ${checked}`;
  });
  const sources = [...new Set(trip.legs.flatMap((l) => l.source ?? []))];
  const sourced = sources.length ? `  (* from ${sources.join(', ')})` : '';
  const note = (estimated ? `  (${estimated} estimated, ~)` : '') + sourced;
  return [`#${rank}  €${Math.round(trip.price)}${note}`, ...lines, `   ${mapLink(trip)}`].join('\n');
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      offline: { type: 'boolean', default: false },
      limit: { type: 'string', default: '10' },
      'max-fetch': { type: 'string', default: '200' },
      check: { type: 'boolean', default: false },
    },
  });
  const arg = positionals[0];
  if (!arg) {
    console.error('Usage: bun trip.ts <query.json | JSON> [--limit N] [--max-fetch N | --offline] [--check]');
    process.exit(2);
  }
  const airports: Airport[] = airportsJson;
  const airportByCode = new Map(airports.map((a) => [a.code, a]));
  const query = parseQuery(JSON.parse(arg.trim().startsWith('{') ? arg : await Bun.file(arg).text()), airportByCode);
  const data = {
    airports,
    network: networkJson,
    wizz: wizzJson as PrefetchedFares,
    schedules: (await Bun.file(SCHEDULES).json()) as Schedules,
    faresDir: FARES_DIR,
    maxFetch: values.offline ? 0 : Number(values['max-fetch']),
    travelpayoutsToken: process.env.TRAVELPAYOUTS_TOKEN,
  };
  const { trips, calendars, fetched, failed, unpriced } = await findTrips(query, data, Number(values.limit));
  const notes = [
    `${calendars} fare calendars (${fetched} fetched now)`,
    failed && `${failed} fetches failed, Ryanair may be blocking us`,
    unpriced && `${unpriced} calendars of these trips not fetched (budget), those legs are estimated`,
    !data.travelpayoutsToken && 'no TRAVELPAYOUTS_TOKEN, so other airlines are priced from Kiwi.com day by day',
  ];
  console.log(`${notes.filter(Boolean).join('; ')}; ${trips.length} trips\n`);
  const kiwi = values.check && !values.offline ? await checkOnKiwi(trips, FARES_DIR) : undefined;
  console.log(trips.map((t, i) => format(t, i + 1, airportByCode, kiwi)).join('\n\n'));
}
