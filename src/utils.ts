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
