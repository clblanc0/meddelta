import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, type Kind } from '../lib/reconcile.ts';
const active = 'CONTINUE lisinopril 10 mg by mouth once daily.';
const fixtures: {
  name: string;
  a: string;
  b: string;
  kind: Kind;
  diff?: string[];
}[] = [
  {
    name: 'stop against continue',
    a: 'STOP lisinopril.',
    b: active,
    kind: 'conflict',
    diff: ['status'],
  },
  { name: 'same status and dose', a: active, b: active, kind: 'consistent' },
  {
    name: 'dose mismatch',
    a: active,
    b: 'TAKE lisinopril 20 mg by mouth once daily.',
    kind: 'conflict',
    diff: ['dose'],
  },
  {
    name: 'frequency mismatch',
    a: active,
    b: 'CONTINUE lisinopril 10 mg by mouth twice daily.',
    kind: 'conflict',
    diff: ['frequency'],
  },
  {
    name: 'dose and frequency mismatch',
    a: active,
    b: 'CONTINUE lisinopril 20 mg by mouth twice daily.',
    kind: 'conflict',
    diff: ['dose', 'frequency'],
  },
  {
    name: 'equivalent g and mg',
    a: 'CONTINUE metformin 0.5 g by mouth twice daily.',
    b: 'TAKE metformin 500 mg by mouth twice daily.',
    kind: 'consistent',
  },
  {
    name: 'equivalent mcg and mg',
    a: 'TAKE levothyroxine 100 mcg oral daily.',
    b: 'TAKE levothyroxine 0.1 mg oral daily.',
    kind: 'consistent',
  },
  {
    name: 'brand alias',
    a: active,
    b: 'TAKE Zestril 10 mg PO QD.',
    kind: 'consistent',
  },
  {
    name: 'case insensitive',
    a: active.toLowerCase(),
    b: active,
    kind: 'consistent',
  },
  {
    name: 'nonoverlapping hold and restart',
    a: 'HOLD lisinopril through 2026-09-10.',
    b: 'RESTART lisinopril 10 mg oral daily from 2026-09-11.',
    kind: 'intentional',
  },
  {
    name: 'same-day boundaries overlap',
    a: 'HOLD lisinopril through 2026-09-10.',
    b: 'RESTART lisinopril 10 mg oral daily from 2026-09-10.',
    kind: 'conflict',
  },
  {
    name: 'date reversal',
    a: 'TAKE lisinopril 10 mg oral daily from 2026-09-11 through 2026-09-10.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'invalid calendar date',
    a: 'TAKE lisinopril 10 mg oral daily from 2026-02-30.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'unknown future timing',
    a: 'RESUME lisinopril 10 mg oral daily tomorrow.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'conditional hold',
    a: 'HOLD lisinopril if dizzy.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'as directed',
    a: 'TAKE lisinopril 10 mg oral as directed.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'no dose',
    a: 'TAKE lisinopril oral daily.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'no route',
    a: 'TAKE lisinopril 10 mg daily.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'unsupported route',
    a: 'TAKE lisinopril 10 mg intravenous daily.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'missing frequency',
    a: 'TAKE lisinopril 10 mg oral.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'extended versus unspecified formulation',
    a: 'TAKE metformin ER 500 mg oral daily.',
    b: 'TAKE metformin 500 mg oral daily.',
    kind: 'uncertain',
  },
  {
    name: 'same extended formulation',
    a: 'TAKE metformin XR 500 mg oral daily.',
    b: 'TAKE metformin ER 500 mg oral daily.',
    kind: 'consistent',
  },
  {
    name: 'zero dose',
    a: 'TAKE lisinopril 0 mg oral daily.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'duplicate entries',
    a: active + '\n' + active,
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'missing medication in second document',
    a: active,
    b: '',
    kind: 'uncertain',
  },
  {
    name: 'two medications on one line',
    a: active + ' Also stop metformin.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'weekly timing',
    a: 'TAKE lisinopril 10 mg oral weekly.',
    b: active,
    kind: 'uncertain',
  },
  {
    name: 'explicit future without bounded earlier instruction',
    a: 'HOLD lisinopril.',
    b: 'RESTART lisinopril 10 mg oral daily from 2026-09-11.',
    kind: 'conflict',
  },
];
for (const f of fixtures)
  void test(f.name, () => {
    const r = reconcile([f.a, f.b]);
    assert.equal(r.findings[0]?.kind, f.kind);
    if (f.diff) assert.deepEqual(r.findings[0].differences, f.diff);
    for (const e of r.facts)
      assert.equal([f.a, f.b][e.document].slice(e.start, e.end), e.quote);
  });
void test('unrecognized medication never disappears silently', () => {
  const r = reconcile([
    'TAKE mysterydrug 10 mg oral daily.',
    'TAKE mysterydrug 10 mg oral daily.',
  ]);
  assert.equal(r.facts.length, 0);
  assert.equal(r.unparsed.length, 2);
  assert.equal(r.findings.length, 0);
});
void test('negated stop is not interpreted as stop', () => {
  const r = reconcile(['DO NOT STOP lisinopril.', active]);
  assert.equal(r.unparsed.length, 1);
  assert.equal(r.findings[0].kind, 'uncertain');
});
void test('empty inputs do not establish agreement', () => {
  const r = reconcile(['', '']);
  assert.equal(r.findings.length, 0);
  assert.equal(r.facts.length, 0);
});
void test('source spans survive indentation, CRLF and Unicode', () => {
  const a = 'SYNTHETIC CASE — demo\r\n\r\n  ' + active + '\r\n';
  const r = reconcile([a, active]);
  assert.equal(r.facts[0].line, 3);
  assert.equal(a.slice(r.facts[0].start, r.facts[0].end), active);
});
void test('each change produces a different review fingerprint', () => {
  assert.notEqual(
    reconcile([active, active]).fingerprint,
    reconcile([active, active + ' ']).fingerprint,
  );
});
void test('documents do not gain priority from their order', () => {
  for (const f of fixtures)
    assert.deepEqual(
      reconcile([f.a, f.b]).findings.map((x) => x.kind),
      reconcile([f.b, f.a]).findings.map((x) => x.kind),
    );
});

void test('contradictory frequencies within a line require review', () => {
  assert.equal(
    reconcile(['TAKE lisinopril 10 mg oral daily twice daily.', active])
      .findings[0].kind,
    'uncertain',
  );
});
void test('different formulations across stop and take require review', () => {
  assert.equal(
    reconcile([
      'STOP metformin ER 500 mg oral daily.',
      'TAKE metformin 500 mg oral daily.',
    ]).findings[0].kind,
    'uncertain',
  );
});
