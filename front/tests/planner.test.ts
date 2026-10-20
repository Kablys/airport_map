import { describe, expect, it } from 'bun:test';
import airports from '../../data/dev/airports.json';
import network from '../../data/dev/routes.json';
import {
  candidatePaths,
  legsToFetch,
  type PlanQuery,
  planTrips,
  searchTrips,
  type TripQuery,
  tripFaresToFetch,
  tripQueryProblem,
} from '../src/planner.ts';
import type { Airport } from '../src/types.ts';
import { daysBetween, filterRoutes } from '../src/utils.ts';

// The search is airline-agnostic; use every dev route
const routes = filterRoutes(network, new Set(['FR', 'W6']));
const airportByCode = new Map<string, Airport>(airports.map((a) => [a.code, a]));

const query: PlanQuery = {
  origin: 'LGW',
  destination: 'FCO',
  earliest: '2026-11-01',
  latest: '2026-11-20',
  stopNights: [2, 3],
  destinationNights: [4, 5],
  maxStops: 1,
  oneWay: false,
  differentReturn: true,
  avoid: [],
};

const ryanair = (price: number) => ({ price, airline: 'FR', estimated: false });

/** €100 everywhere, daily, unless listed. */
const faresFrom = (table: Record<string, number>) => (from: string, to: string) =>
  ryanair(table[`${from}-${to}`] ?? 100);

describe('candidatePaths', () => {
  it('finds direct and one-stop paths along known routes', () => {
    const paths = candidatePaths('LGW', 'FCO', 1, routes, airportByCode).map((p) => p.join('-'));
    expect(paths.sort()).toEqual(['LGW-AMS-FCO', 'LGW-BCN-FCO', 'LGW-FCO']);
  });

  it('respects the stop limit', () => {
    expect(candidatePaths('LGW', 'FCO', 0, routes, airportByCode)).toEqual([['LGW', 'FCO']]);
    const twoStops = candidatePaths('LGW', 'FCO', 2, routes, airportByCode);
    expect(twoStops.some((p) => p.length === 4)).toBe(true);
    expect(twoStops.every((p) => p.length <= 4 && new Set(p).size === p.length)).toBe(true);
  });

  it('skips avoided cities as stopovers', () => {
    const paths = candidatePaths('LGW', 'FCO', 1, routes, airportByCode, ['Amsterdam']).map((p) => p.join('-'));
    expect(paths.sort()).toEqual(['LGW-BCN-FCO', 'LGW-FCO']);
  });

  it('lists only outbound legs for one-way trips', () => {
    const legs = legsToFetch({ ...query, oneWay: true }, routes, airportByCode).map((l) => l.join('-'));
    expect(legs).toContain('LGW-AMS');
    expect(legs).not.toContain('AMS-LGW');
  });

  it('lists each leg to fetch once, both directions', () => {
    const legs = legsToFetch(query, routes, airportByCode).map((l) => l.join('-'));
    expect(new Set(legs).size).toBe(legs.length);
    expect(legs).toContain('LGW-AMS');
    expect(legs).toContain('AMS-LGW');
  });
});

