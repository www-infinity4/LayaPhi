import { esc, safeUrl, paragraphs, slug } from '../util/html.js';
import { PHI_MODES } from './modes.js';
import { DEFAULT_PROPS } from './properties.js';

const ALL_PROPS = Object.keys(DEFAULT_PROPS);

function attrs(inst) {
  const p = inst.props;
  const a = [
    `id="${esc(inst.id)}"`,
    `data-component="${inst.component}"`,
    `data-density="${p.density}"`,
    `data-align="${p.alignment}"`,
    `data-cols="${p.columns}"`,
    `data-media="${p.mediaPosition}"`,
    `data-measure="${p.textWidth}"`,
    `data-space="${p.sectionSpacing}"`,
    `data-emphasis="${p.emphasis}"`,
    `data-card="${p.cardTreatment}"`,
    `data-border="${p.borderTreatment}"`,
    `data-bg="${p.backgroundTreatment}"`,
  ];
  if (inst.mode) a.push(`data-mode="${inst.mode}"`);
  if (inst.variant) a.push(`data-variant="${inst.variant}"`);
  if (inst.rhythmIndex !== undefined) a.push(`data-rhythm="${inst.rhythmIndex % 3}"`);
  return a.join(' ');
}

const modeTag = (mode) => (mode ? `<p class="mode-tag"><span class="mode-dot" aria-hidden="true"></span>${esc(PHI_MODES[mode].name)}</p>` : '');
const heading = (inst, title, level = 2) => `<h${level} id="${esc(inst.id)}-h">${esc(title)}</h${level}>`;

function image(img, { lazy = true, cls = 'media' } = {}) {
  if (!img) return '';
  const dims = (img.width && img.height) ? ` width="${Number(img.width)}" height="${Number(img.height)}"` : '';
  const alt = img.decorative ? '' : img.alt ?? '';
  const el = `<img src="${esc(safeUrl(img.src))}" alt="${esc(alt)}"${img.decorative ? ' data-decorative="true"' : ''}${dims}${lazy ? ' loading="lazy"' : ''} decoding="async">`;
  return `<figure class="${cls}">${el}${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`;
}

export function video(v, id) {
  if (!v) return '';
  const poster = v.poster ? ` poster="${esc(safeUrl(v.poster))}"` : '';
  const tracks = (v.captions || []).map((c) => `<track kind="captions" src="${esc(safeUrl(c.src))}" srclang="${esc(c.lang || 'en')}" label="${esc(c.label || 'Captions')}">`).join('');
  return `<figure class="media video"><video id="${esc(id)}-video" controls preload="metadata" playsinline aria-label="${esc(v.title || 'Video')}"${poster}><source src="${esc(safeUrl(v.src))}">${tracks}<p>Your browser cannot play this video. <a href="${esc(safeUrl(v.src))}">Download the video</a>.</p></video>${v.title ? `<figcaption>${esc(v.title)}</figcaption>` : ''}</figure>`;
}

function chapters(v, id) {
  if (!v?.chapters?.length) return '';
  const items = v.chapters.map((c) => `<li><a href="#${esc(id)}-video" data-seek="${Number(c.t) || 0}">${esc(c.label)}<span class="time">${fmtTime(c.t)}</span></a></li>`).join('');
  return `<nav class="chapters" aria-label="Video chapters"><p class="chapters-title"><strong>Chapters</strong></p><ol>${items}</ol></nav>`;
}
const fmtTime = (t) => `${Math.floor((Number(t) || 0) / 60)}:${String(Math.floor((Number(t) || 0) % 60)).padStart(2, '0')}`;

function prose(inst, s) {
  const paras = paragraphs(s);
  const html = paras.map((t) => `<p>${esc(t)}</p>`);
  if (inst.props.collapse === 'after-first' && html.length > 1) {
    return `${html[0]}<details class="more"><summary>Read more</summary>${html.slice(1).join('')}</details>`;
  }
  return html.join('');
}

