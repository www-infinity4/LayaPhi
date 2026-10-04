// Generates the three demonstration sites from the SAME content.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IterationEngine } from '../src/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const content = JSON.parse(fs.readFileSync(path.join(here, 'content/educational-bridges.json'), 'utf8'));
const out = path.join(here, 'output');
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(here, 'assets'), path.join(out, 'assets'), { recursive: true });

const engine = new IterationEngine();
const variants = {
  'reader-first': { seed: 'phi-reader', preferences: { signals: { text: 0.8, image: 0.1, video: 0.1 } } },
  'visual-first': { seed: 'phi-visual', preferences: { style: 'visual' } },
  balanced: { seed: 'phi-balanced', preferences: { style: 'mixed' } },
};

for (const [name, opts] of Object.entries(variants)) {
  const { html, manifest } = engine.generate(content, opts);
  fs.writeFileSync(path.join(out, `${name}.html`), html);
  fs.writeFileSync(path.join(out, `${name}.manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${name}: signature=${manifest.signature.id} lead=${manifest.leadOrientation} nav=${manifest.navigation} mutations=${manifest.mutations.applied.length} a11y=${manifest.accessibility.passed}`);
}
