import { contrastRatio, repairContrast } from './contrast.js';
import { MEASURE_FACTOR } from '../compiler/tokens.js';

const pass = (id, criterion, detail) => ({ id, criterion, status: 'pass', detail });
const fail = (id, criterion, detail) => ({ id, criterion, status: 'fail', detail });
const warn = (id, criterion, detail) => ({ id, criterion, status: 'warn', detail });

export const MIN_LINE = 45;
export const MAX_LINE = 80;

/** Content-level rule: every informative image needs alt text. Returns repaired content + checks. */
export function checkContentAlt(content, { repair = true } = {}) {
  const checks = [];
  const out = structuredClone(content);
  const fix = (img, label) => {
    if (!img || img.decorative || (img.alt && img.alt.trim())) return;
    const fallback = img.caption || label;
    if (repair && fallback) {
      img.alt = fallback;
      checks.push({ id: 'alt-text', criterion: 'WCAG 1.1.1', status: 'repaired', detail: `missing alt for ${img.src} replaced with "${fallback}"` });
    } else checks.push(fail('alt-text', 'WCAG 1.1.1', `image ${img.src} has no alt text and is not marked decorative`));
  };
  fix(out.heroImage, out.title);
  for (const s of out.sections) { fix(s.image, s.title); (s.images || []).forEach((i) => fix(i, s.title)); }
  return { content: out, checks };
}

/**
 * Repair a design signature's colours/typography so it satisfies WCAG AA
 * (or AAA when the user asked for high contrast). Returns a new signature.
 */
