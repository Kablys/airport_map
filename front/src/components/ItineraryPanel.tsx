import type { Airline, Airport, DayFare, ItineraryItem, ItinerarySegment } from '../types.ts';
import {
  type BookableLeg,
  calculateFlightDuration,
  daysBetween,
  formatDay,
  formatFlightDuration,
  readableTextColor,
  ryanairBookingUrl,
} from '../utils.ts';
import { Icon } from './Icon.tsx';

interface ItineraryPanelProps {
  itinerary: ItineraryItem[];
  startDate: string;
  onStartDateChange: (date: string) => void;
  onNightsChange: (index: number, nights: number) => void;
  onClear: () => void;
  onSegmentHover: (segment: ItinerarySegment, highlight: boolean) => void;
  onSegmentClick: (segment: ItinerarySegment) => void;
}

const formatDuration = (minutes: number) => {
  const { hours, minutes: mins } = formatFlightDuration(minutes);
  return `${hours}h ${mins}m`;
};

export function AirlineChip({ airline }: { airline: Airline }) {
  const { primary, secondary } = airline.colors;
  return (
    <span
      className="airline-chip"
      style={{ background: primary, color: readableTextColor(primary), borderColor: secondary }}
    >
      {airline.name}
    </span>
  );
}

const euros = (price: number) => `€${price.toFixed(2)}`;
const RYANAIR = 'FR';

/** A dated leg Ryanair flies, ready for a booking link. */
function ryanairLeg(item: ItineraryItem | undefined): BookableLeg | undefined {
  if (item?.type !== 'flight' || !item.date || !item.airlines.some((a) => a.code === RYANAIR)) return;
  return { from: item.from.code, to: item.to.code, date: item.date };
}

/** Consecutive Ryanair legs in pairs: each pair is one Ryanair Multicity booking, a lone leg a one-way. */
function ryanairBookings(itinerary: ItineraryItem[]): BookableLeg[][] {
  const bookings: BookableLeg[][] = [];
  let run: BookableLeg[] = [];
  for (const item of itinerary) {
    const leg = ryanairLeg(item);
    if (leg) run.push(leg);
    if (run.length > 0 && (!leg || run.length === 2)) {
      bookings.push(run);
      run = [];
    }
  }
  if (run.length > 0) bookings.push(run);
  return bookings;
}

