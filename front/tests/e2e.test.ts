import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { fareRoutes } from '../fare-store.ts';
import index from '../index.html';

// Uses the dev fixture (data/dev): 5 airports, LGW -> CDG is a direct route, FCO is served only by Wizz Air
const DEV_AIRPORTS = 5;

let server: ReturnType<typeof Bun.serve>;
let faresDir: string;
let browser: Browser;
let page: Page;
const errors: string[] = [];

const markerCount = () => page.$$eval('.leaflet-marker-icon .airport-icon', (els) => els.length);
const clickAirport = async (index: number) => {
  const markers = await page.$$('.leaflet-marker-icon.airport-marker');
  await markers[index]?.click();
};

beforeAll(async () => {
  // Same routes as serve.ts; offline and in a temp dir so tests never call Ryanair or touch data/fares
  faresDir = await mkdtemp(join(tmpdir(), 'e2e-fares-'));
  server = Bun.serve({
    port: 0,
    development: true,
    routes: { '/': index, ...fareRoutes(faresDir, { offline: true }) },
  });
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  page = await browser.newPage();
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(server.url.href);
  await page.waitForSelector('.leaflet-marker-icon .airport-icon');
});

afterAll(async () => {
  await browser?.close();
  await server?.stop(true);
  await rm(faresDir, { recursive: true, force: true });
});

