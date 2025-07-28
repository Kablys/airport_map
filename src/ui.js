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
        div.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.9); padding: 8px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <input type="text" id="airport-search" placeholder="Search airports..." 
                       style="width: 200px; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                <div id="search-results" style="max-height: 200px; overflow-y: auto; margin-top: 5px;"></div>
            </div>
        `;
        
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
            
            searchResults.innerHTML = matches.map(airport => `
                <div style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;"
                     onclick="window.flyToAirport(${airport.lat}, ${airport.lng})">
                    <strong>${airport.name} (${airport.code})</strong><br>
                    <span style="color: #666;">${airport.city}, ${airport.country}</span>
                </div>
            `).join('');
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
        div.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.9); padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 8px 0; color: #003d82;">Legend</h4>
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="background-color: #003d82; color: white; border-radius: 50%; width: 20px; height: 20px; border: 2px solid #ffcc00; display: flex; align-items: center; justify-content: center; font-size: 10px; margin-right: 8px;">12</div>
                    <span style="font-size: 12px;">Airport with number of outgoing flights</span>
                </div>
                <div id="flight-prices-section" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; display: none;">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">Flight Prices:</div>
                    <div style="display: flex; align-items: center; margin-bottom: 3px;">
                        <div style="width: 20px; height: 3px; background: linear-gradient(to right, #00cc44, #ff8800, #ff0066); margin-right: 6px; border-radius: 2px;"></div>
                        <span style="font-size: 10px;">Dynamic gradient (cheapest → most expensive)</span>
                    </div>
                    <div id="price-range-info" style="font-size: 9px; color: #666; margin-top: 4px;">
                        Select an airport to see price range
                    </div>
                </div>
                <div style="font-size: 10px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                    🔍 Use search to find specific destinations
                </div>
            </div>
        `;
        return div;
    };
    legend.addTo(map);
}

function addMapStyling() {
    const style = document.createElement('style');
    style.textContent = `
        .leaflet-control-zoom a {
            background-color: #003d82 !important;
            color: white !important;
            border: 1px solid #ffcc00 !important;
        }
        
        .leaflet-control-zoom a:hover {
            background-color: #0056b3 !important;
        }
        
        .search-control input:focus {
            outline: 2px solid #003d82;
            border-color: #003d82;
        }
        
        .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .leaflet-popup-tip {
            background: white;
        }
    `;
    document.head.appendChild(style);
}

export function updateSelectedAirportInfo(airport, routeCount) {
    const statsDiv = document.getElementById('airport-count');

    if (airport) {
        toggleFlightPricesSection(true);
        
        statsDiv.innerHTML = `
            <div style="background: rgba(255, 204, 0, 0.1); padding: 8px; border-radius: 4px;">
                <strong>Selected:</strong> ${airport.name}<br>
                <strong>Routes:</strong> ${routeCount} direct destinations<br>
                <small style="color: #666;">Click airport again to clear routes</small>
            </div>
        `;
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
        flightPricesSection.style.display = show ? 'block' : 'none';
    }
}
