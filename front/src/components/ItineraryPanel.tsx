import type { Airline, Airport, ItineraryItem, ItinerarySegment } from '../types.ts';
import { calculateFlightDuration, formatFlightDuration, readableTextColor } from '../utils.ts';

interface ItineraryPanelProps {
  itinerary: ItineraryItem[];
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

/** One row per stop; `next` is the leg leaving that stop, if any. */
function toStops(itinerary: ItineraryItem[]): { airport: Airport; next?: ItineraryItem }[] {
  const stops: { airport: Airport; next?: ItineraryItem }[] = [];
  for (const item of itinerary) {
    const last = stops.at(-1);
    if (last?.airport.code === item.from.code) last.next = item;
    else stops.push({ airport: item.from, next: item });
    stops.push({ airport: item.to });
  }
  return stops;
}

function Connection({
  item,
  onSegmentHover,
  onSegmentClick,
}: { item?: ItineraryItem } & Omit<ItineraryPanelProps, 'itinerary' | 'onClear'>) {
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
            {item.airlines.map((airline) => (
              <AirlineChip key={airline.code} airline={airline} />
            ))}{' '}
            ~€{item.priceData.price} • {item.distance}km • {formatDuration(calculateFlightDuration(item.distance))}
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

export function ItineraryPanel({ itinerary, onClear, onSegmentHover, onSegmentClick }: ItineraryPanelProps) {
  if (itinerary.length === 0) return null;

  const flights = itinerary.filter((item): item is ItinerarySegment => item.type === 'flight');
  const totalPrice = flights.reduce((sum, f) => sum + f.priceData.price, 0);
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
          <div>
            <strong>Est. total price:</strong> €{totalPrice}
          </div>
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
