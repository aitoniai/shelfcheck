// ISO code → name, approximate geographic centre and local currency.
// shortcut: hand-picked list (Europe + common food-exporting countries), extend when an origin shows as "unknown".
const C = (name, lat, lon, currency = 'EUR', aliases = []) => ({ name, lat, lon, currency, aliases });

export const COUNTRIES = {
  // Shopping countries (EU, UK and neighbours)
  DE: C('Germany', 51.2, 10.4, 'EUR', ['deutschland', 'allemagne']),
  AT: C('Austria', 47.6, 14.1, 'EUR', ['österreich', 'oesterreich']),
  BE: C('Belgium', 50.6, 4.6),
  BG: C('Bulgaria', 42.7, 25.3),
  HR: C('Croatia', 45.1, 15.2),
  CY: C('Cyprus', 35.0, 33.2),
  CZ: C('Czechia', 49.8, 15.5, 'CZK', ['czech-republic', 'tschechien']),
  DK: C('Denmark', 56.0, 10.0, 'DKK', ['dänemark']),
  EE: C('Estonia', 58.7, 25.5),
  FI: C('Finland', 64.5, 26.0),
  FR: C('France', 46.6, 2.4, 'EUR', ['frankreich']),
  GR: C('Greece', 39.1, 22.0, 'EUR', ['griechenland']),
  HU: C('Hungary', 47.2, 19.4, 'HUF', ['ungarn']),
  IE: C('Ireland', 53.2, -8.2, 'EUR', ['irland']),
  IT: C('Italy', 42.8, 12.6, 'EUR', ['italien']),
  LV: C('Latvia', 56.9, 24.6),
  LT: C('Lithuania', 55.2, 23.9),
  LU: C('Luxembourg', 49.8, 6.1),
  MT: C('Malta', 35.9, 14.4),
  NL: C('Netherlands', 52.2, 5.5, 'EUR', ['niederlande', 'holland']),
  PL: C('Poland', 52.1, 19.4, 'PLN', ['polen']),
  PT: C('Portugal', 39.6, -8.0),
  RO: C('Romania', 45.9, 25.0, 'RON', ['rumänien']),
  SK: C('Slovakia', 48.7, 19.7),
  SI: C('Slovenia', 46.1, 14.8),
  ES: C('Spain', 40.2, -3.6, 'EUR', ['spanien']),
  SE: C('Sweden', 62.0, 15.0, 'SEK', ['schweden']),
  GB: C('United Kingdom', 54.0, -2.5, 'GBP', ['uk', 'great-britain', 'england', 'scotland', 'wales', 'northern-ireland', 'großbritannien']),
  CH: C('Switzerland', 46.8, 8.2, 'CHF', ['schweiz']),
  NO: C('Norway', 61.0, 9.0, 'NOK', ['norwegen']),
  // Common origins outside Europe
  US: C('United States', 39.8, -98.6, 'USD', ['usa', 'united-states-of-america']),
  CA: C('Canada', 56.1, -106.3, 'CAD'),
  MX: C('Mexico', 23.6, -102.6, 'MXN'),
  CR: C('Costa Rica', 9.9, -84.2, 'CRC'),
  CO: C('Colombia', 4.6, -74.1, 'COP'),
  EC: C('Ecuador', -1.8, -78.2, 'USD'),
  PE: C('Peru', -9.2, -75.0, 'PEN'),
  BR: C('Brazil', -10.8, -52.9, 'BRL', ['brasilien']),
  CL: C('Chile', -35.7, -71.5, 'CLP'),
  AR: C('Argentina', -38.4, -63.6, 'ARS', ['argentinien']),
  UY: C('Uruguay', -32.5, -55.8, 'UYU'),
  MA: C('Morocco', 31.8, -7.1, 'MAD', ['marokko']),
  TN: C('Tunisia', 34.0, 9.5, 'TND', ['tunesien']),
  EG: C('Egypt', 26.8, 30.8, 'EGP', ['ägypten']),
  CI: C("Côte d'Ivoire", 7.5, -5.5, 'XOF', ['ivory-coast', 'cote-d-ivoire']),
  GH: C('Ghana', 7.9, -1.0, 'GHS'),
  KE: C('Kenya', 0.0, 37.9, 'KES'),
  ZA: C('South Africa', -30.6, 22.9, 'ZAR', ['südafrika']),
  TR: C('Turkey', 39.0, 35.2, 'TRY', ['türkei', 'turkiye']),
  IL: C('Israel', 31.0, 34.9, 'ILS'),
  UA: C('Ukraine', 48.4, 31.2, 'UAH'),
  RS: C('Serbia', 44.0, 21.0, 'RSD'),
  IN: C('India', 20.6, 79.0, 'INR', ['indien']),
  PK: C('Pakistan', 30.4, 69.3, 'PKR'),
  LK: C('Sri Lanka', 7.9, 80.8, 'LKR'),
  CN: C('China', 35.9, 104.2, 'CNY'),
  TH: C('Thailand', 15.9, 101.0, 'THB'),
  VN: C('Vietnam', 14.1, 108.3, 'VND', ['viet-nam']),
  ID: C('Indonesia', -0.8, 113.9, 'IDR', ['indonesien']),
  MY: C('Malaysia', 4.2, 102.0, 'MYR'),
  PH: C('Philippines', 12.9, 121.8, 'PHP'),
  JP: C('Japan', 36.2, 138.3, 'JPY'),
  AU: C('Australia', -25.3, 133.8, 'AUD', ['australien']),
  NZ: C('New Zealand', -40.9, 174.9, 'NZD', ['neuseeland']),
};

// Countries offered in Settings as "where I shop".
export const SHOP_COUNTRIES = ['DE', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'];

const slug = (s) => s.toLowerCase().normalize('NFC').trim().replace(/[\s_']+/g, '-');

const LOOKUP = new Map();
for (const [code, c] of Object.entries(COUNTRIES)) {
  for (const key of [code.toLowerCase(), slug(c.name), ...c.aliases]) LOOKUP.set(key, code);
}

/** "en:germany", "Germany", "DE", "uk", "Deutschland" → ISO code, or null if unknown. */
export function toCountryCode(value) {
  if (!value) return null;
  const s = slug(String(value).replace(/^[a-z]{2}:/i, ''));
  return LOOKUP.get(s) ?? null;
}