export function repairSignature(sig, { highContrast = false, usedMeasures = ['comfortable'] } = {}) {
  const s = structuredClone(sig);
  const checks = [];
  const repairs = [];
  const minText = highContrast ? 7 : s.contrast.text;
  const minUi = s.contrast.nonText;
  const c = s.colors;

  const textPair = (key, bgs, label, min = minText) => {
    const worst = Math.min(...bgs.map((b) => contrastRatio(c[key], b)));
    if (worst >= min) { checks.push(pass(`contrast-${key}`, 'WCAG 1.4.3', `${label} ${worst.toFixed(2)}:1 ≥ ${min}`)); return; }
    const before = c[key];
    c[key] = repairContrast(c[key], bgs, min);
    const after = Math.min(...bgs.map((b) => contrastRatio(c[key], b)));
    if (after >= min) {
      repairs.push({ token: `colors.${key}`, from: before, to: c[key], reason: `${label} was ${worst.toFixed(2)}:1, needs ${min}:1` });
      checks.push({ id: `contrast-${key}`, criterion: 'WCAG 1.4.3', status: 'repaired', detail: `${label} ${worst.toFixed(2)}:1 → ${after.toFixed(2)}:1` });
    } else checks.push(fail(`contrast-${key}`, 'WCAG 1.4.3', `${label} cannot reach ${min}:1`));
  };
  textPair('text', [c.bg, c.surface], 'text on page/surface');
  textPair('muted', [c.bg, c.surface], 'muted text on page/surface');
  textPair('link', [c.bg, c.surface], 'links on page/surface');
  for (const [m, mc] of Object.entries(c.modes)) {
    const worst = Math.min(contrastRatio(mc.fg, mc.bg), contrastRatio(mc.fg, c.surface), contrastRatio(mc.fg, c.bg));
    if (worst >= minText) checks.push(pass(`contrast-mode-${m}`, 'WCAG 1.4.3', `${m} mode text ${worst.toFixed(2)}:1`));
    else {
      const before = mc.fg;
      mc.fg = repairContrast(mc.fg, [mc.bg, c.surface, c.bg], minText);
      const after = Math.min(contrastRatio(mc.fg, mc.bg), contrastRatio(mc.fg, c.surface), contrastRatio(mc.fg, c.bg));
      if (after >= minText) { repairs.push({ token: `colors.modes.${m}.fg`, from: before, to: mc.fg, reason: `${m} mode text was ${worst.toFixed(2)}:1` }); checks.push({ id: `contrast-mode-${m}`, criterion: 'WCAG 1.4.3', status: 'repaired', detail: `${m} mode text → ${after.toFixed(2)}:1` }); }
      else checks.push(fail(`contrast-mode-${m}`, 'WCAG 1.4.3', `${m} mode text cannot reach ${minText}:1`));
    }
    const ui = Math.min(contrastRatio(mc.accent, mc.bg), contrastRatio(mc.accent, c.bg));
    if (ui >= minUi) checks.push(pass(`contrast-mode-${m}-accent`, 'WCAG 1.4.11', `${m} accent ${ui.toFixed(2)}:1`));
    else {
      const before = mc.accent;
      mc.accent = repairContrast(mc.accent, [mc.bg, c.bg], minUi);
      const after = Math.min(contrastRatio(mc.accent, mc.bg), contrastRatio(mc.accent, c.bg));
      if (after >= minUi) { repairs.push({ token: `colors.modes.${m}.accent`, from: before, to: mc.accent, reason: `${m} accent was ${ui.toFixed(2)}:1` }); checks.push({ id: `contrast-mode-${m}-accent`, criterion: 'WCAG 1.4.11', status: 'repaired', detail: `${m} accent → ${after.toFixed(2)}:1` }); }
      else checks.push(fail(`contrast-mode-${m}-accent`, 'WCAG 1.4.11', `${m} accent cannot reach ${minUi}:1`));
    }
  }
  for (const key of ['accent', 'focus']) {
    const ratio = contrastRatio(c[key], c.bg);
    if (ratio >= minUi) checks.push(pass(`contrast-${key}`, 'WCAG 1.4.11', `${key} ${ratio.toFixed(2)}:1`));
    else {
      const before = c[key];
      c[key] = repairContrast(c[key], [c.bg, c.surface], minUi);
      repairs.push({ token: `colors.${key}`, from: before, to: c[key], reason: `${key} was ${ratio.toFixed(2)}:1 against background` });
      checks.push({ id: `contrast-${key}`, criterion: 'WCAG 1.4.11', status: 'repaired', detail: `${key} → ${contrastRatio(c[key], c.bg).toFixed(2)}:1` });
    }
  }

  // Readable line length for every measure variant in use.
  const factors = usedMeasures.map((m) => MEASURE_FACTOR[m]);
  const lo = Math.max(...factors.map((f) => Math.ceil(MIN_LINE / f)));
  const hi = Math.min(...factors.map((f) => Math.floor(MAX_LINE / f)));
  const w = s.contentWidth.text;
  if (w >= lo && w <= hi) checks.push(pass('line-length', 'WCAG 1.4.8 (advisory)', `text measure ${w}ch within ${MIN_LINE}–${MAX_LINE} characters for variants ${usedMeasures.join(', ')}`));
  else if (lo <= hi) {
    s.contentWidth.text = Math.min(hi, Math.max(lo, w));
    repairs.push({ token: 'contentWidth.text', from: w, to: s.contentWidth.text, reason: 'line length outside readable range' });
    checks.push({ id: 'line-length', criterion: 'WCAG 1.4.8 (advisory)', status: 'repaired', detail: `${w}ch → ${s.contentWidth.text}ch` });
  } else checks.push(fail('line-length', 'WCAG 1.4.8 (advisory)', 'no measure satisfies all text-width variants in use'));

  // Motion limits.
  if (s.animation.maxDurationMs > 500) { s.animation.maxDurationMs = 500; repairs.push({ token: 'animation.maxDurationMs', from: sig.animation.maxDurationMs, to: 500, reason: 'animation limit' }); }
  return { signature: s, checks, repairs };
}

// The CSS checks below are intentionally string-based (no backtracking regexes) and
// assume the compiler's minified output format from src/compiler/css.js.
function ruleBody(css, start) {
  const i = css.indexOf(start);
  if (i < 0) return '';
  const j = css.indexOf('}', i);
  return css.slice(i, j < 0 ? css.length : j);
}

function stripAtRule(css, header) {
  let out = css;
  for (let i = out.indexOf(header); i >= 0; i = out.indexOf(header)) {
    let depth = 0;
    let j = i + header.length - 1;
    for (; j < out.length; j++) {
      if (out[j] === '{') depth++;
      else if (out[j] === '}' && --depth === 0) break;
    }
    out = out.slice(0, i) + out.slice(j + 1);
  }
  return out;
}

