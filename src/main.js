import sections from './sections/index.js';
import { runSections, renderReport } from './report.js';
import { fetchProduct } from './sources/openfoodfacts.js';
import { fetchPrices } from './sources/openprices.js';
import { createAi } from './services/ai.js';
import { canScan, startScan } from './scanner.js';
import { getSettings, saveSettings, getHistory, saveScan } from './store.js';
import { COUNTRIES, SHOP_COUNTRIES } from './geo/countries.js';

const $ = (id) => document.getElementById(id);
let scanning = null;

// ---- Navigation ----
function show(view) {
  for (const v of ['scan', 'history', 'settings']) {
    $(`view-${v}`).hidden = v !== view;
    $(`tab-${v}`).setAttribute('aria-current', v === view ? 'page' : 'false');
  }
  if (view === 'history') renderHistory();
  if (view !== 'scan') stopScan();
}
for (const v of ['scan', 'history', 'settings']) $(`tab-${v}`).addEventListener('click', () => show(v));

// ---- Scanning ----
function stopScan() {
  scanning?.stop();
  scanning = null;
  $('camera').hidden = true;
  $('scan-btn').textContent = 'Scan barcode';
}

$('scan-btn').hidden = !canScan();
$('scan-btn').addEventListener('click', async () => {
  if (scanning) return stopScan();
  $('camera').hidden = false;
  $('scan-btn').textContent = 'Stop';
  scanning = startScan($('camera'));
  try {
    const code = await scanning.result;
    if (code) openProduct(code);
  } catch (err) {
    setStatus(`Camera unavailable: ${err.message}. Type the barcode instead.`);
  } finally {
    stopScan();
  }
});

$('manual-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('manual-code').value.replace(/\D/g, '');
  if (code.length >= 8) openProduct(code);
  else setStatus('A barcode has at least 8 digits.');
});

const setStatus = (text) => { $('status').textContent = text; };

// ---- Report ----
async function openProduct(code) {
  show('scan');
  setStatus('Looking up product…');
  $('product').hidden = true;
  $('report').replaceChildren();
  let product;
  try {
    product = await fetchProduct(code);
  } catch (err) {
    return setStatus(`Couldn't reach Open Food Facts: ${err.message}`);
  }
  if (!product) return setStatus(`Barcode ${code} isn't in Open Food Facts yet. You can add it at openfoodfacts.org.`);

  setStatus('');
  const img = $('product-img');
  img.hidden = !product.imageUrl;
  img.onerror = () => { img.hidden = true; };
  img.src = product.imageUrl ?? '';
  $('product-name').textContent = product.name;
  $('product-brand').textContent = [product.brand, product.size && `${product.size.amount} ${product.size.unit}`].filter(Boolean).join(' · ');
  $('product').hidden = false;

  const input = { ...(getHistory()[code]?.input ?? {}) };
  const refresh = async () => {
    const settings = getSettings();
    const ctx = {
      product, settings, input, history: getHistory(),
      services: { prices: fetchPrices, ai: createAi(settings) },
    };
    const results = await runSections(sections, ctx);
    renderReport($('report'), results, input, (key, value) => { input[key] = value; refresh(); });
    saveScan(product, input, Object.assign({}, ...results.map((r) => r.result?.remember ?? {})));
  };
  await refresh();
}

// ---- History ----
function renderHistory() {
  const items = Object.entries(getHistory()).sort(([, a], [, b]) => b.scannedAt.localeCompare(a.scannedAt));
  $('history-list').replaceChildren(...items.map(([code, h]) => {
    const btn = Object.assign(document.createElement('button'), { className: 'history-item', textContent: h.name });
    btn.append(Object.assign(document.createElement('small'), { textContent: new Date(h.scannedAt).toLocaleDateString() }));
    btn.addEventListener('click', () => openProduct(code));
    const li = document.createElement('li');
    li.append(btn);
    return li;
  }));
  $('history-empty').hidden = items.length > 0;
}

// ---- Settings ----
const form = $('settings-form');
form.country.append(...SHOP_COUNTRIES.map((c) => new Option(COUNTRIES[c].name, c)));
const s = getSettings();
for (const k of ['country', 'units', 'apiKey', 'model']) form[k].value = s[k];
form.addEventListener('submit', (e) => {
  e.preventDefault();
  saveSettings(Object.fromEntries(new FormData(form)));
  $('settings-saved').hidden = false;
  setTimeout(() => { $('settings-saved').hidden = true; }, 2000);
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
