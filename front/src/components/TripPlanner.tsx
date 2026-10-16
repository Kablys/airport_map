import { type FormEvent, useState } from 'react';
import { legsToFetch, type PlanQuery, planTrips, type Trip } from '../planner.ts';
import { loadFareBook } from '../services/fare-service.ts';
import type { Airline, Airport, RouteNetwork } from '../types.ts';
import { addDays, daysBetween, estimateFlightPrice, filterRoutes, formatDay } from '../utils.ts';

interface TripPlannerProps {
  airports: Airport[];
  airlines: Airline[];
  network: RouteNetwork;
  /** Airlines ticked in the airline filter; only their routes are searched. */
  enabledAirlines: ReadonlySet<string>;
  onTripSelect: (trip: Trip) => void;
  /** Preview a trip on the map while hovered; null clears it. */
  onTripHover: (trip: Trip | null) => void;
}

type Search =
  | { status: 'idle' }
  | { status: 'fetching'; done: number; total: number }
  | { status: 'done'; trips: Trip[]; failed: number; wizzFetched: string | undefined };

const today = new Date().toISOString().slice(0, 10);
// Key predates countries in the list; kept so saved lists survive
const AVOID_KEY = 'planner-avoid-cities';
const tripKey = (trip: Trip) => trip.legs.map((l) => `${l.from}${l.date}`).join('');

// Saved per browser: a convenience, so failures only lose the list
function loadAvoided(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(AVOID_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((c): c is string => typeof c === 'string') : [];
  } catch (err) {
    console.warn('Ignoring unreadable saved avoided places', err);
    return [];
  }
}

