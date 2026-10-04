export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Allow only http(s), mailto, fragment and relative URLs. */
export function safeUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return '#';
  if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(u)) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '#';
  return u;
}

export function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
}

export function paragraphs(section) {
  if (Array.isArray(section.paragraphs)) return section.paragraphs;
  if (typeof section.text === 'string' && section.text) return section.text.split(/\n{2,}/);
  return [];
}
