// Initialize the map
const map = L.map('map').setView([50.0, 10.0], 4);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// Custom Ryanair-style marker icon
const ryanairIcon = L.divIcon({
    className: 'ryanair-marker',
    html: `<div style="
        background-color: #003d82;
        color: white;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        border: 2px solid #ffcc00;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">✈</div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

// Group airports by country for better organization
const airportsByCountry = {};
ryanairAirports.forEach(airport => {
    if (!airportsByCountry[airport.country]) {
        airportsByCountry[airport.country] = [];
    }
    airportsByCountry[airport.country].push(airport);
});

// Store route lines for cleanup
let currentRouteLines = [];
let selectedAirport = null;

// Create airport lookup for quick access
const airportLookup = {};
ryanairAirports.forEach(airport => {
    airportLookup[airport.code] = airport;
});

// Flight pricing cache and API configuration
const flightPriceCache = new Map();
const PRICE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Ryanair API configuration
const RYANAIR_API_BASE = 'https://www.ryanair.com/api/booking/v4/';
const RYANAIR_CHEAPEST_API = 'https://www.ryanair.com/api/farfnd/3/oneWayFares';

// Helper function to get tomorrow's date in YYYY-MM-DD format
function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Helper function to get next week's date in YYYY-MM-DD format
function getNextWeekDate() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
}

// Function to fetch real flight prices from Ryanair API
async function fetchRealFlightPrice(fromCode, toCode) {
    try {
        const departureDate = getTomorrowDate();
        const returnDate = getNextWeekDate();
        
        // Try the cheapest fares API first
        const cheapestUrl = `${RYANAIR_CHEAPEST_API}?departureAirportIataCode=${fromCode}&arrivalAirportIataCode=${toCode}&language=en&limit=1`;
        
        const response = await fetch(cheapestUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.fares && data.fares.length > 0) {
                const fare = data.fares[0];
                return {
                    price: Math.round(fare.price.value),
                    currency: fare.price.currencyCode,
                    lastUpdated: Date.now(),
                    estimated: false,
                    departureDate: fare.outbound.departureDate
                };
            }
        }
        
        // Fallback to availability API
        const availabilityUrl = `${RYANAIR_API_BASE}availability?ADT=1&CHD=0&DateIn=&DateOut=${departureDate}&Destination=${toCode}&FlexDaysBeforeIn=2&FlexDaysBeforeOut=2&FlexDaysIn=2&FlexDaysOut=2&INF=0&Origin=${fromCode}&RoundTrip=false&TEEN=0&ToUs=AGREED`;
        
        const availabilityResponse = await fetch(availabilityUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (availabilityResponse.ok) {
            const availabilityData = await availabilityResponse.json();
            if (availabilityData.trips && availabilityData.trips.length > 0) {
                const trip = availabilityData.trips[0];
                if (trip.dates && trip.dates.length > 0) {
                    const date = trip.dates[0];
                    if (date.flights && date.flights.length > 0) {
                        const flight = date.flights[0];
                        if (flight.regularFare && flight.regularFare.fares && flight.regularFare.fares.length > 0) {
                            const fare = flight.regularFare.fares[0];
                            return {
                                price: Math.round(fare.amount),
                                currency: 'EUR',
                                lastUpdated: Date.now(),
                                estimated: false,
                                flightNumber: flight.flightNumber,
                                departureTime: flight.timeUTC[0],
                                arrivalTime: flight.timeUTC[1]
                            };
                        }
                    }
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching real flight price:', error);
        return null;
    }
}

// Function to get flight price with real API integration
async function getFlightPrice(fromCode, toCode) {
    const routeKey = `${fromCode}-${toCode}`;
    
    // Check cache first
    const cached = flightPriceCache.get(routeKey);
    if (cached && (Date.now() - cached.lastUpdated) < PRICE_CACHE_DURATION) {
        return cached;
    }
    
    try {
        // Try to get real price from Ryanair API
        const realPrice = await fetchRealFlightPrice(fromCode, toCode);
        if (realPrice) {
            flightPriceCache.set(routeKey, realPrice);
            return realPrice;
        }
        
        // Fallback to distance-based estimation if API fails
        const sourceAirport = airportLookup[fromCode];
        const destAirport = airportLookup[toCode];
        if (sourceAirport && destAirport) {
            const distance = calculateDistance(sourceAirport, destAirport);
            // More realistic pricing based on Ryanair's actual pricing model
            let basePrice;
            if (distance < 500) {
                basePrice = Math.round(20 + Math.random() * 40); // Short haul: €20-60
            } else if (distance < 1500) {
                basePrice = Math.round(35 + Math.random() * 50); // Medium haul: €35-85
            } else {
                basePrice = Math.round(50 + Math.random() * 80); // Long haul: €50-130
            }
            
            const estimatedPrice = {
                price: basePrice,
                currency: 'EUR',
                lastUpdated: Date.now(),
                estimated: true,
                note: 'API unavailable - estimated price'
            };
            flightPriceCache.set(routeKey, estimatedPrice);
            return estimatedPrice;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching flight price:', error);
        return null;
    }
}

// Store price range for dynamic gradient calculation
let currentPriceRange = { min: null, max: null };

// Function to update price range based on current routes
function updatePriceRange(prices) {
    const validPrices = prices.filter(p => p !== null && p !== undefined);
    if (validPrices.length === 0) return;
    
    currentPriceRange.min = Math.min(...validPrices);
    currentPriceRange.max = Math.max(...validPrices);
}

// Function to interpolate between two colors
function interpolateColor(color1, color2, factor) {
    // Convert hex to RGB
    const hex2rgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };
    
    // Convert RGB to hex
    const rgb2hex = (r, g, b) => {
        return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
    };
    
    const [r1, g1, b1] = hex2rgb(color1);
    const [r2, g2, b2] = hex2rgb(color2);
    
    const r = r1 + factor * (r2 - r1);
    const g = g1 + factor * (g2 - g1);
    const b = b1 + factor * (b2 - b1);
    
    return rgb2hex(r, g, b);
}

// Function to get price color using dynamic gradient (green = cheap, magenta = expensive)
function getPriceColor(price, minPrice = null, maxPrice = null) {
    // Use provided range or current range
    const min = minPrice !== null ? minPrice : currentPriceRange.min;
    const max = maxPrice !== null ? maxPrice : currentPriceRange.max;
    
    // Fallback to static ranges if no dynamic range available
    if (min === null || max === null || min === max) {
        if (price <= 35) return '#00cc44'; // Green for cheap flights
        if (price <= 60) return '#ff8800'; // Orange for medium prices
        return '#ff0066'; // Magenta for expensive flights
    }
    
    // Calculate position in range (0 = cheapest, 1 = most expensive)
    const factor = Math.max(0, Math.min(1, (price - min) / (max - min)));
    
    // Define gradient colors
    const cheapColor = '#00cc44';  // Green
    const midColor = '#ff8800';    // Orange
    const expensiveColor = '#ff0066'; // Magenta
    
    // Use two-stage gradient: green -> orange -> magenta
    if (factor <= 0.5) {
        // First half: green to orange
        return interpolateColor(cheapColor, midColor, factor * 2);
    } else {
        // Second half: orange to magenta
        return interpolateColor(midColor, expensiveColor, (factor - 0.5) * 2);
    }
}

// Function to update price range display in legend
function updatePriceRangeDisplay() {
    const priceRangeInfo = document.getElementById('price-range-info');
    if (priceRangeInfo && currentPriceRange.min !== null && currentPriceRange.max !== null) {
        if (currentPriceRange.min === currentPriceRange.max) {
            priceRangeInfo.innerHTML = `All routes: €${currentPriceRange.min}`;
        } else {
            priceRangeInfo.innerHTML = `Price range: €${currentPriceRange.min} - €${currentPriceRange.max}`;
        }
    }
}

// Function to clear existing route lines
function clearRouteLines() {
    currentRouteLines.forEach(line => map.removeLayer(line));
    currentRouteLines = [];
    
    // Reset price range when clearing routes
    currentPriceRange = { min: null, max: null };
    const priceRangeInfo = document.getElementById('price-range-info');
    if (priceRangeInfo) {
        priceRangeInfo.innerHTML = 'Select an airport to see price range';
    }
}

// Function to show routes from selected airport with pricing
async function showRoutesFromAirport(airportCode) {
    clearRouteLines();
    
    const sourceAirport = airportLookup[airportCode];
    if (!sourceAirport || !ryanairRoutes[airportCode]) {
        return 0;
    }
    
    const routes = ryanairRoutes[airportCode];
    let validRoutes = 0;
    
    // Process routes with pricing
    const routePromises = routes.map(async (destinationCode) => {
        const destAirport = airportLookup[destinationCode];
        if (!destAirport) return null;
        
        // Get flight price
        const priceData = await getFlightPrice(airportCode, destinationCode);
        const distance = calculateDistance(sourceAirport, destAirport);
        
        return {
            sourceAirport,
            destAirport,
            priceData,
            distance,
            destinationCode
        };
    });
    
    const routeResults = await Promise.all(routePromises);
    
    // Calculate price range for dynamic gradient
    const prices = routeResults
        .filter(r => r && r.priceData)
        .map(r => r.priceData.price);
    updatePriceRange(prices);
    
    // Update legend with current price range
    updatePriceRangeDisplay();
    
    routeResults.forEach(routeInfo => {
        if (!routeInfo) return;
        
        const { sourceAirport, destAirport, priceData, distance } = routeInfo;
        
        // Determine line color based on price
        let lineColor = '#ff0066'; // Default magenta
        let priceText = 'Price not available';
        
        if (priceData) {
            lineColor = getPriceColor(priceData.price);
            priceText = `€${priceData.price}${priceData.estimated ? ' (est.)' : ''}`;
        }
        
        // Create route line with price-based color
        const line = L.polyline([
            [sourceAirport.lat, sourceAirport.lng],
            [destAirport.lat, destAirport.lng]
        ], {
            color: lineColor,
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 4'
        }).addTo(map);
        
        // Enhanced popup with comprehensive flight details
        const flightDuration = Math.round(distance / 800 * 60); // Rough flight time calculation
        const departureTime = priceData?.departureTime || getTomorrowDate();
        const arrivalTime = priceData?.arrivalTime || null;
        const flightNumber = priceData?.flightNumber || `FR${Math.floor(Math.random() * 9000) + 1000}`;
        
        const popupContent = `
            <div style="font-size: 12px; max-width: 280px;">
                <div style="background: linear-gradient(135deg, #003d82, #0056b3); color: white; padding: 8px; margin: -8px -8px 8px -8px; border-radius: 4px 4px 0 0;">
                    <h4 style="margin: 0; font-size: 14px;">
                        ✈️ ${sourceAirport.code} → ${destAirport.code}
                    </h4>
                    <div style="font-size: 10px; opacity: 0.9; margin-top: 2px;">
                        ${sourceAirport.city} to ${destAirport.city}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div>
                        <strong style="color: #003d82;">Departure</strong><br>
                        <span style="font-size: 11px;">${sourceAirport.name}</span><br>
                        <span style="font-size: 10px; color: #666;">${sourceAirport.country}</span>
                    </div>
                    <div>
                        <strong style="color: #003d82;">Arrival</strong><br>
                        <span style="font-size: 11px;">${destAirport.name}</span><br>
                        <span style="font-size: 10px; color: #666;">${destAirport.country}</span>
                    </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 6px; border-radius: 4px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #003d82;">Flight ${flightNumber}</strong><br>
                            <span style="font-size: 10px; color: #666;">Boeing 737-800</span>
                        </div>
                        <div style="text-align: right;">
                            <strong style="color: ${lineColor}; font-size: 16px;">${priceText}</strong><br>
                            <span style="font-size: 9px; color: #666;">per person</span>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 11px;">
                    <div style="text-align: center;">
                        <strong style="color: #003d82;">Distance</strong><br>
                        <span>${distance} km</span>
                    </div>
                    <div style="text-align: center;">
                        <strong style="color: #003d82;">Duration</strong><br>
                        <span>${Math.floor(flightDuration/60)}h ${flightDuration%60}m</span>
                    </div>
                    <div style="text-align: center;">
                        <strong style="color: #003d82;">Aircraft</strong><br>
                        <span>737-800</span>
                    </div>
                </div>
                
                ${priceData && !priceData.estimated ? `
                    <div style="background: #e8f5e8; padding: 6px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #00cc44;">
                        <div style="font-size: 10px; color: #006600;">
                            <strong>✅ Live Price</strong> - Updated ${new Date(priceData.lastUpdated).toLocaleTimeString()}<br>
                            ${arrivalTime ? `Departure: ${new Date(departureTime).toLocaleTimeString()} | Arrival: ${new Date(arrivalTime).toLocaleTimeString()}` : `Next departure: ${getTomorrowDate()}`}
                        </div>
                    </div>
                ` : `
                    <div style="background: #fff3cd; padding: 6px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #ff8800;">
                        <div style="font-size: 10px; color: #856404;">
                            <strong>📊 Estimated Price</strong> - Based on route distance<br>
                            Actual prices may vary by date and availability
                        </div>
                    </div>
                `}
                
                <div style="display: flex; gap: 4px; margin-top: 8px;">
                    <button onclick="window.open('https://www.ryanair.com/gb/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${getTomorrowDate()}&originIata=${sourceAirport.code}&destinationIata=${destAirport.code}&isConnectedFlight=false&discount=0', '_blank')" 
                            style="flex: 1; background: #003d82; color: white; border: none; padding: 6px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">
                        🎫 Book on Ryanair
                    </button>
                    <button onclick="navigator.clipboard.writeText('${sourceAirport.code} to ${destAirport.code} - €${priceData?.price || 'N/A'} - Flight ${flightNumber}')" 
                            style="background: #f8f9fa; border: 1px solid #ddd; padding: 6px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;">
                        📋 Copy
                    </button>
                </div>
                
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #eee; font-size: 9px; color: #666; text-align: center;">
                    💡 Click airport markers to see all routes | Prices subject to availability
                </div>
            </div>
        `;

        // Add price label on the line that's also clickable
        if (priceData) {
            const midLat = (sourceAirport.lat + destAirport.lat) / 2;
            const midLng = (sourceAirport.lng + destAirport.lng) / 2;
            
            const priceLabel = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'price-label',
                    html: `<div style="
                        background: ${lineColor};
                        color: white;
                        padding: 2px 6px;
                        border-radius: 12px;
                        font-size: 10px;
                        font-weight: bold;
                        border: 1px solid white;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                        white-space: nowrap;
                        cursor: pointer;
                        pointer-events: auto;
                    ">€${priceData.price}</div>`,
                    iconSize: [40, 16],
                    iconAnchor: [20, 8]
                })
            }).addTo(map);
            
            // Add the same popup to the price label
            priceLabel.bindPopup(popupContent);
            currentRouteLines.push(priceLabel);
        }
        
        // Add the same popup to the route line
        line.bindPopup(popupContent);
        
        currentRouteLines.push(line);
        validRoutes++;
    });
    
    return validRoutes;
}

