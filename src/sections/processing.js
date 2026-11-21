const NOVA = {
  1: ['good', 'Unprocessed or minimally processed'],
  2: ['good', 'Processed culinary ingredient'],
  3: ['warn', 'Processed food'],
  4: ['bad', 'Ultra-processed food'],
};

export default {
  id: 'processing',
  title: 'How processed',
  run({ product: p }) {
    if (!NOVA[p.nova] && !p.additives.length) return null;
    const [status, label] = NOVA[p.nova] ?? ['info', 'Processing level unknown'];
    const details = p.additives.length ? [`${p.additives.length} additive(s): ${p.additives.join(', ')}`] : ['No additives listed'];
    return { status, summary: NOVA[p.nova] ? `NOVA ${p.nova}: ${label}` : label, details };
  },
};
