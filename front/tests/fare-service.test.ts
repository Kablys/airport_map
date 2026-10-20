import { describe, expect, it } from 'bun:test';
import { createFareBook, type FareCalendar, type PrefetchedFares } from '../src/services/fare-service.ts';

const ryanairDay = (date: string, price: number) => ({ date, price, airline: 'FR', estimated: false });
const ryanair = new Map<string, FareCalendar>([
  ['VNO-BGY-2026-11', new Map([['2026-11-05', ryanairDay('2026-11-05', 30)]])],
]);
const wizz: PrefetchedFares = {
  fetched: '2026-10-16',
  from: '2026-10-17',
  to: '2026-11-30',
  routes: { 'VNO-BGY': { '2026-11-05': [25, '06:10'] } },
};
const book = createFareBook(ryanair, wizz, () => 10);

describe('createFareBook', () => {
  it('picks the cheapest real fare among the airlines', () => {
    expect(book.quote('VNO', 'BGY', '2026-11-05', ['FR', 'W6'])).toMatchObject({ price: 25, airline: 'W6' });
    expect(book.quote('VNO', 'BGY', '2026-11-05', ['FR'])).toMatchObject({ price: 30, airline: 'FR' });
  });

  it('prefers a real fare over a cheaper estimate', () => {
    expect(book.quote('VNO', 'BGY', '2026-11-05', ['VY', 'FR'])).toMatchObject({ price: 30, estimated: false });
  });

  it('treats a day missing from loaded data as no flight', () => {
    expect(book.quote('VNO', 'BGY', '2026-11-06', ['FR', 'W6'])).toBeUndefined();
  });

  it('estimates airlines and days without data', () => {
    expect(book.quote('VNO', 'BGY', '2026-11-06', ['FR', 'V7'])).toMatchObject({ airline: 'V7', estimated: true });
    expect(book.quote('VNO', 'BGY', '2026-12-05', ['W6'])).toMatchObject({ airline: 'W6', estimated: true });
    expect(book.wizzFetched).toBe('2026-10-16');
  });
});

describe('createFareBook with schedules', () => {
  // easyJet LGW→BCN flies Mondays and Fridays in November 2026, nothing listed for December
  const scheduled = createFareBook(new Map(), undefined, () => 50, { U2: { 'LGW-BCN': { '2026-11': '15' } } });

  it('estimates only on scheduled weekdays', () => {
    expect(scheduled.quote('LGW', 'BCN', '2026-11-02', ['U2'])?.price).toBe(50); // Monday
    expect(scheduled.quote('LGW', 'BCN', '2026-11-03', ['U2'])).toBeUndefined(); // Tuesday
  });

  it('assumes daily flights beyond the schedule or without one', () => {
    expect(scheduled.quote('LGW', 'BCN', '2026-12-01', ['U2'])?.estimated).toBe(true);
    expect(scheduled.quote('BCN', 'LGW', '2026-11-03', ['U2'])?.estimated).toBe(true);
  });
});
