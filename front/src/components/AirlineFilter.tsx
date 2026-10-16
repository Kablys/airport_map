import { useState } from 'react';
import type { Airline } from '../types.ts';

interface AirlineFilterProps {
  airlines: Airline[];
  onChange: (enabled: Set<string>) => void;
}

export function AirlineFilter({ airlines, onChange }: AirlineFilterProps) {
  const [enabled, setEnabled] = useState(() => new Set(airlines.map((a) => a.code)));

  const toggle = (code: string) => {
    const next = new Set(enabled);
    if (!next.delete(code)) next.add(code);
    setEnabled(next);
    onChange(next);
  };

  return (
    <fieldset className="ui-panel airline-filter">
      <legend>Airlines</legend>
      {airlines.map((airline) => (
        <label key={airline.code}>
          <input type="checkbox" checked={enabled.has(airline.code)} onChange={() => toggle(airline.code)} />
          {airline.name}
        </label>
      ))}
    </fieldset>
  );
}