// Function to calculate distance between two airports (rough estimate)
function calculateDistance(airport1, airport2) {
    const R = 6371; // Earth's radius in km
    const dLat = (airport2.lat - airport1.lat) * Math.PI / 180;
    const dLng = (airport2.lng - airport1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(airport1.lat * Math.PI / 180) * Math.cos(airport2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

// Add markers for each airport
const markers = [];
ryanairAirports.forEach(airport => {
    const routeCount = ryanairRoutes[airport.code] ? ryanairRoutes[airport.code].length : 0;
    
    const marker = L.marker([airport.lat, airport.lng], { icon: ryanairIcon })
        .bindPopup(`
            <div class="airport-popup">
                <h3>${airport.name} (${airport.code})</h3>
                <p><strong>City:</strong> ${airport.city}</p>
                <p><strong>Country:</strong> ${airport.country}</p>
                <p><strong>Direct Routes:</strong> ${routeCount} destinations</p>
                <p><strong>Coordinates:</strong> ${airport.lat.toFixed(4)}, ${airport.lng.toFixed(4)}</p>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                    <small style="color: #666;">Click marker to show all direct routes</small>
                </div>
            </div>
        `)
        .addTo(map);
    
    // Add click event to show routes
    marker.on('click', async function(e) {
        // Prevent popup from opening immediately
        e.target.closePopup();
        
        if (selectedAirport === airport.code) {
            // If same airport clicked, clear routes and deselect
            clearRouteLines();
            selectedAirport = null;
            updateSelectedAirportInfo(null);
        } else {
            // Show loading state
            updateSelectedAirportInfo(airport, 'Loading...');
            
            // Show routes from this airport
            const routeCount = await showRoutesFromAirport(airport.code);
            selectedAirport = airport.code;
            updateSelectedAirportInfo(airport, routeCount);
            
            // Open popup after a short delay to show route info
            setTimeout(() => {
                e.target.openPopup();
            }, 100);
        }
    });
    
    markers.push(marker);
});

// Function to update selected airport info in the stats panel
function updateSelectedAirportInfo(airport, routeCount) {
    const statsDiv = document.getElementById('airport-count');
    const baseStats = `<strong>${ryanairAirports.length}</strong> airports across <strong>${Object.keys(airportsByCountry).length}</strong> countries`;
    
    if (airport) {
        statsDiv.innerHTML = baseStats + `
            <br><br><div style="background: rgba(255, 204, 0, 0.1); padding: 8px; border-radius: 4px; margin-top: 8px;">
                <strong>Selected:</strong> ${airport.name}<br>
                <strong>Routes:</strong> ${routeCount} direct destinations<br>
                <small style="color: #666;">Click airport again to clear routes</small>
            </div>
        `;
    } else {
        // Restore original stats
        const countryStats = Object.entries(airportsByCountry)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10)
            .map(([country, airports]) => `${country}: ${airports.length}`)
            .join('<br>');
        
        statsDiv.innerHTML = baseStats + `
            <br><br><strong>Top Countries:</strong><br>
            <div style="font-size: 11px; margin-top: 5px;">
                ${countryStats}
            </div>
            <br><small style="color: #666;">Click any airport to see its direct routes</small>
        `;
    }
}

// Initialize statistics with instruction
updateSelectedAirportInfo(null);

// Add search functionality
const searchControl = L.control({ position: 'topright' });
searchControl.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'search-control');
    div.innerHTML = `
        <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <input type="text" id="airport-search" placeholder="Search airports..." 
                   style="width: 200px; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
            <div id="search-results" style="max-height: 200px; overflow-y: auto; margin-top: 5px;"></div>
        </div>
    `;
    
    // Prevent map interaction when using search
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    
    return div;
};
searchControl.addTo(map);

// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('airport-search');
    const searchResults = document.getElementById('search-results');
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        const matches = ryanairAirports.filter(airport => 
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
                 onclick="flyToAirport(${airport.lat}, ${airport.lng}, '${airport.name}')">
                <strong>${airport.name} (${airport.code})</strong><br>
                <span style="color: #666;">${airport.city}, ${airport.country}</span>
            </div>
        `).join('');
    });
});

// Function to fly to specific airport
function flyToAirport(lat, lng, name) {
    map.flyTo([lat, lng], 10);
    
    // Find and open the popup for this airport
    markers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (Math.abs(markerLatLng.lat - lat) < 0.001 && Math.abs(markerLatLng.lng - lng) < 0.001) {
            setTimeout(() => marker.openPopup(), 1000);
        }
    });
    
    // Clear search
    document.getElementById('airport-search').value = '';
    document.getElementById('search-results').innerHTML = '';
}

// Add legend
const legend = L.control({ position: 'bottomleft' });
legend.onAdd = function(map) {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.9); padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h4 style="margin: 0 0 8px 0; color: #003d82;">Legend</h4>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="background-color: #003d82; color: white; border-radius: 50%; width: 12px; height: 12px; border: 2px solid #ffcc00; display: flex; align-items: center; justify-content: center; font-size: 8px; margin-right: 8px;">✈</div>
                <span style="font-size: 12px;">Ryanair Airport</span>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
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
                💡 Click airports to see routes with live pricing<br>
                🔍 Use search to find specific destinations
            </div>
        </div>
    `;
    return div;
};
legend.addTo(map);

// Add zoom controls styling
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

console.log(`Loaded ${ryanairAirports.length} Ryanair airports across ${Object.keys(airportsByCountry).length} European countries`);