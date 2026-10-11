import { createHash } from 'node:crypto';
import { createRng } from '../util/rng.js';
import { loadSignatures } from '../presets/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { adaptPreferences } from '../preferences/adapt.js';
import { analyzeContent, chooseArchetype } from './analyze.js';
import { buildPlan, finalizeLead } from './planner.js';
import { applyMutations } from '../mutation/matrix.js';
import { compileCss } from '../compiler/css.js';
import { compileHtml } from '../compiler/html.js';
import { checkContentAlt, repairSignature, validateOutput } from '../accessibility/validator.js';
import { validateSchema } from '../validators/schema.js';
import { COMPONENTS } from '../components/library.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GENERATOR = { name: 'LayaPhi', version: '0.1.0' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contentSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/site-content.schema.json'), 'utf8'));
const manifestSchema = JSON.parse(fs.readFileSync(path.join(root, 'schemas/design-manifest.schema.json'), 'utf8'));

export class LayaPhiError extends Error {}

/**
 * IterationEngine — turns structured content + permitted presentation signals into
 * a validated, compiled website and a machine-readable design manifest.
 * Same seed + same inputs ⇒ byte-identical output.
 */
export class IterationEngine {
  constructor({ signatures = loadSignatures(), registry = ToolRegistry.load() } = {}) {
    this.signatures = signatures;
    this.registry = registry;
  }

  generate(rawContent, { seed = 'layaphi', preferences = {}, signature: forcedSignature } = {}) {
    seed = String(seed);
    // 1. Analyze
    const schemaErrors = validateSchema(rawContent, contentSchema);
    if (schemaErrors.length) throw new LayaPhiError(`Invalid content:\n${schemaErrors.join('\n')}`);
    const altResult = checkContentAlt(rawContent);
    const altFail = altResult.checks.find((c) => c.status === 'fail');
    if (altFail) throw new LayaPhiError(`Rejected: ${altFail.detail}`);
    const analysis = analyzeContent(altResult.content);
    const { content } = analysis;
    const decisions = [];

    // 2-3. Hierarchy & archetype
    const { archetype, reason } = chooseArchetype(analysis, content.purpose);
    decisions.push({ decision: `archetype: ${archetype}`, reason });
    const counts = analysis.hierarchy.reduce((a, h) => ({ ...a, [h.tier]: (a[h.tier] || 0) + 1 }), {});
    decisions.push({ decision: 'content hierarchy', reason: `${counts.core || 0} core, ${counts.supporting || 0} supporting, ${counts.auxiliary || 0} auxiliary sections; ${analysis.wordCount} words; ${analysis.imageCount} images; video: ${analysis.hasVideo}` });

    // 7 (computed early because it informs selection). Preferences are signals only.
    const profile = adaptPreferences(preferences, analysis, content.purpose);
    decisions.push({ decision: `presentation profile: ${profile.kind}`, reason: `basis=${profile.basis}, confidence=${profile.confidence}${profile.overrides.map((o) => `; override ${o.from}→${o.to} (${o.reason})`).join('')}` });

    // 5. Rank design signatures deterministically.
    const ranked = this.rankSignatures(archetype, profile, seed, forcedSignature);
    const rejectedSignatures = [];
    let lastError;
    for (const sig of ranked) {
      try {
        const result = this.#build({ rawContent, analysis, archetype, profile, signature: sig, seed, decisions, preferences, altChecks: altResult.checks, rejectedSignatures });
        return result;
      } catch (e) {
        if (!(e instanceof LayaPhiError)) throw e;
        rejectedSignatures.push({ id: sig.id, reason: e.message });
        lastError = e;
      }
    }
    throw new LayaPhiError(`No design signature produced a valid design. Last: ${lastError?.message}`);
  }

  rankSignatures(archetype, profile, seed, forcedId) {
    if (forcedId) {
      const s = this.signatures.find((x) => x.id === forcedId);
      if (!s) throw new LayaPhiError(`Unknown design signature: ${forcedId}`);
      return [s];
    }
    const rng = createRng(seed, 'signature');
    // New Oracle Octaves work explicitly selects its signature; keep existing seeded
    // site designs byte-identical until their owners choose a redesign.
    return this.signatures.filter(s => s.id !== 'oracle-octaves')
      .map((s) => {
        let score = 0;
        if (s.suits.profiles.includes(profile.kind)) score += 3;
        if (s.suits.profiles[0] === profile.kind) score += 1;
        if (s.suits.archetypes.includes(archetype)) score += 2;
        return { s, score: score + rng.next() * 0.9 };
      })
      .sort((a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id))
      .map((x) => x.s);
  }

