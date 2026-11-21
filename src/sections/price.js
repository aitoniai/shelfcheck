import { COUNTRIES } from '../geo/countries.js';

const BAND = 0.15; // within ±15% of the usual price counts as normal

export const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 'higher' | 'normal' | 'lower' compared with a reference price. */
export function compare(value, reference) {
  const r = value / reference - 1;
  return r > BAND ? 'higher' : r < -BAND ? 'lower' : 'normal';
}

const STATUS = { higher: 'bad', normal: 'good', lower: 'good' };

export default {
  id: 'price',
  title: 'Price',
  inputs: [{ key: 'price', label: 'Shelf price', type: 'number', placeholder: 'e.g. 2.49' }],
  async run({ product, settings, input, history, services }) {
    const currency = COUNTRIES[settings.country]?.currency ?? 'EUR';
    const fmt = (v) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(v);
    const price = Number(input.price);
    if (!(price > 0)) return { status: 'info', summary: 'Enter the shelf price to compare it', details: [] };
    if (!product.size) return { status: 'info', summary: `${fmt(price)}: pack size unknown, can't work out the price per kg`, details: [] };

    const perUnit = (p) => p / (product.size.amount / 1000);
    const unitLabel = product.size.unit === 'ml' ? 'litre' : 'kg';
    const pricePerKg = perUnit(price);
    const details = [];
    let verdict = null;

    const others = await services.prices(product.code, currency).catch(() => []);
    const productMedian = median(others.map((o) => o.price));
    if (productMedian) {
      verdict = compare(price, productMedian);
      details.push(`${verdict} than the usual ${fmt(productMedian)} for this product (${others.length} reported prices)`);
    }

    const category = product.categories.at(-1);
    const similar = Object.entries(history)
      .filter(([code, h]) => category && code !== product.code && h.pricePerKg && h.categories?.at(-1) === category)
      .map(([, h]) => h.pricePerKg);
    const categoryMedian = median(similar);
    if (categoryMedian) {
      const c = compare(pricePerKg, categoryMedian);
      verdict ??= c;
      details.push(`${c} than similar products you've scanned (${fmt(categoryMedian)}/${unitLabel}, ${similar.length} scanned)`);
    }
    if (!verdict) details.push('No other prices to compare with yet. Prices you enter are remembered for next time.');

    return {
      status: verdict ? STATUS[verdict] : 'info',
      summary: `${fmt(pricePerKg)} per ${unitLabel}${verdict ? `, ${verdict} than normal` : ''}`,
      details,
      remember: { pricePerKg },
    };
  },
};
