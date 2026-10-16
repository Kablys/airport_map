import type { Airport, DayFare, ItineraryItem, ItinerarySegment } from '../types.ts';
import { calculateFlightDuration, daysBetween, formatDay, formatFlightDuration } from '../utils.ts';

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

const euros = (price: number) => `€${price.toFixed(2)}`;
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
  return (
    <>
      {day} {time(live.fare.departure)}→{time(live.fare.arrival)} · <strong>{euros(live.fare.price)}</strong>
      {nearbyHint(live.cheaperNearby)}
    </>
  );
}

function Connection({
  item,
  onSegmentHover,
  onSegmentClick,
}: { item?: ItineraryItem } & Pick<ItineraryPanelProps, 'onSegmentHover' | 'onSegmentClick'>) {
  return (
    <div className="itinerary-row flight-connector-row">
      <div className="airport-column">
        <div className={`connector-line${item?.type === 'gap' ? ' gap-connector' : ''}`}>
          {item?.type === 'gap' ? '⚡' : '|'}
        </div>
      </div>
      <div className="flight-info-column">
        {item?.type === 'flight' && (
          <button
            type="button"
            className="flight-details clickable"
            onMouseEnter={() => onSegmentHover(item, true)}
            onMouseLeave={() => onSegmentHover(item, false)}
            onFocus={() => onSegmentHover(item, true)}
            onBlur={() => onSegmentHover(item, false)}
            onClick={() => onSegmentClick(item)}
          >
            <FlightText item={item} />
          </button>
        )}
        {item?.type === 'gap' && (
          <div className="gap-details">
            <span className="gap-icon">✈️ ⚡ 🚌</span>
            <span className="gap-text">Alternative transport needed</span>
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

  return (
    <div id="itinerary-panel" className="itinerary-panel">
      <div className="itinerary-header">
        <h4>🛫 Your Itinerary ({itinerary.length} items)</h4>
        <button
          type="button"
          className="clear-itinerary-btn"
          title="Clear itinerary"
          aria-label="Clear itinerary"
          onClick={onClear}
        >
          ✕
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
              <strong>Total price:</strong> {euros(liveFares.reduce((sum, f) => sum + f.price, 0))}
              {unpriced > 0 && ` + ${unpriced} unpriced`}
            </div>
          ) : (
            <div>
              <strong>Est. total price:</strong> €{flights.reduce((sum, f) => sum + f.priceData.price, 0)}
            </div>
          )}
          <div>
            <strong>Total Distance:</strong> {totalDistance}km
          </div>
          <div>
            <strong>Total Flight Time:</strong> {formatDuration(totalDuration)}
          </div>
          <div>
            <strong>Flight Segments:</strong> {flights.length}
          </div>
        </div>
      </div>
    </div>
  );
}
