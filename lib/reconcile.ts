export type Kind = 'conflict' | 'uncertain' | 'consistent' | 'intentional';
export type Fact = {
  id: string;
  document: number;
  line: number;
  quote: string;
  start: number;
  end: number;
  drug: string;
  status: 'stop' | 'take';
  dose: number | null;
  frequency: number | null;
  route: string | null;
  formulation: string;
  from: string | null;
  through: string | null;
  issues: string[];
};
export type Finding = {
  id: string;
  drug: string;
  kind: Kind;
  title: string;
  reason: string;
  facts: Fact[];
  differences: string[];
};
export type Report = {
  findings: Finding[];
  facts: Fact[];
  unparsed: { document: number; line: number; quote: string }[];
  fingerprint: string;
};
export const VERSION = '0.1.0';
const aliases: Record<string, string> = {
  lisinopril: 'lisinopril',
  prinivil: 'lisinopril',
  zestril: 'lisinopril',
  metformin: 'metformin',
  glucophage: 'metformin',
  amlodipine: 'amlodipine',
  norvasc: 'amlodipine',
  atorvastatin: 'atorvastatin',
  lipitor: 'atorvastatin',
  furosemide: 'furosemide',
  lasix: 'furosemide',
  losartan: 'losartan',
  cozaar: 'losartan',
  levothyroxine: 'levothyroxine',
  synthroid: 'levothyroxine',
  apixaban: 'apixaban',
  eliquis: 'apixaban',
};
export const SUPPORTED_DRUGS = [...new Set(Object.values(aliases))];
function date(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
    ? null
    : value;
}
function hash(s: string) {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return (n >>> 0).toString(16);
}
function extract(text: string, document: number) {
  const facts: Fact[] = [];
  const unparsed: Report['unparsed'] = [];
  let offset = 0;
  for (const [index, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    const start = offset + raw.indexOf(line);
    offset += raw.length + 1;
    if (
      !line ||
      /^(?:SYNTHETIC(?: CASE)?\b|Patient:|Discharge date:|Document date:|Medication instructions:)/i.test(
        line,
      )
    )
      continue;
    const match = line.match(
      /^(STOP|STOPPED|DISCONTINUE|CONTINUE|TAKE|RESUME|RESTART|HOLD)\s+([a-z]+)\s*(ER|XR|IR|extended-release|immediate-release)?\s*(\d+(?:\.\d+)?)?\s*(mcg|mg|g)?\b(.*)$/i,
    );
    if (!match || !aliases[match[2].toLowerCase()]) {
      unparsed.push({ document, line: index + 1, quote: line });
      continue;
    }
    const rest = match[6].toLowerCase();
    const issues: string[] = [];
    const frequency = /\b(?:twice daily|twice a day|bid)\b/.test(rest)
      ? 2
      : /\b(?:three times daily|tid)\b/.test(rest)
        ? 3
        : /\b(?:once daily|daily|every day|qd)\b/.test(rest)
          ? 1
          : null;
    if (
      (
        rest.match(
          /\b(?:once daily|twice daily|twice a day|three times daily|every day|daily|bid|tid|qd)\b/g,
        ) ?? []
      ).length > 1
    )
      issues.push('Multiple frequency expressions require clarification.');
    const route = /\b(?:by mouth|oral|po)\b/.test(rest) ? 'oral' : null;
    const isStop = /^(?:STOP|STOPPED|DISCONTINUE|HOLD)$/i.test(match[1]);
    const fromMatch = rest.match(/\bfrom (\d{4}-\d{2}-\d{2})/);
    const throughMatch = rest.match(/\bthrough (\d{4}-\d{2}-\d{2})/);
    const from = date(fromMatch?.[1]);
    const through = date(throughMatch?.[1]);
    if (
      (fromMatch && !from) ||
      (throughMatch && !through) ||
      (from && through && from > through)
    )
      issues.push('Invalid or reversed effective dates.');
    if (
      /\b(?:until|after|before|tomorrow|today|next|then|if|unless|when|as needed|as directed|prn|not|except|taper|alternate|weekly|monthly|every \d+ hours)\b/.test(
        rest,
      )
    )
      issues.push('Conditional or unsupported instructions require review.');
    const dose =
      match[4] && match[5]
        ? Number(match[4]) *
          ({ g: 1000, mg: 1, mcg: 0.001 }[match[5].toLowerCase()] ?? 1)
        : null;
    if (dose !== null && dose <= 0) issues.push('Dose must be positive.');
    if (!isStop && (!dose || !frequency || !route))
      issues.push(
        'An active instruction is missing a supported dose, frequency, or route.',
      );
    // Reject trailing language the narrow grammar cannot account for, including second medications.
    const residue = rest
      .replace(
        /\b(?:by mouth|oral|po|once daily|twice daily|twice a day|three times daily|every day|daily|bid|tid|qd)\b/g,
        '',
      )
      .replace(/\b(?:from|through) \d{4}-\d{2}-\d{2}/g, '')
      .replace(/[.,;\s]/g, '');
    if (residue)
      issues.push('Some wording is outside the supported extraction grammar.');
    const formulation = match[3]
      ? /^(ER|XR|extended-release)$/i.test(match[3])
        ? 'extended-release'
        : 'immediate-release'
      : 'unspecified';
    facts.push({
      id: `${document}-${index + 1}`,
      document,
      line: index + 1,
      quote: line,
      start,
      end: start + line.length,
      drug: aliases[match[2].toLowerCase()],
      status: isStop ? 'stop' : 'take',
      dose,
      frequency,
      route,
      formulation,
      from,
      through,
      issues: [...new Set(issues)],
    });
  }
  return { facts, unparsed };
}
function disjoint(a: Fact, b: Fact) {
  return Boolean(
    (a.through && b.from && a.through < b.from) ||
    (b.through && a.from && b.through < a.from),
  );
}
export function reconcile(documents: [string, string]): Report {
  const parts = documents.map(extract);
  const facts = parts.flatMap((p) => p.facts);
  const unparsed = parts.flatMap((p) => p.unparsed);
  const findings: Finding[] = [];
  for (const drug of new Set(facts.map((f) => f.drug))) {
    const group = facts.filter((f) => f.drug === drug);
    const differences: string[] = [];
    let kind: Kind = 'consistent';
    let reason =
      'The supported fields agree in both documents. This is not a safety assessment.';
    const a = group.filter((f) => f.document === 0),
      b = group.filter((f) => f.document === 1);
    if (a.length !== 1 || b.length !== 1) {
      kind = 'uncertain';
      reason =
        !a.length || !b.length
          ? 'This medication is not represented by a supported instruction in both documents.'
          : 'Multiple instructions for this medication require manual timeline review.';
    } else if (group.some((f) => f.issues.length)) {
      kind = 'uncertain';
      reason = [...new Set(group.flatMap((f) => f.issues))].join(' ');
    } else if (disjoint(a[0], b[0])) {
      kind = 'intentional';
      reason =
        'Explicit effective dates do not overlap. These instructions may describe a planned change; confirm the plan with a clinician.';
    } else {
      const x = a[0],
        y = b[0];
      if (x.status !== y.status) differences.push('status');
      if (x.formulation !== y.formulation) {
        kind = 'uncertain';
        reason =
          'Formulation differs or is unspecified. Dose equivalence cannot be assumed.';
      }
      if (x.status === 'take' && y.status === 'take') {
        if (x.dose !== y.dose) differences.push('dose');
        if (x.frequency !== y.frequency) differences.push('frequency');
      }
      if (differences.length && kind !== 'uncertain') {
        kind = 'conflict';
        reason = `The documents disagree on ${differences.join(' and ')} within overlapping or unspecified effective dates. Neither document is automatically treated as authoritative.`;
      }
    }
    const titles: Record<Kind, string> = {
      conflict: 'Conflicting instructions',
      uncertain: 'Needs clarification',
      consistent: 'Consistent within checked scope',
      intentional: 'Non-overlapping instructions',
    };
    findings.push({
      id: drug,
      drug,
      kind,
      title: titles[kind],
      reason,
      facts: group,
      differences,
    });
  }
  return {
    findings: findings.sort(
      (a, b) =>
        ({ conflict: 0, uncertain: 1, intentional: 2, consistent: 3 })[a.kind] -
        { conflict: 0, uncertain: 1, intentional: 2, consistent: 3 }[b.kind],
    ),
    facts,
    unparsed,
    fingerprint: hash(documents.join('\n---\n')),
  };
}
