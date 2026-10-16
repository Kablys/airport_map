import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fareRoutes, type StoredCalendar } from '../fare-store.ts';

let dir: string;
let server: ReturnType<typeof Bun.serve>;
const api = (path: string, init?: RequestInit) => fetch(new URL(path, server.url), init);
const post = (body: unknown) =>
  api('/api/fares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const day = (date: string, price: number) => ({
  day: date,
  departureDate: `${date}T06:45:00`,
  arrivalDate: `${date}T09:15:00`,
  price: { value: price, currencyCode: 'EUR' },
});
const calendar = (savedAt: string, price: number): StoredCalendar => ({
  savedAt,
  fares: [day('2026-11-03', price), { ...day('2026-11-04', 1), unavailable: true }],
});

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fares-'));
  server = Bun.serve({ port: 0, routes: fareRoutes(dir, { offline: true }) });
});

afterAll(async () => {
  await server?.stop(true);
  await rm(dir, { recursive: true, force: true });
});

describe('fare store', () => {
  it('imports calendars into one file per month, bookable days only, one line per route', async () => {
    const res = await post({
      'VNO-BGY-2026-11': calendar('2026-10-16T10:00:00.000Z', 27.99),
      'BGY-TFS-2026-12': calendar('2026-10-16T10:00:00.000Z', 30.99),
    });
    expect(await res.json()).toEqual({ months: ['2026-11', '2026-12'] });
    expect((await readdir(dir)).sort()).toEqual(['2026-11.json', '2026-12.json']);
    const text = await Bun.file(join(dir, '2026-11.json')).text();
    expect(text.split('\n')[1]).toStartWith('  "VNO-BGY": {"savedAt"');
    const stored = JSON.parse(text)['VNO-BGY'] as StoredCalendar;
    expect(stored.fares.map((f) => f.day)).toEqual(['2026-11-03']);
  });

  it('serves stored calendars in the shape Ryanair answers with', async () => {
    const body = await (await api('/api/fares/VNO/BGY/2026-11')).json();
    expect(body.outbound.fares[0].price.value).toBe(27.99);
  });

  it('keeps the newer calendar on import', async () => {
    await post({ 'VNO-BGY-2026-11': calendar('2026-10-01T00:00:00.000Z', 99) });
    const body = await (await api('/api/fares/VNO/BGY/2026-11')).json();
    expect(body.outbound.fares[0].price.value).toBe(27.99);
    await post({ 'VNO-BGY-2026-11': calendar('2026-10-17T00:00:00.000Z', 25) });
    expect((await (await api('/api/fares/VNO/BGY/2026-11')).json()).outbound.fares[0].price.value).toBe(25);
  });

  it('serves stored calendars however old, without calling Ryanair', async () => {
    await post({ 'VNO-RIX-2026-11': calendar('2020-01-01T00:00:00.000Z', 12) });
    const online = Bun.serve({ port: 0, routes: fareRoutes(dir) });
    try {
      const body = await (await fetch(new URL('/api/fares/VNO/RIX/2026-11', online.url))).json();
      expect(body.outbound.fares[0].price.value).toBe(12);
    } finally {
      await online.stop(true);
    }
  });

  it('answers "no flights" offline for unknown routes', async () => {
    expect(await (await api('/api/fares/VNO/OSL/2026-11')).json()).toEqual({ outbound: { fares: [] } });
  });

  it('rejects bad input without writing anything', async () => {
    expect((await api('/api/fares/VNO/BGY/..%2F..%2Fetc')).status).toBe(400);
    const res = await post({ 'VNO-OSL-2026-11': calendar('2026-10-20T00:00:00.000Z', 5), nope: {} });
    expect(res.status).toBe(400);
    expect(await (await api('/api/fares/VNO/OSL/2026-11')).json()).toEqual({ outbound: { fares: [] } });
  });
});
