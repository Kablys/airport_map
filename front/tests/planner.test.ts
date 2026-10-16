import { describe, expect, it } from 'bun:test';
import airports from '../../data/dev/airports.json';
import network from '../../data/dev/routes.json';
import { candidatePaths, legsToFetch, type PlanQuery, planTrips } from '../src/planner.ts';
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
  differentReturn: true,
};

/** €100 everywhere, daily, unless listed. */
const faresFrom =
  (table: Record<string, number>) =>
  (from: string, to: string): number =>
    table[`${from}-${to}`] ?? 100;

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

  it('only uses days with flights', () => {
    const onlyNov3 = (from: string, to: string, date: string) =>
      from === 'LGW' && to === 'FCO' && date !== '2026-11-03' ? undefined : 50;
    const trips = planTrips({ ...query, differentReturn: false }, routes, airportByCode, onlyNov3);
    expect(trips.length).toBeGreaterThan(0);
    for (const t of trips) {
      const first = t.legs[0];
      if (first?.from === 'LGW' && first.to === 'FCO') expect(first.date).toBe('2026-11-03');
    }
    expect(planTrips(query, routes, airportByCode, () => undefined)).toEqual([]);
  });
});
