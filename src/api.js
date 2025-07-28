export let ryanairAirports = [];
export let ryanairRoutes = {};

async function loadAirportsData() {
    try {
        const response = await fetch('../data/airports.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        ryanairAirports = await response.json();
        console.log(`Loaded ${ryanairAirports.length} airports from JSON`);
        return ryanairAirports;
    } catch (error) {
        console.error('Error loading airports data:', error);
        return [];
    }
}

async function loadRoutesData() {
    try {
        const response = await fetch('../data/routes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        ryanairRoutes = await response.json();
        console.log(`Loaded routes for ${Object.keys(ryanairRoutes).length} airports from JSON`);
        return ryanairRoutes;
    } catch (error) {
        console.error('Error loading routes data:', error);
        return {};
    }
}

export async function initializeData() {
    try {
        await Promise.all([
            loadAirportsData(),
            loadRoutesData()
        ]);

        console.log('All data loaded successfully');

        return { airports: ryanairAirports, routes: ryanairRoutes };
    } catch (error) {
        console.error('Error initializing data:', error);
        throw error;
    }
}