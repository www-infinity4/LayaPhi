import { compileTokens } from './tokens.js';

/** Base stylesheet: mobile-first, attribute-driven, no runtime dependencies. */
export function compileCss(sig, ov = {}) {
  const { md, lg } = sig.breakpoints;
  return `${compileTokens(sig, ov)}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-padding-top:5rem}
body{margin:0;background:var(--bg);color:var(--text);font:var(--w-body) var(--step-0)/var(--lh) var(--font-body);overflow-wrap:break-word;min-width:0}
img,video,svg,iframe,canvas{max-width:100%;height:auto}
h1,h2,h3,p,li,dd,dt,summary,figcaption,blockquote{overflow-wrap:break-word;min-width:0}
h1,h2,h3{font-family:var(--font-heading);font-weight:var(--w-heading);line-height:1.15;margin:0 0 var(--space-2)}
h1{font-size:var(--step-4)}h2{font-size:var(--step-2)}h3{font-size:var(--step-1)}
p{margin:0 0 var(--space-2)}
strong{font-weight:var(--w-strong)}
a{color:var(--link);text-underline-offset:.2em}
ul,ol{padding-left:1.25rem}
code,pre{font-family:var(--font-mono)}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
[id]{scroll-margin-top:5rem}
.skip-link{position:absolute;left:-999px;top:0;background:var(--surface);color:var(--text);padding:var(--space-2) var(--space-3);z-index:100;border:var(--border-w) var(--border-style) var(--border)}
.skip-link:focus{left:var(--space-2);top:var(--space-2)}
.site-header{display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-1) var(--space-3);padding:var(--space-2) clamp(1rem,4vw,2rem);border-bottom:var(--border-w) var(--border-style) var(--border);background:var(--bg)}
body[data-sticky="1"] .site-header{position:sticky;top:0;z-index:20}
.site-name{font:var(--w-heading) var(--step-1)/1.2 var(--font-heading);color:var(--text);text-decoration:none;display:inline-flex;align-items:center;min-height:var(--tap)}
.site-header ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:var(--space-1)}
.site-header nav{min-width:0;max-width:100%}
nav a,.button,summary,.chapters a{display:inline-flex;align-items:center;min-height:var(--tap);min-width:var(--tap)}
.site-header nav a{padding:0 var(--space-2);color:var(--link)}
.button{justify-content:center;padding:0 var(--space-4);background:var(--text);color:var(--bg);font-weight:var(--w-strong);text-decoration:none;border-radius:var(--radius);border:var(--border-w) var(--border-style) var(--text)}
summary{cursor:pointer;font-weight:var(--w-strong)}
body[data-nav="bottom-bar"]{padding-bottom:calc(var(--tap) + var(--space-3) + env(safe-area-inset-bottom,0px))}
body[data-nav="bottom-bar"] .site-header nav{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--surface);border-top:var(--border-w) var(--border-style) var(--border);padding:0 0 env(safe-area-inset-bottom,0px)}
body[data-nav="bottom-bar"] .site-header nav ul{flex-wrap:nowrap;gap:0}
body[data-nav="bottom-bar"] .site-header nav li{flex:1 1 0;min-width:0}
body[data-nav="bottom-bar"] .site-header nav a{width:100%;justify-content:center;text-align:center;font-size:var(--step-n1);padding:0 var(--space-1)}
main{display:block;padding:0 clamp(1rem,4vw,2rem) var(--space-6);max-width:var(--page);margin-inline:auto;min-width:0}
main:focus{outline:none}
main>section,main>aside,main>nav{margin-block:calc(var(--section-gap) * var(--sp,1) * var(--rhythm-0));min-width:0}
main>[data-rhythm="1"]{margin-block:calc(var(--section-gap) * var(--sp,1) * var(--rhythm-1))}
main>[data-rhythm="2"]{margin-block:calc(var(--section-gap) * var(--sp,1) * var(--rhythm-2))}
[data-space="tight"]{--sp:.6}[data-space="loose"]{--sp:1.5}
[data-density="compact"]{--d:.75}[data-density="comfortable"]{--d:1}[data-density="spacious"]{--d:1.35}
[data-component]{--gap:calc(var(--space-3) * var(--d,1))}
[data-align="center"]{text-align:center}
[data-align="center"] .body p,[data-align="center"] .lead-text p{margin-inline:auto}
[data-measure]{--mw:var(--measure)}
[data-measure="narrow"]{--mw:calc(var(--measure) * .8)}
[data-measure="wide"]{--mw:calc(var(--measure) * 1.15)}
.body p,.body li,.lead-text p,.summary,.refs,details.more p,.faq-item p{max-width:var(--mw)}
[data-align="center"] .lead-text p,[data-align="center"] .summary{margin-inline:auto}
.eyebrow{font:var(--w-strong) var(--step-n1)/1.2 var(--font-body);text-transform:uppercase;letter-spacing:.08em;margin:0 0 var(--space-1);color:var(--muted)}
.meta,.refs,.note,figcaption,.publisher,.time{color:var(--muted)}
.summary{font-size:var(--step-1);color:var(--muted)}
[data-emphasis="high"] h2{font-size:var(--step-3)}
[data-emphasis="low"] h2{font-size:var(--step-1)}
[data-emphasis="low"] .summary{font-size:var(--step-0)}
/* lead */
.lead{display:grid;gap:var(--gap);align-items:center}
.lead-media{min-width:0}
[data-component="hero"]{min-height:var(--hero-min);align-content:center}
[data-component="hero"] .lead-media img{width:100%;aspect-ratio:var(--img-aspect);object-fit:var(--img-fit)}
[data-component="article-lead"] h1{font-size:var(--step-4)}
[data-component="article-lead"] .lead-media img{max-width:min(100%,24rem)}
/* mode treatments (semantic modes realised by the signature) */
.mode-tag{display:inline-flex;align-items:center;gap:.4rem;margin:0 0 var(--space-1);font:var(--w-strong) var(--step-n1)/1.2 var(--font-body);text-transform:uppercase;letter-spacing:.06em;color:var(--text);padding:.15rem .5rem;border:var(--border-w) var(--border-style) transparent}
.mode-dot{width:.75rem;height:.75rem;border-radius:50%;background:var(--mode-accent);border:2px solid var(--mode-fg,currentColor)}
${['yellow', 'green', 'blue', 'red', 'orange'].map((m) => `[data-mode="${m}"]{--mode-bg:var(--mode-${m}-bg);--mode-fg:var(--mode-${m}-fg);--mode-accent:var(--mode-${m}-accent)}`).join('\n')}
body[data-mode-style="tint"] [data-mode]{background:var(--mode-bg);color:var(--mode-fg);padding:var(--card-pad);border-radius:var(--radius);--text:var(--mode-fg);--muted:var(--mode-fg);--link:var(--mode-fg)}
body[data-mode-style="solid"] [data-mode]{background:var(--mode-bg);color:var(--mode-fg);padding:var(--card-pad);border:calc(var(--border-w) + 2px) var(--border-style) var(--mode-accent);border-radius:var(--radius);--text:var(--mode-fg);--muted:var(--mode-fg);--link:var(--mode-fg)}
body[data-mode-style="outline"] [data-mode]{border:calc(var(--border-w) + 1px) var(--border-style) var(--mode-accent);padding:var(--card-pad);border-radius:var(--radius)}
body[data-mode-style="stripe"] [data-mode]{border-left:.4rem solid var(--mode-accent);padding-left:var(--space-3)}
body[data-mode-style="badge"] [data-mode] .mode-tag{background:var(--mode-bg);color:var(--mode-fg);border-color:var(--mode-accent);border-radius:999px;padding:.2rem .75rem}
body[data-mode-style="tint"] [data-mode] .mode-tag,body[data-mode-style="solid"] [data-mode] .mode-tag{color:var(--mode-fg);border-color:var(--mode-accent)}
[data-mode] a{text-decoration:underline}
body[data-mode-style="tint"] [data-mode] a,body[data-mode-style="solid"] [data-mode] a{color:var(--mode-fg)}
/* split & media */
.split{display:grid;gap:var(--gap);min-width:0}
.side,.body{min-width:0}
figure{margin:0 0 var(--space-2)}
figure.media img,figure.media video{width:100%;display:block}
figure.media img{aspect-ratio:var(--img-aspect);object-fit:var(--img-fit)}
figure.video video{aspect-ratio:var(--vid-aspect);background:#000}
body[data-img-frame="border"] figure.media img{border:var(--border-w) var(--border-style) var(--border)}
body[data-img-frame="shadow"] figure.media img{box-shadow:var(--shadow-card);border-radius:var(--radius)}
body[data-img-frame="matte"] figure.media img{padding:var(--space-3);background:var(--surface);border:var(--border-w) var(--border-style) var(--border)}
body[data-vid-frame="border"] figure.video video{border:var(--border-w) var(--border-style) var(--border)}
body[data-vid-frame="shadow"] figure.video video{box-shadow:var(--shadow-card)}
figcaption{font-size:var(--step-n1);margin-top:var(--space-1)}
/* cards */
.card,.stat,.key-points,.faq-item{min-width:0}
[data-card="plain"] .card,[data-card="plain"] .stat{padding:var(--space-2) 0;border-top:var(--border-w) var(--border-style) var(--border)}
[data-card="outlined"] .card,[data-card="outlined"] .stat,[data-card="outlined"] .key-points{padding:var(--card-pad);border:var(--border-w) var(--border-style) var(--border);border-radius:var(--radius)}
[data-card="raised"] .card,[data-card="raised"] .stat,[data-card="raised"] .key-points{padding:var(--card-pad);background:var(--surface);box-shadow:var(--shadow-card);border:var(--border-w) var(--border-style) var(--border);border-radius:var(--radius)}
[data-card="filled"] .card,[data-card="filled"] .stat,[data-card="filled"] .key-points{padding:var(--card-pad);background:var(--surface);border-radius:var(--radius)}
[data-border="hairline"]{border-top:1px solid var(--border);padding-top:var(--space-3)}
[data-border="strong"]{border-top:calc(var(--border-w) + 2px) solid var(--text);padding-top:var(--space-3)}
[data-border="accent"]{border-left:.3rem solid var(--accent);padding-left:var(--space-3)}
[data-bg="surface"]{background:var(--surface);padding:var(--card-pad);border-radius:var(--radius)}
.card h3{margin-bottom:var(--space-1)}.card p:last-child{margin-bottom:0}
.grid,.gallery,.stats,.timeline,.sources,.steps,.points{margin:0}
.grid,.gallery,.rail,.stats{list-style:none;padding:0}
.grid{display:grid;gap:var(--gap)}
.stats{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))}
.stat dd{margin:0}.stat strong{display:block;font:var(--w-heading) var(--step-3)/1.1 var(--font-heading)}.stat span{display:block}.stat dt{font-weight:var(--w-strong)}
.gallery{display:grid;gap:var(--gap);grid-template-columns:repeat(auto-fill,minmax(min(100%,10rem),1fr))}
.gallery figure{margin:0}
.rail{display:flex;gap:var(--gap);overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;max-width:100%;padding-bottom:var(--space-2)}
.rail>li{flex:0 0 min(80%,18rem);scroll-snap-align:start;min-width:0}
.rail figure{margin:0}
.timeline{list-style:none;padding:0 0 0 var(--space-3);border-left:calc(var(--border-w) + 1px) var(--border-style) var(--accent)}
.timeline li{margin-bottom:var(--space-3)}
.when{font-weight:var(--w-strong);margin:0;color:var(--muted)}
.faq-item{border-bottom:var(--border-w) var(--border-style) var(--border);padding:var(--space-1) 0}
details.more{margin:var(--space-2) 0}
details.more>summary{color:var(--link)}
.sources{padding-left:1.25rem}.sources li{margin-bottom:var(--space-1)}
.sources-cards{list-style:none;padding:0;display:grid;gap:var(--gap)}
.sources-cards li{padding:var(--card-pad);border:var(--border-w) var(--border-style) var(--border);border-radius:var(--radius)}
.sources-footnotes{font-size:var(--step-n1)}
.points,.steps{padding-left:1.25rem}
.quote{margin:0}.quote blockquote{margin:0;padding-left:var(--space-3);border-left:.3rem solid var(--accent);font:var(--w-body) var(--step-2)/1.35 var(--font-heading)}
.quote figcaption{margin-top:var(--space-2)}
/* navigation */
[data-component="toc"] ol{list-style:none;margin:0;padding:0;display:grid;gap:0}
[data-component="toc"] a{color:var(--link);gap:var(--space-2);padding:0 var(--space-1)}
[data-component="toc"] a[aria-current="true"]{font-weight:var(--w-strong);text-decoration-thickness:3px}
[data-component="toc"] summary{font:var(--w-heading) var(--step-1)/1.2 var(--font-heading)}
[data-component="toc"][data-variant="visual"] ol{display:flex;flex-wrap:wrap;gap:var(--space-2)}
[data-component="toc"][data-variant="visual"] a{border:var(--border-w) var(--border-style) var(--border);border-radius:var(--radius);padding:var(--space-1) var(--space-2) var(--space-1) var(--space-1);text-decoration:none}
[data-component="toc"] img{width:2.5rem;height:2.5rem;object-fit:cover;border-radius:calc(var(--radius) / 2)}
.chapters ol{list-style:none;padding:0;margin:0;display:grid;gap:var(--space-1)}
.chapters a{justify-content:space-between;gap:var(--space-3);width:100%;padding:0 var(--space-2);border:var(--border-w) var(--border-style) var(--border);border-radius:var(--radius);color:var(--link)}
body[data-chapter-style="chips"] .chapters ol{display:flex;flex-wrap:wrap}
body[data-chapter-style="chips"] .chapters a{width:auto;border-radius:999px}
.chapters-title{margin:0 0 var(--space-1)}
footer[data-component="footer"]{border-top:var(--border-w) var(--border-style) var(--border);padding:var(--space-4) clamp(1rem,4vw,2rem);max-width:var(--page);margin-inline:auto}
.colophon{color:var(--muted);font-size:var(--step-n1)}
${sig.animation.transitions ? 'a,button,summary,.card{transition:background-color var(--anim) ease,color var(--anim) ease,border-color var(--anim) ease}' : ''}
@media (hover:hover){a:hover{text-decoration-thickness:3px}.button:hover{opacity:.9}}
@media (min-width:${md}px){
  .lead[data-component="split-hero"]{grid-template-columns:1fr 1fr}
  .split{grid-template-columns:1fr 1fr}
  [data-media="top"] .split,[data-media="bottom"] .split{grid-template-columns:1fr}
  [data-cols="2"] .grid,[data-cols="3"] .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  [data-cols="2"] .gallery,[data-cols="3"] .gallery{grid-template-columns:repeat(2,minmax(0,1fr))}
  [data-cols="3"] .gallery{grid-template-columns:repeat(3,minmax(0,1fr))}
  [data-component="hero"] .lead-media img{aspect-ratio:21 / 9}
}
@media (min-width:${lg}px){
  .lead[data-component="split-hero"],.split{grid-template-columns:var(--split-ratio)}
  [data-media="top"] .split,[data-media="bottom"] .split{grid-template-columns:1fr}
  [data-cols="3"] .grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  body[data-nav="sticky-toc"] main{display:grid;grid-template-columns:minmax(12rem,16rem) minmax(0,1fr);column-gap:var(--space-5)}
  body[data-nav="sticky-toc"] main>*{grid-column:2}
  body[data-nav="sticky-toc"] main>[data-component="hero"],body[data-nav="sticky-toc"] main>[data-component="split-hero"],body[data-nav="sticky-toc"] main>[data-component="article-lead"]{grid-column:1/-1}
  body[data-nav="sticky-toc"] main>[data-component="toc"]{grid-column:1;grid-row:2/span 99;align-self:start;position:sticky;top:5rem;margin-block:0}
  body[data-nav="bottom-bar"]{padding-bottom:0}
  body[data-nav="bottom-bar"] .site-header nav{position:static;background:none;border:0;padding:0}
  body[data-nav="bottom-bar"] .site-header nav ul{flex-wrap:wrap}
  body[data-nav="bottom-bar"] .site-header nav li{flex:0 1 auto}
  body[data-nav="bottom-bar"] .site-header nav a{width:auto;font-size:inherit;padding:0 var(--space-2)}
}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}
`;
}
