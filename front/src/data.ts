import airportsData from '../../data/airports.json';
import routesData from '../../data/routes.json';

import type { Airport, Routes } from './types.ts';

export const ryanairAirports: Airport[] = airportsData as Airport[];
export const ryanairRoutes: Routes = routesData as Routes;
