import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import puppeteer, { type Browser, type Page } from 'puppeteer';

describe('Itinerary Creation Tests', () => {
  let browser: Browser;
  let page: Page;
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions',
      ]
    });

    try {
      const response = await fetch(APP_URL);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      console.log(`✅ Connected to dev server at ${APP_URL}`);
    } catch (error) {
      console.error(`❌ Cannot connect to ${APP_URL}`);
      console.error(`   Make sure to run 'bun run dev' in another terminal first!`);
      throw new Error(`Dev server not running at ${APP_URL}`);
    }

    page = await browser.newPage();
    // Capture console errors
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        try {
          consoleErrors.push(`[console.${msg.type()}] ${msg.text()}`);
        } catch {
          consoleErrors.push(`[console.${msg.type()}] <unreadable message>`);
        }
      }
    });
    // Capture unhandled page errors
    page.on('pageerror', (err) => {
      pageErrors.push(`[pageerror] ${err?.stack || err?.message || String(err)}`);
    });
    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultTimeout(3000);
    page.setDefaultNavigationTimeout(5000);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  });

  it('should create an itinerary by clicking on airport icons', async () => {
    await page.waitForSelector('.leaflet-container', { timeout: 2000 });
    // Ensure markers are rendered before querying
    await page.waitForSelector('.ryanair-marker', { timeout: 3000 });
    // small settle delay to allow all markers to attach
    await new Promise((r) => setTimeout(r, 200));

    // Click on the first airport to select it
    const airportMarkers = await page.$$('.ryanair-marker');
    expect(airportMarkers.length).toBeGreaterThan(20);
    await airportMarkers[0]!.click();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click on two different airport icons
    await airportMarkers[10]!.click(); // Click a random airport to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    await airportMarkers[20]!.click();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the itinerary panel
    const itineraryItems = await page.$$('#itinerary-panel .itinerary-row');
    expect(itineraryItems.length).toBeGreaterThanOrEqual(3); // 2 airports, 1 connection
  });

  afterAll(async () => {
    const hasErrors = consoleErrors.length > 0 || pageErrors.length > 0;
    if (hasErrors) {
      // eslint-disable-next-line no-console
      console.log('\n--- Browser error logs (itinerary.test.ts) ---');
      if (consoleErrors.length) {
        // eslint-disable-next-line no-console
        console.log(`Console errors (count=${consoleErrors.length}):`);
        for (const line of consoleErrors) {
          // eslint-disable-next-line no-console
          console.log(line);
        }
      }
      if (pageErrors.length) {
        // eslint-disable-next-line no-console
        console.log(`Page errors (count=${pageErrors.length}):`);
        for (const line of pageErrors) {
          // eslint-disable-next-line no-console
          console.log(line);
        }
      }
      // eslint-disable-next-line no-console
      console.log('--- End browser error logs ---\n');
      throw new Error(
        `Browser reported errors: console=${consoleErrors.length}, page=${pageErrors.length}`
      );
    }
    // Intentionally not closing browser here to avoid potential hangs in CI/Windows.
  });
});