describe('map page', () => {
  it('renders the map with one set of controls', async () => {
    expect(await page.title()).toContain('European Low-Cost Flights Map');
    expect(await markerCount()).toBe(DEV_AIRPORTS);
    for (const selector of ['#airport-search', '#tile-selector', '.legend']) {
      expect(await page.$$eval(selector, (els) => els.length)).toBe(1);
    }
  });

  it('searches airports', async () => {
    await page.type('#airport-search', 'paris');
    await page.waitForSelector('.search-result');
    expect(await page.$eval('.search-result', (el) => el.textContent)).toContain('CDG');
    await page.click('.search-result');
    expect(await page.$$('.search-result')).toHaveLength(0);
  });

  it('switches the tile layer', async () => {
    await page.select('#tile-selector', 'openstreetmap');
    await page.waitForSelector('img.leaflet-tile[src*="tile.openstreetmap.org"]');
  });

  it('builds an itinerary without losing markers', async () => {
    await page.goto(page.url());
    await page.waitForSelector('.leaflet-marker-icon .airport-icon');

    await clickAirport(0); // LGW
    await page.waitForSelector('.route-line');
    expect(await page.$eval('.price-range-info', (el) => el.textContent)).toMatch(/€\d+/);

    await clickAirport(1); // CDG
    await page.waitForSelector('#itinerary-panel');
    const panel = await page.$eval('#itinerary-panel', (el) => el.textContent ?? '');
    expect(panel).toContain('LGW');
    expect(panel).toContain('CDG');
    expect(panel).toContain('Flight Segments: 1');
    expect(await markerCount()).toBe(DEV_AIRPORTS);

    await page.click('.clear-itinerary-btn');
    expect(await page.$('#itinerary-panel')).toBeNull();
  });

  it('filters airports and routes by airline', async () => {
    const wizz = await page.$$('.airline-filter input');
    await wizz[1]?.click(); // Wizz Air off
    expect(await markerCount()).toBe(DEV_AIRPORTS - 1);
    await wizz[1]?.click(); // back on
    expect(await markerCount()).toBe(DEV_AIRPORTS);
  });

  it('plans a trip and loads it into the itinerary with live fares', async () => {
    await page.setRequestInterception(true);
    let fareRequests = 0;
    // Wizz Air file: covers the next 90 days, flying only LGW → FCO at €15
    const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const wizzDays = Object.fromEntries(Array.from({ length: 90 }, (_, i) => [day(i), [15, '09:00']]));
    const wizzFile = { fetched: day(0), from: day(0), to: day(89), routes: { 'LGW-FCO': wizzDays } };
    page.on('request', (req) => {
      // The dev server serves the fares file as a hashed /_bun/asset/*.json (its only JSON asset)
      if (/\/_bun\/asset\/\w+\.json$/.test(req.url())) {
        return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(wizzFile) });
      }
      const match = req.url().match(/\/api\/fares\/(\w+)\/(\w+)\/(\d{4}-\d{2})/);
      if (!match) return req.continue();
      fareRequests++;
      const [, from, to, month] = match;
      const cheap = ['LGW-CDG', 'CDG-BCN', 'BCN-LGW'].includes(`${from}-${to}`);
      const fares = Array.from({ length: 28 }, (_, i) => {
        const day = `${month}-${String(i + 1).padStart(2, '0')}`;
        return {
          day,
          departureDate: `${day}T08:00:00`,
          arrivalDate: `${day}T10:30:00`,
          price: { value: cheap ? 10 : 99, currencyCode: 'EUR' },
          soldOut: false,
          unavailable: false,
        };
      });
      req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ outbound: { fares } }),
      });
    });
    await page.goto(page.url());
    await page.click('.planner-toggle');
    await page.select('#planner-destination', 'BCN'); // planner uses Ryanair routes only
    await page.click('.planner-submit');
    await page.waitForSelector('.planner-trip');
    const best = await page.$eval('.planner-trip', (el) => el.textContent ?? '');
    expect(best).toContain('€30.00');
    expect(best).toContain('London → Paris');

    const previewPaths = () => page.$$eval('.leaflet-trip-preview-pane path', (els) => els.length);
    await page.hover('.planner-trip');
    expect(await previewPaths()).toBe(3);
    expect(await page.$$('.leaflet-trip-preview-pane text.chevron-line')).toHaveLength(3);
    await page.hover('.planner-submit');
    expect(await previewPaths()).toBe(0);
    expect(await page.$$('text.chevron-line')).toHaveLength(0); // removed with their legs

    await page.click('.planner-trip');
    await page.waitForFunction(() => document.querySelector('#itinerary-panel')?.textContent?.includes('€30.00'));
    const panel = await page.$eval('#itinerary-panel', (el) => el.textContent ?? '');
    expect(panel).toContain('Flight Segments: 3');
    expect(panel).toContain('08:00→10:30');
    expect(await page.$$('.nights-input')).toHaveLength(2);
    // A Ryanair link per leg, and the trip as Multicity bookings of at most two flights
    expect(await page.$$('.flight-info-column .book-link')).toHaveLength(3);
    expect(await page.$$eval('.itinerary-booking-links .book-link', (els) => els.map((el) => el.textContent))).toEqual([
      'LGW→CDG, CDG→BCN ↗',
      'BCN→LGW ↗',
    ]);
    // One run of › chevrons per leg, following its path; preview chevrons live in their own pane
    const chevrons = await page.$$eval('.leaflet-overlay-pane text.chevron-line', (els) =>
      els.map((el) => el.querySelectorAll('tspan').length)
    );
    expect(chevrons).toHaveLength(3);
    expect(chevrons.every((n) => n > 1)).toBe(true);

    await page.click('#planner-one-way');
    await page.click('.planner-submit');
    await page.waitForFunction(() => document.querySelector('.planner-trip')?.textContent?.includes('€20.00'));
    expect(await page.$eval('.planner-trip .planner-route', (el) => el.textContent)).toBe(
      'London → Paris 2n → Barcelona'
    );

    await page.type('#planner-avoid', 'paris');
    await page.keyboard.press('Enter');
    await page.click('.planner-submit');
    await page.waitForFunction(() => document.querySelector('.planner-trip')?.textContent?.includes('€99.00'));
    expect(await page.$$eval('.planner-route', (els) => els.map((el) => el.textContent))).toEqual([
      'London → Barcelona',
    ]);
    await page.click('.avoid-chip');

    // Suggestions include whole countries; arrows pick one, Enter adds it ("an": France, Netherlands)
    await page.type('#planner-avoid', 'an');
    await page.waitForSelector('.planner-avoid-option');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.type('#planner-avoid', 'an');
    await page.keyboard.press('Enter');
    expect(await page.$$eval('.avoid-chip', (els) => els.map((el) => el.textContent?.trim()))).toEqual([
      '🇫🇷 France ✕',
      '🇳🇱 Netherlands ✕',
    ]);
    await page.click('.avoid-chip');
    await page.click('.avoid-chip');

    // Wizz-only route, priced from the pre-fetched file
    await page.select('#planner-destination', 'FCO');
    await page.click('.planner-submit');
    await page.waitForFunction(() => document.querySelector('.planner-trip')?.textContent?.includes('€15.00'));
    const wizzTrip = await page.$eval('.planner-trip', (el) => el.textContent ?? '');
    expect(wizzTrip).toContain('London → Rome');
    expect(wizzTrip).toContain('Wizz Air');
    expect(wizzTrip).not.toContain('estimated');

    // After a reload the same Ryanair search is answered from IndexedDB
    expect(fareRequests).toBeGreaterThan(0);
    fareRequests = 0;
    await page.goto(page.url());
    await page.click('.planner-toggle');
    await page.select('#planner-destination', 'BCN');
    await page.click('.planner-submit');
    await page.waitForSelector('.planner-trip');
    expect(await page.$eval('.planner-trip', (el) => el.textContent ?? '')).toContain('€30.00');
    expect(fareRequests).toBe(0);
    await page.setRequestInterception(false);
  });

  it('logs no browser errors', () => {
    expect(errors).toEqual([]);
  });
});
