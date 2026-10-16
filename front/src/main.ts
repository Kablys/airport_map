import 'leaflet/dist/leaflet.css';
import '../assets/styles.css';
import { ryanairAirports, ryanairRoutes } from './data.ts';
import { initializeMap } from './map.ts';

const container = document.getElementById('map');
if (!container) throw new Error('#map element missing from index.html');
const map = initializeMap(container, ryanairAirports, ryanairRoutes);

// Deep links: ?airport=STN or ?lat=..&lng=..
const params = new URLSearchParams(window.location.search);
const airport = ryanairAirports.find((a) => a.code === params.get('airport')?.toUpperCase());
const lat = Number.parseFloat(params.get('lat') ?? '');
const lng = Number.parseFloat(params.get('lng') ?? '');
if (airport) map.setView([airport.lat, airport.lng], 10);
else if (Number.isFinite(lat) && Number.isFinite(lng)) map.setView([lat, lng], 10);
