'use client';
import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { registerComparisonTool } from '@/lib/webmcp';
import {
  ArrowRight,
  FileText,
  ShieldCheck,
  TriangleAlert,
  Check,
  Download,
  RotateCcw,
  CircleHelp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cases } from '@/lib/cases';
import { reconcile, VERSION, SUPPORTED_DRUGS } from '@/lib/reconcile';
const labels = ['Discharge summary', 'Patient medication list'];
type Decision = {
  outcome: string;
  note: string;
  at: string;
  fingerprint: string;
};
export default function Home() {
  const [caseId, setCaseId] = useState('status');
  const [docs, setDocs] = useState<[string, string]>(cases[0].documents);
  const [report, setReport] = useState(() => reconcile(cases[0].documents));
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState('lisinopril');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notice, setNotice] = useState('');
  const [comparisonCount, setComparisonCount] = useState(0);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const current = cases.find((c) => c.id === caseId);
  const finding =
    report.findings.find((f) => f.id === selected) ?? report.findings[0];
  const conflicts = report.findings.filter((f) => f.kind === 'conflict').length;
  const uncertain =
    report.findings.filter((f) => f.kind === 'uncertain').length +
    report.unparsed.length;
  function load(id: string) {
    const c = cases.find((c) => c.id === id);
    if (!c) return;
    setCaseId(id);
    setDocs(c.documents);
    const r = reconcile(c.documents);
    setReport(r);
    setSelected(r.findings[0]?.id ?? '');
    setDirty(false);
    setDecisions({});
    setNote('');
    setOutcome('');
    setNotice('');
    setComparisonCount(0);
  }
  function applyComparison(input: [string, string]) {
    const r = reconcile(input);
    setReport(r);
    setSelected(r.findings[0]?.id ?? '');
    setDirty(false);
    setDecisions({});
    setNote('');
    setOutcome('');
    setNotice('Comparison updated. Previous review decisions cleared.');
    setComparisonCount((count) => count + 1);
    return r;
  }
  function analyze() {
    flushSync(() => applyComparison(docs));
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({
      block: 'start',
      behavior: 'instant',
    });
  }
  useEffect(
    () =>
      registerComparisonTool((input) => {
        let result!: ReturnType<typeof reconcile>;
        flushSync(() => {
          setDocs(input);
          setCaseId('custom');
          result = applyComparison(input);
        });
        return result;
      }),
    [],
  );
  function save() {
    if (!finding || !outcome || !note.trim() || dirty) return;
    setDecisions({
      ...decisions,
      [finding.id]: {
        outcome,
        note: note.trim(),
        at: new Date().toISOString(),
        fingerprint: report.fingerprint,
      },
    });
    setNotice(
      'Demo review decision recorded. Treatment instructions were not changed.',
    );
  }
  function download() {
    const data = {
      project: 'MedDelta',
      version: VERSION,
      syntheticOnly: true,
      createdAt: new Date().toISOString(),
      documents: docs,
      report,
      decisions,
      limitations:
        'Narrow rule-based extraction. Not clinically validated. Decisions belong to this browser session.',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meddelta-demo-review.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" aria-label="MedDelta home">
          <Image
            src="/meddelta-logo.png"
            alt="MedDelta"
            className="logo"
            width={1280}
            height={1280}
            unoptimized
          />
        </Link>
        <div className="top-divider" />
        <span className="workspace-label">Discharge review</span>
        <span className="demo-pill">SYNTHETIC DEMO</span>
      </header>
      <main>
        <div className="intro">
          <div>
            <p className="eyebrow">MEDICATION CONSISTENCY</p>
            <h1>
              One patient. Two documents.
              <br />
              <span>One clear plan.</span>
            </h1>
            <p>
              Compare the instructions. Inspect the evidence. Record a review.
            </p>
          </div>
          <div className="scope-note">
            <ShieldCheck size={20} />
            <div>
              <strong>A review aid, not a treatment decision</strong>
              <p>
                Early prototype · synthetic examples only.
                <br />
                No clinical validation or patient-care use.
              </p>
            </div>
          </div>
        </div>
        <section className="casebar" aria-label="Demo scenario">
          <div className="casepicker">
            <label id="case-label" htmlFor="case-select">
              Explore a case
            </label>
            <Select
              value={caseId}
              onValueChange={(v) => {
                if (v) load(v);
              }}
            >
              <SelectTrigger
                id="case-select"
                aria-labelledby="case-label"
                className="case-select"
              >
                <SelectValue>{current?.title ?? 'Custom text'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {caseId === 'custom' && (
                  <SelectItem value="custom">Custom text</SelectItem>
                )}
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p>
            {current?.description ??
              'Compare your edited synthetic instructions.'}
          </p>
          <Button
            variant="outline"
            onClick={() => load(caseId === 'custom' ? 'status' : caseId)}
          >
            <RotateCcw /> Reset case
          </Button>
        </section>
        <section className="documents" aria-label="Source documents">
          {docs.map((doc, i) => (
            <article key={i} className="document">
              <div className="document-head">
                <span className="document-letter">{i === 0 ? 'A' : 'B'}</span>
                <h2>{labels[i]}</h2>
                <FileText size={18} />
              </div>
              <Textarea
                aria-label={labels[i]}
                value={doc}
                maxLength={15000}
                spellCheck={false}
                onChange={(e) => {
                  const updated = [...docs] as [string, string];
                  updated[i] = e.target.value;
                  setDocs(updated);
                  setDirty(true);
                  setNotice(
                    'Documents changed. Compare again before reviewing.',
                  );
                }}
              />
              <div className="document-foot">
                Editable synthetic text · no real patient information
              </div>
            </article>
          ))}
        </section>
        <div className="actionbar">
          <span role="status" aria-live="polite" aria-atomic="true">
            {dirty
              ? 'Documents changed — results below are out of date.'
              : comparisonCount > 0
                ? `Comparison ${comparisonCount} complete. ${conflicts} conflict${conflicts === 1 ? '' : 's'} found; ${uncertain} need clarification.`
                : 'Example results are shown below. Edit either document, then compare.'}
          </span>
          <Button onClick={analyze} className="compare">
            Compare instructions <ArrowRight size={18} />
          </Button>
        </div>
        <div className="review-heading">
          <div>
            <p className="eyebrow">EVIDENCE FIRST</p>
            <h2
              ref={resultsHeading}
              tabIndex={-1}
              style={{ scrollMarginTop: '24px' }}
            >
              Review the differences
            </h2>
            {comparisonCount > 0 && !dirty && (
              <p className="comparison-complete">
                Comparison {comparisonCount} complete · Results refreshed
              </p>
            )}
          </div>
          <div className="counts">
            <span className="count conflict">
              {conflicts} conflict{conflicts === 1 ? '' : 's'}
            </span>
            <span className="count">{uncertain} need clarification</span>
            <span className="count">
              {report.facts.length} extracted instructions
            </span>
          </div>
        </div>
        <div className={'review-grid ' + (dirty ? 'stale' : '')}>
          <section className="findings" aria-label="Medication findings">
            {!report.findings.length ? (
              <p className="empty">
                No supported medication instructions found. Review the
                extraction limits below.
              </p>
            ) : (
              report.findings.map((f) => (
                <button
                  className={
                    'finding ' +
                    f.kind +
                    (finding?.id === f.id ? ' selected' : '')
                  }
                  key={f.id}
                  onClick={() => {
                    setSelected(f.id);
                    setNote(decisions[f.id]?.note ?? '');
                    setOutcome(decisions[f.id]?.outcome ?? '');
                  }}
                >
                  <span className="finding-icon">
                    {f.kind === 'conflict' ? (
                      <TriangleAlert size={19} />
                    ) : f.kind === 'uncertain' ? (
                      <CircleHelp size={19} />
                    ) : (
                      <Check size={19} />
                    )}
                  </span>
                  <span>
                    <strong>{f.drug}</strong>
                    <small>{f.title}</small>
                  </span>
                  {decisions[f.id] && (
                    <span className="reviewed-dot" title="Review recorded">
                      ✓
                    </span>
                  )}
                </button>
              ))
            )}
          </section>
          <article className="evidence-panel">
            {finding ? (
              <>
                <div className="evidence-title">
                  <div>
                    <span className={'status-label ' + finding.kind}>
                      {finding.title}
                    </span>
                    <h3>{finding.drug}</h3>
                  </div>
                  <span className="metadata">
                    {finding.facts.length} source passages
                  </span>
                </div>
                <p className="reason">{finding.reason}</p>
                <div className="evidence-quotes">
                  {finding.facts.map((f) => (
                    <figure key={f.id}>
                      <figcaption>
                        <span>
                          {f.document === 0 ? 'A' : 'B'} · {labels[f.document]}
                        </span>
                        <span>Line {f.line}</span>
                      </figcaption>
                      <blockquote>{f.quote}</blockquote>
                      <div className="fact-tags">
                        <span>
                          {f.status === 'stop'
                            ? 'Stop / hold'
                            : 'Take / continue'}
                        </span>
                        {f.dose !== null && <span>{f.dose} mg</span>}
                        {f.frequency && <span>{f.frequency}× daily</span>}
                        {f.from && <span>From {f.from}</span>}
                        {f.through && <span>Through {f.through}</span>}
                      </div>
                    </figure>
                  ))}
                </div>
                <div className="resolution">
                  <div className="resolution-heading">
                    <h4>Record a demo review</h4>
                    <span>Session only</span>
                  </div>
                  <p>
                    A clinician must determine the treatment plan. Recording a
                    decision does not remove the original finding.
                  </p>
                  <label id="decision-label" htmlFor="decision-select">
                    Review outcome
                  </label>
                  <Select
                    value={outcome}
                    onValueChange={(v) => setOutcome(v ?? '')}
                    disabled={dirty}
                  >
                    <SelectTrigger
                      id="decision-select"
                      aria-labelledby="decision-label"
                      className="decision-select"
                    >
                      <SelectValue placeholder="Choose an outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clarification-requested">
                        Clarification requested
                      </SelectItem>
                      <SelectItem value="intentional-change">
                        Reviewed as an intentional change
                      </SelectItem>
                      <SelectItem value="conflict-confirmed">
                        Conflict confirmed for correction
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <label htmlFor="review-note">Reason and next action</label>
                  <Textarea
                    id="review-note"
                    placeholder="Record the evidence and who should clarify the plan…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={dirty}
                    maxLength={2000}
                  />
                  <div className="resolution-actions">
                    <Button
                      onClick={save}
                      disabled={!note.trim() || !outcome || dirty}
                    >
                      Save review decision
                    </Button>
                    {decisions[finding.id] && (
                      <span className="saved">
                        <Check size={16} /> Review recorded
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty">
                Add supported instructions to both documents and compare again.
              </div>
            )}
          </article>
        </div>
        <output className="notice">{notice}</output>
        {report.unparsed.length > 0 && (
          <section className="unparsed">
            <h3>Text that could not be checked</h3>
            <p>These lines are not counted as agreement or disagreement.</p>
            {report.unparsed.map((x, i) => (
              <p key={i}>
                <strong>
                  {labels[x.document]}, line {x.line}:
                </strong>{' '}
                {x.quote}
              </p>
            ))}
          </section>
        )}
        <section className="bottom-row">
          <details>
            <summary>What this prototype can—and cannot—check</summary>
            <div className="limits">
              <p>
                Deterministic extraction, not an AI clinical model. Use one
                medication instruction per line, starting with STOP, HOLD,
                CONTINUE, TAKE, RESUME, or RESTART. Active instructions need a
                dose, an oral route, and a daily frequency.
              </p>
              <p>
                Supported medications: {SUPPORTED_DRUGS.join(', ')}. Selected
                brand aliases are mapped by a small local dictionary, not a live
                RxNorm connection. Explicit timing uses “from YYYY-MM-DD” and
                “through YYYY-MM-DD”. Other wording, duplicate instructions,
                missing medications, and formulation mismatches need
                clarification.
              </p>
              <p>
                “Consistent” refers only to supported extracted fields. It does
                not establish that a regimen is safe, complete, or appropriate.
                Documents and review decisions stay in memory in this browser
                tab; refreshing clears the session.
              </p>
            </div>
          </details>
          <Button variant="outline" onClick={download} disabled={dirty}>
            <Download /> Export demo review
          </Button>
        </section>
        <footer>
          <span>MedDelta · Prototype {VERSION}</span>
          <span>
            Christian Lopez Blanco · University of Alabama at Birmingham · Solo
            entrant
          </span>
        </footer>
      </main>
    </div>
  );
}
