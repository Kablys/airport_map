import { useEffect, useState } from 'react';
import { isTileProviderKey, type TileProviderKey, tileProviders } from '../services/map-service.ts';
import { Icon } from './Icon.tsx';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
export const systemTileProvider = (): TileProviderKey => (darkQuery.matches ? 'dark' : 'light');

export function TileSelector({ onTileChange }: { onTileChange: (key: TileProviderKey) => void }) {
  const [selected, setSelected] = useState<TileProviderKey>(systemTileProvider);

  const select = (key: TileProviderKey) => {
    setSelected(key);
    onTileChange(key);
  };

  // Follow the system color scheme until the user picks a non-themed style
  useEffect(() => {
    if (selected !== 'dark' && selected !== 'light') return;
    const onChange = () => {
      setSelected(systemTileProvider());
      onTileChange(systemTileProvider());
    };
    darkQuery.addEventListener('change', onChange);
    return () => darkQuery.removeEventListener('change', onChange);
  }, [selected, onTileChange]);

  return (
    <label className="tile-selector-row">
      <Icon name="layers" />
      <select
        id="tile-selector"
        aria-label="Map style"
        value={selected}
        onChange={(e) => isTileProviderKey(e.target.value) && select(e.target.value)}
      >
        {Object.entries(tileProviders).map(([key, provider]) => (
          <option key={key} value={key}>
            {provider.name}
          </option>
        ))}
      </select>
    </label>
  );
}
