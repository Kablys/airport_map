import { describe, it, expect } from 'bun:test';
import { calculateDistance } from '../src/utils.ts';
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