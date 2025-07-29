export let ryanairAirports = [];
export let ryanairRoutes = {};

/**
 * Loads JSON data from a URL
 *
 * @param url - The URL to load JSON from
 * @returns The parsed JSON data
 */
async function loadJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to load JSON from ${url}:`, error);
    throw error;
  }
}

/**
 * Initializes the application data by loading airports and routes
 *
 * @returns Object containing airports and routes data
 */
export async function initializeData() {
  const results = await Promise.allSettled([
    loadJSON('./data/airports.json'),
    loadJSON('./data/routes.json'),
  ]);

  if (results[0].status === 'fulfilled') {
    ryanairAirports = results[0].value;
    console.log(`Loaded ${ryanairAirports.length} airports from JSON`);
  } else {
    console.error('Error loading airports data:', results[0].reason);
  }

  if (results[1].status === 'fulfilled') {
    ryanairRoutes = results[1].value;
    console.log(`Loaded routes for ${Object.keys(ryanairRoutes).length} airports from JSON`);
  } else {
    console.error('Error loading routes data:', results[1].reason);
  }

  return { airports: ryanairAirports, routes: ryanairRoutes };
}
