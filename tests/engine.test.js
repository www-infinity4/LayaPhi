import test from 'node:test';
import assert from 'node:assert/strict';
import { IterationEngine, validateSchema, LayaPhiError } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, withVideo, PROFILES, root } from './helpers.js';

const engine = new IterationEngine();
const content = loadContent();
const manifestSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/design-manifest.schema.json'), 'utf8'));

test('same seed + inputs reproduce identical output; different seeds can differ', () => {
  const a = engine.generate(content, { seed: 's1', preferences: PROFILES.mixed });
  const b = engine.generate(content, { seed: 's1', preferences: PROFILES.mixed });
  assert.equal(a.html, b.html);
  assert.deepEqual(a.manifest, b.manifest);
  const variants = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => engine.generate(content, { seed: s, preferences: PROFILES.mixed }).html));
  assert.ok(variants.size > 1, 'seed should vary design');
});

test('engine does not mutate input content', () => {
  const copy = structuredClone(content);
  engine.generate(content, { seed: 'x' });
  assert.deepEqual(content, copy);
});

test('manifest is schema-valid, embedded in HTML, and complete', () => {
  const { manifest, html } = engine.generate(content, { seed: 'm', preferences: PROFILES.visual });
  assert.deepEqual(validateSchema(manifest, manifestSchema), []);
  assert.equal(manifest.generator.name, 'LayaPhi');
  assert.equal(manifest.seed, 'm');
  assert.ok(manifest.components.length > 6);
  assert.ok(manifest.tools.length > 0);
  assert.ok(manifest.decisions.length > 4);
  assert.equal(manifest.accessibility.passed, true);
  const embedded = JSON.parse(html.match(/<script type="application\/json" id="layaphi-manifest">([\s\S]*?)<\/script>/)[1].replace(/\\u003c/g, '<'));
  assert.deepEqual(embedded, manifest);
});

test('reader-first, visual-first and balanced differ structurally from the same content', () => {
  const run = (prefs, seed) => engine.generate(content, { seed, preferences: prefs });
  const r = run(PROFILES.reader, 'phi-reader');
  const v = run(PROFILES.visual, 'phi-visual');
  const b = run(PROFILES.mixed, 'phi-balanced');
  const sequence = (x) => x.manifest.components.map((c) => c.component).join('>');
  const shape = (x) => ({
    seq: sequence(x),
    lead: x.manifest.leadOrientation,
    collapse: x.manifest.components.filter((c) => c.props.collapse === 'after-first').length,
    gallery: x.manifest.components.some((c) => c.component === 'media-rail'),
    sig: x.manifest.signature.id,
  });
  const [sr, sv, sb] = [shape(r), shape(v), shape(b)];
  assert.notEqual(sr.seq, sv.seq);
  assert.notEqual(sv.seq, sb.seq);
  assert.notEqual(sr.seq, sb.seq);
  assert.equal(new Set([sr.sig, sv.sig, sb.sig]).size, 3, 'three different design signatures');
  assert.equal(sr.collapse, 0, 'reader keeps text visible');
  assert.ok(sv.collapse > 0, 'visual uses Read more');
  assert.equal(sv.gallery, true, 'visual uses a media rail');
  assert.notEqual(sr.lead, 'full');
  assert.equal(v.manifest.userPresentation.profile, 'visual');
  assert.equal(r.manifest.userPresentation.profile, 'reader');
});

test('reader layout shows all paragraphs, ToC and visible sources', () => {
  const { html, manifest } = engine.generate(content, { seed: 'phi-reader', preferences: PROFILES.reader });
  assert.ok(!/<summary>Read more<\/summary>/.test(html));
  for (const p of content.sections[0].paragraphs) assert.ok(html.includes(p.slice(0, 40)));
  assert.ok(manifest.components.some((c) => c.component === 'toc'));
  assert.ok(/class="sources sources-(list|footnotes)"/.test(html));
  assert.ok(!manifest.components.some((c) => c.component === 'hero'));
});

test('visual layout hides long copy behind native Read more but keeps it in the DOM', () => {
  const { html } = engine.generate(content, { seed: 'phi-visual', preferences: PROFILES.visual });
  assert.ok(html.includes('<summary>Read more</summary>'));
  assert.ok(html.includes(content.sections[0].paragraphs[3].slice(0, 40)));
});

test('video-heavy profile gives a playable lead with chapter controls', () => {
  const { html, manifest } = engine.generate(withVideo(content), { seed: 'v', preferences: PROFILES.video });
  assert.equal(manifest.userPresentation.profile, 'video');
  assert.ok(/<video [^>]*controls/.test(html));
  assert.ok(html.includes('data-seek="95"'));
  assert.ok(manifest.tools.some((t) => t.id === 'video-chapters'));
  assert.notEqual(manifest.leadOrientation, 'typographic');
});

