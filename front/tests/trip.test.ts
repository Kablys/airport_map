import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import airports from '../../data/dev/airports.json';
import network from '../../data/dev/routes.json';
import { kiwiDirect } from '../providers.ts';
import type { TripQuery } from '../src/planner.ts';
import { findTrips, mapLink, parseQuery, type TripData } from '../trip.ts';

// London → Barcelona (fixed 6-10 Nov) → London, one stopover each way: Paris is the only one on Ryanair
const query: TripQuery = {
  places: [
    { at: ['LGW'], leave: ['2026-11-01', '2026-11-05'] },
    { at: ['BCN'], arrive: ['2026-11-06', '2026-11-06'], leave: ['2026-11-10', '2026-11-10'] },
    { at: ['LGW'], arrive: ['2026-11-11', '2026-11-15'] },
  ],
  via: { stops: [1, 1], nights: [1, 3] },
  distinctCountries: false,
  avoid: ['Amsterdam'],
};

const novemberAt = (price: number) =>
  Array.from({ length: 30 }, (_, i) => {
    const day = `2026-11-${String(i + 1).padStart(2, '0')}`;
    return {
      day,
      departureDate: `${day}T08:00:00`,
      arrivalDate: `${day}T10:00:00`,
      price: { value: price, currencyCode: 'EUR' },
    };
  });

// Bun's fetch type carries extras (preconnect) a stub doesn't need
const fakeFetch = (respond: (url: string, init?: RequestInit) => Response) =>
  (async (input: string | URL | Request, init?: RequestInit) =>
    respond(String(input), init)) as unknown as typeof fetch;

