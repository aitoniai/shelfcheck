/** Run every section in parallel. A section that throws becomes an "unavailable" card instead of breaking the report. */
export async function runSections(sections, ctx) {
  return Promise.all(sections.map(async (section) => {
    try {
      return { section, result: await section.run(ctx) };
    } catch (err) {
      return { section, result: { status: 'info', summary: 'Unavailable right now', details: [String(err.message ?? err)] } };
    }
  }));
}

const ICON = { good: '✓', warn: '!', bad: '✗', info: 'i' };

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
};

/** Render results into `container`. `onInput(key, value)` fires when a section input changes. Uses textContent only: product data is untrusted. */
export function renderReport(container, results, input, onInput) {
  container.replaceChildren(...results
    .filter(({ section, result }) => result || section.inputs)
    .map(({ section, result }) => {
      const status = result?.status ?? 'info';
      const fields = (section.inputs ?? []).map((f) => {
        const field = el('input', {
          type: f.type ?? 'text', placeholder: f.placeholder ?? '', value: input[f.key] ?? '',
          inputMode: f.type === 'number' ? 'decimal' : 'text', step: 'any',
        });
        field.addEventListener('change', () => onInput(f.key, field.value));
        return el('label', { className: 'field' }, el('span', { textContent: f.label }), field);
      });
      return el('section', { className: `card ${status}` },
        el('h2', {}, el('span', { className: 'badge', textContent: ICON[status], ariaLabel: status }), section.title),
        result ? el('p', { className: 'summary', textContent: result.summary }) : null,
        result?.details?.length ? el('ul', {}, ...result.details.map((d) => el('li', { textContent: d }))) : null,
        ...fields);
    }));
}
