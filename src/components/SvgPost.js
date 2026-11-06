'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';

function cleanSvgMarkup(markup) {
  if (typeof window === 'undefined' || !markup) return '';
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return '';
  const allowed = new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon','text','tspan','defs','lineargradient','radialgradient','stop','clippath']);
  const attrs = new Set(['viewbox','width','height','fill','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-opacity','opacity','cx','cy','r','rx','ry','x','y','x1','x2','y1','y2','d','points','transform','id','class','offset','stop-color','stop-opacity','gradientunits','gradienttransform','text-anchor','font-size','font-family','font-weight','letter-spacing']);
  [root, ...root.querySelectorAll('*')].forEach((node) => {
    if (!allowed.has(node.tagName.toLowerCase())) { node.remove(); return; }
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (!attrs.has(name) || name.startsWith('on') || /javascript:|data:/i.test(attr.value) || /url\(\s*(?!#)/i.test(attr.value)) node.removeAttribute(attr.name);
    });
  });
  return root.outerHTML;
}

export default function SvgPost({ markup }) {
  const artRef = useRef(null);
  const safeMarkup = cleanSvgMarkup(markup);
  function onEnter() {
    const root = artRef.current;
    if (!root) return;
    const core = root.querySelector('.svg-core');
    if (core) gsap.to(core, { rotation: 9, scale: 1.045, duration: .65, ease: 'power2.out', transformOrigin: '50% 50%' });
    gsap.to(root.querySelectorAll('.svg-spark'), { y: -12, opacity: 1, stagger: .07, duration: .6, ease: 'power2.out' });
  }
  function onLeave() {
    const root = artRef.current;
    if (!root) return;
    const core = root.querySelector('.svg-core');
    if (core) gsap.to(core, { rotation: 0, scale: 1, duration: .75, ease: 'elastic.out(1,.55)', transformOrigin: '50% 50%' });
    gsap.to(root.querySelectorAll('.svg-spark'), { y: 0, opacity: .55, stagger: .04, duration: .45, ease: 'power2.out' });
  }
  return (
    <div className="svg-post" ref={artRef} onPointerEnter={onEnter} onPointerLeave={onLeave} onClick={onEnter}>
      {safeMarkup ? <div className="custom-svg" dangerouslySetInnerHTML={{ __html: safeMarkup }} /> : <svg viewBox="0 0 900 470" role="img" aria-label="Интерактивная левитирующая сфера">
        <defs><radialGradient id="sphereFill" cx="32%" cy="25%"><stop offset="0" stopColor="#fff"/><stop offset=".44" stopColor="#e8efff"/><stop offset="1" stopColor="#bdcdf3"/></radialGradient><linearGradient id="ringStroke"><stop stopColor="#8ba6ec" stopOpacity=".08"/><stop offset=".5" stopColor="#9387e4" stopOpacity=".58"/><stop offset="1" stopColor="#a8c2f1" stopOpacity=".08"/></linearGradient><filter id="softShadow"><feGaussianBlur stdDeviation="18"/></filter></defs>
        <ellipse cx="450" cy="365" rx="190" ry="22" fill="#8b9fc7" opacity=".14" filter="url(#softShadow)"/>
        <g className="svg-core"><ellipse cx="450" cy="226" rx="215" ry="83" fill="none" stroke="url(#ringStroke)" strokeWidth="2" transform="rotate(-18 450 226)"/><ellipse cx="450" cy="226" rx="182" ry="70" fill="none" stroke="#9db2e2" strokeOpacity=".32" strokeWidth="1.5" transform="rotate(28 450 226)"/><circle cx="450" cy="220" r="112" fill="url(#sphereFill)" stroke="#fff" strokeWidth="3"/><circle cx="450" cy="220" r="84" fill="none" stroke="#fff" strokeOpacity=".7"/><text x="450" y="235" textAnchor="middle" fill="#7185c4" fontFamily="system-ui,sans-serif" fontSize="42" fontWeight="700" letterSpacing="-4">O.</text></g>
        <circle className="svg-spark" cx="213" cy="131" r="5" fill="#fff"/><circle className="svg-spark" cx="696" cy="137" r="4" fill="#fff"/><circle className="svg-spark" cx="672" cy="322" r="6" fill="#fff"/><circle className="svg-spark" cx="259" cy="320" r="3" fill="#fff"/>
      </svg>}
      <span className="svg-hint">НАВЕДИ, ЧТОБЫ ОЖИВИТЬ</span>
    </div>
  );
}
