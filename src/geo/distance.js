import { COUNTRIES } from './countries.js';

const EARTH_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in km between two ISO country codes (centre to centre). */
export function countryDistanceKm(a, b) {
  const p = COUNTRIES[a], q = COUNTRIES[b];
  if (!p || !q) return null;
  const h = Math.sin(rad(q.lat - p.lat) / 2) ** 2 +
    Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(rad(q.lon - p.lon) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Sum of legs along a chain of country codes; same-country legs count as 0. */
export function chainDistanceKm(codes) {
  let total = 0;
  for (let i = 1; i < codes.length; i++) total += countryDistanceKm(codes[i - 1], codes[i]) ?? 0;
  return total;
}

export const formatDistance = (km, units) =>
  units === 'miles' ? `${Math.round(km * 0.621371).toLocaleString()} miles` : `${Math.round(km).toLocaleString()} km`;
