export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Repair: move `fg` toward black or white (whichever can reach the target)
 * in small steps until it meets `min` against every background in `bgs`.
 * Returns the original colour when it already passes.
 */
export function repairContrast(fg, bgs, min) {
  const list = [].concat(bgs);
  const ok = (c) => list.every((bg) => contrastRatio(c, bg) >= min);
  if (ok(fg)) return fg;
  const towards = (target) => {
    const f = hexToRgb(fg);
    for (let t = 0.02; t <= 1.0001; t += 0.02) {
      const c = rgbToHex(f.map((v, i) => v + (target[i] - v) * t));
      if (ok(c)) return c;
    }
    return null;
  };
  const candidates = [towards([0, 0, 0]), towards([255, 255, 255])].filter(Boolean);
  if (!candidates.length) return fg;
  return candidates.sort((a, b) => contrastRatio(a, list[0]) - contrastRatio(b, list[0]))[0];
}
