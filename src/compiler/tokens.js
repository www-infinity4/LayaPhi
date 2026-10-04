// Design signature (+ controlled mutation overrides) → CSS custom properties.
const r = (n) => Number(n.toFixed(4));

const RATIOS = { '1:1': '1fr 1fr', '2:1': '2fr 1fr', '1:2': '1fr 2fr', '3:2': '3fr 2fr' };
const RHYTHM = { uniform: [1, 1, 1], alternating: [1, 0.7, 1.3], accelerating: [0.8, 1, 1.4] };

export const MEASURE_FACTOR = { narrow: 0.8, comfortable: 1, wide: 1.15 };

/** Modular scale step n as a fluid clamp() between 20rem and 60rem viewports. */
export function fluidStep(base, ratio, n) {
  const max = base * ratio ** n;
  const min = base * (1 + (ratio - 1) * 0.6) ** n;
  if (Math.abs(max - min) < 0.001) return `${r(max)}rem`;
  const slope = (max - min) / 40; // rem per rem of viewport width
  const intercept = min - slope * 20;
  return `clamp(${r(Math.min(min, max))}rem, ${r(intercept)}rem + ${r(slope * 100)}vw, ${r(Math.max(min, max))}rem)`;
}

export function compileTokens(sig, ov = {}) {
  const t = sig.typography;
  const ratio = ov.typeScale ?? t.scaleRatio;
  const spaceMul = ov.whitespace ?? 1;
  const radius = r(sig.corners.radius * (ov.cardRadius ?? 1));
  const rhythm = RHYTHM[ov.rhythm ?? sig.rhythm.pattern];
  const base = t.baseSize * (ov.textScale ?? 1);
  const v = {
    'color-scheme': sig.colors.scheme,
    'font-heading': t.fontRoles.heading,
    'font-body': t.fontRoles.body,
    'font-mono': t.fontRoles.mono,
    'w-body': t.weights.body,
    'w-heading': t.weights.heading,
    'w-strong': t.weights.strong,
    lh: t.lineHeight,
  };
  for (let n = -1; n <= 5; n++) v[`step-${n < 0 ? 'n' + -n : n}`] = fluidStep(base, ratio, n);
  sig.spacing.scale.forEach((s, i) => { v[`space-${i}`] = `${r(s * spaceMul)}rem`; });
  Object.assign(v, {
    measure: `${sig.contentWidth.text}ch`,
    page: `${sig.contentWidth.page}px`,
    bg: sig.colors.bg, surface: sig.colors.surface, text: sig.colors.text, muted: sig.colors.muted,
    link: sig.colors.link, accent: sig.colors.accent, focus: sig.colors.focus, border: sig.colors.border,
  });
  for (const [m, c] of Object.entries(sig.colors.modes)) {
    v[`mode-${m}-bg`] = c.bg; v[`mode-${m}-fg`] = c.fg; v[`mode-${m}-accent`] = c.accent;
  }
  Object.assign(v, {
    'border-w': `${sig.borders.width}px`,
    'border-style': sig.borders.style,
    radius: `${radius}px`,
    'shadow-card': sig.shadows.card,
    'section-gap': `var(--space-${sig.rhythm.section})`,
    'rhythm-0': rhythm[0], 'rhythm-1': rhythm[1], 'rhythm-2': rhythm[2],
    'hero-min': sig.hero.minHeight ? `${sig.hero.minHeight}vh` : 'auto',
    'img-aspect': sig.imageTreatment.aspect,
    'img-fit': sig.imageTreatment.fit,
    'vid-aspect': sig.videoTreatment.aspect,
    'card-pad': `${sig.cards.padding}rem`,
    'split-ratio': RATIOS[ov.columnRatio ?? '1:1'],
    anim: `${sig.animation.transitions ? sig.animation.maxDurationMs : 0}ms`,
    tap: '44px',
  });
  const body = Object.entries(v).map(([k, val]) => `--${k}:${val};`).join('');
  return `:root{${body}}`;
}
