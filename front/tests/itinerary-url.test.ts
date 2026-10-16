import { describe, expect, it } from 'bun:test';
import { itineraryFromSearch, itineraryToSearch } from '../src/itinerary-url.ts';

const trip = {
  legs: [
    ['VNO', 'DUB'],
    ['DUB', 'TFS'],
    ['TFS', 'VNO'],
  ] as [string, string][],
  start: '2026-11-13',
  nights: [2, 5],
};

describe('itinerary in the URL', () => {
  it('writes a readable query and reads it back', () => {
    const search = itineraryToSearch(trip, '');
    expect(search).toBe('?legs=VNO-DUB,DUB-TFS,TFS-VNO&start=2026-11-13&nights=2,5');
    expect(itineraryFromSearch(search)).toEqual(trip);
  });

  it('keeps other params and removes the itinerary when it is empty', () => {
    const search = itineraryToSearch(trip, '?airport=STN');
    expect(new URLSearchParams(search).get('airport')).toBe('STN');
    expect(itineraryToSearch({ legs: [], start: '', nights: [] }, search)).toBe('?airport=STN');
    expect(itineraryToSearch({ legs: [], start: '', nights: [] }, '?legs=VNO-DUB')).toBe('');
  });

  it('reads an undated itinerary without nights', () => {
    expect(itineraryFromSearch('?legs=VNO-DUB')).toEqual({ legs: [['VNO', 'DUB']], start: '', nights: [] });
  });

  it('ignores malformed input', () => {
    expect(itineraryFromSearch('')).toBeUndefined();
    expect(itineraryFromSearch('?legs=VNO-DUB,<script>')).toBeUndefined();
    expect(itineraryFromSearch('?legs=VNO-DUB&start=soon&nights=-1')).toEqual({
      legs: [['VNO', 'DUB']],
      start: '',
      nights: [0],
    });
  });
});