const list = (arr, cls) => (arr?.length ? `<ul class="${cls}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
const olist = (arr, cls) => (arr?.length ? `<ol class="${cls}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '');

function withMedia(inst, textHtml, mediaHtml) {
  if (!mediaHtml) return `<div class="body">${textHtml}</div>`;
  const pos = inst.props.mediaPosition;
  const media = `<div class="side">${mediaHtml}</div>`;
  const text = `<div class="body">${textHtml}</div>`;
  const first = pos === 'start' || pos === 'top';
  return `<div class="split">${first ? media + text : text + media}</div>`;
}

function section(inst, inner, tag = 'section') {
  return `<${tag} ${attrs(inst)} aria-labelledby="${esc(inst.id)}-h">${inner}</${tag}>`;
}

function sectionHead(inst, s) {
  return `${modeTag(inst.mode)}${heading(inst, s.title)}${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ''}`;
}

const cta = (c) => (c ? `<p class="cta"><a class="button" href="${esc(safeUrl(c.href))}">${esc(c.label)}</a></p>` : '');

function leadInner(inst, ctx, { media }) {
  const c = ctx.content;
  return `<div class="lead-text">${c.topic ? `<p class="eyebrow">${esc(c.topic)}</p>` : ''}<h1 id="${esc(inst.id)}-h">${esc(c.title)}</h1>${c.summary ? `<p class="summary">${esc(c.summary)}</p>` : ''}${cta(c.cta)}</div>${media ? `<div class="lead-media">${media}</div>` : ''}`;
}

function leadMedia(inst, ctx) {
  const c = ctx.content;
  if (c.video && ctx.plan.lead.preferVideo) return video(c.video, inst.id) + chapters(c.video, inst.id);
  return ctx.plan.lead.orientation === 'typographic' ? '' : image(c.heroImage, { lazy: false });
}

export const COMPONENTS = {
  hero: {
    family: 'lead', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst, ctx) => section(inst, leadInner(inst, ctx, { media: leadMedia(inst, ctx) })),
  },
  'split-hero': {
    family: 'lead', requires: ['semantic-html', 'css-grid-layout'], adjustable: ALL_PROPS,
    render: (inst, ctx) => section(inst, leadInner(inst, ctx, { media: leadMedia(inst, ctx) })),
  },
  'article-lead': {
    family: 'lead', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst, ctx) => {
      const c = ctx.content;
      const meta = c.meta ? `<p class="meta">${esc(c.meta)}</p>` : '';
      return section(inst, leadInner(inst, ctx, { media: leadMedia(inst, ctx) }).replace('</h1>', `</h1>${meta}`));
    },
  },
  toc: {
    family: 'navigation', requires: ['semantic-html', 'details-disclosure'], adjustable: ALL_PROPS,
    render: (inst, ctx) => {
      const items = inst.entries.map((e) => {
        const thumb = inst.variant === 'visual' && e.thumb ? `<img src="${esc(safeUrl(e.thumb))}" alt="" data-decorative="true" loading="lazy" decoding="async" width="56" height="56">` : '';
        return `<li><a href="#${esc(e.id)}">${thumb}<span>${esc(e.title)}</span></a></li>`;
      }).join('');
      return `<nav ${attrs(inst)} aria-labelledby="${esc(inst.id)}-h"><details class="toc-disclosure" open><summary id="${esc(inst.id)}-h">On this page</summary><ol>${items}</ol></details></nav>`;
    },
  },
  lesson: {
    family: 'educational', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst, ctx) => {
      const s = inst.section;
      const media = image(s.image) || '';
      const keys = s.keyPoints?.length ? `<div class="key-points"><h3>Key points</h3>${list(s.keyPoints, 'points')}</div>` : '';
      return section(inst, sectionHead(inst, s) + withMedia(inst, prose(inst, s) + keys, media));
    },
  },
  research: {
    family: 'educational', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst, ctx) => {
      const s = inst.section;
      const refs = s.sources?.length ? `<p class="refs">Sources: ${s.sources.map((r) => `<a href="${esc(safeUrl(r.url))}">${esc(r.title)}</a>`).join('; ')}</p>` : '';
      return section(inst, sectionHead(inst, s) + withMedia(inst, prose(inst, s) + refs, image(s.image)));
    },
  },
  experiment: {
    family: 'educational', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const mats = s.materials?.length ? `<div class="materials"><h3>Materials</h3>${list(s.materials, 'points')}</div>` : '';
      const steps = s.steps?.length ? `<div class="steps"><h3>Steps</h3>${olist(s.steps, 'steps')}</div>` : '';
      const safety = s.safety ? `<p class="note"><strong>Safety:</strong> ${esc(s.safety)}</p>` : '';
      return section(inst, sectionHead(inst, s) + withMedia(inst, prose(inst, s) + mats + steps + safety, image(s.image)));
    },
  },
  project: {
    family: 'educational', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const mats = s.materials?.length ? `<div class="materials"><h3>You will need</h3>${list(s.materials, 'points')}</div>` : '';
      const steps = s.steps?.length ? `<div class="steps"><h3>Instructions</h3>${olist(s.steps, 'steps')}</div>` : '';
      return section(inst, sectionHead(inst, s) + withMedia(inst, prose(inst, s) + mats + steps, image(s.image)));
    },
  },
  'feature-grid': {
    family: 'collection', requires: ['semantic-html', 'css-grid-layout'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const cards = (s.items || []).map((it) => `<li class="card"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`).join('');
      return section(inst, sectionHead(inst, s) + (prose(inst, s)) + `<ul class="grid">${cards}</ul>`);
    },
  },
  comparison: {
    family: 'collection', requires: ['semantic-html', 'css-grid-layout'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const cols = (s.items || []).map((it) => `<li class="card"><h3>${esc(it.title)}</h3>${it.text ? `<p>${esc(it.text)}</p>` : ''}${list(it.points, 'points')}</li>`).join('');
      return section(inst, sectionHead(inst, s) + prose(inst, s) + `<ul class="grid compare">${cols}</ul>`);
    },
  },
  timeline: {
    family: 'collection', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const items = (s.items || []).map((it) => `<li><p class="when">${esc(it.label)}</p><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p></li>`).join('');
      return section(inst, sectionHead(inst, s) + prose(inst, s) + `<ol class="timeline">${items}</ol>`);
    },
  },
  statistics: {
    family: 'collection', requires: ['semantic-html', 'css-grid-layout'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const items = (s.items || []).map((it) => `<div class="stat"><dt>${esc(it.label)}</dt><dd><strong>${esc(it.value)}</strong>${it.note ? `<span>${esc(it.note)}</span>` : ''}</dd></div>`).join('');
      return section(inst, sectionHead(inst, s) + prose(inst, s) + `<dl class="stats">${items}</dl>`);
    },
  },
  gallery: {
    family: 'media', requires: ['semantic-html', 'css-grid-layout'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const figs = (s.images || []).map((im) => `<li>${image(im)}</li>`).join('');
      return section(inst, sectionHead(inst, s) + prose(inst, s) + `<ul class="gallery">${figs}</ul>`);
    },
  },
  'media-rail': {
    family: 'media', requires: ['semantic-html', 'scroll-snap-rail'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const figs = (s.images || []).map((im) => `<li>${image(im)}</li>`).join('');
      return section(inst, sectionHead(inst, s) + prose(inst, s) + `<ul class="rail" tabindex="0" role="list" aria-label="${esc(s.title)} (scrollable)">${figs}</ul>`);
    },
  },
  callout: {
    family: 'text', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      return section(inst, sectionHead(inst, s) + `<div class="body">${prose(inst, s)}</div>`, 'aside');
    },
  },
  quote: {
    family: 'text', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const cite = s.cite ? `<figcaption>— ${esc(s.cite)}</figcaption>` : '';
      return `<section ${attrs(inst)} aria-label="${esc(s.title || 'Quote')}"><figure class="quote"><blockquote>${paragraphs(s).map((t) => `<p>${esc(t)}</p>`).join('')}</blockquote>${cite}</figure></section>`;
    },
  },
  faq: {
    family: 'text', requires: ['semantic-html', 'details-disclosure'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const items = (s.items || []).map((it) => `<details class="faq-item"><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join('');
      return section(inst, sectionHead(inst, s) + `<div class="faq">${items}</div>`);
    },
  },
  related: {
    family: 'collection', requires: ['semantic-html', 'css-grid-layout'], adjustable: ALL_PROPS,
    render: (inst) => {
      const s = inst.section;
      const items = (s.items || []).map((it) => `<li class="card"><h3>${it.href ? `<a href="${esc(safeUrl(it.href))}">${esc(it.title)}</a>` : esc(it.title)}</h3>${it.text ? `<p>${esc(it.text)}</p>` : ''}</li>`).join('');
      return section(inst, sectionHead(inst, s) + `<ul class="grid">${items}</ul>`);
    },
  },
  sources: {
    family: 'text', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst, ctx) => {
      const style = ctx.plan.sourceStyle;
      const items = (inst.section.items || []).map((r) => {
        const link = r.url ? `<a href="${esc(safeUrl(r.url))}">${esc(r.title)}</a>` : esc(r.title);
        return `<li>${link}${r.publisher ? ` — <span class="publisher">${esc(r.publisher)}</span>` : ''}${r.note ? `<span class="note"> ${esc(r.note)}</span>` : ''}</li>`;
      }).join('');
      const tag = style === 'footnotes' ? 'ol' : 'ul';
      const body = `<${tag} class="sources sources-${style}">${items}</${tag}>`;
      if (style === 'collapsible') {
        return `<section ${attrs(inst)} aria-labelledby="${esc(inst.id)}-h">${heading(inst, inst.section.title || 'Sources')}<details class="more"><summary>Show ${(inst.section.items || []).length} sources</summary>${body}</details></section>`;
      }
      return section(inst, heading(inst, inst.section.title || 'Sources') + body);
    },
  },
  footer: {
    family: 'chrome', requires: ['semantic-html'], adjustable: ALL_PROPS,
    render: (inst, ctx) => {
      const c = ctx.content;
      return `<footer ${attrs(inst)}>${c.cta ? `${c.cta.text ? `<p class="footer-cta">${esc(c.cta.text)}</p>` : ''}${cta(c.cta)}` : ''}<p class="colophon">${esc(c.footerNote || `${c.title}`)}</p><p class="colophon">Generated by LayaPhi ${esc(ctx.generatorVersion)}.</p></footer>`;
    },
  },
};

export const COMPONENT_NAMES = Object.keys(COMPONENTS);
export { slug };
