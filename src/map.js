import { ryanairAirports, ryanairRoutes } from './api.js';
import { updateSelectedAirportInfo, updatePriceRangeDisplay, toggleFlightPricesSection } from './ui.js';

let map;
let airportsByCountry = {};
let currentRouteLines = [];
let fadedRouteLines = [];
let selectedAirport = null;
let airportLookup = {};
let markers = [];
const flightPriceCache = new Map();
const PRICE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
let currentPriceRange = { min: null, max: null };

export function initializeMap(airports, routes) {
    map = L.map('map').setView([50.0, 10.0], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    airportsByCountry = {};
    airports.forEach(airport => {
        if (!airportsByCountry[airport.country]) {
            airportsByCountry[airport.country] = [];
        }
        airportsByCountry[airport.country].push(airport);
    });

    airportLookup = {};
    airports.forEach(airport => {
        airportLookup[airport.code] = airport;
    });

    markers = [];
    airports.forEach(airport => {
        const routeCount = routes[airport.code] ? routes[airport.code].length : 0;

        const marker = L.marker([airport.lat, airport.lng], { icon: createAirportIcon(routeCount) })
            .addTo(map);

        marker.on('click', async function (e) {
            if (selectedAirport === airport.code) {
                clearRouteLines();
                selectedAirport = null;
                updateSelectedAirportInfo(null);
            } else {
                updateSelectedAirportInfo(airport, 'Loading...');
                const routeCount = await showRoutesFromAirport(airport.code);
                selectedAirport = airport.code;
                updateSelectedAirportInfo(airport, routeCount);
                updateAirportTransparency(airport.code);
            }
        });

        marker.on('mouseover', function(e) {
            if (selectedAirport !== airport.code) {
                showFadedRoutes(airport.code);
            }
            const tooltip = L.tooltip({
                permanent: false,
                direction: 'top',
                offset: [0, -10]
            })
            .setContent(`${airport.name}, ${airport.country}`)
            .setLatLng(e.latlng);
            
            tooltip.addTo(map);
            
            marker._tooltip = tooltip;
        });
        
        marker.on('mouseout', function() {
            if (selectedAirport !== airport.code) {
                clearFadedRoutes();
            }
            if (marker._tooltip) {
                map.removeLayer(marker._tooltip);
                marker._tooltip = null;
            }
        });

        markers.push(marker);
    });

    const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
    });

    resizeObserver.observe(document.getElementById('map'));

    return map;
}

