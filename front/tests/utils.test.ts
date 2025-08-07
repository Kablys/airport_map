import { describe, it, expect } from 'bun:test';
import { 
  calculateDistance, 
  calculateFlightDuration, 
  formatFlightDuration, 
  getPriceColor, 
  interpolateColor,
  generateFlightNumber,
  calculateTotalDuration,
  generateCurvedPath
} from '../src/utils.ts';
import type { Airport } from '../src/main.ts';

describe('calculateDistance', () => {
  // Test airports with known coordinates
  const londonLGW: Airport = {
    code: 'LGW',
    name: 'London Gatwick',
    city: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    lat: 51.1481,
    lng: -0.1903
  };

  const parisORY: Airport = {
    code: 'ORY',
    name: 'Paris Orly',
    city: 'Paris',
    country: 'France',
    flag: '🇫🇷',
    lat: 48.7233,
    lng: 2.3794
  };

  const madridMAD: Airport = {
    code: 'MAD',
    name: 'Madrid Barajas',
    city: 'Madrid',
    country: 'Spain',
    flag: '🇪🇸',
    lat: 40.4719,
    lng: -3.5626
  };

  it('should calculate distance between London and Paris correctly', () => {
    const distance = calculateDistance(londonLGW, parisORY);
    // Expected distance is approximately 326 km
    expect(distance).toBe(326);
  });

  it('should calculate distance between London and Madrid correctly', () => {
    const distance = calculateDistance(londonLGW, madridMAD);
    // Expected distance is approximately 1215 km
    expect(distance).toBe(1215);
  });

  it('should return 0 for same airport', () => {
    const distance = calculateDistance(londonLGW, londonLGW);
    expect(distance).toBe(0);
  });

  it('should be symmetric (distance A to B equals B to A)', () => {
    const distanceAB = calculateDistance(londonLGW, parisORY);
    const distanceBA = calculateDistance(parisORY, londonLGW);
    expect(distanceAB).toBe(distanceBA);
  });

  it('should handle airports at different hemispheres', () => {
    const northAirport: Airport = {
      code: 'TEST1',
      name: 'North Test',
      city: 'North',
      country: 'Test',
      flag: '🧪',
      lat: 60.0,
      lng: 10.0
    };

    const southAirport: Airport = {
      code: 'TEST2',
      name: 'South Test',
      city: 'South',
      country: 'Test',
      flag: '🧪',
      lat: -60.0,
      lng: 10.0
    };

    const distance = calculateDistance(northAirport, southAirport);
    // Should be approximately 13,340 km (roughly 120 degrees of latitude)
    expect(distance).toBeGreaterThan(13000);
    expect(distance).toBeLessThan(14000);
  });

  it('should return a positive number', () => {
    const distance = calculateDistance(londonLGW, parisORY);
    expect(distance).toBeGreaterThan(0);
  });

  it('should return an integer (rounded result)', () => {
    const distance = calculateDistance(londonLGW, parisORY);
    expect(Number.isInteger(distance)).toBe(true);
  });
});

describe('calculateFlightDuration', () => {
  it('should calculate flight duration for short distances', () => {
    const duration = calculateFlightDuration(400); // 400km
    expect(duration).toBe(30); // 30 minutes at 800km/h
  });

  it('should calculate flight duration for medium distances', () => {
    const duration = calculateFlightDuration(800); // 800km
    expect(duration).toBe(60); // 1 hour at 800km/h
  });

  it('should calculate flight duration for long distances', () => {
    const duration = calculateFlightDuration(1600); // 1600km
    expect(duration).toBe(120); // 2 hours at 800km/h
  });

  it('should handle zero distance', () => {
    const duration = calculateFlightDuration(0);
    expect(duration).toBe(0);
  });

  it('should round to nearest minute', () => {
    const duration = calculateFlightDuration(100); // Should be 7.5 minutes
    expect(duration).toBe(8); // Rounded to 8 minutes
  });
});

