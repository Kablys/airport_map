import { describe, it, expect, beforeAll } from 'bun:test';
import puppeteer, { type Browser, type Page } from 'puppeteer';

describe('Eurotrip Planner E2E Tests', () => {
  let browser: Browser;
  let page: Page;
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';

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
    await page.setViewport({ width: 1280, height: 720 });

    // Faster timeouts
    page.setDefaultTimeout(3000);
    page.setDefaultNavigationTimeout(5000);

    // Load the page once for all tests
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' }); // Faster than networkidle0
  });

  it('should load the main page successfully', async () => {
    const title = await page.title();
    expect(title).toContain('Ryanair European Airports Map');

    // Check if main elements are present
    const [mapContainer, navMap, navInfo] = await Promise.all([
      page.$('#map'),
      page.$('#nav-map'),
      page.$('#nav-info')
    ]);

    expect(mapContainer).toBeTruthy();
    expect(navMap).toBeTruthy();
    expect(navInfo).toBeTruthy();
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
    // Test navigation without page reload
    const navInfo = await page.$('#nav-info');
    if (navInfo) {
      await navInfo.click();
      await new Promise(resolve => setTimeout(resolve, 300));

      const infoPage = await page.$('#info-page');
      expect(infoPage).toBeTruthy();
    }

    // Go back to map
    const navMap = await page.$('#nav-map');
    if (navMap) {
      await navMap.click();
      await new Promise(resolve => setTimeout(resolve, 300));

      const mapPage = await page.$('#map-page');
      expect(mapPage).toBeTruthy();
    }
  });

  it('should display info page with stats', async () => {
    // Click on info navigation button (no page reload needed)
    await page.click('#nav-info');
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check elements in parallel
    const [infoPage, infoText] = await Promise.all([
      page.$('#info-page'),
      page.$eval('#info-page', el => el.textContent || '')
    ]);

    expect(infoPage).toBeTruthy();
    expect(infoText).toContain('Statistics');
    expect(infoText).toContain('Search Airports');
  });

  it('should be responsive on mobile viewport', async () => {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });
    // Ensure we are on the map page
    const navMapBtn = await page.$('#nav-map');
    if (navMapBtn) {
      await navMapBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }
    await page.waitForSelector('#map', { timeout: 2000 });

    // Check all elements in parallel
    const [mapDiv, navMap, navInfo] = await Promise.all([
      page.$('#map'),
      page.$('#nav-map'),
      page.$('#nav-info')
    ]);

    expect(mapDiv).toBeTruthy();
    expect(navMap).toBeTruthy();
    expect(navInfo).toBeTruthy();

    // Test navigation on mobile
    await navInfo!.click();
    await new Promise(resolve => setTimeout(resolve, 200));

    const infoPage = await page.$('#info-page');
    expect(infoPage).toBeTruthy();

    // Reset viewport for other tests
    await page.setViewport({ width: 1280, height: 720 });
  });

  it('should handle basic page structure', async () => {
    // Check main nav exists and pages render when selected
    const [body, mainNav, navStyle] = await Promise.all([
      page.$('body'),
      page.$('#main-nav'),
      page.$eval('#main-nav', el => window.getComputedStyle(el).display)
    ]);

    expect(body).toBeTruthy();
    expect(mainNav).toBeTruthy();
    expect(navStyle).not.toBe('');

    // Map page present when selected
    await page.click('#nav-map');
    await new Promise((r) => setTimeout(r, 200));
    const mapPage = await page.$('#map-page');
    expect(mapPage).toBeTruthy();

    // Info page present when selected
    await page.click('#nav-info');
    await new Promise((r) => setTimeout(r, 200));
    const infoPage = await page.$('#info-page');
    expect(infoPage).toBeTruthy();
  });
});