// "Is it really what the name says?" EU QUID rules require a % for any ingredient named on the pack.
const FLAVOUR = /\b(flavou?r(ed)?|geschmack|aroma|[a-z]+-style|nach art)\b/i;

const words = (s) => s.toLowerCase().replace(/[^\p{L}\s-]/gu, ' ').split(/[\s-]+/)
  .filter(Boolean).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w));

/** The phrase from the ingredient that also appears in the product name, or null. */
function matchedPhrase(ingredientText, nameWords) {
  const iw = words(ingredientText);
  // shortcut: matches single-word ingredients or two-word phrases only; the optional AI check covers the rest.
  if (iw.length === 1) return iw[0].length >= 4 && nameWords.includes(iw[0]) ? iw[0] : null;
  const name = ` ${nameWords.join(' ')} `;
  for (let i = 1; i < iw.length; i++) {
    const pair = `${iw[i - 1]} ${iw[i]}`;
    if (name.includes(` ${pair} `)) return pair;
  }
  return null;
}

/** [{ phrase, percent, declared }] for each ingredient named in the product name. */
export function namedIngredients(product) {
  const nameWords = words(product.name);
  const byPhrase = new Map();
  for (const ing of product.ingredients) {
    const phrase = matchedPhrase(ing.text, nameWords);
    const percent = ing.percent ?? ing.estimate;
    if (!phrase || percent === null) continue;
    const prev = byPhrase.get(phrase);
    // Sub-entries of the same ingredient repeat the %, so keep the largest rather than summing.
    if (!prev || percent > prev.percent) byPhrase.set(phrase, { phrase, percent, declared: ing.percent !== null });
  }
  return [...byPhrase.values()];
}

const rank = { good: 0, info: 0, warn: 1, bad: 2 };

export default {
  id: 'claims',
  title: 'Is it what it says?',
  run({ product }) {
    const named = namedIngredients(product);
    const details = [];
    let status = 'good';
    const worse = (s) => { if (rank[s] > rank[status]) status = s; };

    for (const n of named) {
      const pct = `${Math.round(n.percent)}%`;
      if (n.percent < 50) { worse('bad'); details.push(`Name says "${n.phrase}" but it's only ${pct}`); }
      else if (n.percent < 80) { worse('warn'); details.push(`"${n.phrase}" makes up ${pct}`); }
      else details.push(`"${n.phrase}" makes up ${pct}`);
      if (!n.declared) { worse('warn'); details.push(`No % declared for "${n.phrase}" (estimated)`); }
    }
    if (FLAVOUR.test(product.name)) { worse('warn'); details.push('"Flavour"/"Aroma" in the name: it may contain little or none of the real thing'); }

    if (!details.length) return product.ingredients.length ? { status: 'info', summary: 'No named ingredient to check', details: [] } : null;
    const summary = { good: 'Matches the name', warn: 'Partly what it says', bad: 'Not really what it says' }[status];
    return { status, summary, details };
  },
};
