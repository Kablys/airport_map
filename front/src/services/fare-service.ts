import type { DayFare } from '../types.ts';
import { addDays } from '../utils.ts';

// Ryanair's public fare finder: unofficial, no key, CORS open; one request = one route for one month
export const RYANAIR_FARES_API = 'https://services-api.ryanair.com/farfnd/v4/oneWayFares';
const MAX_CONCURRENT = 6;
/** The only airline whose live fares we can fetch. */
export const FARE_AIRLINE = 'FR';

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
    const req = indexedDB.open('fares', 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
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
          departureDate: f.departure,
          arrivalDate: f.arrival,
          price: { value: f.price, currencyCode: f.currency },
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
    calendar.set(d.day, {
      date: d.day,
      price: d.price.value,
      currency: d.price.currencyCode,
      departure: d.departureDate,
      arrival: d.arrivalDate,
    });
  }
  return calendar;
}

/** Fare calendar for one route and month (YYYY-MM), cached for 6 hours and rate limited. */
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

const NEARBY_DAYS = 3;

/** The fare on `date`, plus the cheapest fare within ±3 days when it beats it (or there is none on the day). */
export async function legFare(
  from: string,
  to: string,
  date: string
): Promise<{ fare: DayFare | undefined; cheaperNearby: DayFare | undefined }> {
  const first = addDays(date, -NEARBY_DAYS);
  const last = addDays(date, NEARBY_DAYS);
  const months = [...new Set([first.slice(0, 7), last.slice(0, 7)])];
  const calendars = await Promise.all(months.map((m) => fareCalendar(from, to, m)));
  const nearby = calendars
    .flatMap((c) => [...c.values()])
    .filter((f) => f.date >= first && f.date <= last && f.date !== date);
  const fare = calendars.find((c) => c.has(date))?.get(date);
  const cheapest = nearby.reduce<DayFare | undefined>(
    (best, f) => (!best || f.price < best.price ? f : best),
    undefined
  );
  return { fare, cheaperNearby: cheapest && (!fare || cheapest.price < fare.price) ? cheapest : undefined };
}
