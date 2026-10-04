/** Optional progressive enhancement (~1 KB). The page is fully usable without it. */
export function compileScript(sig) {
  return `(function(){
var v=document.querySelector('video');
document.querySelectorAll('[data-seek]').forEach(function(a){a.addEventListener('click',function(e){if(!v)return;e.preventDefault();v.currentTime=+a.getAttribute('data-seek');v.scrollIntoView({block:'nearest'});v.focus()})});
var d=document.querySelector('[data-variant="list"] .toc-disclosure');
if(d&&window.matchMedia&&window.matchMedia('(max-width:${sig.breakpoints.lg - 1}px)').matches)d.removeAttribute('open');
if('IntersectionObserver' in window){var L={};document.querySelectorAll('[data-component="toc"] a').forEach(function(a){L[a.hash.slice(1)]=a});
var o=new IntersectionObserver(function(es){es.forEach(function(e){var a=L[e.target.id];if(a&&e.isIntersecting){for(var k in L)L[k].removeAttribute('aria-current');a.setAttribute('aria-current','true')}})},{rootMargin:'0px 0px -60% 0px'});
for(var k in L){var el=document.getElementById(k);if(el)o.observe(el)}}
})();`;
}
