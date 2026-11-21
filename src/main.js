import sections from './sections/index.js';
import { runSections, renderReport } from './report.js';
import { fetchProduct, normalise } from './sources/openfoodfacts.js';
import { fetchPrices } from './sources/openprices.js';
import { readLabel, photoToBase64 } from './sources/label.js';
import { createAi } from './services/ai.js';
import { canScan, startScan } from './scanner.js';
import { getSettings, saveSettings, getHistory, saveScan, getLabel, saveLabel } from './store.js';
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
  $('label-panel').hidden = true;
  let product = null, offError = null;
  try {
    product = await fetchProduct(code);
  } catch (err) {
    offError = err;
  }
  // A freshly added Open Food Facts entry can be empty; treat it like a missing one.
  if (product && !product.brand && !product.ingredients.length && product.nutriments.energyKcal === null && product.name === 'Unknown product') product = null;
  const saved = product ? null : getLabel(code);
  if (saved) product = normalise(saved, code);
  if (!product) {
    if (offError) return setStatus(`Couldn't reach Open Food Facts: ${offError.message}`);
    return showLabelPanel(code);
  }

  setStatus('');
  const img = $('product-img');
  img.hidden = !product.imageUrl;
  img.onerror = () => { img.hidden = true; };
  img.src = product.imageUrl ?? '';
  $('product-name').textContent = product.name;
  $('product-brand').textContent = [
    product.brand,
    product.size && `${product.size.amount} ${product.size.unit}`,
    product.source === 'label' && 'read from your label photos by AI',
  ].filter(Boolean).join(' · ');
  $('product').hidden = false;

  const input = { ...(getHistory()[code]?.input ?? {}) };
  if (!input.stages && product.labelStages) input.stages = product.labelStages;
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

// ---- Not in Open Food Facts: read the label with AI ----
let labelCode = null, labelPhotos = [];

function showLabelPanel(code) {
  labelCode = code;
  labelPhotos = [];
  const hasKey = !!getSettings().apiKey;
  setStatus(`Open Food Facts has no details for barcode ${code} yet.`);
  $('label-help').textContent = hasKey
    ? 'Take photos of the front, the ingredients, the nutrition table and any origin text or oval mark (e.g. "DE NW-12345 EG").'
    : 'To read the label with AI, add your Claude API key in Settings first.';
  $('label-add').hidden = !hasKey;
  $('label-count').textContent = '';
  $('label-read').disabled = true;
  $('label-read').hidden = !hasKey;
  $('off-add').href = `https://world.openfoodfacts.org/cgi/product.pl?type=search_or_add&action=process&code=${encodeURIComponent(code)}`;
  $('label-panel').hidden = false;
}

$('label-photo').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = ''; // let the same button take another photo
  for (const f of files) labelPhotos.push(await photoToBase64(f));
  $('label-count').textContent = `${labelPhotos.length} photo${labelPhotos.length === 1 ? '' : 's'} ready`;
  $('label-read').disabled = labelPhotos.length === 0;
});

$('label-read').addEventListener('click', async () => {
  const code = labelCode;
  $('label-read').disabled = true;
  setStatus('Reading the label… this can take up to a minute.');
  try {
    const raw = await readLabel(createAi(getSettings()), code, labelPhotos);
    if (!raw.product_name && !raw.ingredients.length) throw new Error("couldn't read a product from these photos. Try sharper, closer photos.");
    saveLabel(code, raw);
    openProduct(code);
  } catch (err) {
    setStatus(`Label reading failed: ${err.message}`);
    $('label-read').disabled = false;
  }
});

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
