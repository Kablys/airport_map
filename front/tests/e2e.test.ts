import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import index from '../index.html';

// Uses the dev fixture (data/dev): 5 airports, LGW -> CDG is a direct route, FCO is served only by Wizz Air
const DEV_AIRPORTS = 5;

let server: ReturnType<typeof Bun.serve>;
let browser: Browser;
let page: Page;
const errors: string[] = [];

const markerCount = () => page.$$eval('.leaflet-marker-icon .airport-icon', (els) => els.length);
const clickAirport = async (index: number) => {
  const markers = await page.$$('.leaflet-marker-icon.airport-marker');
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

  it('logs no browser errors', () => {
    expect(errors).toEqual([]);
  });
});
