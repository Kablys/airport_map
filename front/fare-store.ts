import { type ApiDay, RYANAIR_FARES_API } from './src/services/fare-service.ts';

/** One route's fare calendar for a month, as saved on disk: Ryanair's day objects, bookable days only. */
export interface StoredCalendar {
  savedAt: string;
  fares: ApiDay[];
}

/** Calendars of one month keyed "FROM-TO"; one file per month, data/fares/YYYY-MM.json. */
type MonthFile = Record<string, StoredCalendar>;

const IATA = /^[A-Z]{3}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const bookable = (days: ApiDay[]): ApiDay[] =>
  days.flatMap((d) =>
    d.price && d.departureDate && d.arrivalDate && !d.soldOut && !d.unavailable
      ? [
          {
            day: d.day,
            departureDate: d.departureDate,
            arrivalDate: d.arrivalDate,
            price: { value: d.price.value, currencyCode: d.price.currencyCode },
          },
        ]
      : []
  );

/**
 * Routes for a local server that proxies Ryanair's fare calendars through files in `dir`, so every search
 * (browser, preview pane, anyone on this checkout) adds to the same data set. Only routes not on file are fetched.
 * Offline: never call Ryanair; routes not on file answer "no flights" (repeatable tests, no network).
 */
export function fareRoutes(dir: string, { offline = false } = {}) {
  const months = new Map<string, Promise<MonthFile>>();
  const writes = new Map<string, Promise<unknown>>();

  const load = (month: string) => {
    let data = months.get(month);
    if (!data) {
      const file = Bun.file(`${dir}/${month}.json`);
      data = file.exists().then((exists) => (exists ? (file.json() as Promise<MonthFile>) : {}));
      months.set(month, data);
    }
    return data;
  };

  // Writes go out one at a time per month, each with the full in-memory state, so none is lost
  const save = (month: string) => {
    const write = (writes.get(month) ?? Promise.resolve()).then(async () => {
      const data = await load(month);
      const lines = Object.keys(data)
        .sort()
        .map((route) => `  ${JSON.stringify(route)}: ${JSON.stringify(data[route])}`);
      await Bun.write(`${dir}/${month}.json`, `{\n${lines.join(',\n')}\n}\n`);
    });
    writes.set(month, write);
    return write;
  };

  return {
    '/api/fares/:from/:to/:month': async (req: Bun.BunRequest<'/api/fares/:from/:to/:month'>) => {
      const { from, to, month } = req.params;
      if (!IATA.test(from) || !IATA.test(to) || !MONTH.test(month)) {
        return new Response('Expected /api/fares/ABC/XYZ/YYYY-MM', { status: 400 });
      }
      const data = await load(month);
      const stored = data[`${from}-${to}`];
      // Kept forever to save fetches while testing; savedAt says how old it is. Delete a line or file to refetch.
      if (stored) return Response.json({ outbound: { fares: stored.fares } });
      if (offline) {
        console.warn(`Offline: no stored fares for ${from}→${to} ${month}, answering "no flights"`);
        return Response.json({ outbound: { fares: [] } });
      }

      const res = await fetch(
        `${RYANAIR_FARES_API}/${from}/${to}/cheapestPerDay?outboundMonthOfDate=${month}-01&currency=EUR`
      );
      if (!res.ok) return new Response(`Ryanair answered HTTP ${res.status}`, { status: 502 });
      const days = ((await res.json()) as { outbound?: { fares?: ApiDay[] } }).outbound?.fares;
      if (!Array.isArray(days)) return new Response('Unexpected Ryanair response', { status: 502 });
      data[`${from}-${to}`] = { savedAt: new Date().toISOString(), fares: bookable(days) };
      await save(month);
      return Response.json({ outbound: { fares: data[`${from}-${to}`]?.fares } });
    },

    /** Import calendars, e.g. a browser's IndexedDB: { "FROM-TO-YYYY-MM": StoredCalendar }; newer wins. */
    '/api/fares': {
      POST: async (req: Request) => {
        const body = (await req.json()) as Record<string, StoredCalendar>;
        const entries = Object.entries(body).map(([key, calendar]) => {
          const [from = '', to = '', ...rest] = key.split('-');
          return { key, from, to, month: rest.join('-'), calendar };
        });
        // Check everything before touching any month, so a bad entry imports nothing
        const bad = entries.find(
          ({ from, to, month, calendar }) =>
            !IATA.test(from) ||
            !IATA.test(to) ||
            !MONTH.test(month) ||
            !Array.isArray(calendar?.fares) ||
            Number.isNaN(Date.parse(calendar.savedAt))
        );
        if (bad) return new Response(`Bad calendar "${bad.key}"`, { status: 400 });

        const touched = new Set<string>();
        for (const { from, to, month, calendar } of entries) {
          const data = await load(month);
          const known = data[`${from}-${to}`];
          if (known && Date.parse(known.savedAt) >= Date.parse(calendar.savedAt)) continue;
          data[`${from}-${to}`] = { savedAt: calendar.savedAt, fares: bookable(calendar.fares) };
          touched.add(month);
        }
        await Promise.all([...touched].map(save));
        return Response.json({ months: [...touched].sort() });
      },
    },
  };
}
