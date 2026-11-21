const VERDICT = {
  a: ['good', 'Healthy choice'],
  b: ['good', 'Fairly healthy'],
  c: ['warn', 'Average, fine in moderation'],
  d: ['bad', 'Less healthy, an occasional treat'],
  e: ['bad', 'Unhealthy, best kept rare'],
};

export default {
  id: 'health',
  title: 'Healthy?',
  run({ product: p }) {
    if (!VERDICT[p.nutriscore]) return null;
    const [status, text] = VERDICT[p.nutriscore];
    return { status, summary: `Nutri-Score ${p.nutriscore.toUpperCase()}: ${text}`, details: [] };
  },
};
