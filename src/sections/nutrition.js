const ROWS = [
  ['energyKcal', 'Energy', 'kcal', null],
  ['fat', 'Fat', 'g', 'fat'],
  ['saturatedFat', 'Saturates', 'g', 'saturated-fat'],
  ['sugars', 'Sugars', 'g', 'sugars'],
  ['salt', 'Salt', 'g', 'salt'],
  ['protein', 'Protein', 'g', null],
  ['fiber', 'Fibre', 'g', null],
];

export default {
  id: 'nutrition',
  title: 'Nutrition (per 100 g)',
  run({ product: p }) {
    const rows = ROWS.filter(([k]) => p.nutriments[k] !== null);
    if (!rows.length) return null;
    const highs = rows.filter(([, , , lvl]) => p.nutrientLevels[lvl] === 'high').map(([, label]) => label.toLowerCase());
    return {
      status: highs.length === 0 ? 'good' : highs.length === 1 ? 'warn' : 'bad',
      summary: highs.length ? `High in ${highs.join(', ')}` : 'No traffic-light reds',
      details: rows.map(([k, label, unit, lvl]) => `${label}: ${p.nutriments[k]} ${unit}${p.nutrientLevels[lvl] ? ` (${p.nutrientLevels[lvl]})` : ''}`),
    };
  },
};
