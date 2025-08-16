from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto("http://localhost:3004")

    # Wait for the map to load and markers to appear
    page.wait_for_selector(".leaflet-marker-icon")

    # Find the first airport marker
    first_marker = page.locator("div.leaflet-marker-icon").first

    # Click the marker
    first_marker.click()

    # Wait for the tooltip to appear
    tooltip = page.locator(".destination-tooltip")
    expect(tooltip).to_be_visible(timeout=10000)

    # Give it a moment to render the chart
    page.wait_for_timeout(2000)

    # Take a screenshot of the tooltip
    tooltip.screenshot(path="jules-scratch/verification/tooltip_screenshot.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
