import type { Airport, Routes } from './types.ts';
import { addDays, calculateDistance, daysBetween } from './utils.ts';

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
  /** Fly home through other cities than on the way out; ignored when `maxStops` is 0. */
  differentReturn: boolean;
  /** Cities never used as stopovers (blacklisted or already visited). */
  /** City or country names never used as stopovers. */
  avoid: string[];
}

export interface TripLeg {
  from: string;
  to: string;
  date: string;
  price: number;
  airline: string;
  estimated: boolean;
  /** Where a real fare came from, when not the airline itself (e.g. "travelpayouts"). */
  source?: string;
}

export interface Trip {
  legs: TripLeg[];
  price: number;
}

/** Cheapest fare for a route on a day, or undefined when there is no flight. */
export type FareLookup = (
  from: string,
  to: string,
  date: string
) => { price: number; airline: string; estimated: boolean; source?: string } | undefined;

// Stopovers that make the way longer than this times the direct distance aren't "on the way"
const MAX_DETOUR = 1.5;
// Cheapest options kept per day before pairing outbound with return; bounds the pairing work
const KEEP_PER_DAY = 20;

/**
 * Airport sequences from → to with up to `maxStops` stopovers, along known routes, without big detours
 * and without stopping in any city or country named in `avoid`.
 */