describe('formatFlightDuration', () => {
  it('should format duration less than 1 hour', () => {
    const formatted = formatFlightDuration(45);
    expect(formatted).toEqual({ hours: 0, minutes: 45 });
  });

  it('should format duration exactly 1 hour', () => {
    const formatted = formatFlightDuration(60);
    expect(formatted).toEqual({ hours: 1, minutes: 0 });
  });

  it('should format duration more than 1 hour', () => {
    const formatted = formatFlightDuration(135); // 2h 15m
    expect(formatted).toEqual({ hours: 2, minutes: 15 });
  });

  it('should handle zero duration', () => {
    const formatted = formatFlightDuration(0);
    expect(formatted).toEqual({ hours: 0, minutes: 0 });
  });

  it('should handle large durations', () => {
    const formatted = formatFlightDuration(1440); // 24 hours
    expect(formatted).toEqual({ hours: 24, minutes: 0 });
  });
});

describe('getPriceColor', () => {
  it('should return orange for equal min/max prices', () => {
    const color = getPriceColor(50, 50, 50);
    expect(color).toBe('#ff8800');
  });

  it('should return green for minimum price', () => {
    const color = getPriceColor(20, 20, 100);
    expect(color).toBe('#00cc44'); // Cheapest color
  });

  it('should return red for maximum price', () => {
    const color = getPriceColor(100, 20, 100);
    expect(color).toBe('#ff0066'); // Most expensive color
  });

  it('should return orange for middle price', () => {
    const color = getPriceColor(60, 20, 100);
    expect(color).toBe('#ff8800'); // Mid-range color
  });

  it('should interpolate colors correctly for low-mid range', () => {
    const color = getPriceColor(30, 20, 100); // 25% of range
    // Should be between green and orange
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(color).not.toBe('#00cc44');
    expect(color).not.toBe('#ff8800');
  });

  it('should interpolate colors correctly for mid-high range', () => {
    const color = getPriceColor(80, 20, 100); // 75% of range
    // Should be between orange and red
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(color).not.toBe('#ff8800');
    expect(color).not.toBe('#ff0066');
  });
});

