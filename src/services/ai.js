// Optional Claude access, only created when the user pasted an API key in Settings.
// The key stays in this phone's localStorage and is sent only to api.anthropic.com.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.6.0/+esm';

export function createAi({ apiKey, model }) {
  if (!apiKey) return null;
  let client;
  return {
    /** Ask Claude for JSON matching `schema`. `images` are base64 JPEGs. Returns the parsed object. */
    async json(prompt, schema, { images = [], effort = 'low', maxTokens = 4000 } = {}) {
      if (!client) {
        const { default: Anthropic } = await import(SDK_URL);
        client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      }
      const content = [
        ...images.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })),
        { type: 'text', text: prompt },
      ];
      // Haiku has no server-side refusal fallback, so only ask for one on the other models.
      const fallback = model.startsWith('claude-haiku') ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };
      const res = await client.beta.messages.create({
        model,
        max_tokens: maxTokens,
        ...fallback,
        output_config: { effort, format: { type: 'json_schema', schema } },
        messages: [{ role: 'user', content }],
      });
      if (res.stop_reason === 'refusal') throw new Error('Claude declined this request');
      const text = res.content.find((b) => b.type === 'text')?.text;
      if (!text) throw new Error('Empty AI response');
      return JSON.parse(text);
    },
  };
}