export function candidatePaths(
  from: string,
  to: string,
  maxStops: number,
  routes: Routes,
  airportByCode: Map<string, Airport>,
  avoid: readonly string[] = [],
  maxDetour = MAX_DETOUR
): string[][] {
  const start = airportByCode.get(from);
  const end = airportByCode.get(to);
  if (!start || !end) return [];
  const limit = calculateDistance(start, end) * maxDetour;
  const avoided = (a: Airport) => avoid.includes(a.city) || avoid.includes(a.country);
  const paths: string[][] = [];
  const walk = (path: string[], here: Airport, travelled: number) => {
    for (const code of routes[here.code] ?? []) {
      if (code === to) {
        paths.push([...path, code]);
        continue;
      }
      const next = airportByCode.get(code);
      if (!next || path.includes(code) || path.length > maxStops || avoided(next)) continue;
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
    candidatePaths(from, to, query.maxStops, routes, airportByCode, query.avoid);
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
    const quote = fare(from, to, date);
    if (!quote) return;
    const soFar = [...legs, { from, to, date, ...quote }];
    const total = price + quote.price;
    // shortcut: a flight arriving after midnight still counts as arriving on its departure day
    if (i + 2 === path.length) options.push({ legs: soFar, price: total });
    else for (let n = nights[0]; n <= nights[1]; n++) step(i + 1, addDays(date, n), soFar, total);
  };
  for (const day of days) step(0, day, [], 0);
  return options;
}

const routeOf = (legs: TripLeg[]) => legs.map((l) => l.from).join('-');

/**
 * The cheapest KEEP_PER_DAY options per day picked by `dayOf`, cheapest first, one per route: the same route on
 * other days in between only costs more, and would crowd out other routes.
 */
function cheapestPerDay(options: Option[], dayOf: (o: Option) => string): Map<string, Option[]> {
  const byDay = new Map<string, Option[]>();
  for (const o of options.sort((a, b) => a.price - b.price)) {
    const list = byDay.get(dayOf(o)) ?? [];
    if (list.length < KEEP_PER_DAY && !list.some((kept) => routeOf(kept.legs) === routeOf(o.legs))) {
      byDay.set(dayOf(o), [...list, o]);
    }
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
    const route = routeOf(trip.legs);
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
    candidatePaths(from, to, query.maxStops, routes, airportByCode, query.avoid).flatMap((p) =>
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
    .filter(([out, back]) => !query.differentReturn || query.maxStops === 0 || returnsDifferently(out, back, cityOf))
    .map(([out, back]) => ({ legs: [...out.legs, ...back.legs], price: out.price + back.price }));
  return cheapestPerRoute(trips, limit);
}

/** Inclusive YYYY-MM-DD range. */
export type DayRange = [first: string, last: string];

/** A place the trip must visit, in order. */
export interface TripPlace {
  /** Any of these airports, e.g. ["TFS", "TFN"] for Tenerife. */
  at: string[];
  /** Day the flight in lands; required for every place but the first. */
  arrive?: DayRange;
  /** Day the flight out leaves; required for every place but the last. */
  leave?: DayRange;
  /** Nights here, when the arrive and leave ranges alone allow too short or long a stay. */
  nights?: [min: number, max: number];
}

/** Fixed places with dates, joined by flexible stopovers: "be in Tenerife 22-28 Nov, get there via 1-3 cities". */
export interface TripQuery {
  places: TripPlace[];
  /** Stopovers on each way between two places, and nights at each stopover. */
  via: { stops: [min: number, max: number]; nights: [min: number, max: number] };
  /** Every city on the trip is in a different country (home counts once). */
  distinctCountries: boolean;
  /** City or country names never used as stopovers. */
  avoid: string[];
  /** How much longer than the direct distance a way between two places may be; default 1.5. */
  maxDetour?: number;
}

/** Days in the range, in order. */
function daysIn([first, last]: DayRange): string[] {
  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  return days;
}

const inRange = (n: number, [min, max]: [number, number]) => n >= min && n <= max;

/** Airport paths for each way between consecutive places. */
function tripPaths(query: TripQuery, routes: Routes, airportByCode: Map<string, Airport>): string[][][] {
  const [minStops, maxStops] = query.via.stops;
  return query.places
    .slice(1)
    .map((place, i) =>
      (query.places[i]?.at ?? []).flatMap((from) =>
        place.at.flatMap((to) =>
          candidatePaths(from, to, maxStops, routes, airportByCode, query.avoid, query.maxDetour).filter(
            (p) => p.length - 2 >= minStops
          )
        )
      )
    );
}

/** Every route and month (YYYY-MM) the trip search may price, so fares can be fetched up front. */
export function tripFaresToFetch(
  query: TripQuery,
  routes: Routes,
  airportByCode: Map<string, Airport>
): { from: string; to: string; month: string }[] {
  const keys = new Set(
    tripPaths(query, routes, airportByCode).flatMap((paths, i) => {
      const first = query.places[i]?.leave?.[0] ?? '';
      const last = query.places[i + 1]?.arrive?.[1] ?? '';
      const months: string[] = [];
      for (let m = first.slice(0, 7); m <= last.slice(0, 7); m = addDays(`${m}-01`, 32).slice(0, 7)) months.push(m);
      return paths.flatMap((p) => p.slice(1).flatMap((to, j) => months.map((month) => `${p[j]} ${to} ${month}`)));
    })
  );
  return [...keys].map((key) => {
    const [from = '', to = '', month = ''] = key.split(' ');
    return { from, to, month };
  });
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDayRange = (r: unknown) =>
  Array.isArray(r) && r.length === 2 && r.every((d) => typeof d === 'string' && DAY.test(d)) && r[0] <= r[1];
const isMinMax = (r: unknown) =>
  Array.isArray(r) && r.length === 2 && r.every((n) => Number.isInteger(n) && n >= 0) && r[0] <= r[1];

/** Why place `i` of `count` can't be searched, or undefined when it can. */
function placeProblem(place: TripPlace, i: number, count: number, airportByCode: Map<string, Airport>) {
  const name = `places[${i}]`;
  if (!Array.isArray(place.at) || place.at.length === 0) return `${name}.at must list airport codes`;
  const unknown = place.at.find((code) => !airportByCode.has(code));
  if (unknown) return `${name}.at: unknown airport ${unknown}`;
  if (i > 0 && !place.arrive) return `${name}.arrive is required`;
  if (i < count - 1 && !place.leave) return `${name}.leave is required`;
  for (const key of ['arrive', 'leave'] as const) {
    if (place[key] && !isDayRange(place[key])) return `${name}.${key} must be ["YYYY-MM-DD", "YYYY-MM-DD"], in order`;
  }
  if (place.nights && !isMinMax(place.nights)) return `${name}.nights must be [min, max]`;
  return undefined;
}

/** Why the query can't be searched, or undefined when it can. */
export function tripQueryProblem(query: TripQuery, airportByCode: Map<string, Airport>): string | undefined {
  const { places } = query;
  if (!Array.isArray(places) || places.length < 2) return 'places must list at least two places';
  for (const [i, place] of places.entries()) {
    const problem = placeProblem(place, i, places.length, airportByCode);
    if (problem) return problem;
  }
  if (!isMinMax(query.via?.stops)) return 'via.stops must be [min, max]';
  if (!isMinMax(query.via.nights)) return 'via.nights must be [min, max]';
  if (!Array.isArray(query.avoid)) return 'avoid must be a list of city or country names';
  return undefined;
}

/**
 * Cheapest trips visiting `query.places` in order on their dates, one per distinct route, cheapest first.
 * Each way between two places is searched on its own, then the ways are joined where the stay fits.
 */
export function searchTrips(
  query: TripQuery,
  routes: Routes,
  airportByCode: Map<string, Airport>,
  fare: FareLookup,
  limit = 15
): Trip[] {
  const { places, via } = query;
  const countryOf = (code: string) => airportByCode.get(code)?.country ?? code;
  const cityOf = (code: string) => airportByCode.get(code)?.city ?? code;
  /** Cities the legs visit (the start, and each landing except a return to the start), in different countries. */
  const distinct = (legs: TripLeg[]) => {
    const first = legs[0]?.from ?? '';
    const visited = [first, ...legs.map((l) => l.to)];
    if (cityOf(visited.at(-1) ?? '') === cityOf(first)) visited.pop();
    return new Set(visited.map(countryOf)).size === visited.length;
  };

  const ways = tripPaths(query, routes, airportByCode).map((paths, i) => {
    const arrive = places[i + 1]?.arrive;
    const leave = places[i]?.leave;
    if (!arrive || !leave) throw new Error('Unchecked query: run tripQueryProblem first');
    return paths
      .flatMap((p) => datedOptions(p, daysIn(leave), via.nights, arrive[1], fare))
      .filter((o) => (o.legs.at(-1)?.date ?? '') >= arrive[0] && (!query.distinctCountries || distinct(o.legs)));
  });

  let trips: Option[] = ways[0] ?? [];
  for (const [i, way] of ways.entries()) {
    if (i === 0) continue;
    const stay = places[i]?.nights ?? [0, Number.POSITIVE_INFINITY];
    const byArrival = cheapestPerDay(trips, (o) => o.legs.at(-1)?.date ?? '');
    const byDeparture = cheapestPerDay(way, (o) => o.legs[0]?.date ?? '');
    trips = [...byArrival].flatMap(([arrival, sofar]) =>
      [...byDeparture]
        .filter(([departure]) => departure >= arrival && inRange(daysBetween(arrival, departure), stay))
        .flatMap(([, nexts]) =>
          sofar.flatMap((a) => nexts.map((b) => ({ legs: [...a.legs, ...b.legs], price: a.price + b.price })))
        )
        .filter((t) => !query.distinctCountries || distinct(t.legs))
    );
  }
  return cheapestPerRoute(trips, limit);
}
