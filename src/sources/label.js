// Fallback source: Claude reads photos of the pack and returns data in Open Food Facts' raw shape,
// so normalise() and every report section work unchanged.
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const num = nullable({ type: 'number' });
const str = nullable({ type: 'string' });

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['product_name', 'brands', 'quantity_amount', 'quantity_unit', 'ingredients', 'nutriments', 'origins', 'packer_code', 'stages', 'nova_group'],
  properties: {
    product_name: str,
    brands: str,
    quantity_amount: num,
    quantity_unit: nullable({ type: 'string', enum: ['g', 'ml'] }),
    ingredients: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['text', 'percent'], properties: { text: { type: 'string' }, percent: num } },
    },
    nutriments: {
      type: 'object',
      additionalProperties: false,
      required: ['energy_kcal', 'fat', 'saturated_fat', 'sugars', 'salt', 'proteins', 'fiber'],
      properties: { energy_kcal: num, fat: num, saturated_fat: num, sugars: num, salt: num, proteins: num, fiber: num },
    },
    origins: { type: 'array', items: { type: 'string' } },
    packer_code: str,
    stages: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['label', 'country'], properties: { label: { type: 'string' }, country: { type: 'string' } } },
    },
    nova_group: nullable({ type: 'integer', enum: [1, 2, 3, 4] }),
  },
};

const PROMPT = `These photos show one supermarket food product (front, ingredients, nutrition table, origin text).
Read only what is printed; use null or an empty list for anything not visible. Keep the product's own language for names and ingredients.
- quantity_amount/quantity_unit: net quantity converted to grams or millilitres (e.g. "1 l" → 1000 ml).
- ingredients: top-level ingredients in label order, with the % only if printed.
- nutriments: per 100 g/ml.
- origins: English country names of the product or main ingredient (e.g. "Herkunft: Spanien" → "Spain").
- packer_code: the oval health mark exactly as printed, e.g. "DE NW-12345 EG".
- stages: origin stages printed on meat or fish, e.g. "Geboren in: Deutschland" → {label:"Born", country:"Germany"}; also "Reared", "Slaughtered", "Caught in", "Packed".
- nova_group: your estimate of the NOVA processing group from the ingredients (1 unprocessed … 4 ultra-processed), or null if no ingredients are visible.`;

/** Map Claude's answer onto the raw Open Food Facts fields that normalise() reads. */
export function toRawProduct(out, code) {
  const n = out.nutriments ?? {};
  return {
    code,
    product_name: out.product_name ?? '',
    brands: out.brands ?? '',
    product_quantity: out.quantity_amount,
    product_quantity_unit: out.quantity_unit ?? 'g',
    ingredients: (out.ingredients ?? []).map((i) => ({ text: i.text, percent: i.percent, percent_estimate: i.percent })),
    nutriments: {
      'energy-kcal_100g': n.energy_kcal, fat_100g: n.fat, 'saturated-fat_100g': n.saturated_fat,
      sugars_100g: n.sugars, salt_100g: n.salt, proteins_100g: n.proteins, fiber_100g: n.fiber,
    },
    nova_group: out.nova_group,
    origins_tags: out.origins ?? [],
    emb_codes: out.packer_code ?? '',
    // "DE NW-12345 EG" → "de-nw-12345-eg", the tag format normalise() expects
    emb_codes_tags: out.packer_code ? [out.packer_code.toLowerCase().trim().replace(/\s+/g, '-')] : [],
    label_stages: (out.stages ?? []).map((s) => `${s.label}: ${s.country}`).join(', '),
    source: 'label',
  };
}

/** Shrink a photo to a JPEG (base64, no prefix) small enough to send: labels stay readable at ~1600px. */
export async function photoToBase64(file, maxSide = 1600) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

/** Read label photos with Claude. Returns a raw (Open Food Facts-shaped) product. */
export async function readLabel(ai, code, base64Images) {
  const out = await ai.json(PROMPT, SCHEMA, { images: base64Images, effort: 'medium', maxTokens: 8000 });
  return toRawProduct(out, code);
}
