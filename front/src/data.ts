// Determine environment - Bun sets NODE_ENV automatically
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Import data based on environment
const airportsData = isDev
  ? await import('../../data/dev/airports.json')
  : await import('../../data/prod/airports.json');

const routesData = isDev ? await import('../../data/dev/routes.json') : await import('../../data/prod/routes.json');

import type { Airport, Routes } from './types.ts';
export const ryanairAirports: Airport[] = airportsData.default as Airport[];

export const ryanairRoutes: Routes = routesData.default as Routes;

console.log(`🌍 Loaded ${isDev ? 'development' : 'production'} data: ${ryanairAirports.length} airports`);
