import { FlightPrice } from '../types';

/**
 * Price range calculation and display utilities
 */

export interface PriceRange {
  min: number;
  max: number;
  average: number;
  median: number;
}

/**
 * Calculate comprehensive price range statistics from flight prices
 */
export function calculatePriceRange(prices: FlightPrice[]): PriceRange | null {
  if (!prices.length) return null;

  const priceValues = prices.map(p => p.price).sort((a, b) => a - b);
  
  const min = priceValues[0];
  const max = priceValues[priceValues.length - 1];
  const average = Math.round(priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length);
  
  // Calculate median
  const mid = Math.floor(priceValues.length / 2);
  const median = priceValues.length % 2 === 0
    ? Math.round((priceValues[mid - 1] + priceValues[mid]) / 2)
    : priceValues[mid];

  return { min, max, average, median };
}

/**
 * Get price-based color using gradient from green to orange to red
 */
export function getPriceColor(price: number, minPrice: number, maxPrice: number): string {
  if (maxPrice === minPrice) return '#00cc44'; // Default green if no range
  
  // Normalize price to 0-1 range
  const normalizedPrice = (price - minPrice) / (maxPrice - minPrice);
  
  // Define color stops: green (0) -> orange (0.5) -> red (1)
  if (normalizedPrice <= 0.5) {
    // Green to orange transition
    const ratio = normalizedPrice * 2; // 0 to 1
    const red = Math.round(0 + (255 * ratio));
    const green = Math.round(204 + (136 - 204) * ratio); // 204 to 136
    const blue = Math.round(68 + (0 - 68) * ratio); // 68 to 0
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // Orange to red transition
    const ratio = (normalizedPrice - 0.5) * 2; // 0 to 1
    const red = Math.round(255);
    const green = Math.round(136 + (0 - 136) * ratio); // 136 to 0
    const blue = Math.round(0 + (102 * ratio)); // 0 to 102
    return `rgb(${red}, ${green}, ${blue})`;
  }
}

/**
 * Get price category as string
 */
export function getPriceCategory(price: number, minPrice: number, maxPrice: number): 'cheap' | 'medium' | 'expensive' {
  if (maxPrice === minPrice) return 'cheap';
  
  const normalizedPrice = (price - minPrice) / (maxPrice - minPrice);
  
  if (normalizedPrice <= 0.33) return 'cheap';
  if (normalizedPrice <= 0.66) return 'medium';
  return 'expensive';
}

/**
 * Format price for display with currency symbol
 */
export function formatPrice(price: FlightPrice): string {
  const symbol = getCurrencySymbol(price.currency);
  return `${symbol}${price.price}`;
}

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: { [key: string]: string } = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'PLN': 'zł',
    'CZK': 'Kč',
    'HUF': 'Ft',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
  };
  
  return symbols[currencyCode] || currencyCode;
}

/**
 * Get route line weight based on price (cheaper routes are thicker)
 */
export function getRouteWeight(price: number, minPrice: number, maxPrice: number): number {
  if (maxPrice === minPrice) return 3;
  
  const normalizedPrice = (price - minPrice) / (maxPrice - minPrice);
  // Cheaper routes (lower normalized price) get higher weight
  return Math.max(2, Math.round(5 - (normalizedPrice * 2))); // 5 to 3
}

/**
 * Get route line opacity based on selection and hover state
 */
export function getRouteOpacity(isSelected: boolean, isHovered: boolean = false): number {
  if (isHovered) return 0.9;
  return isSelected ? 0.8 : 0.6;
}

/**
 * Calculate price difference percentage between two prices
 */
export function calculatePriceDifference(price1: number, price2: number): number {
  if (price2 === 0) return 0;
  return Math.round(((price1 - price2) / price2) * 100);
}

/**
 * Find cheapest and most expensive routes from a list
 */
export function findPriceExtremes(prices: FlightPrice[]): {
  cheapest: FlightPrice | null;
  mostExpensive: FlightPrice | null;
} {
  if (!prices.length) {
    return { cheapest: null, mostExpensive: null };
  }

  let cheapest = prices[0];
  let mostExpensive = prices[0];

  for (const price of prices) {
    if (price.price < cheapest.price) {
      cheapest = price;
    }
    if (price.price > mostExpensive.price) {
      mostExpensive = price;
    }
  }

  return { cheapest, mostExpensive };
}

/**
 * Group prices by price ranges for histogram display
 */
export function groupPricesByRange(prices: FlightPrice[], bucketCount: number = 5): Array<{
  range: string;
  count: number;
  minPrice: number;
  maxPrice: number;
}> {
  if (!prices.length) return [];

  const priceValues = prices.map(p => p.price);
  const min = Math.min(...priceValues);
  const max = Math.max(...priceValues);
  const bucketSize = (max - min) / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const bucketMin = min + (i * bucketSize);
    const bucketMax = i === bucketCount - 1 ? max : bucketMin + bucketSize;
    
    const count = priceValues.filter(price => 
      price >= bucketMin && (i === bucketCount - 1 ? price <= bucketMax : price < bucketMax)
    ).length;

    return {
      range: `€${Math.round(bucketMin)}-€${Math.round(bucketMax)}`,
      count,
      minPrice: bucketMin,
      maxPrice: bucketMax,
    };
  });

  return buckets;
}

/**
 * Check if a price is considered a good deal based on historical data
 */
export function isGoodDeal(currentPrice: number, averagePrice: number, threshold: number = 0.8): boolean {
  return currentPrice <= (averagePrice * threshold);
}

/**
 * Generate price trend indicator
 */
export function getPriceTrend(currentPrice: number, previousPrice: number): 'up' | 'down' | 'stable' {
  const difference = Math.abs(currentPrice - previousPrice);
  const threshold = previousPrice * 0.05; // 5% threshold
  
  if (difference <= threshold) return 'stable';
  return currentPrice > previousPrice ? 'up' : 'down';
}