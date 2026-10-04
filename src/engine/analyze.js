import { slug, paragraphs } from '../util/html.js';
import { DEFAULT_MODE_BY_TYPE } from '../components/modes.js';

const CORE = new Set(['lesson', 'research', 'experiment', 'project']);
const SUPPORT = new Set(['feature-grid', 'comparison', 'timeline', 'statistics', 'faq']);

/** Normalise content (ids, modes) and derive hierarchy facts. Never mutates the input. */
export function analyzeContent(input) {
  const content = structuredClone(input);
  const used = new Set();
  content.lang = content.lang || 'en';
  content.sections = content.sections.map((s) => {
    let id = s.id ? slug(s.id) : slug(s.title);
    for (let n = 2; used.has(id); n++) id = `${slug(s.id || s.title)}-${n}`;
    used.add(id);
    return { ...s, id, mode: s.mode || DEFAULT_MODE_BY_TYPE[s.type] };
  });

  const imagesOf = (s) => [s.image, ...(s.images || [])].filter(Boolean);
  const hasImages = Boolean(content.heroImage) || content.sections.some((s) => imagesOf(s).length);
  const words = content.sections.reduce((n, s) => n + paragraphs(s).join(' ').split(/\s+/).filter(Boolean).length, 0);
  const count = (set) => content.sections.filter((s) => set.has(s.type)).length;
  const modes = [...new Set(content.sections.map((s) => s.mode).filter(Boolean))];

  const hierarchy = content.sections.map((s) => ({
    id: s.id, type: s.type,
    tier: CORE.has(s.type) ? 'core' : SUPPORT.has(s.type) ? 'supporting' : 'auxiliary',
  }));

  return {
    content,
    hasImages,
    hasVideo: Boolean(content.video),
    imageCount: content.sections.reduce((n, s) => n + imagesOf(s).length, 0) + (content.heroImage ? 1 : 0),
    wordCount: words,
    coreCount: count(CORE),
    buildShare: content.sections.filter((s) => s.mode === 'orange').length / content.sections.length,
    modes,
    hierarchy,
  };
}

export function chooseArchetype(analysis, purpose) {
  const map = { 'video-course': 'course', gallery: 'visual-story', portfolio: 'visual-story', 'project-guide': 'project-guide', landing: 'landing', reference: 'research', research: 'research', documentation: 'research', article: 'article', blog: 'article' };
  if (map[purpose]) return { archetype: map[purpose], reason: `purpose "${purpose}" maps to ${map[purpose]}` };
  if (analysis.buildShare >= 0.5) return { archetype: 'project-guide', reason: 'majority of sections are Build (orange) mode' };
  return { archetype: 'explainer', reason: 'educational content with mixed Phi modes' };
}
