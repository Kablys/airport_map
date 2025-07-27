import { Airport, Routes } from '../types';

// Base URL for data files
const DATA_BASE_URL = '/data';

// Generic fetch wrapper with error handling
async function fetchData<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch data from ${url}: ${error.message}`);
    }
    throw new Error(`Failed to fetch data from ${url}: Unknown error`);
  }
}

// Load airports data
export async function loadAirports(): Promise<Airport[]> {
  const url = `${DATA_BASE_URL}/airports.json`;
  return fetchData<Airport[]>(url);
}

// Load routes data
export async function loadRoutes(): Promise<Routes> {
  const url = `${DATA_BASE_URL}/routes.json`;
  return fetchData<Routes>(url);
}

// Combined data loader for both airports and routes
export async function loadAllData(): Promise<{ airports: Airport[]; routes: Routes }> {
  try {
    const [airports, routes] = await Promise.all([
      loadAirports(),
      loadRoutes()
    ]);
    
    return { airports, routes };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load application data: ${error.message}`);
    }
    throw new Error('Failed to load application data: Unknown error');
  }
}

// Data validation functions
export function validateAirport(airport: any): airport is Airport {
  return (
    typeof airport === 'object' &&
    typeof airport.code === 'string' &&
    typeof airport.name === 'string' &&
    typeof airport.city === 'string' &&
    typeof airport.country === 'string' &&
    typeof airport.lat === 'number' &&
    typeof airport.lng === 'number'
  );
}

export function validateRoutes(routes: any): routes is Routes {
  if (typeof routes !== 'object' || routes === null) {
    return false;
  }
  
  for (const [key, value] of Object.entries(routes)) {
    if (typeof key !== 'string' || !Array.isArray(value)) {
      return false;
    }
    
    if (!value.every(item => typeof item === 'string')) {
      return false;
    }
  }
  
  return true;
}

// Data service with caching and error handling
class DataService {
  private airportsCache: Airport[] | null = null;
  private routesCache: Routes | null = null;
  private loadingPromise: Promise<{ airports: Airport[]; routes: Routes }> | null = null;

  async getAirports(): Promise<Airport[]> {
    if (this.airportsCache) {
      return this.airportsCache;
    }

    if (this.loadingPromise) {
      const data = await this.loadingPromise;
      return data.airports;
    }

    const airports = await loadAirports();
    
    // Validate data
    if (!Array.isArray(airports) || !airports.every(validateAirport)) {
      throw new Error('Invalid airports data format');
    }
    
    this.airportsCache = airports;
    return airports;
  }

  async getRoutes(): Promise<Routes> {
    if (this.routesCache) {
      return this.routesCache;
    }

    if (this.loadingPromise) {
      const data = await this.loadingPromise;
      return data.routes;
    }

    const routes = await loadRoutes();
    
    // Validate data
    if (!validateRoutes(routes)) {
      throw new Error('Invalid routes data format');
    }
    
    this.routesCache = routes;
    return routes;
  }

  async getAllData(): Promise<{ airports: Airport[]; routes: Routes }> {
    if (this.airportsCache && this.routesCache) {
      return {
        airports: this.airportsCache,
        routes: this.routesCache
      };
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = loadAllData().then(data => {
      // Validate data
      if (!Array.isArray(data.airports) || !data.airports.every(validateAirport)) {
        throw new Error('Invalid airports data format');
      }
      
      if (!validateRoutes(data.routes)) {
        throw new Error('Invalid routes data format');
      }

      this.airportsCache = data.airports;
      this.routesCache = data.routes;
      this.loadingPromise = null;
      
      return data;
    }).catch(error => {
      this.loadingPromise = null;
      throw error;
    });

    return this.loadingPromise;
  }

  // Clear cache (useful for testing or data refresh)
  clearCache(): void {
    this.airportsCache = null;
    this.routesCache = null;
    this.loadingPromise = null;
  }

  // Get cached data without making network requests
  getCachedAirports(): Airport[] | null {
    return this.airportsCache;
  }

  getCachedRoutes(): Routes | null {
    return this.routesCache;
  }
}

// Export singleton instance
export const dataService = new DataService();