function createAirportIcon(flightCount) {
    const template = document.getElementById('airport-icon-template');
    const clone = template.content.cloneNode(true);
    const div = clone.querySelector('div');
    div.textContent = flightCount;
    
    return L.divIcon({
        className: 'ryanair-marker',
        html: div.outerHTML,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function clearRouteLines() {
    currentRouteLines.forEach(line => map.removeLayer(line));
    currentRouteLines = [];
    currentPriceRange = { min: null, max: null };
    updatePriceRangeDisplay(currentPriceRange);
    updateAirportTransparency(null);
}

function showFadedRoutes(airportCode) {
    clearFadedRoutes();
    const sourceAirport = airportLookup[airportCode];
    if (!sourceAirport || !ryanairRoutes[airportCode]) {
        return;
    }

    const routes = ryanairRoutes[airportCode];
    routes.forEach(destinationCode => {
        const destAirport = airportLookup[destinationCode];
        if (destAirport) {
            const line = L.polyline([
                [sourceAirport.lat, sourceAirport.lng],
                [destAirport.lat, destAirport.lng]
            ], {
                color: '#003d82',
                weight: 1,
                opacity: 0.3,
                pane: 'overlayPane'
            }).addTo(map);
            fadedRouteLines.push(line);
        }
    });
}

function clearFadedRoutes() {
    fadedRouteLines.forEach(line => map.removeLayer(line));
    fadedRouteLines = [];
}

async function getFlightPrice(fromCode, toCode) {
    const routeKey = `${fromCode}-${toCode}`;
    
    const cached = flightPriceCache.get(routeKey);
    if (cached && (Date.now() - cached.lastUpdated) < PRICE_CACHE_DURATION) {
        return cached;
    }
    
    try {
        const priceData = await fetchRealFlightPrice(fromCode, toCode);
        if (priceData) {
            flightPriceCache.set(routeKey, priceData);
            return priceData;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching flight price:', error);
        return null;
    }
}

async function fetchRealFlightPrice(fromCode, toCode) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    try {
        const sourceAirport = airportLookup[fromCode];
        const destAirport = airportLookup[toCode];
        
        if (!sourceAirport || !destAirport) {
            return null;
        }
        
        const distance = calculateDistance(sourceAirport, destAirport);
        
        let basePrice;
        let priceVariation;
        
        if (distance < 500) {
            basePrice = 25;
            priceVariation = 35;
        } else if (distance < 1000) {
            basePrice = 40;
            priceVariation = 45;
        } else if (distance < 2000) {
            basePrice = 60;
            priceVariation = 70;
        } else {
            basePrice = 80;
            priceVariation = 100;
        }
        
        const routeHash = (fromCode + toCode).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const routeModifier = Math.abs(routeHash % 100) / 100;
        const finalPrice = Math.round(basePrice + (priceVariation * routeModifier));
        
        const flightNumber = `FR${Math.floor(1000 + (Math.abs(routeHash) % 8000))}`;
        
        const departureHour = 6 + Math.floor(routeModifier * 16);
        const departureMinute = Math.floor(routeModifier * 60);
        const flightDuration = Math.round(distance / 800 * 60);
        
        const departureDate = new Date();
        departureDate.setDate(departureDate.getDate() + 1);
        departureDate.setHours(departureHour, departureMinute, 0, 0);
        
        const arrivalDate = new Date(departureDate);
        arrivalDate.setMinutes(arrivalDate.getMinutes() + flightDuration);
        
        return {
            price: finalPrice,
            currency: 'EUR',
            lastUpdated: Date.now(),
            estimated: false,
            flightNumber: flightNumber,
            departureTime: departureDate.toISOString(),
            arrivalTime: arrivalDate.toISOString(),
            departureDate: new Date().toISOString().split('T')[0],
            aircraft: 'Boeing 737-800',
            note: 'Development stub data'
        };
        
    } catch (error) {
        console.error('Error in flight price stub:', error);
        return null;
    }
}

function calculateDistance(airport1, airport2) {
    const R = 6371;
    const dLat = (airport2.lat - airport1.lat) * Math.PI / 180;
    const dLng = (airport2.lng - airport1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(airport1.lat * Math.PI / 180) * Math.cos(airport2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

async function showRoutesFromAirport(airportCode) {
    clearRouteLines();
    
    const sourceAirport = airportLookup[airportCode];
    if (!sourceAirport || !ryanairRoutes[airportCode]) {
        return 0;
    }
    
    const routes = ryanairRoutes[airportCode];
    let validRoutes = 0;
    
    const routePromises = routes.map(async (destinationCode) => {
        const destAirport = airportLookup[destinationCode];
        if (!destAirport) return null;
        
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
    
    const prices = routeResults
        .filter(r => r && r.priceData)
        .map(r => r.priceData.price);
    updatePriceRange(prices);
    
    routeResults.forEach(routeInfo => {
        if (!routeInfo) return;
        
        const { sourceAirport, destAirport, priceData, distance } = routeInfo;
        
        let lineColor = '#ff0066';
        
        if (priceData) {
            lineColor = getPriceColor(priceData.price, currentPriceRange.min, currentPriceRange.max);
        }
        
        const line = L.polyline([
            [sourceAirport.lat, sourceAirport.lng],
            [destAirport.lat, destAirport.lng]
        ], {
            color: lineColor,
            weight: 3,
            opacity: 0.6,
            pane: 'overlayPane'
        }).addTo(map);

        const popupContent = createPopupContent(sourceAirport, destAirport, priceData, distance, lineColor);
        line.bindPopup(popupContent);
        
        if (priceData) {
            const midLat = (sourceAirport.lat + destAirport.lat) / 2;
            const midLng = (sourceAirport.lng + destAirport.lng) / 2;
            
            const priceText = `€${priceData.price}`;
            const textWidth = priceText.length * 6 + 8;
            const textHeight = 18;
            
            const template = document.getElementById('price-label-template');
            const clone = template.content.cloneNode(true);
            const div = clone.querySelector('div');
            
            // Use CSS custom properties for dynamic styling
            div.style.setProperty('--dynamic-line-color', lineColor);
            div.style.setProperty('--dynamic-width', `${Math.max(textWidth, 40)}px`);
            
            div.setAttribute('data-dest-code', destAirport.code);
            div.textContent = priceText;
            
            const priceLabel = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'price-label',
                    html: div.outerHTML,
                    iconSize: [Math.max(textWidth, 40), textHeight],
                    iconAnchor: [Math.max(textWidth, 40) / 2, textHeight / 2]
                })
            }).addTo(map);
            priceLabel.bindPopup(popupContent);
            currentRouteLines.push(priceLabel);
        }
        
        currentRouteLines.push(line);
        validRoutes++;
    });
    
    return validRoutes;
}

function getPriceColor(price, min, max) {
    if (min === max) {
        return '#ff8800';
    }
    
    const factor = (price - min) / (max - min);
    
    const cheapColor = '#00cc44';
    const midColor = '#ff8800';
    const expensiveColor = '#ff0066';
    
    if (factor <= 0.5) {
        return interpolateColor(cheapColor, midColor, factor * 2);
    } else {
        return interpolateColor(midColor, expensiveColor, (factor - 0.5) * 2);
    }
}

function interpolateColor(color1, color2, factor) {
    const hex2rgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };
    
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

function updateAirportTransparency(selectedAirportCode) {
    if (!selectedAirportCode) {
        // Reset all airports to full opacity using CSS custom properties
        document.documentElement.style.setProperty('--dynamic-opacity', '1');
        markers.forEach(marker => {
            const markerElement = marker.getElement();
            if (markerElement) {
                const markerDiv = markerElement.querySelector('div');
                if (markerDiv) {
                    markerDiv.style.setProperty('--dynamic-opacity', '1');
                }
            }
        });
        return;
    }

    const connectedAirports = ryanairRoutes[selectedAirportCode] || [];
    const connectedSet = new Set([selectedAirportCode, ...connectedAirports]);

    markers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        
        const airport = ryanairAirports.find(a => 
            Math.abs(a.lat - markerLatLng.lat) < 0.001 && 
            Math.abs(a.lng - markerLatLng.lng) < 0.001
        );
        
        if (airport) {
            const markerElement = marker.getElement();
            if (markerElement) {
                const markerDiv = markerElement.querySelector('div');
                if (markerDiv) {
                    const opacity = connectedSet.has(airport.code) ? '1' : '0.2';
                    markerDiv.style.setProperty('--dynamic-opacity', opacity);
                }
            }
        }
    });
}

function updatePriceRange(prices) {
    const validPrices = prices.filter(p => p !== null && p !== undefined);
    if (validPrices.length === 0) return;
    
    currentPriceRange.min = Math.min(...validPrices);
    currentPriceRange.max = Math.max(...validPrices);
    updatePriceRangeDisplay(currentPriceRange);
}

function createPopupContent(sourceAirport, destAirport, priceData, distance, lineColor) {
    const flightDuration = Math.round(distance / 800 * 60);
    const departureTime = priceData?.departureTime || new Date().toISOString().split('T')[0];
    const arrivalTime = priceData?.arrivalTime || null;
    const flightNumber = priceData?.flightNumber || `FR${Math.floor(Math.random() * 9000) + 1000}`;

    const template = document.getElementById('flight-popup-template');
    const clone = template.content.cloneNode(true);
    
    // Fill in the data
    clone.querySelector('.route-codes').textContent = `${sourceAirport.code} → ${destAirport.code}`;
    clone.querySelector('.route-cities').textContent = `${sourceAirport.city} to ${destAirport.city}`;
    
    clone.querySelector('.departure-name').textContent = sourceAirport.name;
    clone.querySelector('.departure-country').textContent = sourceAirport.country;
    clone.querySelector('.arrival-name').textContent = destAirport.name;
    clone.querySelector('.arrival-country').textContent = destAirport.country;
    
    clone.querySelector('.flight-number').textContent = `Flight ${flightNumber}`;
    
    const priceDisplay = clone.querySelector('.price-display');
    priceDisplay.style.setProperty('--dynamic-price-color', lineColor);
    
    if (priceData.estimated) {
        priceDisplay.innerHTML = `€${priceData.price} <span style="cursor: help; color: var(--price-medium);" title="📊 Estimated Price - Based on route distance. Actual prices may vary by date and availability">ⓘ</span>`;
    } else {
        priceDisplay.textContent = `€${priceData.price}`;
    }
    
    clone.querySelector('.distance').textContent = `${distance} km`;
    clone.querySelector('.duration').textContent = `${Math.floor(flightDuration/60)}h ${flightDuration%60}m`;
    
    // Handle live price info
    const livePriceInfo = clone.querySelector('.live-price-info');
    if (priceData && !priceData.estimated) {
        livePriceInfo.removeAttribute('style'); // Remove inline display: none
        clone.querySelector('.update-time').textContent = new Date(priceData.lastUpdated).toLocaleTimeString();
        const flightTimes = arrivalTime ? 
            `Departure: ${new Date(departureTime).toLocaleTimeString()} | Arrival: ${new Date(arrivalTime).toLocaleTimeString()}` : 
            `Next departure: ${new Date().toISOString().split('T')[0]}`;
        clone.querySelector('.flight-times').textContent = flightTimes;
    }
    
    // Set up button handlers
    const bookButton = clone.querySelector('.book-button');
    bookButton.onclick = () => {
        window.open(`https://www.ryanair.com/gb/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${new Date().toISOString().split('T')[0]}&originIata=${sourceAirport.code}&destinationIata=${destAirport.code}&isConnectedFlight=false&discount=0`, '_blank');
    };
    
    const copyButton = clone.querySelector('.copy-button');
    copyButton.onclick = () => {
        navigator.clipboard.writeText(`${sourceAirport.code} to ${destAirport.code} - €${priceData?.price || 'N/A'} - Flight ${flightNumber}`);
    };
    
    // Return the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(clone);
    return tempDiv.innerHTML;
}