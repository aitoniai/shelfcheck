const GOOD = ['a-plus', 'a', 'b'], OK = ['c'];
const CAR_KG_PER_KM = 0.17; // average petrol car

export default {
  id: 'co2',
  title: 'CO₂ footprint',
  run({ product: p }) {
    if (p.co2PerKg === null) return { status: 'info', summary: 'No CO₂ data for this product yet.', details: [] };

    const status = p.ecoGrade
      ? (GOOD.includes(p.ecoGrade) ? 'good' : OK.includes(p.ecoGrade) ? 'warn' : 'bad')
      : (p.co2PerKg < 2 ? 'good' : p.co2PerKg < 5 ? 'warn' : 'bad');

    const perPack = p.size ? p.co2PerKg * p.size.amount / 1000 : null;
    const summary = perPack !== null
      ? `${perPack.toFixed(2)} kg CO₂e for this pack (${p.co2PerKg.toFixed(2)} kg per kg)`
      : `${p.co2PerKg.toFixed(2)} kg CO₂e per kg`;

    const parts = Object.entries(p.co2Breakdown).filter(([, v]) => v);
    const details = parts.map(([k, v]) => `${k}: ${Math.round(v / p.co2PerKg * 100)}%`);
    if (perPack !== null) details.push(`About the same as driving ${(perPack / CAR_KG_PER_KM).toFixed(1)} km in a petrol car`);
    if (p.ecoGrade) details.push(`Eco/Green-Score: ${p.ecoGrade.toUpperCase()}`);
    return { status, summary, details };
  },
};
