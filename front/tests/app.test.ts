import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import puppeteer, { type Browser, type Page } from 'puppeteer';

describe('Eurotrip Planner E2E Tests', () => {
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
        '--disable-features=VizDisplayCompositor', // Faster rendering
        '--disable-dev-shm-usage', // Overcome limited resource problems
        '--disable-gpu', // Disable GPU for headless
        '--no-first-run', // Skip first run setup
        '--disable-default-apps', // Don't load default apps
        '--disable-extensions',
      ]
    });

    // Check if server is running
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

    // Faster timeouts
    page.setDefaultTimeout(3000);
    page.setDefaultNavigationTimeout(5000);

    // Load the page once for all tests
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' }); // Faster than networkidle0
  });

  afterAll(async () => {
    const hasErrors = consoleErrors.length > 0 || pageErrors.length > 0;
    if (hasErrors) {
      // Print a compact error report for CI diagnostics
      // eslint-disable-next-line no-console
      console.log('\n--- Browser error logs (app.test.ts) ---');
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

  it('should load the main page successfully', async () => {
    const title = await page.title();
    expect(title).toContain('Ryanair European Airports Map');

    // Check if main elements are present
    const mapContainer = await page.$('#map');
    expect(mapContainer).toBeTruthy();
  });

  it('should display the map with leaflet container', async () => {
    await page.waitForSelector('.leaflet-container', { timeout: 2000 });

    // Check both elements in parallel
    const [leafletContainer, mapPane] = await Promise.all([
      page.$('.leaflet-container'),
      page.$('.leaflet-map-pane')
    ]);

    expect(leafletContainer).toBeTruthy();
    expect(mapPane).toBeTruthy();
  });

  it('should show search functionality', async () => {
    await page.waitForSelector('#airport-search', { timeout: 1500 });

    // Type in search box and check results in parallel
    await page.type('#airport-search', 'London');
    await new Promise(resolve => setTimeout(resolve, 500));

    const searchResults = await page.$('#search-results');
    expect(searchResults).toBeTruthy();
  });

  it('should handle basic page interactions', async () => {
    // Test map page is present
    const mapPage = await page.$('#map-page');
    expect(mapPage).toBeTruthy();
  });



  it('should be responsive on mobile viewport', async () => {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    await page.waitForSelector('#map', { timeout: 2000 });

    // Check map element is present
    const mapDiv = await page.$('#map');
    expect(mapDiv).toBeTruthy();

    // Reset viewport for other tests
    await page.setViewport({ width: 1280, height: 720 });
  });

  it('should handle basic page structure', async () => {
    // Check basic page structure
    const [body, mapPage] = await Promise.all([
      page.$('body'),
      page.$('#map-page')
    ]);

    expect(body).toBeTruthy();
    expect(mapPage).toBeTruthy();
  });
});