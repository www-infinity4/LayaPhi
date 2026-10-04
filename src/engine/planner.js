import { COMPONENTS } from '../components/library.js';
import { DEFAULT_PROPS } from '../components/properties.js';
import { PHI_MODES } from '../components/modes.js';

const FALLBACK = { 'media-rail': 'gallery', gallery: 'lesson', comparison: 'feature-grid', 'split-hero': 'hero', hero: 'article-lead' };

const PROFILE_DEFAULTS = {
  reader: { density: 'comfortable', textWidth: 'comfortable', collapse: 'none', emphasis: 'low', columns: 1, card: 'plain', media: 'end' },
  visual: { density: 'spacious', textWidth: 'narrow', collapse: 'after-first', emphasis: 'high', columns: 3, card: null, media: 'top' },
  video: { density: 'comfortable', textWidth: 'comfortable', collapse: 'none', emphasis: 'medium', columns: 2, card: null, media: 'end' },
  mixed: { density: 'comfortable', textWidth: 'comfortable', collapse: 'after-first', emphasis: 'medium', columns: 2, card: null, media: 'start' },
};

export const NAV_BY_PROFILE = {
  reader: ['sticky-toc', 'top-bar', 'minimal'],
  visual: ['top-bar', 'bottom-bar', 'minimal'],
  video: ['top-bar', 'bottom-bar'],
  mixed: ['sticky-toc', 'top-bar', 'bottom-bar', 'minimal'],
};

export function navOptions(profileKind, signature) {
  return signature.navigation.allowed.filter((n) => NAV_BY_PROFILE[profileKind].includes(n));
}

const GRID_TYPES = new Set(['feature-grid', 'comparison', 'related', 'gallery']);

function resolveComponent(want, registry, available, rejected) {
  let name = want;
  const seen = new Set();
  while (name) {
    seen.add(name);
    const def = COMPONENTS[name];
    const missing = def ? registry.missing(def.requires) : ['unknown-component'];
    const allowed = !available || available.includes(name);
    if (def && !missing.length && allowed) return name;
    rejected.push({ component: name, reason: !def ? 'unknown component' : missing.length ? `capability not approved: ${missing.join(', ')}` : 'not in availableComponents' });
    name = FALLBACK[name];
    if (seen.has(name)) break;
  }
  return null;
}

