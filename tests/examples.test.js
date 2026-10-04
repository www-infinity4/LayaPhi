import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from './helpers.js';

test('committed example output matches a fresh build (no drift)', () => {
  const out = path.join(root, 'examples/output');
  const before = Object.fromEntries(['reader-first', 'visual-first', 'balanced'].map((n) => [n, fs.readFileSync(path.join(out, `${n}.html`), 'utf8')]));
  execFileSync(process.execPath, [path.join(root, 'examples/build.js')], { stdio: 'pipe' });
  for (const [n, html] of Object.entries(before)) assert.equal(fs.readFileSync(path.join(out, `${n}.html`), 'utf8'), html, n);
});

test('three example sites exist with distinct manifests', () => {
  const out = path.join(root, 'examples/output');
  const m = ['reader-first', 'visual-first', 'balanced'].map((n) => JSON.parse(fs.readFileSync(path.join(out, `${n}.manifest.json`), 'utf8')));
  assert.equal(new Set(m.map((x) => x.signature.id)).size, 3);
  assert.equal(new Set(m.map((x) => x.components.map((c) => c.component).join())).size, 3);
});
