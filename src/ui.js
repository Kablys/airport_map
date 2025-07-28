export function initializeUI(airports, map) {
    // Make airports data available globally for UI functions
    window.ryanairAirports = airports;
    window.airportsByCountry = {};
    airports.forEach(airport => {
        if (!window.airportsByCountry[airport.country]) {
            window.airportsByCountry[airport.country] = [];
        }
        window.airportsByCountry[airport.country].push(airport);
    });
    
    initializeSearch(airports, map);
    addLegend(map);
    addMapStyling();
    updateSelectedAirportInfo(null);
}

function initializeSearch(airports, map) {
    const searchControl = L.control({ position: 'topright' });
    searchControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'search-control');
        
        const template = document.getElementById('search-control-template');
        const clone = template.content.cloneNode(true);
        div.appendChild(clone);
        
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        
        return div;
    };
    searchControl.addTo(map);

    const searchInput = document.getElementById('airport-search');
    const searchResults = document.getElementById('search-results');
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            const matches = airports.filter(airport => 
                airport.name.toLowerCase().includes(query) ||
                airport.city.toLowerCase().includes(query) ||
                airport.country.toLowerCase().includes(query) ||
                airport.code.toLowerCase().includes(query)
            ).slice(0, 10);
            
            if (matches.length === 0) {
                searchResults.innerHTML = '<div style="padding: 5px; color: #666;">No airports found</div>';
                return;
            }
            
            const template = document.getElementById('search-result-template');
            searchResults.innerHTML = '';
            
            matches.forEach(airport => {
                const clone = template.content.cloneNode(true);
                const div = clone.querySelector('div');

                // Use slots for dynamic content
                const nameCodeSlot = document.createElement('span');
                nameCodeSlot.slot = 'airport-name-code';
                nameCodeSlot.textContent = `${airport.name} (${airport.code})`;
                div.querySelector('.airport-name-code')?.replaceWith(nameCodeSlot);

                const locationSlot = document.createElement('span');
                locationSlot.slot = 'airport-location';
                locationSlot.textContent = `${airport.city}, ${airport.country}`;
                div.querySelector('.airport-location')?.replaceWith(locationSlot);

                div.onclick = () => window.flyToAirport(airport.lat, airport.lng);
                searchResults.appendChild(clone);
            });
        });
    }

    window.flyToAirport = function(lat, lng) {
        map.flyTo([lat, lng], 10);
        
        const searchInput = document.getElementById('airport-search');
        const searchResults = document.getElementById('search-results');
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '';
    }
}

function addLegend(map) {
    const legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        
        const template = document.getElementById('legend-template');
        const clone = template.content.cloneNode(true);
        div.appendChild(clone);
        
        return div;
    };
    legend.addTo(map);
}

function addMapStyling() {
    // All styling is now handled by CSS custom properties in assets/styles.css
    // This function is kept for compatibility but no longer needed
    console.log('Map styling loaded from CSS custom properties');
}

export function updateSelectedAirportInfo(airport, routeCount) {
    const statsDiv = document.getElementById('airport-count');
    if (!statsDiv) return;

    if (airport) {
        toggleFlightPricesSection(true);
        const template = document.getElementById('selected-airport-info-template');
        const clone = template.content.cloneNode(true);
        const container = document.createElement('div');
        container.appendChild(clone);

        // Use slots for dynamic content
        const nameSlot = document.createElement('span');
        nameSlot.slot = 'airport-name';
        nameSlot.textContent = airport.name;
        container.querySelector('.airport-name')?.replaceWith(nameSlot);

        const codeSlot = document.createElement('span');
        codeSlot.slot = 'airport-code';
        codeSlot.textContent = airport.code;
        container.querySelector('.airport-code')?.replaceWith(codeSlot);

        const countrySlot = document.createElement('span');
        countrySlot.slot = 'airport-country';
        countrySlot.textContent = airport.country;
        container.querySelector('.airport-country')?.replaceWith(countrySlot);

        const routeCountSlot = document.createElement('span');
        routeCountSlot.slot = 'route-count';
        routeCountSlot.textContent = routeCount;
        container.querySelector('.route-count')?.replaceWith(routeCountSlot);

        statsDiv.innerHTML = container.innerHTML;
    } else {
        toggleFlightPricesSection(false);
        statsDiv.innerHTML = `<strong>${window.ryanairAirports.length}</strong> airports across <strong>${Object.keys(window.airportsByCountry).length}</strong> countries`;
    }
}

export function updatePriceRangeDisplay(priceRange) {
    const priceRangeInfo = document.getElementById('price-range-info');
    if (priceRangeInfo && priceRange.min !== null && priceRange.max !== null) {
        if (priceRange.min === priceRange.max) {
            priceRangeInfo.innerHTML = `All routes: €${priceRange.min}`;
        } else {
            priceRangeInfo.innerHTML = `Price range: €${priceRange.min} - €${priceRange.max}`;
        }
    } else if (priceRangeInfo) {
        priceRangeInfo.innerHTML = 'Select an airport to see price range';
    }
}

export function toggleFlightPricesSection(show) {
    const flightPricesSection = document.getElementById('flight-prices-section');
    if (flightPricesSection) {
        // Control visibility through CSS custom properties and direct style
        flightPricesSection.style.setProperty('--dynamic-display', show ? 'block' : 'none');
        flightPricesSection.style.display = show ? 'block' : 'none';
    }
}
