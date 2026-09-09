export type DemoCase = {
  id: string;
  title: string;
  description: string;
  documents: [string, string];
};
const header =
  'SYNTHETIC CASE — demo only\nPatient: SYN-001\nDischarge date: 2026-09-09\nMedication instructions:\n';
export const cases: DemoCase[] = [
  {
    id: 'status',
    title: 'Stopped or continued?',
    description:
      'The discharge summary and patient list disagree on whether to take lisinopril.',
    documents: [
      header +
        'STOP lisinopril 10 mg by mouth once daily.\nCONTINUE metformin 500 mg by mouth twice daily.',
      header +
        'CONTINUE lisinopril 10 mg by mouth once daily.\nCONTINUE metformin 500 mg by mouth twice daily.',
    ],
  },
  {
    id: 'dose',
    title: 'Two different doses',
    description: 'The same medication appears with two different doses.',
    documents: [
      header + 'CONTINUE amlodipine 5 mg by mouth once daily.',
      header + 'TAKE amlodipine 10 mg by mouth once daily.',
    ],
  },
  {
    id: 'frequency',
    title: 'Different frequencies',
    description: 'The documents disagree on how often the medication is taken.',
    documents: [
      header + 'CONTINUE metformin 500 mg by mouth once daily.',
      header + 'TAKE metformin 500 mg by mouth twice daily.',
    ],
  },
  {
    id: 'timing',
    title: 'A planned restart',
    description:
      'A hold and restart have explicit, non-overlapping effective dates.',
    documents: [
      header + 'HOLD lisinopril 10 mg by mouth once daily through 2026-09-10.',
      header + 'RESUME lisinopril 10 mg by mouth once daily from 2026-09-11.',
    ],
  },
  {
    id: 'consistent',
    title: 'Matching instructions',
    description: 'A limited local alias dictionary maps Norvasc to amlodipine.',
    documents: [
      header + 'CONTINUE amlodipine 5 mg by mouth once daily.',
      header + 'TAKE Norvasc 5 mg by mouth once daily.',
    ],
  },
  {
    id: 'uncertain',
    title: 'An unclear instruction',
    description:
      '“As directed” cannot establish whether the instructions agree.',
    documents: [
      header + 'CONTINUE furosemide 20 mg by mouth once daily.',
      header + 'TAKE furosemide 20 mg by mouth as directed.',
    ],
  },
  {
    id: 'formulation',
    title: 'Formulation matters',
    description:
      'An extended-release product should not silently match an unspecified formulation.',
    documents: [
      header + 'CONTINUE metformin ER 500 mg by mouth twice daily.',
      header + 'CONTINUE metformin 500 mg by mouth twice daily.',
    ],
  },
];
