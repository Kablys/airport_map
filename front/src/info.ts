/// <reference lib="dom" />
import type { Airport, Routes } from './main.ts';

interface CountryStats {
  name: string;
  flag: string;
  airportCount: number;
  airports: Airport[];
}

interface AirportStats extends Airport {
  routeCount: number;
}

let allAirports: Airport[] = [];
let allRoutes: Routes = {};

export function initializeInfoPage(airports: Airport[], routes: Routes): void {
  allAirports = airports;
  allRoutes = routes;

  setupInfoPageContent();
  setupInfoSearch();
}

function setupInfoPageContent(): void {
  populateCountriesList();
  populateTopAirports();
  populateFlightStats();
}

function populateCountriesList(): void {
  const countriesContainer = document.getElementById('countries-list');
  if (!countriesContainer) return;

  // Group airports by country
  const countriesMap = new Map<string, CountryStats>();

  for (const airport of allAirports) {
    if (!countriesMap.has(airport.country)) {
      countriesMap.set(airport.country, {
        name: airport.country,
        flag: airport.flag,
        airportCount: 0,
        airports: [],
      });
    }

    const countryStats = countriesMap.get(airport.country);
    if (!countryStats) continue;
    countryStats.airportCount++;
    countryStats.airports.push(airport);
  }

  // Sort countries by airport count (descending)
  const sortedCountries = Array.from(countriesMap.values()).sort((a, b) => b.airportCount - a.airportCount);

  countriesContainer.innerHTML = '';

  sortedCountries.forEach((country) => {
    const countryDiv = document.createElement('div');
    countryDiv.className = 'country-item';
    countryDiv.innerHTML = `
      <div class="country-name">
        <span>${country.flag}</span>
        <span>${country.name}</span>
      </div>
      <div class="country-count">${country.airportCount}</div>
    `;

    countryDiv.addEventListener('click', () => {
      showCountryDetails(country);
    });

    countriesContainer.appendChild(countryDiv);
  });
}

function populateTopAirports(): void {
  const topAirportsContainer = document.getElementById('top-airports');
  if (!topAirportsContainer) return;

  // Calculate route counts for each airport
  const airportsWithStats: AirportStats[] = allAirports.map((airport) => ({
    ...airport,
    routeCount: allRoutes[airport.code]?.length || 0,
  }));

  // Sort by route count (descending) and take top 20
  const topAirports = airportsWithStats.sort((a, b) => b.routeCount - a.routeCount).slice(0, 20);

  topAirportsContainer.innerHTML = '';

  topAirports.forEach((airport, index) => {
    const airportDiv = document.createElement('div');
    airportDiv.className = 'airport-item';
    airportDiv.innerHTML = `
      <div class="airport-info">
        <div class="airport-name">${index + 1}. ${airport.flag} ${airport.name} (${airport.code})</div>
        <div class="airport-details">${airport.city}, ${airport.country}</div>
      </div>
      <div class="airport-routes">${airport.routeCount}</div>
    `;

    airportDiv.addEventListener('click', () => {
      showAirportOnMap(airport);
    });

    topAirportsContainer.appendChild(airportDiv);
  });
}

function populateFlightStats(): void {
  const flightStatsContainer = document.getElementById('flight-stats');
  if (!flightStatsContainer) return;

  // Calculate statistics
  const totalAirports = allAirports.length;
  const totalCountries = new Set(allAirports.map((a) => a.country)).size;
  const totalRoutes = Object.values(allRoutes).reduce((sum, routes) => sum + routes.length, 0);
  const avgRoutesPerAirport = Math.round(totalRoutes / totalAirports);

  flightStatsContainer.innerHTML = `
    <div class="stat-item">
      <div class="stat-number">${totalAirports}</div>
      <div class="stat-label">Total Airports</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${totalCountries}</div>
      <div class="stat-label">Countries</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${totalRoutes}</div>
      <div class="stat-label">Total Routes</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${avgRoutesPerAirport}</div>
      <div class="stat-label">Avg Routes/Airport</div>
    </div>
  `;
}

