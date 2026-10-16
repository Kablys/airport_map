import type { DayFare } from '../types.ts';
import { addDays } from '../utils.ts';

// Ryanair's public fare finder: unofficial, no key, CORS open; one request = one route for one month
const API = 'https://services-api.ryanair.com/farfnd/v4/oneWayFares';
const MAX_CONCURRENT = 6;

interface ApiDay {
  day: string;
  departureDate: string | null;
  arrivalDate: string | null;
  price: { value: number; currencyCode: string } | null;
  soldOut: boolean;
  unavailable: boolean;
}

/** Cheapest fare per day, keyed by YYYY-MM-DD; days without a bookable flight are absent. */
export type FareCalendar = Map<string, DayFare>;

// shortcut: in-memory only, a reload refetches; persist if repeated searches get slow
const cache = new Map<string, Promise<FareCalendar>>();
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
  const url = `${API}/${from}/${to}/cheapestPerDay?outboundMonthOfDate=${month}-01&currency=EUR`;
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

/** Fare calendar for one route and month (YYYY-MM), cached and rate limited. */
export function fareCalendar(from: string, to: string, month: string): Promise<FareCalendar> {
  const key = `${from}-${to}-${month}`;
  let calendar = cache.get(key);
  if (!calendar) {
    calendar = limited(() => fetchCalendar(from, to, month));
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
