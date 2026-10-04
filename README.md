# LayaPhi

**Adaptive website layout & design engine for the Phi system.**
LayaPhi turns structured educational content (plus *permitted* presentation preferences)
into a validated, mobile-first website: semantic HTML, CSS custom properties, a tiny optional
script, and a machine-readable **design manifest** that explains every decision.

It is independent of production Code Phi. Code Phi can later consume it through a thin adapter
(`new IterationEngine().generate(content, { seed, preferences })`).

Zero runtime dependencies. Node ≥ 18.

```bash
npm test                # automated tests
npm run build:examples  # regenerates examples/output/*.html + manifests
```

## Quick start

```js
import { IterationEngine } from './src/index.js';
const engine = new IterationEngine();
const { html, css, manifest } = engine.generate(content, {
  seed: 'my-site',                                   // same seed + inputs ⇒ identical design
  preferences: { signals: { text: 0.8, image: 0.1, video: 0.1 } }  // or { style: 'reader' | 'visual' | 'video' | 'mixed' }
});
```

Content shape: `schemas/site-content.schema.json`. Example: `examples/content/educational-bridges.json`.

## Demonstration: one content file, three different sites

`examples/output/` (open the HTML files; images live in `examples/output/assets`):

| Site | Preference | What changes structurally |
|---|---|---|
| `reader-first.html` | text-heavy signals | typographic lead (no hero image), table of contents, every paragraph visible, plain/outlined sections, footnote-style sources, restrained imagery |
| `visual-first.html` | `visual` | media lead, image-chip navigation, media rail, first paragraph + native "Read more", bottom tab navigation |
| `balanced.html` | `mixed` | stacked/split lead, ToC, alternating media placement, cards, mixed density |

Each ships a `*.manifest.json` (also embedded in the page as `#layaphi-manifest`).

## Architecture

```
src/
  engine/         IterationEngine, content analysis, planner (layout grammar → plan)
  components/     structural primitives (hero, split-hero, article-lead, toc, lesson, research,
                  experiment, project, feature-grid, comparison, timeline, statistics, gallery,
                  media-rail, callout, quote, faq, related, sources, footer), adjustable
                  properties, Phi educational modes
  presets/        design-signature loader + schema validation
  mutation/       deterministic Mutation Matrix with compatibility rules
  preferences/    presentation-signal adaptation (sensitive traits are dropped)
  accessibility/  WCAG contrast maths/repair + static HTML/CSS validator
  compiler/       signature → CSS variables, base CSS, HTML, optional ~1 KB script
  tools/          ToolRegistry (approved capabilities) and ToolScanner (discovery only)
  validators/     tiny JSON-Schema validator (no dependency)
schemas/          design-signature, design-manifest, site-content, tool-registry, tool-candidate
presets/          10 design signatures (JSON)
registry/         capabilities.json — machine-readable approved capabilities
examples/ tests/
```

### IterationEngine pipeline
1. Validate/analyse content (alt-text rule, ids, Phi modes).
2. Content hierarchy (core / supporting / auxiliary).
3. Page archetype (`explainer`, `project-guide`, `course`, `visual-story`, `research`, …).
4. Presentation profile from permitted signals (reader / visual / video / mixed).
5. Rank design signatures (suitability + seeded tie-break); select compatible component families,
   gated by the Tool Registry and `availableComponents`.
6. Controlled layout mutations (Mutation Matrix, one independent seeded stream per mutation).
7. Repair tokens (contrast, line length, motion), compile CSS/HTML, run the accessibility validator.
8. Reject invalid combinations (falls through to the next signature) and return the manifest.

### Adaptive layout, without stereotyping
Preference is a **signal, not a restriction**: it is overridden (and the override is recorded in the manifest)
when the site's purpose or the available content requires (e.g. a `gallery` purpose, or "video" preference with no video).
Keys naming sensitive attributes (age, health, religion, disability, …) are discarded and listed in
`manifest.userPresentation.ignoredSignals`. Explicit accessibility choices (`reducedMotion`, `density`, `largeText`, `highContrast`) are honoured.

### Phi modes
Yellow *Explore*, Green *Engineer*, Blue *Understand*, Red *Challenge*, Orange *Build* are semantic section modes
(`section.mode`, with defaults per section type). A signature chooses how they look through `modeTreatment`
(`tint`, `stripe`, `badge`, `solid`, `outline`) and per-mode colours. Modes are always labelled in text, never colour alone.

### Design signatures
`schemas/design-signature.schema.json` covers typography scale, font roles, weights, spacing scale, content width,
colours (+ mode colours), contrast requirements, borders, corner geometry, shadows, section rhythm, hero behaviour,
image/video treatment, navigation, cards, animation limits, breakpoints, suitability and allowed mutations.
Everything compiles to CSS custom properties (`src/compiler/tokens.js`). Adding a signature = adding one JSON file in
`presets/`; no code changes (the architecture does not care whether there are 10 or 1000).

### Accessibility validator
Contrast (AA, AAA with `highContrast`), heading hierarchy, landmarks, skip link, keyboard (no positive tabindex,
labelled scrollers), focus visibility, line length (45–80 ch for every width variant), tap targets (≥ 44 px),
alt text, overflow safety, hover-only styling, reduced motion. Colours/line length/motion are *repaired*; structural failures *reject* the design.

### ToolScanner & Tool Registry
* `registry/capabilities.json` lists approved (and planned) capabilities by category; the engine only uses `approved` ones,
  records them in `manifest.tools`, and falls back when one is missing.
* `src/tools/scanner.js` is **discovery only**: pure functions over metadata (license, activity, framework, dependencies,
  bundle size, security flags, novelty vs. registry, proposed adapter, score + verdict). It imports nothing — it cannot
  fetch, install or execute code — and every record carries `execution.allowed = false`.
* A tool enters the registry only through `ToolRegistry.approve(record, adapter)`, which requires an explicit passed validation and a controlled adapter. Duplicates are rejected; heavy frameworks get `extract-single-feature`.
* `examples/tool-candidates.json` is illustrative fixture data, not live scan results.

## Milestone 1 status

**Complete:** IterationEngine; schemas; 10 design signatures; 20 structural components; deterministic Mutation Matrix (11 mutation
families); CSS-variable compiler; preference adaptation; accessibility checks + repair; design manifest; three generated example
sites from the same content; ToolScanner + Tool Registry; automated tests.

**Remaining / known limits**
* Accessibility checks are static (HTML/CSS analysis); no real-browser overflow/focus tests, screen-reader runs or computed-style contrast yet.
* Video example is covered by tests only (no sample video asset in the repo); caption tracks are optional (warned when absent).
* Planned registry capabilities not yet implemented: diagrams, data visualisation, forms, code display, scroll reveal, lightbox.
* ToolScanner has no live GitHub collector (by design only a pure metadata mapper `candidateFromGithubRepo`); validation of candidates is manual/CI.
* System fonts only; no web-font loading. Page-level `<head>` extras (favicons, social tags) are not generated.
* Mutation Matrix covers layout-level mutations; component-family swaps (e.g. gallery ⇄ media rail) are planner rules, not yet mutations.
* Code Phi adapter is intentionally not written; production Code Phi is untouched.