function setupInfoSearch(): void {
  const searchInput = document.getElementById('info-search') as HTMLInputElement;
  const searchResults = document.getElementById('info-search-results');

  if (!searchInput || !searchResults) return;

  searchInput.addEventListener('input', function (this: HTMLInputElement) {
    const query = this.value.toLowerCase().trim();

    if (query.length < 2) {
      searchResults.classList.remove('show');
      return;
    }

    const matches = allAirports
      .filter(
        (airport) =>
          airport.name.toLowerCase().includes(query) ||
          airport.city.toLowerCase().includes(query) ||
          airport.country.toLowerCase().includes(query) ||
          airport.code.toLowerCase().includes(query)
      )
      .slice(0, 10);

    if (matches.length === 0) {
      searchResults.innerHTML =
        '<div style="padding: 16px; color: var(--text-gray); text-align: center;">No airports found</div>';
      searchResults.classList.add('show');
      return;
    }

    searchResults.innerHTML = '';

    matches.forEach((airport) => {
      const routeCount = allRoutes[airport.code]?.length || 0;
      const resultDiv = document.createElement('div');
      resultDiv.className = 'search-result-item';
      resultDiv.innerHTML = `
        <div class="search-result-name">${airport.flag} ${airport.name} (${airport.code})</div>
        <div class="search-result-details">${airport.city}, ${airport.country} • ${routeCount} routes</div>
      `;

      resultDiv.addEventListener('click', () => {
        showAirportOnMap(airport);
        searchInput.value = '';
        searchResults.classList.remove('show');
      });

      searchResults.appendChild(resultDiv);
    });

    searchResults.classList.add('show');
  });

  // Hide search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target as Node) && !searchResults.contains(e.target as Node)) {
      searchResults.classList.remove('show');
    }
  });
}

function showCountryDetails(country: CountryStats): void {
  // Create a modal or detailed view for country
  const modal = document.createElement('div');
  modal.className = 'country-modal';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${country.flag} ${country.name}</h2>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p><strong>${country.airportCount}</strong> airports served by Ryanair</p>
          <div class="country-airports">
            ${country.airports
              .sort((a, b) => (allRoutes[b.code]?.length || 0) - (allRoutes[a.code]?.length || 0))
              .map((airport) => {
                const routeCount = allRoutes[airport.code]?.length || 0;
                return `
                  <div class="country-airport-item" data-airport-code="${airport.code}">
                    <div class="airport-info">
                      <div class="airport-name">${airport.name} (${airport.code})</div>
                      <div class="airport-city">${airport.city}</div>
                    </div>
                    <div class="airport-routes">${routeCount} routes</div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Add modal styles
  const style = document.createElement('style');
  style.textContent = `
    .country-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .modal-content {
      background: var(--white);
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: var(--shadow-dark);
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--border-light);
      background: var(--background-secondary);
    }
    
    .modal-header h2 {
      margin: 0;
      color: var(--primary-blue);
      font-size: 1.5rem;
    }
    
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-gray);
      padding: 4px 8px;
      border-radius: 4px;
      transition: all var(--transition-fast);
    }
    
    .modal-close:hover {
      background: var(--background-hover);
      color: var(--text-dark);
    }
    
    .modal-body {
      padding: 20px;
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .country-airports {
      margin-top: 16px;
    }
    
    .country-airport-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-light);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    
    .country-airport-item:hover {
      background: var(--background-hover);
      margin: 0 -12px;
      padding: 12px;
      border-radius: 6px;
    }
    
    .country-airport-item:last-child {
      border-bottom: none;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  // Event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const overlay = modal.querySelector('.modal-overlay');

  const closeModal = () => {
    document.body.removeChild(modal);
    document.head.removeChild(style);
  };

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Airport click handlers
  modal.querySelectorAll('.country-airport-item').forEach((item) => {
    item.addEventListener('click', () => {
      const airportCode = item.getAttribute('data-airport-code');
      const airport = allAirports.find((a) => a.code === airportCode);
      if (airport) {
        showAirportOnMap(airport);
        closeModal();
      }
    });
  });
}

function showAirportOnMap(airport: Airport): void {
  // Navigate to map page with airport coordinates in URL
  const url = new URL('index.html', window.location.origin);
  url.searchParams.set('lat', airport.lat.toString());
  url.searchParams.set('lng', airport.lng.toString());
  url.searchParams.set('airport', airport.code);
  window.location.href = url.toString();
}
