const SCHEMA = {
  type: 'object',
  properties: {
    misleading: { type: 'boolean' },
    reasons: { type: 'array', items: { type: 'string' } },
  },
  required: ['misleading', 'reasons'],
  additionalProperties: false,
};

export default {
  id: 'ai-claims',
  title: 'AI second opinion',
  async run({ product: p, services }) {
    if (!services.ai) return null; // no API key set: section hidden
    const ingredients = p.ingredients.map((i) => `${i.text}${i.percent !== null ? ` ${i.percent}%` : ''}`).join(', ');
    const out = await services.ai.json(
      `You check supermarket food labels for misleading names. Product name: "${p.name}" (brand: ${p.brand || 'unknown'}).\n` +
      `Ingredients in order, with declared %: ${ingredients || 'not available'}.\n` +
      'Is the name or presentation likely to mislead a shopper about what is inside (e.g. named ingredient is a small %, cheaper substitutes, "flavour" wording)? ' +
      'Give short, concrete reasons (max 3). If there is nothing misleading, say so in one reason.',
      SCHEMA,
    );
    return { status: out.misleading ? 'warn' : 'good', summary: out.misleading ? 'Could be misleading' : 'Looks honest', details: out.reasons };
  },
};
