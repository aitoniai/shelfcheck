// Optional Claude access, only created when the user pasted an API key in Settings.
// The key stays in this phone's localStorage and is sent only to api.anthropic.com.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.6.0/+esm';

export function createAi({ apiKey, model }) {
  if (!apiKey) return null;
  let client;
  return {
    /** Ask Claude for JSON matching `schema`. Returns the parsed object. */
    async json(prompt, schema) {
      if (!client) {
        const { default: Anthropic } = await import(SDK_URL);
        client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      }
      const res = await client.beta.messages.create({
        model,
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema } },
        messages: [{ role: 'user', content: prompt }],
      });
      if (res.stop_reason === 'refusal') throw new Error('Claude declined this request');
      const text = res.content.find((b) => b.type === 'text')?.text;
      if (!text) throw new Error('Empty AI response');
      return JSON.parse(text);
    },
  };
}