function tags(html, name) {
  const re = new RegExp(`<${name}\\b([^>]*)>`, 'gi');
  return [...html.matchAll(re)].map((m) => m[1]);
}
const attr = (a, n) => a.match(new RegExp(`(?:^|\\s)${n}="([^"]*)"`))?.[1];

/** Static checks over compiled HTML + CSS. */
export function validateOutput({ html, css }) {
  const checks = [];
  const add = (c) => checks.push(c);

  add(/<html\b[^>]*\slang="[a-zA-Z-]+"/.test(html) ? pass('lang', 'WCAG 3.1.1', 'document language declared') : fail('lang', 'WCAG 3.1.1', 'missing lang attribute'));
  add(/<title>[^<]+<\/title>/.test(html) ? pass('title', 'WCAG 2.4.2', 'page title present') : fail('title', 'WCAG 2.4.2', 'missing title'));
  add(/<meta name="viewport" content="width=device-width, initial-scale=1"\s*>/.test(html) && !/user-scalable=no|maximum-scale=1\b/.test(html) ? pass('viewport', 'WCAG 1.4.4', 'responsive viewport, zoom not disabled') : fail('viewport', 'WCAG 1.4.4', 'bad viewport meta'));

  // Headings
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1 = levels.filter((l) => l === 1).length;
  let skipped = false;
  levels.forEach((l, i) => { if (i === 0 ? l !== 1 : l > levels[i - 1] + 1) skipped = true; });
  add(h1 === 1 ? pass('single-h1', 'WCAG 1.3.1', 'exactly one h1') : fail('single-h1', 'WCAG 1.3.1', `found ${h1} h1 elements`));
  add(!skipped ? pass('heading-hierarchy', 'WCAG 1.3.1', `heading levels never skip (${levels.length} headings)`) : fail('heading-hierarchy', 'WCAG 1.3.1', `heading levels skip: ${levels.join(',')}`));

  // Landmarks
  const mains = tags(html, 'main').length;
  const navs = tags(html, 'nav');
  const labels = navs.map((n) => attr(n, 'aria-label') || attr(n, 'aria-labelledby'));
  const landmarksOk = mains === 1 && tags(html, 'header').length >= 1 && tags(html, 'footer').length >= 1;
  add(landmarksOk ? pass('landmarks', 'WCAG 1.3.1 / 2.4.1', 'banner, main and contentinfo present') : fail('landmarks', 'WCAG 1.3.1 / 2.4.1', 'missing header/main/footer landmark'));
  add(navs.length < 2 || (labels.every(Boolean) && new Set(labels).size === labels.length) ? pass('nav-labels', 'WCAG 2.4.1', 'navigation landmarks are uniquely labelled') : fail('nav-labels', 'WCAG 2.4.1', 'multiple nav landmarks need unique labels'));
  const bodyStart = html.indexOf('<body');
  const firstLink = html.slice(bodyStart).match(/<a\b[^>]*>/)?.[0] || '';
  add(/class="skip-link"/.test(firstLink) && /href="#main"/.test(firstLink) && /<main\b[^>]*id="main"/.test(html) ? pass('skip-link', 'WCAG 2.4.1', 'skip link is first focusable element and targets main') : fail('skip-link', 'WCAG 2.4.1', 'missing skip link'));

  // Keyboard
  const badTab = [...html.matchAll(/tabindex="(-?\d+)"/g)].filter((m) => Number(m[1]) > 0);
  const handlers = /\son(click|mouseover|mouseenter|keydown)=/i.test(html);
  const scrollers = html.split('<').filter((t) => t.includes('tabindex="0"'));
  const scrollersOk = scrollers.every((t) => /aria-label=/.test(t));
  add(!badTab.length && !handlers && scrollersOk ? pass('keyboard', 'WCAG 2.1.1 / 2.4.3', 'native interactive elements only; no positive tabindex; scrollers focusable and labelled') : fail('keyboard', 'WCAG 2.1.1 / 2.4.3', 'positive tabindex, inline handlers, or unlabelled scroller'));

  // Duplicate ids and anchors
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  const broken = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.includes(id));
  add(!dup.length && !broken.length ? pass('anchors', 'WCAG 4.1.1', 'ids unique and in-page anchors resolve') : fail('anchors', 'WCAG 4.1.1', `duplicate ids: ${dup.join(',') || '-'}; broken anchors: ${broken.join(',') || '-'}`));

  // Images and video
  const imgs = tags(html, 'img');
  const bad = imgs.filter((a) => attr(a, 'alt') === undefined || (attr(a, 'alt') === '' && attr(a, 'data-decorative') !== 'true'));
  add(!bad.length ? pass('alt-text', 'WCAG 1.1.1', `${imgs.length} images all have alt text or are explicitly decorative`) : fail('alt-text', 'WCAG 1.1.1', `${bad.length} images lack alt text`));
  const videos = [...html.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>/g)];
  const vBad = videos.filter((v) => !/\scontrols(\s|>|=)/.test(v[1]) || !/aria-label=/.test(v[1]));
  add(!vBad.length ? pass('video-controls', 'WCAG 1.2 / 2.1.1', `${videos.length} videos with native controls and labels`) : fail('video-controls', 'WCAG 1.2 / 2.1.1', 'video without controls or label'));
  const noCaps = videos.filter((v) => !/<track\b[^>]*kind="captions"/.test(v[2]));
  if (noCaps.length) add(warn('video-captions', 'WCAG 1.2.2', `${noCaps.length} video(s) have no captions track supplied`));

  // CSS
  add(/:focus-visible\{outline:\s*\d+px solid var\(--focus\)/.test(css) && !/outline:\s*(none|0)\b/.test(css.split('main:focus{outline:none}').join('')) ? pass('focus-visible', 'WCAG 2.4.7', 'visible focus ring on every focusable element') : fail('focus-visible', 'WCAG 2.4.7', 'missing :focus-visible styling or outline removed'));
  const tap = Number(css.match(/--tap:(\d+)px/)?.[1] || 0);
  add(tap >= 44 && /nav a,\.button,summary/.test(css) && /min-height:var\(--tap\)/.test(css) ? pass('tap-targets', 'WCAG 2.5.5 / 2.5.8', `interactive controls ≥ ${tap}px`) : fail('tap-targets', 'WCAG 2.5.5 / 2.5.8', 'tap target tokens below 44px'));
  const rm = ruleBody(css, '@media (prefers-reduced-motion:reduce){').includes('transition-duration:.001ms!important');
  const infinite = /infinite/.test(css);
  add(rm && !infinite ? pass('reduced-motion', 'WCAG 2.3.3', 'prefers-reduced-motion disables transitions/animations; no infinite animation') : fail('reduced-motion', 'WCAG 2.3.3', 'missing reduced-motion override or infinite animation'));
  const noHover = stripAtRule(css, '@media (hover:hover){');
  add(!/:hover/.test(noHover) ? pass('no-hover-only', 'WCAG 1.4.13 / mobile', 'hover styles are enhancement-only') : fail('no-hover-only', 'WCAG 1.4.13 / mobile', 'hover-dependent styling outside @media (hover:hover)'));
  const fixedW = [...css.matchAll(/(?<![-\w(])(?:width|min-width):\s*(\d+(?:\.\d+)?)px/g)].filter((m) => Number(m[1]) > 320);
  const inlineW = /style="[^"]*width\s*:/i.test(html);
  const overflowOk = /img,video,svg,iframe,canvas\{max-width:100%;height:auto\}/.test(css) && /overflow-wrap:break-word/.test(css) && (() => { const r = ruleBody(css, '.rail{'); return r.includes('overflow-x:auto') && r.includes('max-width:100%'); })() && !fixedW.length && !inlineW;
  add(overflowOk ? pass('responsive-overflow', 'WCAG 1.4.10', 'fluid media, wrapping text, contained scrollers, no fixed widths > 320px') : fail('responsive-overflow', 'WCAG 1.4.10', 'potential horizontal overflow'));
  const fixedPos = (css.match(/position:fixed/g) || []).length;
  add(fixedPos === 0 || (/body\[data-nav="bottom-bar"\]\{padding-bottom:calc/.test(css) && fixedPos === 1) ? pass('no-overlap', 'mobile', 'fixed navigation reserves body padding') : fail('no-overlap', 'mobile', 'fixed elements may overlap content'));

  return { passed: checks.every((c) => c.status !== 'fail'), checks };
}
