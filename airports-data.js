// Ryanair European airports and routes data loader
// Data is now stored in JSON files for better maintainability

let ryanairAirports = [];
let ryanairRoutes = {};

// Load airports data from JSON
async function loadAirportsData() {
    try {
        const response = await fetch('data/airports.json');
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

// Load routes data from JSON
async function loadRoutesData() {
    try {
        const response = await fetch('data/routes.json');
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

// Initialize all data
async function initializeData() {
    try {
        await Promise.all([
            loadAirportsData(),
            loadRoutesData()
        ]);

        console.log('All data loaded successfully');

        // Dispatch custom event to notify that data is ready
        window.dispatchEvent(new CustomEvent('dataLoaded', {
            detail: {
                airports: ryanairAirports,
                routes: ryanairRoutes
            }
        }));

        return { airports: ryanairAirports, routes: ryanairRoutes };
    } catch (error) {
        console.error('Error initializing data:', error);
        throw error;
    }
}

// Export for global access
window.ryanairAirports = ryanairAirports;
window.ryanairRoutes = ryanairRoutes;
window.initializeData = initializeData;