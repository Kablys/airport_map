import type { Airport, Routes } from './types.ts';

// Bun inlines NODE_ENV at bundle time, so only one dataset ends up in the build
const isDev = process.env.NODE_ENV !== 'production';

const [airports, routes] = isDev
  ? await Promise.all([import('../../data/dev/airports.json'), import('../../data/dev/routes.json')])
  : await Promise.all([import('../../data/prod/airports.json'), import('../../data/prod/routes.json')]);

export const ryanairAirports: Airport[] = airports.default;
export const ryanairRoutes: Routes = routes.default;
