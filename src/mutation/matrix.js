import { createRng } from '../util/rng.js';
import { navOptions } from '../engine/planner.js';

const REORDERABLE = new Set(['callout', 'quote', 'statistics', 'gallery', 'media-rail']);

const withImage = (plan) => plan.components.filter((c) => c.section?.image && c.component !== 'gallery');
const bodyInstances = (plan) => plan.components.filter((c) => c.role !== 'toc');

/** Reject helper: split values into allowed/rejected using rules [{when, reason}] per value. */
function filter(values, rule) {
  const allowed = [];
  const rejected = [];
  for (const v of values) {
    const reason = rule(v);
    if (reason) rejected.push({ value: v, reason });
    else allowed.push(v);
  }
  return { allowed, rejected };
}

function orderVariant(plan, variant) {
  const comps = plan.components.slice();
  if (variant === 'authored') return comps;
  const firstCore = comps.findIndex((c) => ['lesson', 'research'].includes(c.component));
  const kind = variant === 'stats-early' ? ['statistics'] : ['gallery', 'media-rail'];
  const idx = comps.findIndex((c) => kind.includes(c.component));
  if (firstCore < 0 || idx < 0 || idx <= firstCore + 1) return comps;
  const [moved] = comps.splice(idx, 1);
  comps.splice(firstCore + 1, 0, moved);
  return comps;
}

