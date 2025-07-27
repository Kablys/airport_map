import { Airport, FlightPrice } from '../types';

// Ryanair API configuration
const RYANAIR_CHEAPEST_API = 'https://www.ryanair.com/api/farfnd/3/oneWayFares';

// API Error types
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  TIMEOUT = 'TIMEOUT'
}

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode?: number,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Cache configuration
const PRICE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Flight pricing cache with TTL
const flightPriceCache = new Map<string, FlightPrice>();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 100; // 100ms base delay for faster tests

// Helper function to get tomorrow's date in YYYY-MM-DD format
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Helper function to get next week's date in YYYY-MM-DD format
function getNextWeekDate(): string {
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek.toISOString().split('T')[0];
}

// Helper function to validate API response structure
function validateApiResponse(data: any): boolean {
  return (
    data &&
    Array.isArray(data.fares) &&
    data.fares.length > 0 &&
    data.fares[0].outbound &&
    data.fares[0].outbound.price &&
    typeof data.fares[0].outbound.price.value === 'number'
  );
}

// Helper function to calculate distance between two airports using Haversine formula
function calculateDistance(airport1: Airport, airport2: Airport): number {
  const R = 6371; // Earth's radius in km
  const dLat = (airport2.lat - airport1.lat) * Math.PI / 180;
  const dLng = (airport2.lng - airport1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(airport1.lat * Math.PI / 180) * Math.cos(airport2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// Helper function to generate distance-based price estimation
function generateEstimatedPrice(fromAirport: Airport, toAirport: Airport): FlightPrice {
  const distance = calculateDistance(fromAirport, toAirport);
  
  // Generate realistic pricing based on distance and route popularity
  let basePrice: number;
  let priceVariation: number;
  
  if (distance < 500) {
    basePrice = 25;
    priceVariation = 35; // €25-60
  } else if (distance < 1000) {
    basePrice = 40;
    priceVariation = 45; // €40-85
  } else if (distance < 2000) {
    basePrice = 60;
    priceVariation = 70; // €60-130
  } else {
    basePrice = 80;
    priceVariation = 100; // €80-180
  }
  
  // Add route-specific pricing factors using consistent hash
  const routeHash = (fromAirport.code + toAirport.code).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Use hash for consistent pricing per route
  const routeModifier = Math.abs(routeHash % 100) / 100;
  const finalPrice = Math.round(basePrice + (priceVariation * routeModifier));
  
  // Generate realistic flight details
  const flightNumber = `FR${Math.floor(1000 + (Math.abs(routeHash) % 8000))}`;
  
  // Generate departure and arrival times
  const departureHour = 6 + Math.floor(routeModifier * 16); // 6 AM to 10 PM
  const departureMinute = Math.floor(routeModifier * 60);
  const flightDuration = Math.round(distance / 800 * 60); // Rough flight time in minutes
  
  const departureDate = new Date();
  departureDate.setDate(departureDate.getDate() + 1);
  departureDate.setHours(departureHour, departureMinute, 0, 0);
  
  const arrivalDate = new Date(departureDate);
  arrivalDate.setMinutes(arrivalDate.getMinutes() + flightDuration);
  
  return {
    price: finalPrice,
    currency: 'EUR',
    lastUpdated: Date.now(),
    estimated: true,
    flightNumber: flightNumber,
    departureTime: departureDate.toISOString(),
    arrivalTime: arrivalDate.toISOString(),
    note: 'Estimated price based on route distance'
  };
}

// Helper function to implement exponential backoff retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter (capped at 500ms for tests)
      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 50, 500);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Function to fetch real flight price from Ryanair API
async function fetchRealFlightPrice(fromCode: string, toCode: string): Promise<FlightPrice | null> {
  // Simulate API delay for realistic behavior (minimal for tests)
  await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
  
  try {
    // Try the cheapest fares API first
    const cheapestFaresUrl = `${RYANAIR_CHEAPEST_API}/${fromCode}/${toCode}/${getTomorrowDate()}/${getNextWeekDate()}/1/0/0/0/EUR`;
    
    const response = await fetch(cheapestFaresUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      const errorType = response.status === 429 ? ApiErrorType.RATE_LIMIT : ApiErrorType.API_ERROR;
      const retryable = response.status >= 500 || response.status === 429;
      throw new ApiError(
        errorType,
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        retryable
      );
    }
    
    const data = await response.json();
    
    // Validate and parse Ryanair API response
    if (validateApiResponse(data)) {
      const fare = data.fares[0];
      const outbound = fare.outbound;
      return {
        price: Math.round(outbound.price.value),
        currency: outbound.price.currencyCode || 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
        flightNumber: outbound.flightNumber || `FR${Math.floor(Math.random() * 9000) + 1000}`,
        departureTime: outbound.departureDate || getTomorrowDate(),
        arrivalTime: outbound.arrivalDate || null,
        note: 'Live price from Ryanair API'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching real flight price:', error);
    
    // Enhance error with type information if it's not already an ApiError
    if (!(error instanceof ApiError)) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        throw new ApiError(ApiErrorType.TIMEOUT, errorMessage, undefined, true);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        throw new ApiError(ApiErrorType.NETWORK_ERROR, errorMessage, undefined, true);
      } else {
        throw new ApiError(ApiErrorType.INVALID_RESPONSE, errorMessage, undefined, false);
      }
    }
    
    throw error;
  }
}

// Main function to get flight price with caching and fallback
export async function getFlightPrice(
  fromCode: string, 
  toCode: string, 
  fromAirport?: Airport, 
  toAirport?: Airport
): Promise<FlightPrice | null> {
  const routeKey = `${fromCode}-${toCode}`;
  
  // Check cache first
  const cached = flightPriceCache.get(routeKey);
  if (cached && (Date.now() - cached.lastUpdated) < PRICE_CACHE_DURATION) {
    return cached;
  }
  
  try {
    // Try to get real price from API with retry logic
    const realPrice = await retryWithBackoff(() => fetchRealFlightPrice(fromCode, toCode));
    
    if (realPrice) {
      flightPriceCache.set(routeKey, realPrice);
      return realPrice;
    }
  } catch (error) {
    console.warn(`Failed to fetch real price for ${fromCode} -> ${toCode}, falling back to estimation:`, error);
  }
  
  // Fallback to distance-based estimation if API fails or airports are provided
  if (fromAirport && toAirport) {
    const estimatedPrice = generateEstimatedPrice(fromAirport, toAirport);
    flightPriceCache.set(routeKey, estimatedPrice);
    return estimatedPrice;
  }
  
  return null;
}

// Function to clear expired cache entries
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of flightPriceCache.entries()) {
    if (now - value.lastUpdated > PRICE_CACHE_DURATION) {
      flightPriceCache.delete(key);
    }
  }
}

