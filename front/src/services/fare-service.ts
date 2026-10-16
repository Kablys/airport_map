import { wizzFaresUrl } from '../data.ts';
import type { DayFare } from '../types.ts';
import { addDays } from '../utils.ts';

// Ryanair's public fare finder: unofficial, no key, CORS open; one request = one route for one month
export const RYANAIR_FARES_API = 'https://services-api.ryanair.com/farfnd/v4/oneWayFares';
const MAX_CONCURRENT = 6;
/** Fetched live from the browser. */
const LIVE_AIRLINE = 'FR';
/** Wizz Air blocks browser requests, so its fares are pre-fetched by data/fares.py. */
const PREFETCHED_AIRLINE = 'W6';

export interface ApiDay {
  day: string;
  departureDate: string | null;
  arrivalDate: string | null;
  price: { value: number; currencyCode: string } | null;
  soldOut?: boolean;
  unavailable?: boolean;
}

/** Cheapest fare per day, keyed by YYYY-MM-DD; days without a bookable flight are absent. */
export type FareCalendar = Map<string, DayFare>;

/** data/prod/fares-W6.json: route "VNO-LTN" → day → [EUR price, first departure HH:MM], for days `from`..`to`. */
export interface PrefetchedFares {
  fetched: string;
  from: string;
  to: string;
  routes: Record<string, Record<string, [number, string]>>;
}

/** Distance-based guess for airlines without a fare source; undefined for unknown airports. */
export type Estimate = (from: string, to: string) => number | undefined;

// In-memory promises dedupe concurrent lookups; IndexedDB keeps calendars across reloads
const cache = new Map<string, Promise<FareCalendar>>();
const STORE = 'calendars';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const EXPORTED_FLAG = 'fares-exported-to-data';

/** Served by serve.ts, which proxies fares and records them in data/fares; the deployed site calls Ryanair. */
const isLocalServer = () => ['localhost', '127.0.0.1'].includes(location.hostname);

interface StoredCalendar {
  savedAt: number;
  calendar: FareCalendar;
}

let db: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    // Bump the version when DayFare changes shape; the upgrade drops calendars cached in the old shape
    const req = indexedDB.open('fares', 2);
    req.onupgradeneeded = () => {
      if (req.result.objectStoreNames.contains(STORE)) req.result.deleteObjectStore(STORE);
      req.result.createObjectStore(STORE);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      // Drop expired calendars so the store doesn't grow with every search
      const cursor = req.result.transaction(STORE, 'readwrite').objectStore(STORE).openCursor();
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) return;
        if (Date.now() - (entry.value as StoredCalendar).savedAt > CACHE_TTL_MS) entry.delete();
        entry.continue();
      };
      if (isLocalServer() && !localStorage.getItem(EXPORTED_FLAG)) {
        exportToLocalServer(req.result).catch((error) =>
          console.warn('Could not export cached fares to data/fares', error)
        );
      }
      resolve(req.result);
    };
  });
  return db;
}

/** Once per browser: copy calendars cached before fares were recorded on disk into data/fares. */
async function exportToLocalServer(db: IDBDatabase): Promise<void> {
  const calendars: Record<string, { savedAt: string; fares: ApiDay[] }> = {};
  await new Promise<void>((resolve, reject) => {
    const cursor = db.transaction(STORE).objectStore(STORE).openCursor();
    cursor.onerror = () => reject(cursor.error);
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) return resolve();
      const { savedAt, calendar } = entry.value as StoredCalendar;
      calendars[String(entry.key)] = {
        savedAt: new Date(savedAt).toISOString(),
        fares: [...calendar.values()].map((f) => ({
          day: f.date,
          departureDate: f.departure ?? null,
          arrivalDate: f.arrival ?? null,
          price: { value: f.price, currencyCode: 'EUR' },
        })),
      };
      entry.continue();
    };
  });
  const res = await fetch('/api/fares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(calendars),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  localStorage.setItem(EXPORTED_FLAG, new Date().toISOString());
}

