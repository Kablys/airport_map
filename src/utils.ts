/// <reference lib="dom" />

import type { Airport } from './main.ts';

/**
 * Calculate the distance between two airports using the haversine formula
 * @param airport1 First airport
 * @param airport2 Second airport
 * @returns Distance in kilometers (rounded to nearest km)
 */
export function calculateDistance(airport1: Airport, airport2: Airport): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((airport2.lat - airport1.lat) * Math.PI) / 180;
    const dLng = ((airport2.lng - airport1.lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((airport1.lat * Math.PI) / 180) *
        Math.cos((airport2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}
/**
 * Calculate estimated flight duration based on distance
 * Uses average speed of 800 km/h for commercial flights
 * @param distance Distance in kilometers
 * @returns Flight duration in minutes
 */
export function calculateFlightDuration(distance: number): number {
    return Math.round((distance / 800) * 60);
}

/**
 * Format flight duration from minutes to hours and minutes
 * @param durationMinutes Duration in minutes
 * @returns Object with hours and minutes
 */
export function formatFlightDuration(durationMinutes: number): { hours: number; minutes: number } {
    return {
        hours: Math.floor(durationMinutes / 60),
        minutes: durationMinutes % 60,
    };
}

/**
 * Get color for price visualization based on min/max range
 * @param price Current price
 * @param min Minimum price in range
 * @param max Maximum price in range
 * @returns Hex color string
 */
export function getPriceColor(price: number, min: number, max: number): string {
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

/**
 * Interpolate between two hex colors
 * @param color1 First color (hex string)
 * @param color2 Second color (hex string)
 * @param factor Interpolation factor (0-1)
 * @returns Interpolated hex color string
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
    const hex2rgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };

    const rgb2hex = (r: number, g: number, b: number): string => {
        return (
            '#' +
            ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
                .toString(16)
                .slice(1)
        );
    };

    const [r1, g1, b1] = hex2rgb(color1);
    const [r2, g2, b2] = hex2rgb(color2);

    const r = r1 + factor * (r2 - r1);
    const g = g1 + factor * (g2 - g1);
    const b = b1 + factor * (b2 - b1);

    return rgb2hex(r, g, b);
}
/**
 * Generate a random flight number in Ryanair format
 * @returns Flight number string (e.g., "FR1234")
 */
export function generateFlightNumber(): string {
    return `FR${Math.floor(Math.random() * 9000) + 1000}`;
}

/**
 * Calculate total duration statistics from individual durations
 * @param totalDurationMinutes Total duration in minutes
 * @returns Object with hours and minutes
 */
export function calculateTotalDuration(totalDurationMinutes: number): {
    hours: number;
    minutes: number;
} {
    return {
        hours: Math.floor(totalDurationMinutes / 60),
        minutes: totalDurationMinutes % 60,
    };
}
