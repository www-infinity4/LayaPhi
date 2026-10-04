// The five Phi educational modes are semantic. Visual treatment comes from the
// design signature (`modeTreatment` + per-mode colours), never from the mode itself.
export const PHI_MODES = {
  yellow: { name: 'Explore', meaning: 'Related ideas, discoveries and directions' },
  green: { name: 'Engineer', meaning: 'Mechanisms, construction, systems and design' },
  blue: { name: 'Understand', meaning: 'Principles, explanation, evidence and background' },
  red: { name: 'Challenge', meaning: 'Problems, limitations, competing explanations and critical questions' },
  orange: { name: 'Build', meaning: 'Projects, experiments, practical application and creation' },
};

/** Default mode for a section type when the author did not set one. */
export const DEFAULT_MODE_BY_TYPE = {
  related: 'yellow',
  'feature-grid': 'green',
  lesson: 'blue',
  research: 'blue',
  statistics: 'blue',
  timeline: 'blue',
  comparison: 'red',
  faq: 'red',
  experiment: 'orange',
  project: 'orange',
};
