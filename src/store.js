// Settings and scan history, kept on this phone only.
const DEFAULTS = { country: 'DE', units: 'km', apiKey: '', model: 'claude-opus-5-5' };

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode / storage full: app still works, just forgets */ }
}

export const getSettings = () => ({ ...DEFAULTS, ...read('pf.settings', {}) });
export const saveSettings = (s) => write('pf.settings', s);

/** History: { [barcode]: { name, categories, scannedAt, input: {...}, pricePerKg } } */
export const getHistory = () => read('pf.history', {});

export function saveScan(product, input, extra = {}) {
  const history = getHistory();
  history[product.code] = { name: product.name, categories: product.categories, scannedAt: new Date().toISOString(), input, ...extra };
  write('pf.history', history);
}
