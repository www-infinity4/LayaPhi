import { esc, safeUrl } from '../util/html.js';
import { COMPONENTS } from '../components/library.js';
import { compileScript } from './script.js';

function headerLinks(plan, content) {
  const max = plan.nav === 'bottom-bar' ? 4 : 6;
  let items;
  if (content.navigation?.length) {
    items = content.navigation.map((n) => ({ label: n.label, href: n.target.startsWith('#') || /^(https?:|\/|\.)/.test(n.target) ? n.target : `#s-${n.target}` }));
  } else {
    items = plan.components.filter((c) => c.section && c.role !== 'sources' && c.section.title && c.component !== 'quote').map((c) => ({ label: c.section.title, href: `#${c.id}` }));
  }
  return items.slice(0, max);
}

export function compileHtml({ plan, content, signature, css, generatorVersion, manifestJson }) {
  const ctx = { content, plan, generatorVersion };
  const links = plan.nav === 'minimal' ? [{ label: 'Contents', href: '#toc' }].filter(() => plan.components.some((c) => c.id === 'toc')) : headerLinks(plan, content);
  const nav = plan.nav === 'sticky-toc' || !links.length
    ? ''
    : `<nav aria-label="Primary"><ul>${links.map((l) => `<li><a href="${esc(safeUrl(l.href))}">${esc(l.label)}</a></li>`).join('')}</ul></nav>`;

  const body = plan.components.filter((c) => c.component !== 'footer').map((inst, i) => {
    inst.rhythmIndex = i;
    return COMPONENTS[inst.component].render(inst, ctx);
  }).join('\n');
  const footerInst = plan.components.find((c) => c.component === 'footer');
  const footer = COMPONENTS.footer.render(footerInst, ctx);
  const description = content.summary ? `<meta name="description" content="${esc(content.summary)}">` : '';
  const sticky = signature.navigation.stickyHeader && plan.nav !== 'bottom-bar' ? '1' : '0';

  return `<!doctype html>
<html lang="${esc(content.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(content.title)}</title>
${description}
<meta name="generator" content="LayaPhi ${esc(generatorVersion)}">
<meta name="color-scheme" content="${signature.colors.scheme}">
<style>${css}</style>
<script type="application/json" id="layaphi-manifest">${manifestJson.replace(/</g, '\\u003c')}</script>
</head>
<body data-nav="${plan.nav}" data-sticky="${sticky}" data-mode-style="${signature.modeTreatment}" data-img-frame="${signature.imageTreatment.frame}" data-vid-frame="${signature.videoTreatment.frame}" data-chapter-style="${signature.videoTreatment.chapterStyle}" data-archetype="${plan.archetype}" data-signature="${signature.id}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-component="site-header"><a class="site-name" href="#main">${esc(content.title)}</a>${nav}</header>
<main id="main" tabindex="-1">
${body}
</main>
${footer}
<script>${compileScript(signature)}</script>
</body>
</html>
`;
}
