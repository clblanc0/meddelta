# MedDelta: initial synthetic prototype

Christian Lopez Blanco — University of Alabama at Birmingham — solo entrant.

This early, browser-based demo compares two synthetic discharge instruction texts, displays exact source lines, records session-only review decisions, and exports a JSON review record. It is not clinically validated and must not be used for patient care.

## Run

Use Node 22.13 or later (Node 24 recommended for the TypeScript test runner).

- `npm ci`
- `npm run dev`
- `npm test`
- `npm run build`

## What is implemented

- Seven illustrative scenarios: status, dose, frequency, explicit non-overlapping dates, matching instructions/brand aliases, ambiguous instructions, and formulation uncertainty.
- Editable text; deterministic, bounded extraction and comparisons.
- Original evidence text, line numbers, character offsets, normalized facts, version and input fingerprint in exported records.
- Explicit unparsed lines, missing-field uncertainty and duplicate-instruction uncertainty.
- Review outcomes and a required note. Editing inputs makes results stale and blocks recording/export until rerun. Rerunning clears old decisions. Refreshing clears all session state.

## Limits and differences from the concept deck

This first slice uses TypeScript and React so it is immediately interactive in a browser. It does not yet implement the planned Python/FastAPI service, LLM extraction, live RxNorm normalization, PDF import, Synthea generation, authentication for clinical users, persistent audit storage, or hospital integration. It uses eight generic medication names and a small curated alias dictionary. Supported units are mg, mcg and g; routes are oral only; daily frequencies are one, two or three times a day. Unit normalization is for comparison, not dosing advice. Unspecified timing is treated as potentially overlapping, not inferred from document order. Product formulations and unsupported wording are not silently treated as equivalent. Reference excerpts are not needed to execute the demo.

All processing is in browser memory. No document API requests are made. Hosting access control is provided by private Sites publication. Do not enter real patient data. Export creates a local file containing the entered text and review notes. The input fingerprint is a convenience identifier, not a cryptographic security guarantee. The latest decision per medication is exported; this is not an immutable clinical audit log.

## Evaluation status

The automated tests are development regression checks, written alongside this implementation. They are not an independent or clinically adjudicated benchmark. Do not present their pass rate as clinical precision, recall, patient safety, or review-time improvement.

Next: freeze the extractor, create an independently reviewed set of synthetic cases from different templates, predefine conflict labels and evidence spans, compare against normalized-list and direct-LLM baselines, report abstentions/coverage and false alerts alongside precision and recall. No clinician study or review-time result exists yet.

## WebMCP

A feature-detected `compare_synthetic_documents` tool mirrors the page's comparison action and clears prior review decisions. Runtime registration, a valid comparison, visible input/result updates, and invalid-input rejection were verified in a WebMCP-capable local browser on September 9, 2026. The ordinary visible UI works without that API.
