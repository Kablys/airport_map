import type { Airline, Airport, RouteNetwork } from './types.ts';

// Bun inlines NODE_ENV at bundle time, so only one dataset ends up in the build
const isDev = process.env.NODE_ENV !== 'production';

const [airportsJson, routesJson, airlinesJson] = isDev
  ? await Promise.all([
      import('../../data/dev/airports.json'),
      import('../../data/dev/routes.json'),
      import('../../data/dev/airlines.json'),
    ])
  : await Promise.all([
      import('../../data/prod/airports.json'),
      import('../../data/prod/routes.json'),
      import('../../data/prod/airlines.json'),
    ]);

// Loaded on demand: the pre-fetched Wizz Air fares are megabytes, so they ship as a separate file
const { default: wizzFaresFile } = isDev
  ? await import('../../data/dev/fares-W6.json', { with: { type: 'file' } })
  : await import('../../data/prod/fares-W6.json', { with: { type: 'file' } });

// TypeScript types the import as JSON; Bun's file loader hands over the file's URL instead
export const wizzFaresUrl = wizzFaresFile as unknown as string;
export const airports: Airport[] = airportsJson.default;
export const routeNetwork: RouteNetwork = routesJson.default;
export const airlines: Airline[] = airlinesJson.default;
