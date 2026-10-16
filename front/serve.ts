import { fareRoutes } from './fare-store.ts';
import index from './index.html';

// NODE_ENV picks the dataset bundled into the page (see src/data.ts): production = data/prod, else data/dev
const production = process.env.NODE_ENV === 'production';
const offline = process.env.FARES === 'offline';
const faresDir = new URL('../data/fares', import.meta.url).pathname;

const server = Bun.serve({
  port: Number(process.env.PORT) || (production ? 4173 : 3000),
  development: !production,
  routes: { '/': index, ...fareRoutes(faresDir, { offline }) },
});

console.log(
  `Map on ${server.url} with ${production ? 'real' : 'dev fixture'} data; fares ${offline ? 'replayed from' : 'recorded to'} data/fares/`
);