  #build({ rawContent, analysis, archetype, profile, signature, seed, decisions, preferences, altChecks, rejectedSignatures }) {
    const { content } = analysis;
    const base = structuredClone(signature);
    // Explicit accessibility preferences adjust the signature (they are user-chosen, not inferred).
    if (profile.explicit.reducedMotion) { base.animation.transitions = false; base.animation.maxDurationMs = 0; }

    // 4. Component families (checked against the registry)
    const plan = buildPlan({ analysis, archetype, profile, signature: base, registry: this.registry });
    // 6. Controlled mutations
    const mutations = applyMutations(plan, { signature: base, profile, analysis, archetype }, seed);
    finalizeLead(plan, this.registry, content.availableComponents);

    // 8. Accessibility: repair tokens, then validate compiled output.
    const measures = [...new Set(plan.components.map((c) => c.props.textWidth))];
    const repaired = repairSignature(base, { highContrast: Boolean(profile.explicit.highContrast), usedMeasures: measures });
    const tokenFail = repaired.checks.find((c) => c.status === 'fail');
    if (tokenFail) throw new LayaPhiError(`rejected ${signature.id}: ${tokenFail.id} — ${tokenFail.detail}`);
    const sig = repaired.signature;

    const css = compileCss(sig, plan.tokens);
    const draft = compileHtml({ plan, content, signature: sig, css, generatorVersion: GENERATOR.version, manifestJson: '{}' });
    const output = validateOutput({ html: draft, css });
    if (!output.passed) throw new LayaPhiError(`rejected ${signature.id}: ${output.checks.filter((c) => c.status === 'fail').map((c) => c.id).join(', ')}`);

    // 9/11. Tools used (queried from the registry) and manifest.
    const toolIds = new Set(['css-custom-properties-compiler', 'fluid-typography', 'contrast-validator', 'a11y-static-validator', 'responsive-breakpoints', 'reduced-motion-guard', 'phi-educational-modes']);
    plan.components.forEach((c) => COMPONENTS[c.component].requires.forEach((r) => toolIds.add(r)));
    if (plan.components.some((c) => c.role === 'toc')) toolIds.add('toc-navigation');
    if (plan.lead.preferVideo && content.video?.chapters?.length) toolIds.add('video-chapters');
    const tools = [...toolIds].map((id) => this.registry.get(id)).filter((t) => t && t.status === 'approved').map((t) => ({ id: t.id, category: t.category, adapter: t.adapter, bytes: t.bytes, runtimeJs: t.runtimeJs }));

    const manifest = {
      generator: GENERATOR,
      seed,
      inputHash: createHash('sha256').update(JSON.stringify(rawContent)).digest('hex').slice(0, 16),
      archetype,
      signature: { id: signature.id, name: signature.name, modeTreatment: signature.modeTreatment, rejected: rejectedSignatures.slice() },
      navigation: plan.nav,
      sourcePresentation: plan.sourceStyle,
      leadOrientation: plan.lead.orientation,
      tokenOverrides: plan.tokens,
      components: plan.components.map((c) => ({ id: c.id, component: c.component, ...(c.sectionId ? { section: c.sectionId } : {}), ...(c.mode ? { mode: c.mode } : {}), props: c.props })),
      mutations: { applied: mutations.applied, rejected: mutations.rejected, unchanged: mutations.unchanged },
      userPresentation: {
        profile: profile.kind,
        weights: profile.weights,
        basis: profile.basis,
        confidence: profile.confidence,
        signalsUsed: profile.signalsUsed,
        ignoredSignals: profile.ignoredSignals,
        overrides: profile.overrides,
        note: 'Preference is a design signal, not a restriction; sensitive attributes are never used.',
      },
      accessibility: { passed: true, checks: [...altChecks, ...repaired.checks, ...output.checks], repairs: repaired.repairs },
      tools,
      rejectedCombinations: plan.rejected,
      decisions: [
        ...decisions,
        { decision: `design signature: ${signature.id}`, reason: `suits profile "${profile.kind}" / archetype "${archetype}"${rejectedSignatures.length ? `; earlier candidates rejected: ${rejectedSignatures.map((r) => r.id).join(', ')}` : ''}` },
        ...plan.decisions,
        ...mutations.applied.map((m) => ({ decision: `mutation ${m.id}: ${m.from} → ${m.to}`, reason: m.reason })),
      ],
    };
    const errors = validateSchema(manifest, manifestSchema);
    if (errors.length) throw new Error(`Internal error: invalid manifest\n${errors.join('\n')}`);

    const html = compileHtml({ plan, content, signature: sig, css, generatorVersion: GENERATOR.version, manifestJson: JSON.stringify(manifest) });
    return { html, css, manifest, signature: sig };
  }
}