// Function to get cache statistics
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: flightPriceCache.size,
    entries: Array.from(flightPriceCache.keys())
  };
}

// Function to clear all cache
export function clearAllCache(): void {
  flightPriceCache.clear();
}

// Function to get cached price without making API call
export function getCachedPrice(fromCode: string, toCode: string): FlightPrice | null {
  const routeKey = `${fromCode}-${toCode}`;
  const cached = flightPriceCache.get(routeKey);
  
  if (cached && (Date.now() - cached.lastUpdated) < PRICE_CACHE_DURATION) {
    return cached;
  }
  
  return null;
}

// Function to check if a route has cached price
export function hasCachedPrice(fromCode: string, toCode: string): boolean {
  return getCachedPrice(fromCode, toCode) !== null;
}

// Function to manually set cache entry (useful for testing or pre-populating)
export function setCachedPrice(fromCode: string, toCode: string, price: FlightPrice): void {
  const routeKey = `${fromCode}-${toCode}`;
  flightPriceCache.set(routeKey, price);
}

// Function to get cache hit rate statistics
export function getCacheHitRate(): { hits: number; misses: number; hitRate: number } {
  // This would need to be implemented with counters in a real application
  // For now, return basic stats
  return {
    hits: 0,
    misses: 0,
    hitRate: 0
  };
}

// Function to preload prices for multiple routes
export async function preloadPrices(
  routes: Array<{ fromCode: string; toCode: string; fromAirport?: Airport; toAirport?: Airport }>
): Promise<Map<string, FlightPrice | null>> {
  const results = new Map<string, FlightPrice | null>();
  
  // Process routes in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (route) => {
      const routeKey = `${route.fromCode}-${route.toCode}`;
      try {
        const price = await getFlightPrice(
          route.fromCode, 
          route.toCode, 
          route.fromAirport, 
          route.toAirport
        );
        results.set(routeKey, price);
        return { routeKey, price };
      } catch (error) {
        console.error(`Failed to preload price for ${routeKey}:`, error);
        results.set(routeKey, null);
        return { routeKey, price: null };
      }
    });
    
    await Promise.all(batchPromises);
    
    // Small delay between batches to be respectful to the API (reduced for tests)
    if (i + batchSize < routes.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  return results;
}