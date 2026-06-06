// ── DesignEra sticker icon data — plain JS, loaded BEFORE the Babel block ──
// Extracted from 04-design-eras.jsx so this data does not inflate the Babel
// transpilation input (~500 KB threshold for deoptimisation).
// _DE, _VB, _eraHeroSVG, _stkEl, _ERA_MOTION_CSS are global.

var _DE = {
  renaissance:{
    hero: '<circle class="keyline" cx="66" cy="66" r="50"/><circle cx="66" cy="66" r="50" fill="#F6E6C4"/><circle cx="66" cy="40" r="7" fill="#2C4A7C"/><path d="M66 44 L46 96 M66 44 L86 96" fill="none" stroke="#C0892E" stroke-width="6" stroke-linecap="round"/><path d="M50 90 a30 30 0 0 1 32 0" fill="none" stroke="#A2701F" stroke-width="3" stroke-linecap="round"/>',
    decor:'<circle class="keyline" cx="66" cy="66" r="48"/><circle cx="66" cy="66" r="48" fill="#7E561A"/><g stroke="#E0B45F" stroke-width="4" stroke-linecap="round"><line x1="66" y1="22" x2="66" y2="34"/><line x1="66" y1="98" x2="66" y2="110"/><line x1="22" y1="66" x2="34" y2="66"/><line x1="98" y1="66" x2="110" y2="66"/><line x1="35" y1="35" x2="44" y2="44"/><line x1="88" y1="88" x2="97" y2="97"/><line x1="97" y1="35" x2="88" y2="44"/><line x1="44" y1="88" x2="35" y2="97"/></g><circle cx="66" cy="66" r="22" fill="#C0892E"/><circle cx="66" cy="66" r="22" fill="none" stroke="#E0B45F" stroke-width="2"/>',
  },
  baroque:{
    hero: '<rect class="keyline" x="16" y="20" width="100" height="92" rx="22"/><rect x="16" y="20" width="100" height="92" rx="22" fill="#2A251D"/><path d="M36 84 L34 50 L50 66 L66 42 L82 66 L98 50 L96 84 Z" fill="#C9A227"/><rect x="36" y="84" width="60" height="10" rx="3" fill="#C9A227"/><circle cx="34" cy="48" r="5" fill="#7E2233"/><circle cx="98" cy="48" r="5" fill="#7E2233"/><circle cx="66" cy="40" r="5" fill="#7E2233"/><circle cx="66" cy="74" r="5" fill="#7E2233"/>',
    decor:'<circle class="keyline" cx="66" cy="66" r="50"/><circle cx="66" cy="66" r="50" fill="#2A251D"/><g stroke="#C9A227" stroke-width="3.5" stroke-linecap="round"><line x1="66" y1="20" x2="66" y2="36"/><line x1="66" y1="96" x2="66" y2="112"/><line x1="20" y1="66" x2="36" y2="66"/><line x1="96" y1="66" x2="112" y2="66"/><line x1="34" y1="34" x2="45" y2="45"/><line x1="87" y1="87" x2="98" y2="98"/><line x1="98" y1="34" x2="87" y2="45"/><line x1="45" y1="87" x2="34" y2="98"/></g><circle cx="66" cy="66" r="20" fill="#C9A227"/><circle cx="66" cy="66" r="20" fill="none" stroke="#7E2233" stroke-width="2"/>',
  },
  rococo:{
    hero: '<circle class="keyline" cx="66" cy="66" r="50"/><circle cx="66" cy="66" r="50" fill="#F5E9EE"/><circle cx="66" cy="62" r="22" fill="#E0A6B8"/><path d="M66 50 a10 10 0 0 1 0 20 a8 8 0 0 1 0 -14" fill="#9A4A60"/><circle cx="66" cy="62" r="5" fill="#F5E9EE"/><path d="M52 84 q-12 4 -16 -8 q12 -2 16 8 Z" fill="#B9CBA0"/><path d="M80 84 q12 4 16 -8 q-12 -2 -16 8 Z" fill="#B9CBA0"/>',
    decor:'<path class="keyline" d="M66 108 C30 86 24 50 40 34 C54 20 66 34 66 34 C66 34 78 20 92 34 C108 50 102 86 66 108 Z"/><path d="M66 104 C34 84 28 52 42 37 C54 25 66 38 66 38 C66 38 78 25 90 37 C104 52 98 84 66 104 Z" fill="#E0A6B8"/><g stroke="#B9CBA0" stroke-width="3.2" fill="none" stroke-linecap="round"><path d="M66 96 C58 78 56 58 60 44"/><path d="M66 96 C74 78 76 58 72 44"/><path d="M66 96 L66 50"/></g>',
  },
  nouveau:{
    hero: '<rect class="keyline" x="20" y="16" width="92" height="100" rx="26"/><rect x="20" y="16" width="92" height="100" rx="26" fill="#E7DCC0"/><path d="M66 100 C60 80 60 56 66 36 C72 56 72 80 66 100 Z" fill="#7C8C5A"/><ellipse cx="66" cy="44" rx="16" ry="20" fill="#9C7CB0"/><ellipse cx="66" cy="46" rx="9" ry="12" fill="#7C8C5A"/><circle cx="66" cy="48" r="5" fill="#5E6B3E"/>',
    decor:'<rect class="keyline" x="18" y="18" width="96" height="96" rx="40"/><rect x="18" y="18" width="96" height="96" rx="40" fill="#EFE9DA"/><path d="M66 102 C40 86 38 56 60 44 C50 64 62 72 66 60 C70 72 82 64 72 44 C94 56 92 86 66 102 Z" fill="#7C8C5A"/><path d="M66 100 C66 80 66 56 66 38 C66 30 74 26 80 30" fill="none" stroke="#9C7CB0" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="30" r="6" fill="#9C7CB0"/>',
  },
  bauhaus:{
    hero: '<circle class="keyline" cx="66" cy="66" r="52"/><circle cx="66" cy="66" r="52" fill="#F2EFE6"/><path d="M66 66 L66 22 A44 44 0 0 1 110 66 Z" fill="#D5332B"/><path d="M66 66 L110 66 A44 44 0 0 1 66 110 Z" fill="#1E4FA3"/><path d="M66 66 L66 110 A44 44 0 0 1 22 66 Z" fill="#F2C200"/><path d="M66 66 L22 66 A44 44 0 0 1 66 22 Z" fill="#1b1b1b"/><circle cx="66" cy="66" r="9" fill="#F2EFE6"/>',
    decor:'<rect class="keyline" x="16" y="16" width="100" height="100" rx="14"/><rect x="16" y="16" width="100" height="100" rx="14" fill="#F2EFE6"/><circle cx="46" cy="46" r="22" fill="#D5332B"/><rect x="62" y="62" width="40" height="40" fill="#1E4FA3"/><path d="M44 104 L66 64 L88 104 Z" fill="#F2C200"/>',
  },
  deco:{
    hero: '<path class="keyline" d="M66 18 L106 96 a44 44 0 0 1 -80 0 Z"/><path d="M66 22 L102 96 a40 40 0 0 1 -72 0 Z" fill="#1F5C4D"/><g stroke="#C9A227" stroke-width="3.4" stroke-linecap="round"><line x1="66" y1="40" x2="66" y2="96"/><line x1="66" y1="96" x2="46" y2="52"/><line x1="66" y1="96" x2="86" y2="52"/><line x1="66" y1="96" x2="34" y2="74"/><line x1="66" y1="96" x2="98" y2="74"/></g><circle cx="66" cy="96" r="5" fill="#C9A227"/>',
    decor:'<rect class="keyline" x="16" y="20" width="100" height="92" rx="16"/><rect x="16" y="20" width="100" height="92" rx="16" fill="#14241F"/><g fill="none" stroke-linecap="round"><path d="M30 92 a36 36 0 0 1 72 0" stroke="#C9A227" stroke-width="5"/><path d="M40 92 a26 26 0 0 1 52 0" stroke="#1F5C4D" stroke-width="5"/><path d="M50 92 a16 16 0 0 1 32 0" stroke="#C9A227" stroke-width="5"/></g>',
  },
  swiss:{
    hero: '<rect class="keyline" x="16" y="16" width="100" height="100" rx="12"/><rect x="16" y="16" width="100" height="100" rx="12" fill="#E2241A"/><rect x="58" y="38" width="16" height="56" fill="#fff"/><rect x="38" y="58" width="56" height="16" fill="#fff"/>',
    decor:'<rect class="keyline" x="16" y="16" width="100" height="100" rx="12"/><rect x="16" y="16" width="100" height="100" rx="12" fill="#fff"/><g fill="#111111"><rect x="30" y="34" width="56" height="12"/><rect x="30" y="60" width="72" height="12"/><rect x="30" y="86" width="40" height="12"/></g><rect x="92" y="34" width="10" height="12" fill="#E2241A"/><rect x="78" y="86" width="24" height="12" fill="#E2241A"/>',
  },
  memphis:{
    hero: '<rect class="keyline" x="16" y="16" width="100" height="100" rx="22"/><rect x="16" y="16" width="100" height="100" rx="22" fill="#1b1b1b"/><path d="M74 28 L46 70 L64 70 L58 104 L88 60 L70 60 Z" fill="#FFC93C"/><circle cx="40" cy="44" r="6" fill="#ED5A8B"/><circle cx="94" cy="84" r="6" fill="#28C0CE"/>',
    decor:'<rect class="keyline" x="16" y="22" width="100" height="88" rx="22"/><rect x="16" y="22" width="100" height="88" rx="22" fill="#FFF6E9"/><path d="M28 66 q12 -20 24 0 t24 0 t24 0" fill="none" stroke="#ED5A8B" stroke-width="6" stroke-linecap="round"/><circle cx="40" cy="42" r="7" fill="#28C0CE"/><rect x="80" y="36" width="14" height="14" fill="#FFC93C" transform="rotate(20 87 43)"/><circle cx="66" cy="92" r="5" fill="#ED5A8B"/>',
  },
};
var _VB = 'viewBox="0 0 132 132"';
function _eraHeroSVG(eraId) {
  var d = _DE[eraId];
  if (!d) return '';
  return '<svg ' + _VB + '>' + d.hero.replace(/class="keyline"/g, 'style="paint-order:stroke"') + '</svg>';
}
function _stkEl(eraId) {
  var d = _DE[eraId];
  return d ? '<span class="de-stk m-' + eraId + '"><svg ' + _VB + '>' + d.decor + '</svg></span>' : '';
}
var _ERA_MOTION_CSS = [
  '.keyline{stroke:#fff;stroke-width:9;stroke-linejoin:round;fill:#fff;paint-order:stroke}',
  '#ielts-era-decor .de-stk{position:absolute;display:block}',
  '#ielts-era-decor .de-stk svg{width:100%;height:100%;display:block;overflow:visible}',
  '@media (prefers-reduced-motion:no-preference){',
  '  @keyframes m-gleam{0%,100%{filter:drop-shadow(0 7px 12px rgba(40,30,14,.24)) brightness(1)}50%{filter:drop-shadow(0 10px 18px rgba(40,30,14,.30)) brightness(1.14)}}',
  '  @keyframes m-grand{0%,100%{transform:scale(1) rotate(0)}50%{transform:scale(1.07) rotate(-1.5deg)}}',
  '  @keyframes m-sway{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(4deg) translateY(-5px)}}',
  '  @keyframes m-grow{0%{transform:scale(.84) rotate(-3deg)}55%{transform:scale(1.05) rotate(2deg)}100%{transform:scale(.84) rotate(-3deg)}}',
  '  @keyframes m-assemble{0%{transform:scale(.35) rotate(-14deg);opacity:0}28%{opacity:1}45%,78%{transform:scale(1) rotate(0);opacity:1}100%{transform:scale(.35) rotate(-14deg);opacity:0}}',
  '  @keyframes m-unfold{0%{transform:perspective(340px) rotateY(-82deg);opacity:0}34%,80%{transform:perspective(340px) rotateY(0);opacity:1}100%{transform:perspective(340px) rotateY(-82deg);opacity:0}}',
  '  @keyframes m-snap{0%{transform:translateX(-42px);opacity:0}18%,82%{transform:translateX(0);opacity:1}100%{transform:translateX(42px);opacity:0}}',
  '  @keyframes m-jitter{0%{transform:translate(0,0) rotate(0)}25%{transform:translate(2px,-3px) rotate(6deg)}50%{transform:translate(-2px,2px) rotate(-5deg)}75%{transform:translate(3px,1px) rotate(4deg)}100%{transform:translate(0,0) rotate(0)}}',
  '  .m-renaissance{animation:m-gleam 2.8s cubic-bezier(.16,1,.3,1) infinite}',
  '  .m-baroque{animation:m-grand 3.2s cubic-bezier(.4,0,.2,1) infinite}',
  '  .m-rococo{animation:m-sway 3.4s cubic-bezier(.4,0,.2,1) infinite;transform-origin:50% 60%}',
  '  .m-nouveau{animation:m-grow 3.0s cubic-bezier(.16,1,.3,1) infinite}',
  '  .m-bauhaus{animation:m-assemble 2.6s cubic-bezier(.34,1.56,.64,1) infinite}',
  '  .m-deco{animation:m-unfold 3.0s cubic-bezier(.16,1,.3,1) infinite;transform-origin:left center}',
  '  .m-swiss{animation:m-snap 2.6s cubic-bezier(.85,0,.15,1) infinite}',
  '  .m-memphis{animation:m-jitter 1.0s cubic-bezier(.4,0,.2,1) infinite}',
  '}',
].join('\n');
