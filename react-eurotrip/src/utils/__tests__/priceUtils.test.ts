import {
  calculatePriceRange,
  getPriceColor,
  getPriceCategory,
  formatPrice,
  getCurrencySymbol,
  getRouteWeight,
  getRouteOpacity,
  calculatePriceDifference,
  findPriceExtremes,
  groupPricesByRange,
  isGoodDeal,
  getPriceTrend,
} from '../priceUtils';
import { FlightPrice } from '../../types';

describe('Price Utils', () => {
  const mockPrices: FlightPrice[] = [
    {
      price: 50,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    },
    {
      price: 100,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    },
    {
      price: 150,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    },
    {
      price: 200,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    },
  ];

  describe('calculatePriceRange', () => {
    it('calculates price range correctly', () => {
      const result = calculatePriceRange(mockPrices);
      
      expect(result).toEqual({
        min: 50,
        max: 200,
        average: 125,
        median: 125,
      });
    });

    it('handles single price', () => {
      const singlePrice = [mockPrices[0]];
      const result = calculatePriceRange(singlePrice);
      
      expect(result).toEqual({
        min: 50,
        max: 50,
        average: 50,
        median: 50,
      });
    });

    it('returns null for empty array', () => {
      const result = calculatePriceRange([]);
      expect(result).toBeNull();
    });

    it('calculates median correctly for odd number of prices', () => {
      const oddPrices = mockPrices.slice(0, 3); // 50, 100, 150
      const result = calculatePriceRange(oddPrices);
      
      expect(result?.median).toBe(100);
    });
  });

  describe('getPriceColor', () => {
    it('returns green for minimum price', () => {
      const color = getPriceColor(50, 50, 200);
      expect(color).toBe('rgb(0, 204, 68)'); // Green
    });

    it('returns red for maximum price', () => {
      const color = getPriceColor(200, 50, 200);
      expect(color).toBe('rgb(255, 0, 102)'); // Red
    });

    it('returns orange for middle price', () => {
      const color = getPriceColor(125, 50, 200);
      expect(color).toBe('rgb(255, 136, 0)'); // Orange
    });

    it('returns default green when min equals max', () => {
      const color = getPriceColor(100, 100, 100);
      expect(color).toBe('#00cc44');
    });
  });

  describe('getPriceCategory', () => {
    it('categorizes prices correctly', () => {
      expect(getPriceCategory(60, 50, 200)).toBe('cheap'); // 0.067 normalized
      expect(getPriceCategory(125, 50, 200)).toBe('medium'); // 0.5 normalized
      expect(getPriceCategory(180, 50, 200)).toBe('expensive'); // 0.867 normalized
    });

    it('returns cheap when min equals max', () => {
      expect(getPriceCategory(100, 100, 100)).toBe('cheap');
    });
  });

  describe('formatPrice', () => {
    it('formats EUR price correctly', () => {
      const price: FlightPrice = {
        price: 125,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
      };
      
      expect(formatPrice(price)).toBe('€125');
    });

    it('formats USD price correctly', () => {
      const price: FlightPrice = {
        price: 150,
        currency: 'USD',
        lastUpdated: Date.now(),
        estimated: false,
      };
      
      expect(formatPrice(price)).toBe('$150');
    });

    it('handles unknown currency', () => {
      const price: FlightPrice = {
        price: 100,
        currency: 'XYZ',
        lastUpdated: Date.now(),
        estimated: false,
      };
      
      expect(formatPrice(price)).toBe('XYZ100');
    });
  });

  describe('getCurrencySymbol', () => {
    it('returns correct symbols for known currencies', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('PLN')).toBe('zł');
    });

    it('returns currency code for unknown currencies', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ');
    });
  });

  describe('getRouteWeight', () => {
    it('returns higher weight for cheaper prices', () => {
      const cheapWeight = getRouteWeight(50, 50, 200);
      const expensiveWeight = getRouteWeight(200, 50, 200);
      
      expect(cheapWeight).toBeGreaterThan(expensiveWeight);
      expect(cheapWeight).toBe(5);
      expect(expensiveWeight).toBe(3);
    });

    it('returns default weight when min equals max', () => {
      expect(getRouteWeight(100, 100, 100)).toBe(3);
    });

    it('ensures minimum weight of 2', () => {
      const weight = getRouteWeight(200, 50, 200);
      expect(weight).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getRouteOpacity', () => {
    it('returns higher opacity for hovered state', () => {
      expect(getRouteOpacity(true, true)).toBe(0.9);
    });

    it('returns medium opacity for selected state', () => {
      expect(getRouteOpacity(true, false)).toBe(0.8);
    });

    it('returns lower opacity for unselected state', () => {
      expect(getRouteOpacity(false, false)).toBe(0.6);
    });
  });

  describe('calculatePriceDifference', () => {
    it('calculates positive difference correctly', () => {
      expect(calculatePriceDifference(120, 100)).toBe(20);
    });

    it('calculates negative difference correctly', () => {
      expect(calculatePriceDifference(80, 100)).toBe(-20);
    });

    it('handles zero base price', () => {
      expect(calculatePriceDifference(100, 0)).toBe(0);
    });
  });

  describe('findPriceExtremes', () => {
    it('finds cheapest and most expensive prices', () => {
      const result = findPriceExtremes(mockPrices);
      
      expect(result.cheapest?.price).toBe(50);
      expect(result.mostExpensive?.price).toBe(200);
    });

    it('handles empty array', () => {
      const result = findPriceExtremes([]);
      
      expect(result.cheapest).toBeNull();
      expect(result.mostExpensive).toBeNull();
    });

    it('handles single price', () => {
      const result = findPriceExtremes([mockPrices[0]]);
      
      expect(result.cheapest).toBe(mockPrices[0]);
      expect(result.mostExpensive).toBe(mockPrices[0]);
    });
  });

  describe('groupPricesByRange', () => {
    it('groups prices into buckets correctly', () => {
      const result = groupPricesByRange(mockPrices, 4);
      
      expect(result).toHaveLength(4);
      expect(result[0].count).toBe(1); // 50
      expect(result[1].count).toBe(1); // 100
      expect(result[2].count).toBe(1); // 150
      expect(result[3].count).toBe(1); // 200
    });

    it('handles empty array', () => {
      const result = groupPricesByRange([]);
      expect(result).toEqual([]);
    });

    it('uses default bucket count', () => {
      const result = groupPricesByRange(mockPrices);
      expect(result).toHaveLength(5);
    });
  });

  describe('isGoodDeal', () => {
    it('identifies good deals correctly', () => {
      expect(isGoodDeal(80, 100, 0.8)).toBe(true); // 80 <= 80
      expect(isGoodDeal(70, 100, 0.8)).toBe(true); // 70 < 80
      expect(isGoodDeal(90, 100, 0.8)).toBe(false); // 90 > 80
    });

    it('uses default threshold', () => {
      expect(isGoodDeal(80, 100)).toBe(true); // Uses 0.8 threshold
      expect(isGoodDeal(85, 100)).toBe(false);
    });
  });

  describe('getPriceTrend', () => {
    it('identifies upward trend', () => {
      expect(getPriceTrend(110, 100)).toBe('up');
    });

    it('identifies downward trend', () => {
      expect(getPriceTrend(90, 100)).toBe('down');
    });

    it('identifies stable trend', () => {
      expect(getPriceTrend(102, 100)).toBe('stable'); // Within 5% threshold
      expect(getPriceTrend(98, 100)).toBe('stable');
    });

    it('handles exact same price', () => {
      expect(getPriceTrend(100, 100)).toBe('stable');
    });
  });
});