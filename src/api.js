export let ryanairAirports = [];
export let ryanairRoutes = {};

async function loadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

export async function initializeData() {
    const results = await Promise.allSettled([
        loadJSON('./data/airports.json'),
        loadJSON('./data/routes.json')
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