export const MUTATIONS = [
  {
    id: 'hero.orientation',
    target: 'lead',
    current: ({ plan }) => plan.lead.orientation,
    values: ['full', 'split', 'stacked', 'typographic'],
    rule: ({ analysis, profile, plan }) => (v) => {
      const media = analysis.hasImages || analysis.hasVideo;
      if ((v === 'full' || v === 'split') && !media) return 'no imagery/video to build a media hero';
      if (profile.kind === 'reader' && v === 'full') return 'reader profile keeps imagery restrained';
      if (profile.kind === 'video' && plan.lead.preferVideo && v === 'typographic') return 'video profile must keep playable media in the lead';
      if (profile.kind === 'visual' && v === 'typographic') return 'visual profile requires a media lead';
      return null;
    },
    apply: (plan, v) => { plan.lead.orientation = v; },
  },
  {
    id: 'section.order',
    target: 'sections',
    current: () => 'authored',
    values: ['authored', 'stats-early', 'media-forward'],
    rule: ({ plan, profile }) => (v) => {
      const reordered = orderVariant(plan, v);
      if (v !== 'authored' && reordered.every((c, i) => c === plan.components[i])) return 'no eligible section to move';
      if (v === 'media-forward' && profile.kind === 'reader') return 'reader profile keeps explanatory text ahead of media';
      return null;
    },
    apply: (plan, v) => { plan.components = orderVariant(plan, v); },
  },
  {
    id: 'column.ratio',
    target: 'split layouts',
    current: () => '1:1',
    values: ['1:1', '2:1', '3:2', '1:2'],
    rule: ({ plan, profile }) => (v) => {
      if (!plan.components.some((c) => c.component === 'split-hero' || c.section?.image) && plan.lead.orientation !== 'split') return 'no split layout present';
      if (profile.kind === 'reader' && v === '1:2') return 'would squeeze text column below 40% on reader layouts';
      if (v === '1:2' && plan.mediaMode === 'alternate') return 'ratio would alternate text column widths';
      return null;
    },
    apply: (plan, v) => { plan.tokens.columnRatio = v; },
  },
  {
    id: 'media.placement',
    target: 'sections with media',
    current: ({ plan }) => plan.mediaMode,
    values: ['start', 'end', 'top', 'bottom', 'alternate'],
    rule: ({ plan, profile }) => (v) => {
      if (!withImage(plan).length) return 'no sections with inline media';
      if (profile.kind === 'reader' && (v === 'start' || v === 'top')) return 'reader profile reads text first; media follows';
      if (profile.kind === 'visual' && (v === 'end' || v === 'bottom')) return 'visual profile leads with media';
      if (v === 'alternate' && profile.kind !== 'mixed') return 'alternating placement reserved for balanced layouts';
      return null;
    },
    apply: (plan, v) => {
      plan.mediaMode = v;
      withImage(plan).forEach((c, i) => { c.props.mediaPosition = v === 'alternate' ? (i % 2 ? 'end' : 'start') : v; });
    },
  },
  {
    id: 'density',
    target: 'all components',
    current: ({ plan }) => bodyInstances(plan)[0].props.density,
    values: ['compact', 'comfortable', 'spacious'],
    rule: ({ profile, plan }) => (v) => {
      if (profile.explicit.density && v !== (profile.explicit.density)) return 'user explicitly chose a density';
      if (v === 'compact' && profile.kind !== 'video' && !profile.explicit.density) return 'compact density harms readability/tap spacing for this profile';
      return null;
    },
    apply: (plan, v) => { bodyInstances(plan).forEach((c) => { c.props.density = v; }); },
  },
  {
    id: 'navigation.style',
    target: 'page',
    current: ({ plan }) => plan.nav,
    values: ['top-bar', 'bottom-bar', 'sticky-toc', 'minimal'],
    rule: ({ plan, profile, signature }) => (v) => {
      if (!navOptions(profile.kind, signature).includes(v)) return `not allowed by ${signature.id} / ${profile.kind} profile`;
      if (v === 'sticky-toc' && !plan.components.some((c) => c.role === 'toc')) return 'sticky-toc requires a table of contents';
      return null;
    },
    apply: (plan, v) => { plan.nav = v; },
  },
  {
    id: 'section.rhythm',
    target: 'page',
    current: ({ signature }) => signature.rhythm.pattern,
    values: ['uniform', 'alternating', 'accelerating'],
    rule: ({ profile }) => (v) => (profile.kind === 'reader' && v === 'accelerating' ? 'uneven rhythm hurts scanning in reader layouts' : null),
    apply: (plan, v) => { plan.tokens.rhythm = v; },
  },
  {
    id: 'type.scale',
    target: 'typography',
    current: ({ signature }) => signature.typography.scaleRatio,
    values: [1.125, 1.2, 1.25, 1.333],
    rule: ({ profile, signature }) => (v) => {
      if (Math.abs(v - signature.typography.scaleRatio) > 0.1) return 'differs too far from the signature type scale';
      if (profile.kind === 'reader' && v > 1.25) return 'reader layouts cap heading contrast at 1.25';
      return null;
    },
    apply: (plan, v) => { plan.tokens.typeScale = v; },
  },
  {
    id: 'card.geometry',
    target: 'cards',
    current: () => 1,
    values: [0, 0.5, 1, 2],
    rule: ({ signature }) => (v) => {
      const g = signature.corners.geometry;
      if (g === 'square' && v !== 1) return 'square signatures stay square';
      if (g === 'pill' && v < 1) return 'pill signatures keep rounded geometry';
      if (signature.corners.radius * v > 32) return 'radius would exceed 32px';
      return null;
    },
    apply: (plan, v) => { plan.tokens.cardRadius = v; },
  },
  {
    id: 'whitespace',
    target: 'spacing scale',
    current: () => 1,
    values: [0.85, 1, 1.15, 1.3],
    rule: ({ profile }) => (v) => (v < 1 && profile.kind !== 'reader' ? 'only dense reading layouts tighten whitespace' : null),
    apply: (plan, v) => { plan.tokens.whitespace = v; },
  },
  {
    id: 'source.presentation',
    target: 'sources',
    current: ({ plan }) => plan.sourceStyle,
    values: ['list', 'footnotes', 'cards', 'collapsible'],
    rule: ({ plan, profile }) => (v) => {
      if (!plan.components.some((c) => c.role === 'sources')) return 'no sources in content';
      if (profile.kind === 'reader' && (v === 'collapsible' || v === 'cards')) return 'reader profile keeps citations visible and plain';
      return null;
    },
    apply: (plan, v) => { plan.sourceStyle = v; },
  },
];

/**
 * Deterministically apply compatible mutations. Every mutation draws from its own
 * (seed, id) random stream, so adding/removing one never changes the others.
 */
export function applyMutations(plan, ctx, seed) {
  const applied = [];
  const rejected = [];
  const unchanged = [];
  const full = { ...ctx, plan };
  for (const m of MUTATIONS) {
    if (!ctx.signature.mutation.allowed.includes(m.id)) {
      rejected.push({ id: m.id, value: '*', reason: `not allowed by signature ${ctx.signature.id}` });
      continue;
    }
    const current = m.current(full);
    const { allowed, rejected: rej } = filter(m.values, m.rule(full));
    rej.forEach((r) => rejected.push({ id: m.id, ...r }));
    const pool = allowed.includes(current) ? allowed : [current, ...allowed];
    const chosen = createRng(seed, `mutation:${m.id}`).pick(pool);
    if (chosen === current) { unchanged.push(m.id); continue; }
    m.apply(plan, chosen);
    applied.push({ id: m.id, target: m.target, from: current, to: chosen, reason: `chosen from ${pool.length} compatible options` });
  }
  return { applied, rejected, unchanged };
}