export function buildPlan({ analysis, archetype, profile, signature, registry }) {
  const { content } = analysis;
  const d = PROFILE_DEFAULTS[profile.kind];
  const ex = profile.explicit;
  const decisions = [];
  const rejected = [];
  const navs = navOptions(profile.kind, signature);
  const nav = navs.includes(signature.navigation.default) ? signature.navigation.default : navs[0] || 'top-bar';
  const density = ex.density || d.density;
  const card = d.card ?? signature.cards.style;

  // Lead
  const hasVideoLead = profile.kind === 'video' && analysis.hasVideo;
  let orientation;
  if (profile.kind === 'reader') orientation = 'typographic';
  else if (profile.kind === 'visual') orientation = analysis.hasImages ? 'full' : 'stacked';
  else if (hasVideoLead) orientation = 'full';
  else orientation = content.heroImage || analysis.hasVideo ? (signature.hero.behavior === 'typographic' ? 'split' : signature.hero.behavior) : 'stacked';
  if (orientation === 'typographic' && profile.kind !== 'reader' && !content.heroImage) orientation = 'stacked';
  decisions.push({ decision: `lead orientation: ${orientation}`, reason: `${profile.kind} profile${hasVideoLead ? ' with playable video in the lead' : ''}; signature hero behaviour is ${signature.hero.behavior}` });

  const makeProps = (extra = {}) => ({
    ...DEFAULT_PROPS,
    density,
    textWidth: d.textWidth,
    emphasis: d.emphasis,
    collapse: d.collapse,
    cardTreatment: card,
    ...extra,
  });

  const instances = [];
  const plan = {
    archetype,
    nav,
    sourceStyle: profile.kind === 'reader' ? 'footnotes' : 'list',
    mediaMode: profile.kind === 'mixed' ? 'alternate' : d.media,
    lead: { orientation, preferVideo: hasVideoLead },
    components: instances,
    tokens: {},
    rejected,
    decisions,
  };
  if (ex.largeText) plan.tokens.textScale = 1.125;

  instances.push({ id: 'lead', component: 'article-lead', role: 'lead', props: makeProps({ alignment: signature.hero.behavior === 'stacked' && profile.kind !== 'reader' ? 'center' : 'start', emphasis: 'high', mediaPosition: 'top' }) });

  const tocEntries = content.sections.filter((s) => s.type !== 'quote').map((s) => ({ id: `s-${s.id}`, title: s.title, thumb: (s.image || s.images?.[0])?.src }));
  const sources = (content.sources || []).length;
  if (sources) tocEntries.push({ id: 'sources', title: 'Sources' });
  if (tocEntries.length > 2) {
    instances.push({ id: 'toc', component: 'toc', role: 'toc', variant: profile.kind === 'visual' && analysis.hasImages ? 'visual' : 'list', entries: tocEntries, props: makeProps({ cardTreatment: 'none', density: 'comfortable' }) });
    decisions.push({ decision: 'table of contents included', reason: `${tocEntries.length} navigable sections; ${profile.kind === 'visual' ? 'rendered as visual navigation chips with thumbnails' : 'rendered as readable list'}` });
  }

  content.sections.forEach((s, i) => {
    let want = s.type;
    if (want === 'gallery' && profile.kind !== 'reader' && (s.images || []).length >= 4 && profile.kind !== 'mixed') want = 'media-rail';
    if (want !== s.type) decisions.push({ decision: `${s.id}: gallery → media-rail`, reason: `${profile.kind} profile favours a scrolling visual rail for ${(s.images || []).length} images` });
    const component = resolveComponent(want, registry, content.availableComponents, rejected);
    if (!component) { rejected.push({ component: want, section: s.id, reason: 'no available fallback; section omitted' }); return; }
    const hasImage = Boolean(s.image);
    const columns = GRID_TYPES.has(s.type) ? Math.min(d.columns, s.type === 'gallery' ? 3 : (s.items || s.images || []).length || 1) : 1;
    const props = makeProps({
      columns,
      mediaPosition: hasImage ? (profile.kind === 'mixed' ? (i % 2 ? 'end' : 'start') : d.media) : 'top',
      collapse: s.type === 'lesson' || s.type === 'research' ? (d.collapse === 'after-first' ? 'after-first' : 'none') : 'none',
      emphasis: s.type === 'callout' ? 'high' : d.emphasis,
      borderTreatment: s.type === 'callout' ? 'accent' : 'none',
      backgroundTreatment: s.type === 'callout' && profile.kind !== 'reader' ? 'surface' : 'none',
    });
    instances.push({ id: `s-${s.id}`, component, sectionId: s.id, section: s, mode: s.mode, props });
  });

  if (sources) {
    instances.push({ id: 'sources', component: 'sources', role: 'sources', section: { title: 'Sources', items: content.sources }, props: makeProps({ cardTreatment: 'none' }) });
  }
  instances.push({ id: 'footer', component: 'footer', role: 'footer', props: makeProps({ cardTreatment: 'none' }) });

  if (plan.nav === 'sticky-toc' && !instances.some((c) => c.role === 'toc')) plan.nav = 'top-bar';
  decisions.push({ decision: `modes present: ${analysis.modes.map((m) => `${m}=${PHI_MODES[m].name}`).join(', ')}`, reason: `rendered with "${signature.modeTreatment}" treatment by ${signature.id}` });
  return plan;
}

/** Map the lead orientation onto a concrete component after mutation. */
export function finalizeLead(plan, registry, available) {
  const lead = plan.components.find((c) => c.role === 'lead');
  const want = { full: 'hero', split: 'split-hero', stacked: 'article-lead', typographic: 'article-lead' }[plan.lead.orientation];
  const name = resolveComponent(want, registry, available, plan.rejected);
  lead.component = name || 'article-lead';
}