describe('planTrips', () => {
  const cheapLoop = { 'LGW-AMS': 10, 'AMS-FCO': 10, 'FCO-BCN': 10, 'BCN-LGW': 10 };

  it('finds the cheapest round trip within the window and stay lengths', () => {
    const [best, ...rest] = planTrips(query, routes, airportByCode, faresFrom(cheapLoop));
    expect(best?.price).toBe(40);
    expect(best?.legs.map((l) => l.from).join('-')).toBe('LGW-AMS-FCO-BCN');
    const dates = best?.legs.map((l) => l.date) ?? [];
    expect(dates[0]! >= query.earliest && dates.at(-1)! <= query.latest).toBe(true);
    const stays = dates.slice(1).map((d, i) => daysBetween(dates[i]!, d));
    expect(stays[0]).toBeGreaterThanOrEqual(2); // AMS
    expect(stays[1]).toBeGreaterThanOrEqual(4); // FCO
    expect(stays[2]).toBeLessThanOrEqual(3); // BCN
    expect(rest.every((t) => t.price >= 40)).toBe(true);
    expect(new Set(rest.map((t) => t.legs.map((l) => l.from).join('-'))).size).toBe(rest.length);
  });

  it('avoids repeating stopover cities on the way home unless allowed', () => {
    const sameWayBack = { ...cheapLoop, 'FCO-AMS': 1, 'AMS-LGW': 1 };
    const different = planTrips(query, routes, airportByCode, faresFrom(sameWayBack))[0];
    expect(different?.legs.map((l) => l.from).join('-')).toBe('LGW-AMS-FCO-BCN');
    const anyWay = planTrips({ ...query, differentReturn: false }, routes, airportByCode, faresFrom(sameWayBack))[0];
    expect(anyWay?.legs.map((l) => l.from).join('-')).toBe('LGW-AMS-FCO-AMS');
    expect(anyWay?.price).toBe(22);
  });

  it('ignores the different-return option for direct-only trips', () => {
    const trips = planTrips({ ...query, maxStops: 0 }, routes, airportByCode, faresFrom(cheapLoop));
    expect(trips.map((t) => t.legs.map((l) => l.from).join('-'))).toEqual(['LGW-FCO']);
    expect(trips[0]?.price).toBe(200);
  });

  it('plans one-way trips ending at the destination', () => {
    const trips = planTrips({ ...query, oneWay: true }, routes, airportByCode, faresFrom(cheapLoop));
    expect(trips[0]?.legs.map((l) => `${l.from}-${l.to}`)).toEqual(['LGW-AMS', 'AMS-FCO']);
    expect(trips[0]?.price).toBe(20);
    expect(trips.every((t) => t.legs.at(-1)?.to === 'FCO')).toBe(true);
  });

  it('never stops in avoided countries', () => {
    const trips = planTrips({ ...query, avoid: ['Netherlands'] }, routes, airportByCode, faresFrom(cheapLoop));
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.every((t) => t.legs.every((l) => l.from !== 'AMS' && l.to !== 'AMS'))).toBe(true);
  });

  it('never stops in avoided cities', () => {
    const trips = planTrips({ ...query, avoid: ['Amsterdam'] }, routes, airportByCode, faresFrom(cheapLoop));
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.every((t) => t.legs.every((l) => l.from !== 'AMS' && l.to !== 'AMS'))).toBe(true);
  });

  it('only uses days with flights', () => {
    const onlyNov3 = (from: string, to: string, date: string) =>
      from === 'LGW' && to === 'FCO' && date !== '2026-11-03' ? undefined : ryanair(50);
    const trips = planTrips({ ...query, differentReturn: false }, routes, airportByCode, onlyNov3);
    expect(trips.length).toBeGreaterThan(0);
    for (const t of trips) {
      const first = t.legs[0];
      if (first?.from === 'LGW' && first.to === 'FCO') expect(first.date).toBe('2026-11-03');
    }
    expect(planTrips(query, routes, airportByCode, () => undefined)).toEqual([]);
  });
});

