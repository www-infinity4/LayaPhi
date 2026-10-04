import test from 'node:test';
import assert from 'node:assert/strict';
import { IterationEngine, validateOutput } from '../src/index.js';
import { contrastRatio } from '../src/accessibility/contrast.js';
import { loadContent, PROFILES } from './helpers.js';

const engine = new IterationEngine();
const content = loadContent();

test('contrast maths matches WCAG reference values', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
  assert.ok(Math.abs(contrastRatio('#767676', '#ffffff') - 4.54) < 0.05);
});

test('generated sites pass every static accessibility check', () => {
  for (const [name, prefs] of Object.entries(PROFILES)) {
    const { html, css, manifest } = engine.generate(content, { seed: `a11y-${name}`, preferences: prefs });
    const r = validateOutput({ html, css });
    assert.ok(r.passed, `${name}: ${JSON.stringify(r.checks.filter((c) => c.status === 'fail'))}`);
    const ids = new Set(r.checks.map((c) => c.id));
    for (const id of ['lang', 'viewport', 'single-h1', 'heading-hierarchy', 'landmarks', 'skip-link', 'keyboard', 'alt-text', 'focus-visible', 'tap-targets', 'reduced-motion', 'responsive-overflow', 'no-hover-only']) assert.ok(ids.has(id), id);
    assert.ok(manifest.accessibility.checks.some((c) => c.id === 'line-length'));
  }
});

test('validator rejects broken markup and CSS', () => {
  const { html, css } = engine.generate(content, { seed: 'neg' });
  const fails = (h, c, id) => assert.ok(validateOutput({ html: h, css: c }).checks.some((x) => x.id === id && x.status === 'fail'), id);
  fails(html.replace(/<h2/, '<h4').replace(/<\/h2>/, '</h4>'), css, 'heading-hierarchy');
  fails(html.replace(/<main\b/, '<div').replace('</main>', '</div>'), css, 'landmarks');
  fails(html.replace(/ alt="[^"]+"/, ''), css, 'alt-text');
  fails(html.replace('<html lang="en"', '<html'), css, 'lang');
  fails(html, css.replace(':focus-visible{outline:3px', ':focus-visible{outline-width:3px'), 'focus-visible');
  fails(html, css.replace('--tap:44px', '--tap:20px'), 'tap-targets');
  fails(html, css.replace(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\}\}/, ''), 'reduced-motion');
  fails(html, `${css}a:hover{color:red}`, 'no-hover-only');
  fails(html, `${css}.x{width:900px}`, 'responsive-overflow');
  fails(html.replace('<div', '<div tabindex="3"'), css, 'keyboard');
});

test('line length stays within a readable range for every text width variant', () => {
  const { css } = engine.generate(content, { seed: 'len', preferences: PROFILES.reader });
  const ch = Number(css.match(/--measure:(\d+)ch/)[1]);
  assert.ok(ch * 0.8 >= 45 && ch * 1.15 <= 80, `${ch}`);
});
