import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import index from '../index.html';

// Uses the dev fixture (data/dev): 5 airports, LGW -> CDG is a direct route
const DEV_AIRPORTS = 5;

let server: ReturnType<typeof Bun.serve>;
let browser: Browser;
let page: Page;
const errors: string[] = [];

const markerCount = () => page.$$eval('.leaflet-marker-icon .airport-icon', (els) => els.length);
const clickAirport = async (index: number) => {
  const markers = await page.$$('.leaflet-marker-icon.ryanair-marker');
  await markers[index]?.click();
};

beforeAll(async () => {
  server = Bun.serve({ port: 0, development: true, routes: { '/': index } });
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
});

describe('map page', () => {
  it('renders the map with one set of controls', async () => {
    expect(await page.title()).toContain('Ryanair European Airports Map');
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

  it('plans a trip and loads it into the itinerary with live fares', async () => {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const match = req.url().match(/oneWayFares\/(\w+)\/(\w+)\/cheapestPerDay\?outboundMonthOfDate=(\d{4}-\d{2})/);
      if (!match) return req.continue();
      const [, from, to, month] = match;
      const cheap = ['LGW-AMS', 'AMS-FCO', 'FCO-BCN', 'BCN-LGW'].includes(`${from}-${to}`);
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
    await page.select('#planner-destination', 'FCO');
    await page.click('.planner-submit');
    await page.waitForSelector('.planner-trip');
    const best = await page.$eval('.planner-trip', (el) => el.textContent ?? '');
    expect(best).toContain('€40.00');
    expect(best).toContain('London → Amsterdam');

    await page.click('.planner-trip');
    await page.waitForFunction(() => document.querySelector('#itinerary-panel')?.textContent?.includes('€40.00'));
    const panel = await page.$eval('#itinerary-panel', (el) => el.textContent ?? '');
    expect(panel).toContain('Flight Segments: 4');
    expect(panel).toContain('08:00→10:30');
    expect(await page.$$('.nights-input')).toHaveLength(3);
    await page.setRequestInterception(false);
  });

  it('logs no browser errors', () => {
    expect(errors).toEqual([]);
  });
});