async function inStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await openDb()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = run(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Stored calendar if fresh, else fetched and stored. A broken IndexedDB (e.g. private mode) only costs a refetch. */
async function loadCalendar(from: string, to: string, month: string): Promise<FareCalendar> {
  const key = `${from}-${to}-${month}`;
  const stored = await inStore<StoredCalendar | undefined>('readonly', (store) => store.get(key)).catch((error) => {
    console.warn(`Fare cache read failed for ${key}, fetching`, error);
    return undefined;
  });
  if (stored && Date.now() - stored.savedAt <= CACHE_TTL_MS) return stored.calendar;
  const calendar = await limited(() => fetchCalendar(from, to, month));
  const entry: StoredCalendar = { savedAt: Date.now(), calendar };
  inStore('readwrite', (store) => store.put(entry, key)).catch((error) =>
    console.warn(`Fare cache write failed for ${key}`, error)
  );
  return calendar;
}
let active = 0;
const waiting: (() => void)[] = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  while (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function fetchCalendar(from: string, to: string, month: string): Promise<FareCalendar> {
  const url = isLocalServer()
    ? `/api/fares/${from}/${to}/${month}`
    : `${RYANAIR_FARES_API}/${from}/${to}/cheapestPerDay?outboundMonthOfDate=${month}-01&currency=EUR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ryanair fares ${from}→${to} ${month}: HTTP ${res.status}`);
  const days = ((await res.json()) as { outbound?: { fares?: ApiDay[] } }).outbound?.fares;
  if (!Array.isArray(days)) throw new Error(`Ryanair fares ${from}→${to} ${month}: unexpected response`);
  const calendar: FareCalendar = new Map();
  for (const d of days) {
    if (!d.price || !d.departureDate || !d.arrivalDate || d.soldOut || d.unavailable) continue;
    if (d.price.currencyCode !== 'EUR') throw new Error(`Ryanair fares ${from}→${to}: got ${d.price.currencyCode}`);
    calendar.set(d.day, {
      date: d.day,
      price: d.price.value,
      airline: LIVE_AIRLINE,
      estimated: false,
      departure: d.departureDate,
      arrival: d.arrivalDate,
    });
  }
  return calendar;
}

/** Ryanair fare calendar for one route and month (YYYY-MM), cached (6 h in IndexedDB) and rate limited. */
export function fareCalendar(from: string, to: string, month: string): Promise<FareCalendar> {
  const key = `${from}-${to}-${month}`;
  let calendar = cache.get(key);
  if (!calendar) {
    calendar = loadCalendar(from, to, month);
    cache.set(key, calendar);
    // Forget failures so a later lookup retries; callers still get the rejection
    calendar.catch(() => cache.delete(key));
  }
  return calendar;
}

let wizz: Promise<PrefetchedFares> | undefined;

function wizzFares(): Promise<PrefetchedFares> {
  if (!wizz) {
    wizz = fetch(wizzFaresUrl).then(async (res) => {
      if (!res.ok) throw new Error(`Wizz Air fares file: HTTP ${res.status}`);
      const body = (await res.json()) as Partial<PrefetchedFares>;
      if (typeof body.from !== 'string' || typeof body.to !== 'string' || typeof body.routes !== 'object') {
        throw new Error('Wizz Air fares file: unexpected shape');
      }
      return body as PrefetchedFares;
    });
    // Forget failures so a later lookup retries; callers still get the rejection
    wizz.catch(() => {
      wizz = undefined;
    });
  }
  return wizz;
}

export interface FareBook {
  /** Cheapest fare for the leg on `date` among `airlines`, or undefined when none of them flies that day. */
  quote(from: string, to: string, date: string, airlines: readonly string[]): DayFare | undefined;
  /** When the Wizz Air fares were pre-fetched, if a file covering some days was loaded. */
  wizzFetched: string | undefined;
}

/**
 * Ryanair from its live calendars, Wizz Air from the pre-fetched file (estimated outside the days it covers),
 * every other airline estimated as flying daily. Real fares win over estimates.
 */
export function createFareBook(
  ryanair: ReadonlyMap<string, FareCalendar>,
  wizzFile: PrefetchedFares | undefined,
  estimate: Estimate
): FareBook {
  /** A fare, null when the airline's data says there's no flight, undefined when there's no data to say. */
  function realFare(airline: string, from: string, to: string, date: string): DayFare | null | undefined {
    if (airline === LIVE_AIRLINE) {
      const calendar = ryanair.get(`${from}-${to}-${date.slice(0, 7)}`);
      return calendar && (calendar.get(date) ?? null);
    }
    if (airline === PREFETCHED_AIRLINE && wizzFile && date >= wizzFile.from && date <= wizzFile.to) {
      const day = wizzFile.routes[`${from}-${to}`]?.[date];
      return day ? { date, price: day[0], airline, estimated: false, departure: `${date}T${day[1]}:00` } : null;
    }
    return undefined;
  }

  return {
    wizzFetched: wizzFile && wizzFile.from <= wizzFile.to ? wizzFile.fetched : undefined,
    quote(from, to, date, airlines) {
      const fares = airlines.map((airline) => ({ airline, fare: realFare(airline, from, to, date) }));
      const real = fares.flatMap(({ fare }) => fare ?? []).sort((a, b) => a.price - b.price)[0];
      // An estimate that undercuts a real fare is a guess, not a deal
      if (real) return real;
      const unknown = fares.find(({ fare }) => fare === undefined)?.airline;
      const price = unknown === undefined ? undefined : estimate(from, to);
      return unknown && price !== undefined ? { date, price, airline: unknown, estimated: true } : undefined;
    },
  };
}

export interface LegToPrice {
  from: string;
  to: string;
  airlines: readonly string[];
}

/** Load every fare source the legs need over `months` (YYYY-MM); failed lookups are logged and counted. */
export async function loadFareBook(
  legs: readonly LegToPrice[],
  months: readonly string[],
  estimate: Estimate,
  onProgress?: (done: number, total: number) => void
): Promise<{ book: FareBook; failed: number }> {
  const ryanairRequests = legs
    .filter((leg) => leg.airlines.includes(LIVE_AIRLINE))
    .flatMap(({ from, to }) => months.map((month) => ({ from, to, month })));
  const needsWizz = legs.some((leg) => leg.airlines.includes(PREFETCHED_AIRLINE));
  const total = ryanairRequests.length + (needsWizz ? 1 : 0);
  let done = 0;
  let failed = 0;
  const tick = () => onProgress?.(++done, total);
  const calendars = new Map<string, FareCalendar>();
  const ryanairLoaded = Promise.all(
    ryanairRequests.map(({ from, to, month }) =>
      fareCalendar(from, to, month)
        .then(
          (calendar) => {
            calendars.set(`${from}-${to}-${month}`, calendar);
          },
          (err) => {
            failed++;
            console.error(`Ryanair fare lookup failed for ${from}→${to} in ${month}`, err);
          }
        )
        .finally(tick)
    )
  );
  const wizzLoaded = needsWizz
    ? wizzFares()
        .catch((err) => {
          failed++;
          console.error('Wizz Air fares file failed to load', err);
          return undefined;
        })
        .finally(tick)
    : undefined;
  const [, wizzFile] = await Promise.all([ryanairLoaded, wizzLoaded]);
  return { book: createFareBook(calendars, wizzFile, estimate), failed };
}

const NEARBY_DAYS = 3;

/** The fare on `date`, plus the cheapest real fare within ±3 days when it beats it (or there is none on the day). */
export async function legFare(
  from: string,
  to: string,
  date: string,
  airlines: readonly string[],
  estimate: Estimate
): Promise<{ fare: DayFare | undefined; cheaperNearby: DayFare | undefined }> {
  const first = addDays(date, -NEARBY_DAYS);
  const last = addDays(date, NEARBY_DAYS);
  const months = [...new Set([first.slice(0, 7), last.slice(0, 7)])];
  const { book, failed } = await loadFareBook([{ from, to, airlines }], months, estimate);
  if (failed > 0) throw new Error(`Fare lookup failed for ${from}→${to} around ${date}`);
  const fare = book.quote(from, to, date, airlines);
  let cheapest: DayFare | undefined;
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const nearby = d === date ? undefined : book.quote(from, to, d, airlines);
    if (nearby && !nearby.estimated && (!cheapest || nearby.price < cheapest.price)) cheapest = nearby;
  }
  return { fare, cheaperNearby: cheapest && (!fare || cheapest.price < fare.price) ? cheapest : undefined };
}
