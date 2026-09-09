import type { Report } from './reconcile';
type Context = {
  registerTool: (
    tool: Record<string, unknown>,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function validateDocuments(input: unknown): [string, string] {
  if (!input || typeof input !== 'object' || !('documents' in input))
    throw new Error('Provide exactly two synthetic documents.');
  const docs = (input as { documents: unknown }).documents;
  if (
    !Array.isArray(docs) ||
    docs.length !== 2 ||
    docs.some((x) => typeof x !== 'string' || x.length > 15000)
  )
    throw new Error('Provide two strings of at most 15,000 characters.');
  return docs as [string, string];
}
export function registerComparisonTool(
  compare: (docs: [string, string]) => Report,
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'compare_synthetic_documents',
          title: 'Compare synthetic medication instructions',
          description:
            'Replace both visible synthetic documents, run the same comparison as the page, and clear existing session review decisions. Not for patient-care use.',
          inputSchema: {
            type: 'object',
            properties: {
              documents: {
                type: 'array',
                minItems: 2,
                maxItems: 2,
                items: { type: 'string', maxLength: 15000 },
              },
            },
            required: ['documents'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute(input: unknown) {
            const r = compare(validateDocuments(input));
            return {
              fingerprint: r.fingerprint,
              findings: r.findings.map((f) => ({
                drug: f.drug,
                kind: f.kind,
                reason: f.reason,
              })),
              unparsedLines: r.unparsed.length,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* The visible comparison remains available in browsers without WebMCP. */
  }
  return () => lifecycle.abort();
}
