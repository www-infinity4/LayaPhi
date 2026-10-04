import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..');
export const loadContent = () => JSON.parse(fs.readFileSync(path.join(root, 'examples/content/educational-bridges.json'), 'utf8'));

export const withVideo = (content) => ({
  ...content,
  video: { src: 'assets/demo.mp4', title: 'Bridge load demo', chapters: [{ t: 0, label: 'Intro' }, { t: 95, label: 'Arch test' }] },
});

export const PROFILES = {
  reader: { signals: { text: 0.8, image: 0.1, video: 0.1 } },
  visual: { style: 'visual' },
  video: { style: 'video' },
  mixed: { style: 'mixed' },
};
