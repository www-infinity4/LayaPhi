import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ToolRegistry, scanCandidates, evaluateCandidate, candidateFromGithubRepo, validateSchema } from '../src/index.js';
import { root } from './helpers.js';

const candidates = JSON.parse(fs.readFileSync(path.join(root, 'examples/tool-candidates.json'), 'utf8')).candidates;
const candidateSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/tool-candidate.schema.json'), 'utf8'));
const now = new Date('2026-10-01T00:00:00Z');

test('registry covers every required capability category', () => {
  const reg = ToolRegistry.load();
  const cats = reg.categories();
  for (const c of ['layout', 'typography', 'accessibility', 'responsive design', 'diagrams', 'galleries', 'animation', 'data visualization', 'educational components', 'navigation', 'media', 'forms', 'code display']) {
    assert.ok(cats.includes(c), c);
  }
  assert.ok(reg.query({ category: 'layout' }).length >= 2);
  assert.ok(reg.query().every((e) => e.status === 'approved'));
  assert.ok(reg.query().every((e) => e.adapter), 'approved tools always go through an adapter');
});

test('candidate fixtures satisfy the candidate schema', () => {
  candidates.forEach((c) => assert.deepEqual(validateSchema(c, candidateSchema), [], c.repository));
});

test('scanner scores, flags duplicates and never allows execution', () => {
  const reg = ToolRegistry.load();
  const { records, skipped } = scanCandidates(candidates, reg, now);
  assert.ok(records.length >= 4);
  assert.ok(skipped.length >= 1, 'repeated repository skipped');
  for (const r of records) {
    assert.equal(r.execution.allowed, false);
    assert.equal(r.status, 'candidate');
    assert.equal(r.validation.passed, false);
    for (const k of ['repository', 'purpose', 'license', 'maintenance', 'framework', 'dependencies', 'bundle', 'security', 'novelCapabilities', 'recommendation']) assert.ok(k in r, k);
    assert.ok(r.recommendation.score >= 0 && r.recommendation.score <= 100);
  }
  const verdict = (name) => records.find((r) => r.repository === name).recommendation.verdict;
  assert.equal(verdict('example-org/tiny-diagrams'), 'adopt-via-adapter');
  assert.equal(verdict('example-org/giant-ui-kit'), 'extract-single-feature');
  assert.equal(verdict('example-org/gpl-charts'), 'reject');
  assert.equal(verdict('example-org/old-carousel'), 'reject');
  assert.equal(verdict('example-org/grid-clone'), 'reject');
  assert.ok(records.find((r) => r.repository === 'example-org/grid-clone').recommendation.reasons.some((x) => /duplicate/.test(x)));
  assert.ok(records.every((r, i) => i === 0 || records[i - 1].recommendation.score >= r.recommendation.score));
});

test('scanner module has no filesystem, network, process or dynamic-import capability', () => {
  const src = fs.readFileSync(path.join(root, 'src/tools/scanner.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/\bimport\b/.test(src), 'no imports at all');
  assert.ok(!/child_process|fetch\(|require\(|eval\(|new Function|XMLHttpRequest|process\./.test(src));
});

test('GitHub repo JSON maps to candidate metadata without any fetching', () => {
  const c = candidateFromGithubRepo({ full_name: 'a/b', description: 'd', license: { spdx_id: 'MIT' }, pushed_at: '2026-09-01T00:00:00Z', stargazers_count: 5, archived: false }, { framework: 'vanilla', dependencies: 0, bundleKb: 2, capabilities: ['x'] });
  assert.deepEqual(validateSchema(c, candidateSchema), []);
});

test('a tool becomes usable only after validation and a controlled adapter', () => {
  const reg = ToolRegistry.load();
  const rec = evaluateCandidate(candidates.find((c) => c.repository === 'example-org/tiny-diagrams'), reg, now);
  const adapter = { id: 'tiny-diagrams-adapter', name: 'Tiny diagrams', category: 'diagrams', path: 'src/tools/adapters/tiny-diagrams.js' };
  assert.throws(() => reg.approve(rec, adapter), /validation/);
  rec.validation = { passed: true, at: '2026-10-02' };
  assert.throws(() => reg.approve(rec, { id: 'x' }), /adapter/);
  assert.throws(() => reg.approve({ ...rec, execution: { allowed: true } }, adapter), /unexecuted/);
  const entry = reg.approve(rec, adapter);
  assert.equal(entry.status, 'approved');
  assert.equal(entry.source, 'adapter');
  assert.ok(reg.isApproved('tiny-diagrams-adapter'));
  assert.throws(() => reg.approve(rec, adapter), /duplicate/);
  assert.equal(ToolRegistry.load().get('tiny-diagrams-adapter'), undefined, 'approval does not touch the on-disk registry');
});
