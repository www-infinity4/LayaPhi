// ToolScanner — DISCOVERY ONLY.
// Pure functions over candidate *metadata*. This module deliberately imports no
// fs / child_process / network / dynamic import: it can never fetch, install or
// execute third-party code. A tool becomes usable only after a human/CI validation
// step and a controlled adapter registered via ToolRegistry.approve().

const PERMISSIVE = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0', 'MPL-2.0']);
const HEAVY_FRAMEWORKS = /^(react|vue|angular|svelte|ember|next|nuxt|jquery)/i;
const DAY = 86400000;

export function evaluateCandidate(c, registry, now = new Date()) {
  const reasons = [];
  const provided = new Set(registry.query({ status: 'approved' }).flatMap((e) => [e.id, ...(e.provides || [])]));
  const novel = c.capabilities.filter((cap) => !provided.has(cap));
  const duplicate = c.capabilities.filter((cap) => provided.has(cap));

  const permitted = PERMISSIVE.has(c.license);
  const days = Math.max(0, Math.floor((now - new Date(c.lastPushed)) / DAY));
  const activity = c.archived ? 'archived' : days <= 180 ? 'active' : days <= 540 ? 'slowing' : 'stale';

  const flags = [];
  if (c.installScripts) flags.push('runs install scripts');
  if (c.nativeBinaries) flags.push('ships native binaries');
  if (c.networkAtRuntime) flags.push('performs network requests at runtime');
  if (c.knownAdvisories > 0) flags.push(`${c.knownAdvisories} known advisories`);
  if (c.dependencies > 25) flags.push('large transitive dependency surface');

  let score = 0;
  score += Math.round(35 * (novel.length / c.capabilities.length));
  score += permitted ? 15 : 0;
  score += { active: 15, slowing: 8, stale: 2, archived: 0 }[activity];
  score += c.bundleKb <= 5 ? 15 : c.bundleKb <= 20 ? 10 : c.bundleKb <= 50 ? 5 : 0;
  score += c.dependencies === 0 ? 10 : c.dependencies <= 3 ? 6 : c.dependencies <= 10 ? 2 : 0;
  score += Math.max(0, 10 - flags.length * 4);

  const heavy = HEAVY_FRAMEWORKS.test(c.framework) || c.bundleKb > 50;
  let verdict;
  if (!permitted) { verdict = 'reject'; reasons.push(`license ${c.license} is not on the permissive allow-list`); }
  else if (c.archived) { verdict = 'reject'; reasons.push('repository is archived'); }
  else if (c.knownAdvisories > 0) { verdict = 'reject'; reasons.push('known security advisories'); }
  else if (!novel.length) { verdict = 'reject'; reasons.push('duplicate: LayaPhi already provides every listed capability'); }
  else if (heavy) { verdict = 'extract-single-feature'; reasons.push('heavy framework/bundle: prefer re-implementing the one needed feature as a small composable adapter'); }
  else if (score >= 60) { verdict = 'adopt-via-adapter'; reasons.push('small, permissive, maintained and adds new capability'); }
  else { verdict = 'defer'; reasons.push('score below adoption threshold'); }
  if (flags.length && verdict !== 'reject') reasons.push(`security review required: ${flags.join(', ')}`);

  const name = c.repository.split('/')[1].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    repository: c.repository,
    purpose: c.purpose,
    category: c.category || null,
    license: { id: c.license, permitted },
    maintenance: { daysSincePush: days, archived: Boolean(c.archived), status: activity, stars: c.stars ?? null },
    framework: c.framework,
    dependencies: { count: c.dependencies },
    bundle: { kb: c.bundleKb, impact: c.bundleKb <= 5 ? 'negligible' : c.bundleKb <= 20 ? 'small' : c.bundleKb <= 50 ? 'moderate' : 'large' },
    security: { flags, risk: flags.length === 0 ? 'low' : flags.length < 3 ? 'medium' : 'high' },
    novelCapabilities: novel,
    duplicateCapabilities: duplicate,
    proposedAdapter: verdict === 'reject' ? null : {
      id: `${name}-adapter`,
      path: `src/tools/adapters/${name}.js`,
      strategy: verdict === 'extract-single-feature' ? 'reimplement-needed-feature' : 'vendored-pinned-build-time',
      boundary: 'adapter receives data only; upstream code is never executed by the scanner',
    },
    recommendation: { score, verdict, reasons },
    status: 'candidate',
    validation: { passed: false, at: null },
    execution: { allowed: false, reason: 'Discovery and execution are separate security boundaries; requires validation + controlled adapter.' },
  };
}

/** Evaluate many candidates, dropping repeats of the same repo or the same capability set. */
export function scanCandidates(candidates, registry, now = new Date()) {
  const seenRepos = new Set();
  const seenCaps = new Set();
  const records = [];
  const skipped = [];
  for (const c of candidates) {
    const key = c.repository.toLowerCase();
    const capKey = [...c.capabilities].sort().join('|');
    if (seenRepos.has(key)) { skipped.push({ repository: c.repository, reason: 'duplicate repository' }); continue; }
    seenRepos.add(key);
    const rec = evaluateCandidate(c, registry, now);
    if (seenCaps.has(capKey)) {
      rec.recommendation.verdict = rec.recommendation.verdict === 'reject' ? 'reject' : 'defer';
      rec.recommendation.reasons.push('overlaps an equal candidate already listed; evaluate one only');
    }
    seenCaps.add(capKey);
    records.push(rec);
  }
  records.sort((a, b) => b.recommendation.score - a.recommendation.score);
  return { records, skipped };
}

/** Map a GitHub REST `repos/{owner}/{repo}` JSON payload to partial candidate metadata. */
export function candidateFromGithubRepo(json, extra = {}) {
  return {
    repository: json.full_name,
    purpose: json.description || '',
    license: json.license?.spdx_id || 'NOASSERTION',
    lastPushed: json.pushed_at,
    stars: json.stargazers_count,
    archived: Boolean(json.archived),
    ...extra,
  };
}