function BookLink({ legs, children }: { legs: BookableLeg[]; children: string }) {
  const [first, second] = legs;
  if (!first) return null;
  const route = legs.map((l) => `${l.from}→${l.to} ${formatDay(l.date)}`).join(', ');
  return (
    <a
      className="book-link"
      href={ryanairBookingUrl(first, second)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Book on Ryanair: ${route}`}
    >
      {children}
    </a>
  );
}
const time = (iso: string) => iso.slice(11, 16);

interface Stop {
  airport: Airport;
  /** Index of the leg that arrived here, whose `nights` is the stay. */
  arrivedBy?: number;
  next?: ItineraryItem;
}

/** One row per stop; `next` is the leg leaving that stop, if any. */
function toStops(itinerary: ItineraryItem[]): Stop[] {
  const stops: Stop[] = [];
  itinerary.forEach((item, index) => {
    const last = stops.at(-1);
    if (last?.airport.code === item.from.code) last.next = item;
    else stops.push({ airport: item.from, next: item });
    stops.push({ airport: item.to, arrivedBy: index });
  });
  return stops;
}

function nearbyHint(fare: DayFare | undefined) {
  return (
    fare && (
      <span className="fare-hint">
        {' '}
        · {euros(fare.price)} on {formatDay(fare.date)}
      </span>
    )
  );
}

function FlightText({ item }: { item: ItinerarySegment }) {
  const live = item.liveFare;
  if (!live) {
    return (
      <>
        ~€{item.priceData.price} • {item.distance}km • {formatDuration(calculateFlightDuration(item.distance))}
      </>
    );
  }
  const day = formatDay(live.date);
  if (live.status === 'loading') return <>{day} · checking fare…</>;
  if (live.status === 'error') return <>{day} · fare lookup failed</>;
  if (!live.fare) {
    return (
      <>
        {day} · <span className="no-flight">no flight</span>
        {nearbyHint(live.cheaperNearby) ?? <span className="fare-hint"> · none within ±3 days</span>}
      </>
    );
  }
  const { fare } = live;
  // Name the airline only when the chips show several
  const airline = item.airlines.length > 1 && item.airlines.find((a) => a.code === fare.airline)?.name;
  if (fare.estimated) {
    return (
      <>
        {day} · ~{euros(fare.price)}{' '}
        <span className="fare-hint">est.{airline && ` (${airline})`}, check the airline</span>
      </>
    );
  }
  return (
    <>
      {day} {fare.departure && time(fare.departure)}
      {fare.arrival && `→${time(fare.arrival)}`} · <strong>{euros(fare.price)}</strong>
      {airline && <span className="fare-hint"> {airline}</span>}
      {nearbyHint(live.cheaperNearby)}
    </>
  );
}

function Connection({
  item,
  onSegmentHover,
  onSegmentClick,
}: { item?: ItineraryItem } & Pick<ItineraryPanelProps, 'onSegmentHover' | 'onSegmentClick'>) {
  const leg = ryanairLeg(item);
  return (
    <div className="itinerary-row flight-connector-row">
      <div className="airport-column">
        <div className={`connector-line${item?.type === 'gap' ? ' connector-line--gap' : ''}`} />
      </div>
      <div className="flight-info-column">
        {item?.type === 'flight' && (
          <button
            type="button"
            className="flight-details"
            onMouseEnter={() => onSegmentHover(item, true)}
            onMouseLeave={() => onSegmentHover(item, false)}
            onFocus={() => onSegmentHover(item, true)}
            onBlur={() => onSegmentHover(item, false)}
            onClick={() => onSegmentClick(item)}
          >
            {item.airlines.map((airline) => (
              <AirlineChip key={airline.code} airline={airline} />
            ))}{' '}
            <FlightText item={item} />
          </button>
        )}
        {leg && <BookLink legs={[leg]}>Book ↗</BookLink>}
        {item?.type === 'gap' && (
          <div className="gap-details">
            <Icon name="alert" />
            No direct flight, find another way here
          </div>
        )}
      </div>
    </div>
  );
}

export function ItineraryPanel({
  itinerary,
  startDate,
  onStartDateChange,
  onNightsChange,
  onClear,
  onSegmentHover,
  onSegmentClick,
}: ItineraryPanelProps) {
  if (itinerary.length === 0) return null;

  const flights = itinerary.filter((item): item is ItinerarySegment => item.type === 'flight');
  const liveFares = flights.flatMap((f) => (f.liveFare?.status === 'found' && f.liveFare.fare) || []);
  const unpriced = flights.length - liveFares.length;
  const endDate = itinerary.at(-1)?.date;
  const totalDistance = flights.reduce((sum, f) => sum + f.distance, 0);
  const totalDuration = flights.reduce((sum, f) => sum + calculateFlightDuration(f.distance), 0);
  const stops = toStops(itinerary);
  const bookings = ryanairBookings(itinerary);

  return (
    <div id="itinerary-panel" className="itinerary-panel panel">
      <div className="panel-header">
        <h2>
          <Icon name="plane" /> Itinerary{' '}
          <span className="muted">
            {itinerary.length} {itinerary.length === 1 ? 'leg' : 'legs'}
          </span>
        </h2>
        <button
          type="button"
          className="icon-btn clear-itinerary-btn"
          title="Clear itinerary"
          aria-label="Clear itinerary"
          onClick={onClear}
        >
          <Icon name="x" />
        </button>
      </div>

      <label className="itinerary-dates">
        Depart <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        {startDate && endDate && (
          <span>
            {' '}
            → {formatDay(endDate)} ({daysBetween(startDate, endDate)} nights)
          </span>
        )}
      </label>

      <div className="itinerary-list">
        <div className="itinerary-vertical">
          {stops.map((stop, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: an airport can appear twice; position is the identity
            <div key={index}>
              <div className="itinerary-row">
                <div className="airport-column">
                  <div className="airport-code">{stop.airport.code}</div>
                </div>
                <div className="flight-info-column">
                  {index === 0 && <div className="departure-label">Departure</div>}
                  {stop.arrivedBy !== undefined && stop.next && (
                    <label className="nights-input">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={itinerary[stop.arrivedBy]?.nights ?? 0}
                        onChange={(e) => onNightsChange(stop.arrivedBy ?? 0, Math.max(0, e.target.valueAsNumber || 0))}
                      />{' '}
                      nights in {stop.airport.city}
                    </label>
                  )}
                </div>
              </div>
              {index < stops.length - 1 && (
                <Connection item={stop.next} onSegmentHover={onSegmentHover} onSegmentClick={onSegmentClick} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="itinerary-stats">
        <div className="itinerary-totals">
          {startDate ? (
            <div>
              <span>Price:</span>{' '}
              <strong>
                {euros(liveFares.reduce((sum, f) => sum + f.price, 0))}
                {unpriced > 0 && ` + ${unpriced} unpriced`}
                {liveFares.some((f) => f.estimated) && ' (incl. estimates)'}
              </strong>
            </div>
          ) : (
            <div>
              <span>Est. price:</span> <strong>€{flights.reduce((sum, f) => sum + f.priceData.price, 0)}</strong>
            </div>
          )}
          <div>
            <span>Distance:</span> <strong>{totalDistance} km</strong>
          </div>
          <div>
            <span>Flight time:</span> <strong>{formatDuration(totalDuration)}</strong>
          </div>
          <div>
            <span>Flights:</span> <strong>{flights.length}</strong>
          </div>
        </div>
        {bookings.length > 0 && (
          <div className="itinerary-bookings">
            <strong>Book on Ryanair</strong> <span className="fare-hint">· Multicity takes 2 flights per booking</span>
            <div className="itinerary-booking-links">
              {bookings.map((legs) => (
                <BookLink key={legs.map((l) => l.from + l.date).join()} legs={legs}>
                  {`${legs.map((l) => `${l.from}→${l.to}`).join(', ')} ↗`}
                </BookLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