describe('interpolateColor', () => {
  it('should return first color when factor is 0', () => {
    const color = interpolateColor('#ff0000', '#00ff00', 0);
    expect(color).toBe('#ff0000');
  });

  it('should return second color when factor is 1', () => {
    const color = interpolateColor('#ff0000', '#00ff00', 1);
    expect(color).toBe('#00ff00');
  });

  it('should interpolate to middle color when factor is 0.5', () => {
    const color = interpolateColor('#000000', '#ffffff', 0.5);
    expect(color).toBe('#808080'); // Middle gray
  });

  it('should handle red to blue interpolation', () => {
    const color = interpolateColor('#ff0000', '#0000ff', 0.5);
    expect(color).toBe('#800080'); // Purple
  });

  it('should handle lowercase hex colors', () => {
    const color = interpolateColor('#ff0000', '#00ff00', 0.5);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('should produce valid hex colors for any factor', () => {
    const factors = [0, 0.25, 0.5, 0.75, 1];
    factors.forEach(factor => {
      const color = interpolateColor('#123456', '#abcdef', factor);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe('generateFlightNumber', () => {
  it('should generate flight number with FR prefix', () => {
    const flightNumber = generateFlightNumber();
    expect(flightNumber).toMatch(/^FR\d{4}$/);
  });

  it('should generate numbers in valid range', () => {
    const flightNumber = generateFlightNumber();
    const number = parseInt(flightNumber.slice(2));
    expect(number).toBeGreaterThanOrEqual(1000);
    expect(number).toBeLessThanOrEqual(9999);
  });

  it('should generate different numbers on multiple calls', () => {
    const numbers = new Set();
    for (let i = 0; i < 10; i++) {
      numbers.add(generateFlightNumber());
    }
    // Should have generated at least some different numbers
    expect(numbers.size).toBeGreaterThan(1);
  });
});

describe('calculateTotalDuration', () => {
  it('should calculate total duration for less than 1 hour', () => {
    const result = calculateTotalDuration(45);
    expect(result).toEqual({ hours: 0, minutes: 45 });
  });

  it('should calculate total duration for exactly 1 hour', () => {
    const result = calculateTotalDuration(60);
    expect(result).toEqual({ hours: 1, minutes: 0 });
  });

  it('should calculate total duration for multiple hours', () => {
    const result = calculateTotalDuration(150); // 2h 30m
    expect(result).toEqual({ hours: 2, minutes: 30 });
  });

  it('should handle zero duration', () => {
    const result = calculateTotalDuration(0);
    expect(result).toEqual({ hours: 0, minutes: 0 });
  });

  it('should handle large durations', () => {
    const result = calculateTotalDuration(1500); // 25h
    expect(result).toEqual({ hours: 25, minutes: 0 });
  });
});

describe('generateCurvedPath', () => {
  it('should generate a path with correct number of points', () => {
    const path = generateCurvedPath(51.1481, -0.1903, 48.7233, 2.3794, 10);
    expect(path).toHaveLength(11); // numPoints + 1 (including start and end)
  });

  it('should start and end at the correct coordinates', () => {
    const lat1 = 51.1481, lng1 = -0.1903;
    const lat2 = 48.7233, lng2 = 2.3794;
    const path = generateCurvedPath(lat1, lng1, lat2, lng2);
    
    // Use approximate equality for floating point comparisons
    expect(path[0][0]).toBeCloseTo(lat1, 5);
    expect(path[0][1]).toBeCloseTo(lng1, 5);
    expect(path[path.length - 1][0]).toBeCloseTo(lat2, 5);
    expect(path[path.length - 1][1]).toBeCloseTo(lng2, 5);
  });

  it('should return straight line for very close points', () => {
    const lat1 = 51.1481, lng1 = -0.1903;
    const lat2 = 51.1482, lng2 = -0.1904; // Very close points
    const path = generateCurvedPath(lat1, lng1, lat2, lng2);
    
    expect(path).toHaveLength(2);
    expect(path[0]).toEqual([lat1, lng1]);
    expect(path[1]).toEqual([lat2, lng2]);
  });

  it('should generate curved path for distant points', () => {
    const path = generateCurvedPath(51.1481, -0.1903, 48.7233, 2.3794, 5);
    
    // Path should have intermediate points that are not on the straight line
    expect(path).toHaveLength(6);
    
    // Check that middle points are different from linear interpolation
    const midPoint = path[Math.floor(path.length / 2)];
    const linearMidLat = (51.1481 + 48.7233) / 2;
    const linearMidLng = (-0.1903 + 2.3794) / 2;
    
    // The curved path should deviate from the straight line
    expect(Math.abs(midPoint[0] - linearMidLat)).toBeGreaterThan(0.01);
  });

  it('should handle same start and end points', () => {
    const lat = 51.1481, lng = -0.1903;
    const path = generateCurvedPath(lat, lng, lat, lng);
    
    expect(path).toHaveLength(2);
    expect(path[0]).toEqual([lat, lng]);
    expect(path[1]).toEqual([lat, lng]);
  });

  it('should generate valid latitude and longitude values', () => {
    const path = generateCurvedPath(51.1481, -0.1903, 48.7233, 2.3794);
    
    path.forEach(([lat, lng]) => {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });

  it('should handle cross-hemisphere paths', () => {
    // London to Sydney (crosses multiple hemispheres)
    const path = generateCurvedPath(51.1481, -0.1903, -33.8688, 151.2093, 10);
    
    expect(path).toHaveLength(11);
    expect(path[0][0]).toBeCloseTo(51.1481, 5);
    expect(path[0][1]).toBeCloseTo(-0.1903, 5);
    expect(path[path.length - 1][0]).toBeCloseTo(-33.8688, 5);
    expect(path[path.length - 1][1]).toBeCloseTo(151.2093, 5);
    
    // All points should be valid coordinates
    path.forEach(([lat, lng]) => {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });
});