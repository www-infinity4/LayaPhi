import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSignatures, validateSignature, repairSignature, MUTATIONS } from '../src/index.js';
import { compileCss } from '../src/compiler/css.js';

const sigs = loadSignatures();

test('8–12 design signatures, all schema-valid with unique ids', () => {
  assert.ok(sigs.length >= 8 && sigs.length <= 12, `got ${sigs.length}`);
  assert.equal(new Set(sigs.map((s) => s.id)).size, sigs.length);
  sigs.forEach((s) => assert.deepEqual(validateSignature(s), []));
});

test('signatures are genuinely different across several axes', () => {
  const axes = {
    modeTreatment: new Set(sigs.map((s) => s.modeTreatment)),
    hero: new Set(sigs.map((s) => s.hero.behavior)),
    nav: new Set(sigs.map((s) => s.navigation.default)),
    scheme: new Set(sigs.map((s) => s.colors.scheme)),
    cards: new Set(sigs.map((s) => s.cards.style)),
    geometry: new Set(sigs.map((s) => s.corners.geometry)),
    headingFont: new Set(sigs.map((s) => s.typography.fontRoles.heading)),
  };
  for (const [axis, values] of Object.entries(axes)) assert.ok(values.size >= 3 || axis === 'scheme', `${axis} has only ${values.size} variants`);
  assert.equal(axes.modeTreatment.size, 5);
});

test('every signature passes WCAG AA without needing repair', () => {
  for (const s of sigs) {
    const r = repairSignature(s);
    assert.deepEqual(r.repairs, [], `${s.id} needed repairs: ${JSON.stringify(r.repairs)}`);
    assert.ok(r.checks.every((c) => c.status === 'pass'), s.id);
  }
});

test('invalid signatures are rejected by the schema', () => {
  const bad = structuredClone(sigs[0]);
  delete bad.colors;
  bad.typography.scaleRatio = 9;
  assert.ok(validateSignature(bad).length >= 2);
});

test('CSS compiler emits custom properties for every signature section', () => {
  for (const s of sigs) {
    const css = compileCss(s);
    for (const v of ['--font-heading', '--step-4', '--space-5', '--measure', '--bg', '--mode-blue-bg', '--radius', '--hero-min', '--img-aspect', '--tap:44px']) {
      assert.ok(css.includes(v), `${s.id} missing ${v}`);
    }
    assert.ok(css.includes(`(min-width:${s.breakpoints.md}px)`));
  }
});

test('contrast repair fixes a deliberately bad palette', () => {
  const bad = structuredClone(sigs[0]);
  bad.colors.text = '#aaaaaa';
  bad.colors.modes.blue.fg = '#9999ff';
  const r = repairSignature(bad);
  assert.ok(r.repairs.length >= 2);
  assert.ok(r.checks.every((c) => c.status !== 'fail'));
});

test('mutation matrix defines the required mutation families', () => {
  const ids = MUTATIONS.map((m) => m.id);
  for (const id of ['hero.orientation', 'section.order', 'column.ratio', 'media.placement', 'density', 'navigation.style', 'section.rhythm', 'type.scale', 'card.geometry', 'whitespace', 'source.presentation']) {
    assert.ok(ids.includes(id), id);
  }
  sigs.forEach((s) => s.mutation.allowed.forEach((id) => assert.ok(ids.includes(id))));
});
