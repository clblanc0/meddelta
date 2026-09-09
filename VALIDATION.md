# Initial prototype checks — September 9, 2026

- 36 development regression tests passed (36 total, 0 failed). These cover status/dose/frequency, unit conversion, aliases, date overlap, ambiguity, missing fields, formulations, duplicate instructions, source spans, and unsupported text.
- TypeScript check passed.
- Application-source lint (`oxlint app lib tests`) passed. The scaffold-wide lint has pre-existing findings in unused vendored UI components; those were not modified.
- Production build passed.
- Local route responded with HTTP 200.
- WebMCP comparison registered; valid input updated both visible textboxes and the conflict count. Invalid input was rejected and did not alter those inputs/results. No broad browser interaction or responsive QA was performed in this turn.

No independent test cohort, clinician adjudication, review-time study, or clinical performance result exists. The regression pass rate is not a measure of clinical accuracy. Current document comparisons do not verify patient identity or prescribe an appropriate regimen.