test('preference is a signal: unsupported or conflicting preferences are overridden with reasons', () => {
  const noVideo = engine.generate(content, { seed: 'o', preferences: { style: 'video' } });
  assert.notEqual(noVideo.manifest.userPresentation.profile, 'video');
  assert.ok(noVideo.manifest.userPresentation.overrides.length > 0);
  const gallery = engine.generate({ ...content, purpose: 'gallery' }, { seed: 'g', preferences: { style: 'reader' } });
  assert.ok(gallery.manifest.userPresentation.overrides.some((o) => /purpose/.test(o.reason)));
  assert.notEqual(gallery.manifest.userPresentation.profile, 'reader');
});

test('sensitive attributes are ignored and never change the design', () => {
  const clean = engine.generate(content, { seed: 'p', preferences: { style: 'mixed' } });
  const dirty = engine.generate(content, { seed: 'p', preferences: { style: 'mixed', age: 71, health: { condition: 'x' }, religion: 'y', userGender: 'z' } });
  assert.deepEqual(dirty.manifest.components, clean.manifest.components);
  const ignored = dirty.manifest.userPresentation.ignoredSignals.map((s) => s.signal);
  assert.deepEqual(ignored.sort(), ['age', 'health', 'religion', 'userGender'].sort());
  assert.deepEqual(clean.manifest.userPresentation.ignoredSignals, []);
});

test('explicit accessibility preferences are honoured', () => {
  const { manifest, css } = engine.generate(content, { seed: 'a', preferences: { style: 'mixed', reducedMotion: true, density: 'spacious', highContrast: true } });
  assert.ok(manifest.components.filter((c) => c.component !== 'toc').every((c) => c.props.density === 'spacious'));
  assert.ok(css.includes('--anim:0ms'));
  assert.ok(manifest.accessibility.checks.some((c) => /contrast/.test(c.id) && /≥ 7|7\)/.test(c.detail)));
});

test('across many seeds and profiles every design is valid and compatible', () => {
  for (const [name, prefs] of Object.entries(PROFILES)) {
    for (let i = 0; i < 12; i++) {
      const { manifest, html } = engine.generate(withVideo(content), { seed: `sweep-${i}`, preferences: prefs });
      assert.equal(manifest.accessibility.passed, true, `${name}/${i}`);
      assert.ok(!manifest.accessibility.checks.some((c) => c.status === 'fail'));
      if (manifest.userPresentation.profile === 'reader') {
        assert.notEqual(manifest.leadOrientation, 'full');
        assert.ok(!/^(cards|collapsible)$/.test(manifest.sourcePresentation));
      }
      if (manifest.navigation === 'sticky-toc') assert.ok(manifest.components.some((c) => c.component === 'toc'));
      assert.ok(html.length > 2000);
    }
  }
});

test('invalid content is rejected: schema errors and missing alt text', () => {
  assert.throws(() => engine.generate({ title: 'x' }), LayaPhiError);
  const noAlt = structuredClone(content);
  noAlt.heroImage = { src: 'a.svg' };
  noAlt.title = '';
  noAlt.sections[0].image = { src: 'b.svg' };
  noAlt.sections[0].title = '';
  assert.throws(() => engine.generate(noAlt), LayaPhiError);
});

test('missing alt text is repaired from caption when possible and reported', () => {
  const c = structuredClone(content);
  delete c.sections[0].image.alt;
  const { manifest } = engine.generate(c, { seed: 'alt' });
  assert.ok(manifest.accessibility.checks.some((x) => x.id === 'alt-text' && x.status === 'repaired'));
});

test('generated HTML is escaped and URLs are sanitised', () => {
  const c = structuredClone(content);
  c.title = '<script>alert(1)</script> Bridges';
  c.cta = { label: 'Go', href: 'javascript:alert(1)' };
  const { html } = engine.generate(c, { seed: 'xss' });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!/href="javascript:/i.test(html));
});

test('JavaScript is optional: enhancements are small and content does not depend on them', () => {
  const { html } = engine.generate(content, { seed: 'js', preferences: PROFILES.visual });
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)[1];
  assert.ok(script.length < 1500, `script is ${script.length} bytes`);
  assert.ok(!/<noscript/.test(html));
  assert.ok(html.includes('<details class="toc-disclosure" open>'));
});

test('registry gating: unapproved capabilities force a fallback component', () => {
  const reg = engine.registry;
  const original = reg.get('scroll-snap-rail').status;
  reg.get('scroll-snap-rail').status = 'deprecated';
  try {
    const { manifest } = engine.generate(content, { seed: 'phi-visual', preferences: PROFILES.visual });
    assert.ok(!manifest.components.some((c) => c.component === 'media-rail'));
    assert.ok(manifest.rejectedCombinations.some((r) => r.component === 'media-rail'));
  } finally {
    reg.get('scroll-snap-rail').status = original;
  }
});

test('availableComponents restricts what the engine may use', () => {
  const c = { ...content, availableComponents: ['article-lead', 'toc', 'lesson', 'feature-grid', 'gallery', 'statistics', 'timeline', 'comparison', 'faq', 'project', 'quote', 'related', 'sources', 'footer'] };
  const { manifest } = engine.generate(c, { seed: 'phi-visual', preferences: PROFILES.visual });
  assert.ok(manifest.components.every((x) => c.availableComponents.includes(x.component)), manifest.components.map((x) => x.component).join());
});
