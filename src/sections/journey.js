import { COUNTRIES, toCountryCode } from '../geo/countries.js';
import { chainDistanceKm, formatDistance } from '../geo/distance.js';

/** "Born: DE, Reared: Hungary, Slaughtered: DE" → [{ label, code }]. Unknown countries keep code null. */
export function parseStages(text = '') {
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((part) => {
    const [label, country] = part.includes(':') ? part.split(':').map((x) => x.trim()) : ['Stage', part];
    return { label, raw: country, code: toCountryCode(country) };
  });
}

const name = (code) => COUNTRIES[code]?.name ?? code;

/** Each route is a list of { label, code } stops ending where you shop. */
export function buildRoutes(product, stagesText, shopCountry) {
  const sold = { label: 'Sold', code: shopCountry };
  const stages = parseStages(stagesText).filter((s) => s.code);
  if (stages.length) return [[...stages, sold]];

  const packed = product.packerCountry ? [{ label: 'Packed', code: product.packerCountry }] : [];
  if (!product.origins.length) return packed.length ? [[...packed, sold]] : [];
  return product.origins.map((code) => [{ label: 'Origin', code }, ...packed, sold]);
}

export default {
  id: 'journey',
  title: 'Food miles',
  inputs: [{ key: 'stages', label: 'Stages from the label (optional)', placeholder: 'Born: DE, Reared: HU, Slaughtered: DE' }],
  run({ product, settings, input }) {
    const routes = buildRoutes(product, input.stages, settings.country);
    const unknown = parseStages(input.stages).filter((s) => !s.code).map((s) => s.raw);
    if (!routes.length) {
      return { status: 'info', summary: 'Origin not recorded. Add the stages from the label below.', details: unknown.map((u) => `Unknown country: ${u}`) };
    }

    const km = routes.map((r) => chainDistanceKm(r.map((s) => s.code)));
    const longest = Math.max(...km);
    const status = longest < 1000 ? 'good' : longest < 3000 ? 'warn' : 'bad';
    const details = routes.map((r, i) => `${r.map((s) => `${s.label} ${name(s.code)}`).join(' → ')}: ${formatDistance(km[i], settings.units)}`);
    if (product.packerCode) details.push(`Packer code: ${product.packerCode}`);
    if (product.originsUnknown.length) details.push(`Also listed: ${product.originsUnknown.join(', ')}`);
    for (const u of unknown) details.push(`Unknown country: ${u}`);
    details.push('Straight-line estimate between country centres; real routes are longer.');
    return { status, summary: `About ${formatDistance(longest, settings.units)} travelled`, details };
  },
};
