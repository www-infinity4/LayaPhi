// Preference adaptation. Behavioural preference is a design *signal*, never a
// restriction, and never derived from sensitive personal traits.

const SENSITIVE = /(^|[_-])(age|gender|sex|race|ethnicity|religion|disabilit\w*|health|medical|diagnos\w*|politic\w*|sexual\w*|orientation|nationality|income|pregnan\w*|union|biometric\w*|dyslex\w*|adhd|autis\w*|neuro\w*)([_-]|$)/i;

const WEIGHTS = {
  reader: { text: 0.8, media: 0.2 },
  visual: { text: 0.3, media: 0.7 },
  video: { text: 0.35, media: 0.65 },
  mixed: { text: 0.5, media: 0.5 },
};

const PURPOSE_LEAN = {
  reference: 'reader', research: 'reader', documentation: 'reader',
  gallery: 'visual', portfolio: 'visual',
  'video-course': 'video',
};

const EXPLICIT_KEYS = ['reducedMotion', 'density', 'largeText', 'highContrast'];

function findSensitive(obj, prefix = '') {
  const found = [];
  if (!obj || typeof obj !== 'object') return found;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (SENSITIVE.test(k.replace(/([a-z])([A-Z])/g, '$1_$2'))) found.push(p);
    else found.push(...findSensitive(v, p));
  }
  return found;
}

function stripSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE.test(k.replace(/([a-z])([A-Z])/g, '$1_$2'))) continue;
    out[k] = stripSensitive(v);
  }
  return out;
}

export function adaptPreferences(rawPrefs, analysis, purpose) {
  const ignoredSignals = findSensitive(rawPrefs).map((s) => ({ signal: s, reason: 'sensitive personal attribute — never used for layout' }));
  const prefs = stripSensitive(rawPrefs) || {};
  const signalsUsed = [];
  const overrides = [];
  let kind = 'mixed';
  let confidence = 0;
  let basis = 'default';

  if (['reader', 'visual', 'video', 'mixed'].includes(prefs.style)) {
    kind = prefs.style; confidence = 0.9; basis = 'explicit-style';
    signalsUsed.push('style');
  } else if (prefs.signals) {
    const s = ['text', 'image', 'video'].map((k) => [k, Number(prefs.signals[k]) || 0]);
    const total = s.reduce((a, [, v]) => a + v, 0);
    if (total > 0) {
      const share = Object.fromEntries(s.map(([k, v]) => [k, v / total]));
      const [top, second] = [...Object.entries(share)].sort((a, b) => b[1] - a[1]);
      if (top[1] >= 0.5 && top[1] - second[1] >= 0.15) {
        kind = { text: 'reader', image: 'visual', video: 'video' }[top[0]];
        confidence = Number(top[1].toFixed(2));
      } else confidence = Number((1 - top[1]).toFixed(2));
      basis = 'consumption-signals';
      signalsUsed.push('signals.text', 'signals.image', 'signals.video');
    }
  }

  // Content may not support the preference.
  if (kind === 'video' && !analysis.hasVideo) {
    overrides.push({ from: 'video', to: analysis.hasImages ? 'visual' : 'mixed', reason: 'no video content available' });
    kind = analysis.hasImages ? 'visual' : 'mixed';
  }
  if (kind === 'visual' && !analysis.hasImages) {
    overrides.push({ from: 'visual', to: 'reader', reason: 'no imagery available' });
    kind = 'reader';
  }
  // Purpose may require a different shape; preference is a signal, not a restriction.
  const lean = PURPOSE_LEAN[purpose];
  if (lean && lean !== kind && !(lean === 'video' && !analysis.hasVideo) && !(lean === 'visual' && !analysis.hasImages)) {
    const to = confidence >= 0.85 ? 'mixed' : lean;
    overrides.push({ from: kind, to, reason: `site purpose "${purpose}" favours a ${lean} layout` });
    kind = to;
  }

  const explicit = {};
  for (const k of EXPLICIT_KEYS) if (prefs[k] !== undefined) { explicit[k] = prefs[k]; signalsUsed.push(k); }
  if (explicit.density && !['compact', 'comfortable', 'spacious'].includes(explicit.density)) delete explicit.density;

  return { kind, weights: WEIGHTS[kind], confidence, basis, explicit, signalsUsed, ignoredSignals, overrides };
}