describe('searchTrips', () => {
  // Rome fixed on 6-10 Nov; London to Rome and back via one stopover each way
  const trip: TripQuery = {
    places: [
      { at: ['LGW'], leave: ['2026-11-01', '2026-11-05'] },
      { at: ['FCO'], arrive: ['2026-11-06', '2026-11-06'], leave: ['2026-11-10', '2026-11-10'] },
      { at: ['LGW'], arrive: ['2026-11-11', '2026-11-15'] },
    ],
    via: { stops: [1, 1], nights: [1, 3] },
    distinctCountries: false,
    avoid: [],
  };
  const route = (t: { legs: { from: string }[] }) => t.legs.map((l) => l.from).join('-');
  const cheapAmsterdam = { 'LGW-AMS': 10, 'AMS-FCO': 10, 'FCO-AMS': 10, 'AMS-LGW': 10 };

  it('keeps the fixed dates and lets the stopovers flex around them', () => {
    const trips = searchTrips(trip, routes, airportByCode, faresFrom({}));
    expect(trips.length).toBeGreaterThan(0);
    for (const t of trips) {
      const intoRome = t.legs.findIndex((l) => l.to === 'FCO');
      expect(t.legs[intoRome]?.date).toBe('2026-11-06');
      expect(t.legs[intoRome + 1]?.date).toBe('2026-11-10');
      expect(t.legs).toHaveLength(4); // exactly one stop each way: no direct LGW-FCO
      const first = t.legs[0]?.date ?? '';
      expect(first >= '2026-11-01' && first <= '2026-11-05').toBe(true);
      const stopNights = daysBetween(first, t.legs[1]?.date ?? '');
      expect(stopNights >= 1 && stopNights <= 3).toBe(true);
    }
  });

  it('finds the cheapest combination, one per route', () => {
    const trips = searchTrips(trip, routes, airportByCode, faresFrom(cheapAmsterdam));
    expect(route(trips[0] ?? { legs: [] })).toBe('LGW-AMS-FCO-AMS');
    expect(trips[0]?.price).toBe(40);
    expect(new Set(trips.map(route)).size).toBe(trips.length);
  });

  it('visits each country once when asked', () => {
    const trips = searchTrips({ ...trip, distinctCountries: true }, routes, airportByCode, faresFrom(cheapAmsterdam));
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.map(route)).not.toContain('LGW-AMS-FCO-AMS');
    expect(trips[0]?.price).toBe(220); // Amsterdam one way, €100 legs the other
  });

  it('respects nights at a place when its dates are loose', () => {
    const loose: TripQuery = {
      ...trip,
      places: [
        trip.places[0]!,
        { at: ['FCO'], arrive: ['2026-11-03', '2026-11-08'], leave: ['2026-11-05', '2026-11-12'], nights: [4, 4] },
        trip.places[2]!,
      ],
    };
    const trips = searchTrips(loose, routes, airportByCode, faresFrom({}));
    expect(trips.length).toBeGreaterThan(0);
    for (const t of trips) {
      const intoRome = t.legs.findIndex((l) => l.to === 'FCO');
      expect(daysBetween(t.legs[intoRome]?.date ?? '', t.legs[intoRome + 1]?.date ?? '')).toBe(4);
    }
  });

  it('accepts any of several airports for a place', () => {
    const either: TripQuery = { ...trip, via: { stops: [0, 0], nights: [1, 1] } };
    // Direct flights land the day they leave
    either.places = [
      { at: ['LGW'], leave: ['2026-11-06', '2026-11-06'] },
      { ...trip.places[1]!, at: ['FCO', 'BCN'] },
      { at: ['LGW'], arrive: ['2026-11-10', '2026-11-10'] },
    ];
    const routesFound = searchTrips(either, routes, airportByCode, faresFrom({})).map(route);
    expect(routesFound).toContain('LGW-FCO');
    expect(routesFound).toContain('LGW-BCN');
  });

  it('lists each route and month to fetch once, per way', () => {
    const fares = tripFaresToFetch(trip, routes, airportByCode).map((f) => `${f.from}-${f.to} ${f.month}`);
    expect(new Set(fares).size).toBe(fares.length);
    expect(fares).toContain('LGW-AMS 2026-11');
    expect(fares).toContain('AMS-LGW 2026-11');
    expect(fares).not.toContain('LGW-FCO 2026-11'); // needs a stop
  });

  it('explains queries it cannot search', () => {
    expect(tripQueryProblem(trip, airportByCode)).toBeUndefined();
    const [home, rome, back] = trip.places as [TripQuery['places'][0], TripQuery['places'][0], TripQuery['places'][0]];
    const problem = (places: TripQuery['places']) => tripQueryProblem({ ...trip, places }, airportByCode);
    expect(problem([home])).toMatch('at least two');
    expect(problem([home, { ...rome, at: ['XXX'] }, back])).toMatch('unknown airport XXX');
    expect(problem([home, { ...rome, arrive: undefined }, back])).toMatch('places[1].arrive is required');
    expect(problem([home, { ...rome, leave: ['2026-11-10', '2026-11-01'] }, back])).toMatch('places[1].leave');
    expect(tripQueryProblem({ ...trip, via: { stops: [2, 1], nights: [1, 1] } }, airportByCode)).toMatch('via.stops');
  });
});
