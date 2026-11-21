import { toCountryCode } from '../geo/countries.js';

const API = 'https://world.openfoodfacts.org/api/v2/product/';

/** Fetch a product by barcode. Returns a normalised Product, or null if Open Food Facts doesn't know it. */
export async function fetchProduct(barcode, lang = 'en') {
  const res = await fetch(`${API}${encodeURIComponent(barcode)}.json?lc=${lang}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts error ${res.status}`);
  const json = await res.json();
  return json.status !== 0 && json.product ? normalise(json.product, barcode) : null;
}

const num = (v) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v));
const grade = (g) => (/^(a-plus|[a-f])$/.test(g ?? '') ? g : null);

/** Pack size. Open Food Facts already normalises product_quantity to grams or millilitres. */
function packSize(p) {
  const amount = num(p.product_quantity);
  if (!amount) return null;
  return { amount, unit: String(p.product_quantity_unit).toLowerCase() === 'ml' ? 'ml' : 'g' };
}

/** EU packer/health mark ("DE NW-20001 EG", "UK AB123 EC", French "EMB 12345") → country code. */
export function packerCountry(embTags = []) {
  for (const tag of embTags) {
    if (/^emb-/i.test(tag)) return 'FR';
    const code = toCountryCode(tag.split('-')[0]);
    if (code) return code;
  }
  return null;
}

// UK/EU front-of-pack thresholds per 100 g: [low up to, high above]. Same ones Open Food Facts uses.
const LEVELS = { fat: [3, 17.5], 'saturated-fat': [1.5, 5], sugars: [5, 22.5], salt: [0.3, 1.5] };

/** Traffic-light levels from per-100 g values, for products that don't come with them (e.g. read from a label). */
export function nutrientLevels(n) {
  const out = {};
  for (const [key, [low, high]] of Object.entries(LEVELS)) {
    const v = num(n[`${key}_100g`]);
    if (v !== null) out[key] = v <= low ? 'low' : v > high ? 'high' : 'moderate';
  }
  return out;
}

/** Convert a raw Open Food Facts product into the app's Product shape. Sections only read this shape. */
export function normalise(p, barcode = p.code) {
  const env = p.environmental_score_data ?? p.ecoscore_data ?? {};
  const agri = env.agribalyse ?? {};
  const n = p.nutriments ?? {};
  const origins = [...new Set((p.origins_tags ?? []).map(toCountryCode).filter(Boolean))];
  return {
    code: barcode,
    name: p.product_name || p.generic_name || 'Unknown product',
    brand: p.brands ?? '',
    imageUrl: p.image_front_small_url ?? p.image_small_url ?? null,
    size: packSize(p),
    ingredients: (p.ingredients ?? []).map((i) => ({
      id: i.id ?? '',
      text: i.text ?? '',
      percent: num(i.percent),
      estimate: num(i.percent_estimate),
    })),
    nutriments: {
      energyKcal: num(n['energy-kcal_100g']),
      fat: num(n.fat_100g),
      saturatedFat: num(n['saturated-fat_100g']),
      sugars: num(n.sugars_100g),
      salt: num(n.salt_100g),
      protein: num(n.proteins_100g),
      fiber: num(n.fiber_100g),
    },
    nutrientLevels: p.nutrient_levels ?? nutrientLevels(n),
    nova: num(p.nova_group),
    nutriscore: grade(p.nutriscore_grade),
    ecoGrade: grade(p.environmental_score_grade ?? p.ecoscore_grade),
    co2PerKg: num(agri.co2_total),
    co2Breakdown: {
      farming: num(agri.co2_agriculture),
      processing: num(agri.co2_processing),
      packaging: num(agri.co2_packaging),
      transport: num(agri.co2_transportation),
      shop: num(agri.co2_distribution),
    },
    origins,
    originsUnknown: (p.origins_tags ?? []).filter((t) => !toCountryCode(t)),
    packerCountry: packerCountry(p.emb_codes_tags),
    packerCode: p.emb_codes || null,
    manufacturingPlaces: p.manufacturing_places || null,
    categories: p.categories_tags ?? [],
    additives: (p.additives_tags ?? []).map((t) => t.replace(/^en:/, '').toUpperCase()),
    source: p.source ?? 'openfoodfacts', // 'label' = read from your photos by AI
    labelStages: p.label_stages ?? '',
  };
}