let dir: string;
let data: TripData;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'trip-'));
  data = { airports, network, wizz: undefined, faresDir: dir, maxFetch: 0 };
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('findTrips', () => {
  it('prices legs from the fare store without calling Ryanair', async () => {
    const stored = { savedAt: '2026-10-20T00:00:00.000Z', fares: novemberAt(7) };
    await Bun.write(join(dir, '2026-11.json'), JSON.stringify({ 'LGW-CDG': stored, 'CDG-BCN': stored }));
    const fetchSpy = spyOn(globalThis, 'fetch');
    try {
      const { trips, fetched } = await findTrips(query, data, 5);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(fetched).toBe(0);
      const outbound = trips[0]?.legs.slice(0, 2);
      expect(outbound?.map((l) => [l.from, l.price, l.estimated])).toEqual([
        ['LGW', 7, false],
        ['CDG', 7, false],
      ]);
      expect(trips[0]?.legs.slice(2).every((l) => l.estimated)).toBe(true);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("fetches only the leading trips' calendars, saves them, and searches again", async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fakeFetch(() => Response.json({ outbound: { fares: novemberAt(5) } }))
    );
    try {
      const { trips, fetched, failed } = await findTrips(query, { ...data, maxFetch: 20 }, 1);
      expect(failed).toBe(0);
      expect(fetched).toBe(4);
      expect(trips[0]?.legs.map((l) => `${l.from}-${l.to}`)).toEqual(['LGW-CDG', 'CDG-BCN', 'BCN-CDG', 'CDG-LGW']);
      expect(trips[0]?.price).toBe(20);
      const saved = await Bun.file(join(dir, '2026-11.json')).json();
      expect(Object.keys(saved).sort()).toEqual(['BCN-CDG', 'CDG-BCN', 'CDG-LGW', 'LGW-CDG']);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('stops fetching at the first Ryanair error and keeps estimates', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fakeFetch(() => new Response('blocked', { status: 403 }))
    );
    const errors = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { trips, fetched, failed } = await findTrips(query, { ...data, maxFetch: 20 }, 3);
      expect(fetched).toBe(0);
      expect(failed).toBeGreaterThan(0);
      expect(fetchSpy.mock.calls.length).toBe(failed); // one batch, no retries
      expect(trips[0]?.legs.every((l) => l.estimated)).toBe(true);
    } finally {
      fetchSpy.mockRestore();
      errors.mockRestore();
    }
  });
});

describe('parseQuery', () => {
  const byCode = new Map(airports.map((a) => [a.code, a]));

  it('fills in defaults', () => {
    const parsed = parseQuery({ places: query.places }, byCode);
    expect(parsed.via).toEqual({ stops: [0, 2], nights: [1, 3] });
    expect(parsed.distinctCountries).toBe(false);
    expect(parsed.avoid).toEqual([]);
  });

  it('rejects queries it cannot search', () => {
    expect(() => parseQuery([], byCode)).toThrow('places');
    expect(() => parseQuery({ places: [{ at: 'LGW' }] }, byCode)).toThrow('at least two');
  });
});

describe('mapLink', () => {
  it("opens the trip as the map's itinerary, with nights between legs", () => {
    const leg = (from: string, to: string, date: string) => ({
      from,
      to,
      date,
      price: 1,
      airline: 'FR',
      estimated: false,
    });
    const link = mapLink({ legs: [leg('LGW', 'CDG', '2026-11-03'), leg('CDG', 'BCN', '2026-11-06')], price: 2 });
    expect(link).toBe('https://kablys.github.io/airport_map/?legs=LGW-CDG,CDG-BCN&start=2026-11-03&nights=3,0');
  });
});

describe('Travelpayouts', () => {
  // London ⇄ Rome is Wizz Air only in the dev data, so without Travelpayouts both legs are estimates
  const rome: TripQuery = {
    places: [
      { at: ['LGW'], leave: ['2026-11-06', '2026-11-06'] },
      { at: ['FCO'], arrive: ['2026-11-06', '2026-11-06'], leave: ['2026-11-10', '2026-11-10'] },
      { at: ['LGW'], arrive: ['2026-11-10', '2026-11-10'] },
    ],
    via: { stops: [0, 0], nights: [1, 1] },
    distinctCountries: false,
    avoid: [],
  };

  it('prices legs other airlines fly with its recent fares, and saves them', async () => {
    const tokens: (string | null)[] = [];
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fakeFetch((url, init) => {
        tokens.push(new Headers(init?.headers).get('X-Access-Token'));
        const q = new URL(url).searchParams;
        const day = (airport: string, price: number) => ({
          origin_airport: airport,
          destination_airport: q.get('destination'),
          price,
          airline: 'W6',
          departure_at: '2026-11-06T09:00:00+00:00',
          transfers: 0,
        });
        // The 7th is from another London airport and must be ignored
        const data = { '2026-11-06': day(q.get('origin') ?? '', 33), '2026-11-10': day(q.get('origin') ?? '', 44) };
        return Response.json({ success: true, data: { ...data, '2026-11-07': day('STN', 1) }, error: null });
      })
    );
    try {
      const { trips } = await findTrips(rome, { ...data, maxFetch: 10, travelpayoutsToken: 'secret' }, 1);
      expect(trips[0]?.legs.map((l) => [l.from, l.price, l.estimated, l.source])).toEqual([
        ['LGW', 33, false, 'travelpayouts'],
        ['FCO', 44, false, 'travelpayouts'],
      ]);
      expect(tokens.every((t) => t === 'secret')).toBe(true);
      const saved = await Bun.file(join(dir, 'travelpayouts.json')).json();
      expect(Object.keys(saved).sort()).toEqual(['FCO-LGW-2026-11', 'LGW-FCO-2026-11']);
      expect(saved['LGW-FCO-2026-11'].days['2026-11-07']).toBeUndefined();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('falls back to Kiwi.com day by day without a token', async () => {
    const urls: string[] = [];
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fakeFetch((url, init) => {
        urls.push(url);
        const { flyFrom, flyTo } = JSON.parse(String(init?.body)).params.arguments;
        return kiwiAnswer([kiwiItinerary(40, [flyFrom, flyTo])]);
      })
    );
    try {
      const { trips } = await findTrips(rome, { ...data, maxFetch: 10 }, 1);
      expect(trips[0]?.legs.map((l) => [l.from, l.price, l.estimated, l.source])).toEqual([
        ['LGW', 40, false, 'kiwi'],
        ['FCO', 40, false, 'kiwi'],
      ]);
      expect(urls.every((u) => u.startsWith('https://mcp.kiwi.com'))).toBe(true);
      expect(Object.keys(await Bun.file(join(dir, 'kiwi.json')).json()).sort()).toEqual([
        'FCO-LGW-2026-11-10',
        'LGW-FCO-2026-11-06',
      ]);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

const kiwiAnswer = (itineraries: unknown[]) =>
  new Response(
    `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify({ itineraries }) }] } })}\n\n`
  );
const kiwiItinerary = (price: number, route: string[]) => ({
  price,
  bookingUrl: `https://kiwi.com/u/${price}`,
  outbound: { route, departureTime: '2026-11-16T11:10:00', segments: [{ carrier: 'FR', flightNumber: 'FR2871' }] },
});

describe('kiwiDirect', () => {
  it('picks the cheapest direct flight and ignores connections', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fakeFetch(() =>
        kiwiAnswer([
          kiwiItinerary(20, ['VNO', 'RIX', 'BGY']),
          kiwiItinerary(35, ['VNO', 'BGY']),
          kiwiItinerary(29, ['VNO', 'BGY']),
        ])
      )
    );
    try {
      const body = JSON.parse(
        String(await kiwiDirect('VNO', 'BGY', '2026-11-16').then(() => fetchSpy.mock.calls[0]?.[1]?.body))
      );
      expect(body.params.arguments).toMatchObject({ flyFrom: 'VNO', flyTo: 'BGY', departureDate: '16/11/2026' });
      expect(await kiwiDirect('VNO', 'BGY', '2026-11-16')).toEqual({
        price: 29,
        airline: 'FR',
        flight: 'FR2871',
        departure: '2026-11-16T11:10:00',
        url: 'https://kiwi.com/u/29',
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('answers null when there is no direct flight', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fakeFetch(() => kiwiAnswer([kiwiItinerary(20, ['VNO', 'RIX', 'BGY'])]))
    );
    try {
      expect(await kiwiDirect('VNO', 'BGY', '2026-11-16')).toBeNull();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
