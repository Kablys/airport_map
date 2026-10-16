import { type FormEvent, useState } from 'react';
import { legsToFetch, type PlanQuery, planTrips, type Trip } from '../planner.ts';
import { type FareCalendar, fareCalendar } from '../services/fare-service.ts';
import type { Airport, Routes } from '../types.ts';
import { addDays, daysBetween, formatDay } from '../utils.ts';

interface TripPlannerProps {
  airports: Airport[];
  routes: Routes;
  onTripSelect: (trip: Trip) => void;
}

type Search =
  | { status: 'idle' }
  | { status: 'fetching'; done: number; total: number }
  | { status: 'done'; trips: Trip[]; failed: number };

const today = new Date().toISOString().slice(0, 10);

/** YYYY-MM of every month touched by the date range. */
function monthsIn(from: string, to: string): string[] {
  const months: string[] = [];
  // the 1st plus 32 days always lands in the next month
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addDays(`${m}-01`, 32).slice(0, 7)) months.push(m);
  return months;
}

/** "Vilnius → Treviso 3n → Tenerife 7n → Berlin 2n → Vilnius" */
function routeText(trip: Trip, cityOf: (code: string) => string): string {
  const stops = trip.legs.map((leg, i) => {
    const arrived = trip.legs[i - 1];
    return arrived ? `${cityOf(leg.from)} ${daysBetween(arrived.date, leg.date)}n` : cityOf(leg.from);
  });
  return [...stops, cityOf(trip.legs.at(-1)?.to ?? '')].join(' → ');
}

function validate(q: PlanQuery): string | undefined {
  if (!q.destination) return 'Choose a destination.';
  if (q.origin === q.destination) return 'Origin and destination are the same.';
  if (!q.earliest || !q.latest || q.earliest > q.latest) return 'The trip must end after it starts.';
  if (q.stopNights[0] > q.stopNights[1] || q.destinationNights[0] > q.destinationNights[1]) {
    return 'Minimum nights must not exceed maximum.';
  }
}

function NightsRange({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}) {
  const num = (s: string) => Math.max(0, Number.parseInt(s, 10) || 0);
  return (
    <fieldset className="planner-nights">
      <legend>{label}</legend>
      <input
        type="number"
        min={0}
        aria-label={`${label} minimum`}
        value={value[0]}
        onChange={(e) => onChange([num(e.target.value), value[1]])}
      />
      –
      <input
        type="number"
        min={0}
        aria-label={`${label} maximum`}
        value={value[1]}
        onChange={(e) => onChange([value[0], num(e.target.value)])}
      />{' '}
      nights
    </fieldset>
  );
}

export function TripPlanner({ airports, routes, onTripSelect }: TripPlannerProps) {
  const sorted = [...airports].sort((a, b) => a.city.localeCompare(b.city));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<PlanQuery>({
    origin: (airports.find((a) => a.code === 'VNO') ?? airports[0])?.code ?? '',
    destination: '',
    earliest: addDays(today, 1),
    latest: addDays(today, 22),
    stopNights: [2, 3],
    destinationNights: [5, 7],
    maxStops: 1,
    differentReturn: true,
  });
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const [error, setError] = useState<string>();
  const update = (patch: Partial<PlanQuery>) => setQuery((q) => ({ ...q, ...patch }));
  const airportByCode = new Map(airports.map((a) => [a.code, a]));
  const cityOf = (code: string) => airportByCode.get(code)?.city ?? code;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate(query);
    setError(problem);
    if (problem) return;

    const months = monthsIn(query.earliest, query.latest);
    const requests = legsToFetch(query, routes, airportByCode).flatMap(([from, to]) =>
      months.map((month) => ({ from, to, month }))
    );
    const calendars = new Map<string, FareCalendar>();
    let done = 0;
    let failed = 0;
    setSearch({ status: 'fetching', done, total: requests.length });
    await Promise.all(
      requests.map(({ from, to, month }) =>
        fareCalendar(from, to, month)
          .then(
            (calendar) => calendars.set(`${from}-${to}-${month}`, calendar),
            (err) => {
              failed++;
              console.error(`Fare lookup failed for ${from}→${to} in ${month}`, err);
            }
          )
          .finally(() => setSearch({ status: 'fetching', done: ++done, total: requests.length }))
      )
    );
    const fare = (from: string, to: string, date: string) =>
      calendars.get(`${from}-${to}-${date.slice(0, 7)}`)?.get(date)?.price;
    setSearch({ status: 'done', trips: planTrips(query, routes, airportByCode, fare), failed });
  }

  if (!open) {
    return (
      <button type="button" className="planner-toggle" onClick={() => setOpen(true)}>
        🧭 Plan a trip
      </button>
    );
  }

  return (
    <div className="trip-planner">
      <div className="itinerary-header">
        <h4>🧭 Plan a trip</h4>
        <button
          type="button"
          className="clear-itinerary-btn"
          aria-label="Close trip planner"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>
      <form className="planner-form" onSubmit={onSubmit}>
        <label>
          From
          <select value={query.origin} onChange={(e) => update({ origin: e.target.value })}>
            {sorted.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            id="planner-destination"
            value={query.destination}
            onChange={(e) => update({ destination: e.target.value })}
          >
            <option value="">Choose…</option>
            {sorted.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          Leave from
          <input type="date" value={query.earliest} onChange={(e) => update({ earliest: e.target.value })} />
        </label>
        <label>
          Back by
          <input type="date" value={query.latest} onChange={(e) => update({ latest: e.target.value })} />
        </label>
        <NightsRange label="Each stopover" value={query.stopNights} onChange={(v) => update({ stopNights: v })} />
        <NightsRange
          label={`In ${query.destination ? cityOf(query.destination) : 'destination'}`}
          value={query.destinationNights}
          onChange={(v) => update({ destinationNights: v })}
        />
        <label>
          Stopovers each way
          <select value={query.maxStops} onChange={(e) => update({ maxStops: Number(e.target.value) })}>
            <option value={0}>none (direct)</option>
            <option value={1}>up to 1</option>
            <option value={2}>up to 2 (slow search)</option>
          </select>
        </label>
        <label className="planner-checkbox">
          <input
            type="checkbox"
            checked={query.differentReturn}
            onChange={(e) => update({ differentReturn: e.target.checked })}
          />
          Come back through other cities
        </label>
        {error && <div className="planner-error">{error}</div>}
        <button type="submit" className="planner-submit" disabled={search.status === 'fetching'}>
          {search.status === 'fetching' ? `Checking fares ${search.done}/${search.total}…` : 'Find trips'}
        </button>
      </form>

      {search.status === 'done' && (
        <div className="planner-results">
          {search.failed > 0 && (
            <div className="planner-error">{search.failed} fare lookups failed, results may miss routes.</div>
          )}
          {search.trips.length === 0 && (
            <div className="no-results">No trips found. Try wider dates or more stopovers.</div>
          )}
          {search.trips.map((trip) => {
            const first = trip.legs[0];
            const last = trip.legs.at(-1);
            if (!first || !last) return null;
            return (
              <button
                type="button"
                key={trip.legs.map((l) => `${l.from}${l.date}`).join('')}
                className="planner-trip"
                onClick={() => onTripSelect(trip)}
              >
                <strong>€{trip.price.toFixed(2)}</strong> · {formatDay(first.date)} → {formatDay(last.date)}
                <span className="planner-route">{routeText(trip, cityOf)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