function saveAvoided(places: string[]) {
  try {
    localStorage.setItem(AVOID_KEY, JSON.stringify(places));
  } catch (err) {
    console.warn('Could not save avoided places', err);
  }
}

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
  if (q.stopNights[0] > q.stopNights[1] || (!q.oneWay && q.destinationNights[0] > q.destinationNights[1])) {
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

/** A city or a whole country the planner can be told to avoid. */
interface Place {
  name: string;
  flag: string;
  /** The country a city is in; undefined for a country. */
  country?: string;
}

/** Countries first, then cities; a city named like its country (Malta) is covered by the country. */
function placesOf(airports: Airport[]): Place[] {
  const places = new Map<string, Place>();
  for (const a of airports) if (!places.has(a.country)) places.set(a.country, { name: a.country, flag: a.flag });
  for (const a of airports)
    if (!places.has(a.city)) places.set(a.city, { name: a.city, flag: a.flag, country: a.country });
  return [...places.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const MAX_SUGGESTIONS = 8;

function AvoidPlaces({
  places,
  value,
  onChange,
}: {
  places: Place[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const term = text.trim().toLowerCase();
  const matches = term
    ? places
        .filter((p) => !value.includes(p.name) && p.name.toLowerCase().includes(term))
        // stable sort: names starting with the text first, alphabetical within each group
        .sort((a, b) => Number(!a.name.toLowerCase().startsWith(term)) - Number(!b.name.toLowerCase().startsWith(term)))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const showList = open && matches.length > 0;
  const flagOf = (name: string) => places.find((p) => p.name === name)?.flag ?? '';

  const add = (place: Place | undefined) => {
    if (!place) return;
    onChange([...value, place.name].sort());
    setText('');
    setActive(0);
  };

  return (
    <div className="planner-avoid">
      <label htmlFor="planner-avoid">Don't stop in (city or whole country)</label>
      <div className="planner-avoid-input">
        <input
          id="planner-avoid"
          role="combobox"
          aria-expanded={showList}
          aria-controls="planner-avoid-options"
          aria-autocomplete="list"
          aria-activedescendant={showList ? `planner-avoid-option-${active}` : undefined}
          autoComplete="off"
          value={text}
          placeholder="Type a city or country…"
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              const step = e.key === 'ArrowDown' ? 1 : -1;
              setActive((i) => Math.min(Math.max(i + step, 0), Math.max(matches.length - 1, 0)));
            } else if (e.key === 'Enter') {
              e.preventDefault(); // never submit the search form from here
              add(matches[active] ?? matches[0]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <button type="button" onClick={() => add(matches[active] ?? matches[0])}>
          Add
        </button>
        {showList && (
          <div id="planner-avoid-options" role="listbox" className="planner-avoid-options">
            {matches.map((place, i) => (
              <div
                key={place.name}
                id={`planner-avoid-option-${i}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === active}
                className={`planner-avoid-option${i === active ? ' planner-avoid-option--active' : ''}`}
                // mousedown, not click: keeps focus in the input so the list doesn't close first
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(place);
                }}
                onMouseMove={() => setActive(i)}
              >
                {place.flag} {place.name}
                <span className="small-muted"> · {place.country ?? 'whole country'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div className="planner-avoid-list">
          {value.map((name) => (
            <button
              type="button"
              key={name}
              className="avoid-chip"
              aria-label={`Allow ${name} again`}
              onClick={() => onChange(value.filter((v) => v !== name))}
            >
              {flagOf(name)} {name} ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TripPlanner({
  airports,
  airlines,
  network,
  enabledAirlines,
  onTripSelect,
  onTripHover,
}: TripPlannerProps) {
  const sorted = [...airports].sort((a, b) => a.city.localeCompare(b.city));
  const places = placesOf(airports);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<PlanQuery>({
    origin: (airports.find((a) => a.code === 'VNO') ?? airports[0])?.code ?? '',
    destination: '',
    earliest: addDays(today, 1),
    latest: addDays(today, 22),
    stopNights: [2, 3],
    destinationNights: [5, 7],
    maxStops: 1,
    oneWay: false,
    differentReturn: true,
    avoid: loadAvoided(),
  });
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const [error, setError] = useState<string>();
  const update = (patch: Partial<PlanQuery>) => setQuery((q) => ({ ...q, ...patch }));
  const setAvoided = (avoid: string[]) => {
    saveAvoided(avoid);
    update({ avoid });
  };
  const airportByCode = new Map(airports.map((a) => [a.code, a]));
  const cityOf = (code: string) => airportByCode.get(code)?.city ?? code;
  const airlineName = (code: string) => airlines.find((a) => a.code === code)?.name ?? code;
  const routes = filterRoutes(network, enabledAirlines);
  const airlinesOf = (from: string, to: string) =>
    (network[from]?.[to] ?? []).filter((code) => enabledAirlines.has(code));
  const estimate = (from: string, to: string) => {
    const a = airportByCode.get(from);
    const b = airportByCode.get(to);
    return a && b ? estimateFlightPrice(a, b).price : undefined;
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = enabledAirlines.size ? validate(query) : 'Tick at least one airline in the Airlines box.';
    setError(problem);
    if (problem) return;
    onTripHover(null);

    const months = monthsIn(query.earliest, query.latest);
    const legs = legsToFetch(query, routes, airportByCode).map(([from, to]) => ({
      from,
      to,
      airlines: airlinesOf(from, to),
    }));
    setSearch({ status: 'fetching', done: 0, total: legs.length });
    const { book, failed } = await loadFareBook(legs, months, estimate, (done, total) =>
      setSearch({ status: 'fetching', done, total })
    );
    const fare = (from: string, to: string, date: string) => book.quote(from, to, date, airlinesOf(from, to));
    const trips = planTrips(query, routes, airportByCode, fare);
    setSearch({ status: 'done', trips, failed, wizzFetched: book.wizzFetched });
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
          onClick={() => {
            onTripHover(null);
            setOpen(false);
          }}
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
          {query.oneWay ? 'Arrive by' : 'Back by'}
          <input type="date" value={query.latest} onChange={(e) => update({ latest: e.target.value })} />
        </label>
        <NightsRange label="Each stopover" value={query.stopNights} onChange={(v) => update({ stopNights: v })} />
        {!query.oneWay && (
          <NightsRange
            label={`In ${query.destination ? cityOf(query.destination) : 'destination'}`}
            value={query.destinationNights}
            onChange={(v) => update({ destinationNights: v })}
          />
        )}
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
            id="planner-one-way"
            type="checkbox"
            checked={query.oneWay}
            onChange={(e) => update({ oneWay: e.target.checked })}
          />
          One way, no return
        </label>
        {!query.oneWay && (
          <label className="planner-checkbox">
            <input
              type="checkbox"
              checked={query.differentReturn}
              onChange={(e) => update({ differentReturn: e.target.checked })}
            />
            Come back through other cities
          </label>
        )}
        <AvoidPlaces places={places} value={query.avoid} onChange={setAvoided} />
        {error && <div className="planner-error">{error}</div>}
        <button type="submit" className="planner-submit" disabled={search.status === 'fetching'}>
          {search.status === 'fetching' ? `Checking fares ${search.done}/${search.total}…` : 'Find trips'}
        </button>
      </form>

      {search.status === 'done' && (
        <div className="planner-results">
          {search.wizzFetched && enabledAirlines.has('W6') && (
            <div className="small-muted">Wizz Air fares as of {formatDay(search.wizzFetched)}.</div>
          )}
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
                key={tripKey(trip)}
                className={`planner-trip${selected === tripKey(trip) ? ' planner-trip--selected' : ''}`}
                onMouseEnter={() => onTripHover(trip)}
                onMouseLeave={() => onTripHover(null)}
                onFocus={() => onTripHover(trip)}
                onBlur={() => onTripHover(null)}
                onClick={() => {
                  setSelected(tripKey(trip));
                  onTripSelect(trip);
                }}
              >
                <strong>€{trip.price.toFixed(2)}</strong> · {formatDay(first.date)} → {formatDay(last.date)}
                <span className="planner-route">{routeText(trip, cityOf)}</span>
                <span className="planner-airlines">
                  {[...new Set(trip.legs.map((l) => airlineName(l.airline)))].join(' · ')}
                  {trip.legs.some((l) => l.estimated) && (
                    <span className="planner-estimated"> · includes estimated fares</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
