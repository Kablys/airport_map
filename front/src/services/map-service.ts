import L from 'leaflet';

export const tileProviders = {
  openstreetmap: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17,
  },
  dark: {
    name: 'Dark Mode',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 16,
  },
  light: {
    name: 'Light Mode',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors',
    maxZoom: 16,
  },
} as const;

export type TileProviderKey = keyof typeof tileProviders;

export const isTileProviderKey = (key: string): key is TileProviderKey => key in tileProviders;

export function createTileLayer(key: TileProviderKey): L.TileLayer {
  const { url, attribution, maxZoom } = tileProviders[key];
  return L.tileLayer(url, { attribution, maxZoom });
}
