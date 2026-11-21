import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalise, packerCountry } from '../src/sources/openfoodfacts.js';
import { toCountryCode } from '../src/geo/countries.js';
import { countryDistanceKm } from '../src/geo/distance.js';
import { runSections } from '../src/report.js';
import sections from '../src/sections/index.js';
import claims, { namedIngredients } from '../src/sections/claims.js';
import journey, { buildRoutes, parseStages } from '../src/sections/journey.js';
import price, { compare, median } from '../src/sections/price.js';

const load = (f) => normalise(JSON.parse(readFileSync(new URL(`fixtures/${f}`, import.meta.url))).product);
const settings = { country: 'DE', units: 'km' };
const noServices = { prices: async () => [], ai: null };

test('normalises a real Open Food Facts product', () => {
  const p = load('nutella.json');
  assert.equal(p.name, 'Nutella');
  assert.deepEqual(p.size, { amount: 400, unit: 'g' });
  assert.equal(typeof p.nova, 'number');
  assert.equal(typeof p.co2PerKg, 'number');
  assert.equal(p.nutriscore, 'e');
});

test('country lookup handles OFF tags, names, aliases and packer codes', () => {
  assert.equal(toCountryCode('en:germany'), 'DE');
  assert.equal(toCountryCode('Deutschland'), 'DE');
  assert.equal(toCountryCode('uk'), 'GB');
  assert.equal(toCountryCode('en:atlantis'), null);
  assert.equal(packerCountry(['de-ni-12345-eg']), 'DE');
  assert.equal(packerCountry(['emb-29232']), 'FR');
});

test('"with olive oil" blend that is 15% olive oil is flagged', async () => {
  const p = load('olive-oil-blend.json');
  assert.deepEqual(namedIngredients(p).map((n) => [n.phrase, n.percent]), [['olive oil', 15]]);
  const r = await claims.run({ product: p });
  assert.equal(r.status, 'bad');
  assert.match(r.details[0], /only 15%/);
});

test('50% olive oil is a warning, 100% is fine', async () => {
  const base = { name: 'Olive Oil', ingredients: [] };
  const half = await claims.run({ product: { ...base, ingredients: [{ text: 'olive oil', percent: 50, estimate: 50 }, { text: 'rapeseed oil', percent: 50, estimate: 50 }] } });
  assert.equal(half.status, 'warn');
  const pure = await claims.run({ product: { ...base, ingredients: [{ text: 'extra virgin olive oil', percent: 100, estimate: 100 }] } });
  assert.equal(pure.status, 'good');
});

test('journey: label stages override data, distances add up', async () => {
  assert.deepEqual(parseStages('Born: DE, Reared: Hungary, Slaughtered: DE').map((s) => s.code), ['DE', 'HU', 'DE']);
  const p = load('chicken-de.json');
  assert.deepEqual(buildRoutes(p, '', 'DE')[0].map((s) => s.code), ['HU', 'DE', 'DE']);
  const r = await journey.run({ product: p, settings, input: { stages: 'Born: DE, Reared: HU, Slaughtered: DE' } });
  const there = countryDistanceKm('DE', 'HU');
  assert.ok(there > 600 && there < 900, `DE→HU ${there}`);
  assert.match(r.summary, new RegExp(`${Math.round(there * 2).toLocaleString()} km`));
});

test('price bands and per-kg maths', async () => {
  assert.equal(compare(1.2, 1), 'higher');
  assert.equal(compare(1.1, 1), 'normal');
  assert.equal(compare(0.8, 1), 'lower');
  assert.equal(median([3, 1, 2, 10]), 2.5);
  const p = load('chicken-de.json');
  const r = await price.run({
    product: p, settings, input: { price: '6' }, history: {},
    services: { prices: async () => [{ price: 4 }, { price: 4.2 }, { price: 3.9 }] },
  });
  assert.equal(r.remember.pricePerKg, 15);
  assert.equal(r.status, 'bad');
  assert.match(r.summary, /higher than normal/);
});

test('a section that throws does not break the report; AI section hides with no key', async () => {
  const boom = { id: 'boom', title: 'Boom', run() { throw new Error('nope'); } };
  const ctx = { product: load('olive-oil-blend.json'), settings, input: {}, history: {}, services: noServices };
  const results = await runSections([...sections, boom], ctx);
  assert.equal(results.at(-1).result.summary, 'Unavailable right now');
  assert.equal(results.find((r) => r.section.id === 'ai-claims').result, null);
  assert.ok(results.filter((r) => r.result).length >= 5);
});

test('label read by AI becomes a normal product: traffic lights, journey stages, packer code', async () => {
  const { toRawProduct } = await import('../src/sources/label.js');
  const aiOut = {
    product_name: 'Hähnchen Brustfilet', brands: 'Hofgut', quantity_amount: 400, quantity_unit: 'g',
    ingredients: [{ text: 'Hähnchenbrustfilet', percent: 100 }],
    nutriments: { energy_kcal: 105, fat: 1.5, saturated_fat: 0.4, sugars: 0, salt: 1.6, proteins: 23, fiber: null },
    origins: ['Germany'], packer_code: 'DE NI-12345 EG',
    stages: [{ label: 'Reared', country: 'Hungary' }, { label: 'Slaughtered', country: 'Germany' }],
    nova_group: 1,
  };
  const p = normalise(toRawProduct(aiOut, '4070308070346'));
  assert.equal(p.source, 'label');
  assert.equal(p.packerCountry, 'DE');
  assert.deepEqual(p.nutrientLevels, { fat: 'low', 'saturated-fat': 'low', sugars: 'low', salt: 'high' });
  assert.equal(p.labelStages, 'Reared: Hungary, Slaughtered: Germany');
  const j = await journey.run({ product: p, settings, input: { stages: p.labelStages } });
  assert.match(j.details[0], /Reared Hungary → Slaughtered Germany → Sold Germany/);
  const results = await runSections(sections, { product: p, settings, input: {}, history: {}, services: noServices });
  assert.ok(results.every((r) => !r.result || r.result.summary !== 'Unavailable right now'));
});

test('price: products without a category are not compared with each other', async () => {
  const p = { ...load('chicken-de.json'), categories: [] };
  const r = await price.run({ product: p, settings, input: { price: '6' }, history: { other: { pricePerKg: 1, categories: [] } }, services: noServices });
  assert.equal(r.status, 'info');
});

test('AI second opinion asks once per product, then reuses the saved answer', async () => {
  const { default: aiClaims } = await import('../src/sections/ai-claims.js');
  let calls = 0;
  const ai = { json: async () => { calls++; return { misleading: true, reasons: ['only 15% olive oil'] }; } };
  const product = load('olive-oil-blend.json');
  const first = await aiClaims.run({ product, history: {}, services: { ai } });
  const second = await aiClaims.run({ product, history: { [product.code]: { aiClaims: first.remember.aiClaims } }, services: { ai } });
  assert.equal(calls, 1);
  assert.equal(second.summary, 'Could be misleading');
  assert.deepEqual(second.remember, first.remember);
});
