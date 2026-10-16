import type { Airport, Routes } from './types.ts';
import { addDays, calculateDistance } from './utils.ts';

export interface PlanQuery {
  origin: string;
  destination: string;
  /** Whole trip, first departure to return, within these days (YYYY-MM-DD). */
  earliest: string;
  latest: string;
  stopNights: [min: number, max: number];
  destinationNights: [min: number, max: number];
  /** Stopover cities each way. */
  maxStops: number;
  /** Only the way there; `destinationNights` and `differentReturn` are ignored. */
  oneWay: boolean;
  /** Fly home through other cities than on the way out. */
  differentReturn: boolean;
  /** Cities never used as stopovers (blacklisted or already visited). */
  avoidCities: string[];
}

export interface TripLeg {
  from: string;
  to: string;
  date: string;
  price: number;
}

export interface Trip {
  legs: TripLeg[];
  price: number;
}

/** Cheapest fare for a route on a day, or undefined when there is no flight. */
export type FareLookup = (from: string, to: string, date: string) => number | undefined;

// Stopovers that make the way longer than this times the direct distance aren't "on the way"
const MAX_DETOUR = 1.5;
// Cheapest options kept per day before pairing outbound with return; bounds the pairing work
const KEEP_PER_DAY = 20;

/**
 * Airport sequences from → to with up to `maxStops` stopovers, along known routes, without big detours
 * and without stopping in `avoidCities`.
 */
export function candidatePaths(
  from: string,
  to: string,
  maxStops: number,
  routes: Routes,
  airportByCode: Map<string, Airport>,
  avoidCities: readonly string[] = []
): string[][] {
  const start = airportByCode.get(from);
  const end = airportByCode.get(to);
  if (!start || !end) return [];
  const limit = calculateDistance(start, end) * MAX_DETOUR;
  const paths: string[][] = [];
  const walk = (path: string[], here: Airport, travelled: number) => {
    for (const code of routes[here.code] ?? []) {
      if (code === to) {
        paths.push([...path, code]);
        continue;
      }
      const next = airportByCode.get(code);
      if (!next || path.includes(code) || path.length > maxStops || avoidCities.includes(next.city)) continue;
      const soFar = travelled + calculateDistance(here, next);
      if (soFar + calculateDistance(next, end) <= limit) walk([...path, code], next, soFar);
    }
  };
  walk([from], start, 0);
  return paths;
}

/** Every route/day pair the planner may price, so fares can be fetched up front. */
export function legsToFetch(query: PlanQuery, routes: Routes, airportByCode: Map<string, Airport>): [string, string][] {
  const paths = (from: string, to: string) =>
    candidatePaths(from, to, query.maxStops, routes, airportByCode, query.avoidCities);
  const all = [
    ...paths(query.origin, query.destination),
    ...(query.oneWay ? [] : paths(query.destination, query.origin)),
  ];
  const legs = new Set(all.flatMap((p) => p.slice(1).map((to, i) => `${p[i]}-${to}`)));
  return [...legs].map((leg) => leg.split('-') as [string, string]);
}

interface Option {
  legs: TripLeg[];
  price: number;
}

/** Priced, dated ways to fly `path`, first leg on any of `days`, stopovers within `nights`, ending by `latest`. */
function datedOptions(path: string[], days: string[], nights: [number, number], latest: string, fare: FareLookup) {
  const options: Option[] = [];
  const step = (i: number, date: string, legs: TripLeg[], price: number) => {
    const from = path[i];
    const to = path[i + 1];
    if (!from || !to || date > latest) return;
    const legPrice = fare(from, to, date);
    if (legPrice === undefined) return;
    const soFar = [...legs, { from, to, date, price: legPrice }];
    // shortcut: a flight arriving after midnight still counts as arriving on its departure day
    if (i + 2 === path.length) options.push({ legs: soFar, price: price + legPrice });
    else for (let n = nights[0]; n <= nights[1]; n++) step(i + 1, addDays(date, n), soFar, price + legPrice);
  };
  for (const day of days) step(0, day, [], 0);
  return options;
}

/** The cheapest KEEP_PER_DAY options per day picked by `dayOf`, cheapest first. */
function cheapestPerDay(options: Option[], dayOf: (o: Option) => string): Map<string, Option[]> {
  const byDay = new Map<string, Option[]>();
  for (const o of options.sort((a, b) => a.price - b.price)) {
    const list = byDay.get(dayOf(o)) ?? [];
    if (list.length < KEEP_PER_DAY) byDay.set(dayOf(o), [...list, o]);
  }
  return byDay;
}

/** True when the way home shares no stopover city with the way out (and they aren't both direct). */
function returnsDifferently(out: Option, back: Option, cityOf: (code: string) => string): boolean {
  const outCities = out.legs.slice(1).map((l) => cityOf(l.from));
  const backCities = back.legs.slice(1).map((l) => cityOf(l.from));
  if (outCities.length === 0 && backCities.length === 0) return false;
  return !backCities.some((c) => outCities.includes(c));
}

/** The cheapest trip per distinct route, cheapest first. */
function cheapestPerRoute(trips: Trip[], limit: number): Trip[] {
  const best = new Map<string, Trip>();
  for (const trip of trips) {
    const route = trip.legs.map((l) => l.from).join('-');
    const known = best.get(route);
    if (!known || trip.price < known.price) best.set(route, trip);
  }
  return [...best.values()].sort((a, b) => a.price - b.price).slice(0, limit);
}

/** Cheapest trips for the query (round or one way), one per distinct route, cheapest first. */
export function planTrips(
  query: PlanQuery,
  routes: Routes,
  airportByCode: Map<string, Airport>,
  fare: FareLookup,
  limit = 15
): Trip[] {
  const days: string[] = [];
  for (let d = query.earliest; d <= query.latest; d = addDays(d, 1)) days.push(d);
  const options = (from: string, to: string) =>
    candidatePaths(from, to, query.maxStops, routes, airportByCode, query.avoidCities).flatMap((p) =>
      datedOptions(p, days, query.stopNights, query.latest, fare)
    );
  const outbound = options(query.origin, query.destination);
  if (query.oneWay) return cheapestPerRoute(outbound, limit);
  const outByArrival = cheapestPerDay(outbound, (o) => o.legs.at(-1)?.date ?? '');
  const backByDeparture = cheapestPerDay(options(query.destination, query.origin), (o) => o.legs[0]?.date ?? '');
  // Same city, not just same airport: STN out and LTN back is still London twice
  const cityOf = (code: string) => airportByCode.get(code)?.city ?? code;
  const [minStay, maxStay] = query.destinationNights;
  const pairs = [...outByArrival].flatMap(([arrival, outs]) =>
    Array.from({ length: maxStay - minStay + 1 }, (_, i) => backByDeparture.get(addDays(arrival, minStay + i)) ?? [])
      .flat()
      .flatMap((back) => outs.map((out) => [out, back] as const))
  );

  const trips = pairs
    .filter(([out, back]) => !query.differentReturn || returnsDifferently(out, back, cityOf))
    .map(([out, back]) => ({ legs: [...out.legs, ...back.legs], price: out.price + back.price }));
  return cheapestPerRoute(trips, limit);
}
