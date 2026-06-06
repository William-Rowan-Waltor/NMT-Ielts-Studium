// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN ERAS — user-selectable visual themes (see "Applying the Design Eras" guide).
// The app is fully token-driven (:root vars in styles.css). Each era remaps those
// ~17 vars, swaps the 3 font families, and paints a CSS-only background recipe.
// applyDesignEra() injects a <style> (after styles.css) + a Google-Fonts <link>.
// "modern" = the shipped lime-on-black baseline (removes any override).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _hexToRgba(hex, a) {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${a})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const DESIGN_ERAS = [
  {
    id: "modern", label: "Modern (default)", light: false,
    blurb: "The shipped lime-on-black contemporary look — your baseline."
    // no fonts/vars: applyDesignEra() resets to styles.css
  },
  {
    id: "classical", label: "Classical Antiquity", light: false, fx: "classical",
    blurb: "Marble + gold. Cinzel capitals over Cormorant Garamond.",
    fonts: "family=Cinzel:wght@500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400",
    display: "'Cinzel', serif", sans: "'Cormorant Garamond', serif", mono: "'Cinzel', serif",
    base: "#0c0a08",
    layers: ["radial-gradient(60% 80% at 30% 18%,rgba(200,169,106,.13),transparent 60%)", "radial-gradient(80% 80% at 82% 92%,rgba(138,160,180,.08),transparent 60%)"],
    vars: { bg: "#0c0a08", bg2: "#0f0c09", surface: "#161210", surface2: "#1e1813", border: "#2a2118", border2: "#3a2e20", ink: "#e8dcc4", ink2: "#a99a7c", ink3: "#6e6048", leaf: "#c8a96a", "leaf-hover": "#d8bd84", sky: "#8aa0b4", orchid: "#b58f6a", honey: "#c8a96a", rose: "#a8604c" }
  },
  {
    id: "gothic", label: "Medieval / Gothic", light: false, fx: "gothic",
    blurb: "Candle gold on near-black. Blackletter titles, EB Garamond body.",
    fonts: "family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;1,400",
    display: "'UnifrakturCook', cursive", sans: "'EB Garamond', serif", mono: "'EB Garamond', serif",
    base: "#0a0d0a",
    layers: ["radial-gradient(50% 60% at 50% 12%,rgba(201,162,39,.14),transparent 60%)", "radial-gradient(120% 120% at 50% 100%,rgba(0,0,0,.5),transparent 55%)"],
    vars: { bg: "#0a0d0a", bg2: "#0c100c", surface: "#121612", surface2: "#1a201a", border: "#243024", border2: "#36482f", ink: "#d8c9a8", ink2: "#9a8c6e", ink3: "#5f5a44", leaf: "#c9a227", "leaf-hover": "#e0b63a", sky: "#3a5a8c", orchid: "#7a3d6b", honey: "#c9a227", rose: "#6b1f2a" }
  },
  {
    id: "renaissance", label: "Renaissance", light: false, fx: "renaissance",
    blurb: "Chiaroscuro gold leaf. Playfair Display over Cormorant.",
    fonts: "family=Playfair+Display:ital,wght@0,600;0,700;1,700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400",
    display: "'Playfair Display', serif", sans: "'Cormorant Garamond', serif", mono: "'Cormorant Garamond', serif",
    base: "#14100a",
    layers: ["radial-gradient(70% 90% at 38% 30%,rgba(184,146,63,.22),transparent 60%)", "radial-gradient(120% 120% at 70% 80%,rgba(122,46,34,.2),transparent 60%)"],
    vars: { bg: "#14100a", bg2: "#181309", surface: "#211a10", surface2: "#2a2012", border: "#352a18", border2: "#473922", ink: "#e6d6b8", ink2: "#b09a72", ink3: "#7a6a4a", leaf: "#b8923f", "leaf-hover": "#cda74f", sky: "#7a8a6a", orchid: "#9a6a4a", honey: "#b8923f", rose: "#7a2e22" }
  },
  {
    id: "baroque", label: "Baroque", light: false, fx: "baroque",
    blurb: "Dramatic heavy gold + oxblood. Playfair 900 italic.",
    fonts: "family=Playfair+Display:ital,wght@0,700;0,900;1,900&family=Cormorant+Garamond:wght@500",
    display: "'Playfair Display', serif", sans: "'Cormorant Garamond', serif", mono: "'Cormorant Garamond', serif",
    base: "#0d0805",
    layers: ["radial-gradient(55% 65% at 50% 28%,rgba(212,175,55,.2),transparent 58%)", "radial-gradient(90% 90% at 12% 95%,rgba(139,26,31,.28),transparent 55%)", "radial-gradient(90% 90% at 90% 95%,rgba(139,26,31,.22),transparent 55%)"],
    vars: { bg: "#0d0805", bg2: "#120a06", surface: "#1a0f0a", surface2: "#24140d", border: "#3a1c14", border2: "#5a2a1c", ink: "#f0e6d2", ink2: "#c9b48a", ink3: "#8a6a4a", leaf: "#d4af37", "leaf-hover": "#e6c451", sky: "#b8902f", orchid: "#8b1a1f", honey: "#d4af37", rose: "#8b1a1f" }
  },
  {
    id: "rococo", label: "Rococo", light: true, fx: "rococo",
    blurb: "Delicate rose + sage on cream. Crimson Pro italic, EB Garamond.",
    fonts: "family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400",
    display: "'Crimson Pro', serif", sans: "'EB Garamond', serif", mono: "'Crimson Pro', serif",
    base: "#F5E9EE",
    layers: ["radial-gradient(80% 80% at 22% 16%,rgba(224,166,184,.16),transparent 60%)", "radial-gradient(80% 80% at 82% 88%,rgba(185,203,160,.12),transparent 60%)"],
    vars: { bg: "#F5E9EE", bg2: "#EDD8E2", surface: "#FDF4F7", surface2: "#EDD8E2", border: "#D4AFC0", border2: "#C09AAE", ink: "#2D1222", ink2: "#6B3550", ink3: "#A87590", leaf: "#9A4A60", "leaf-hover": "#B5586F", sky: "#7A9A6E", orchid: "#C585A0", honey: "#B9CBA0", rose: "#9A4A60" }
  },
  {
    id: "nouveau", label: "Art Nouveau", light: false, fx: "nouveau",
    blurb: "Soft sage + tarnished gold. Italiana / Marcellus.",
    fonts: "family=Italiana&family=Marcellus&family=EB+Garamond",
    display: "'Italiana', serif", sans: "'EB Garamond', serif", mono: "'Marcellus', serif",
    base: "#1a1f1a",
    layers: ["radial-gradient(80% 80% at 25% 25%,rgba(184,155,94,.14),transparent 62%)", "radial-gradient(80% 80% at 80% 80%,rgba(168,90,60,.12),transparent 62%)"],
    vars: { bg: "#1a1f1a", bg2: "#1d231d", surface: "#222a22", surface2: "#2d3a2e", border: "#384538", border2: "#4a5a48", ink: "#d9c9a8", ink2: "#9aa589", ink3: "#6e7a62", leaf: "#b89b5e", "leaf-hover": "#cdb070", sky: "#7d8c6a", orchid: "#a85a3c", honey: "#b89b5e", rose: "#a85a3c" }
  },
  {
    id: "victorian", label: "Victorian (light)", light: true, fx: "victorian",
    blurb: "Cream paper + oxblood ink. IM Fell English / Crimson Text.",
    fonts: "family=IM+Fell+English+SC&family=Crimson+Text:ital,wght@0,400;0,600;1,400",
    display: "'IM Fell English SC', serif", sans: "'Crimson Text', serif", mono: "'IM Fell English SC', serif",
    base: "#f0e7d6",
    layers: ["radial-gradient(90% 90% at 20% 10%,rgba(122,59,46,.06),transparent 60%)", "radial-gradient(120% 120% at 80% 100%,rgba(122,59,46,.05),transparent 60%)"],
    vars: { bg: "#f0e7d6", bg2: "#e8dec9", surface: "#f6efe0", surface2: "#e3d6bd", border: "#cdbb98", border2: "#b5a079", ink: "#2b2218", ink2: "#5a4a36", ink3: "#8a7654", leaf: "#7a3b2e", "leaf-hover": "#9a4a38", sky: "#3c4a3a", orchid: "#7a3b2e", honey: "#b5852f", rose: "#9a3326" }
  },
  {
    id: "deco", label: "Art Deco", light: false, fx: "deco",
    blurb: "Gold + emerald geometry on midnight. Poiret One / Jost.",
    fonts: "family=Poiret+One&family=Limelight&family=Jost:wght@300;400;500",
    display: "'Limelight', serif", sans: "'Jost', sans-serif", mono: "'Jost', sans-serif",
    base: "#0a0c0e",
    layers: ["radial-gradient(60% 70% at 50% 15%,rgba(212,175,55,.12),transparent 60%)", "radial-gradient(70% 70% at 10% 90%,rgba(31,111,92,.16),transparent 60%)", "radial-gradient(70% 70% at 90% 90%,rgba(31,111,92,.12),transparent 60%)"],
    vars: { bg: "#0a0c0e", bg2: "#0d1013", surface: "#14181c", surface2: "#1c2228", border: "#26303a", border2: "#3a4753", ink: "#e8e2d0", ink2: "#9a9684", ink3: "#5f6258", leaf: "#d4af37", "leaf-hover": "#e6c451", sky: "#1f6f5c", orchid: "#1f6f5c", honey: "#d4af37", rose: "#9a3b2f" }
  },
  {
    id: "midcentury", label: "Mid-century (light)", light: true, fx: "midcentury",
    blurb: "Warm cream + burnt orange & teal. Jost / DM Sans, flat.",
    fonts: "family=Jost:wght@400;500;600&family=DM+Sans:wght@400;500;600",
    display: "'Jost', sans-serif", sans: "'DM Sans', sans-serif", mono: "'Jost', sans-serif",
    base: "#f3ead7",
    layers: ["radial-gradient(70% 70% at 18% 16%,rgba(217,138,61,.10),transparent 62%)", "radial-gradient(70% 70% at 85% 88%,rgba(47,138,138,.10),transparent 62%)"],
    vars: { bg: "#f3ead7", bg2: "#ece1c9", surface: "#f8f1e0", surface2: "#ece0c8", border: "#d8c9a6", border2: "#bda87f", ink: "#2a2723", ink2: "#544f47", ink3: "#8a8276", leaf: "#d98a3d", "leaf-hover": "#e89a4d", sky: "#2f8a8a", orchid: "#b5482f", honey: "#e0b13e", rose: "#b5482f" }
  },
  {
    id: "bauhaus", label: "Bauhaus", light: false, fx: "bauhaus",
    blurb: "Primary red / blue / yellow on near-black. Bebas Neue / Space Grotesk.",
    fonts: "family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700",
    display: "'Bebas Neue', sans-serif", sans: "'Space Grotesk', sans-serif", mono: "'Space Grotesk', sans-serif",
    base: "#111111",
    layers: ["radial-gradient(44% 44% at 18% 18%,rgba(213,51,43,.13),transparent 60%)", "radial-gradient(44% 44% at 82% 82%,rgba(30,79,163,.13),transparent 60%)", "radial-gradient(30% 30% at 50% 50%,rgba(242,194,0,.08),transparent 60%)"],
    vars: { bg: "#111111", bg2: "#161616", surface: "#1E1E1E", surface2: "#282828", border: "#383838", border2: "#484848", ink: "#F2EFE6", ink2: "#C8C4B8", ink3: "#8A8678", leaf: "#F2C200", "leaf-hover": "#FFD000", sky: "#1E4FA3", orchid: "#D5332B", honey: "#F2C200", rose: "#D5332B" }
  },
  {
    id: "swiss", label: "Swiss / International", light: true, fx: "swiss",
    blurb: "Swiss red on crisp white. Barlow Condensed, strict grid.",
    fonts: "family=Barlow+Condensed:wght@500;700&family=Barlow:wght@300;400;500",
    display: "'Barlow Condensed', sans-serif", sans: "'Barlow', sans-serif", mono: "'Barlow Condensed', sans-serif",
    base: "#F7F7F7",
    layers: ["radial-gradient(60% 60% at 92% 8%,rgba(226,36,26,.07),transparent 60%)"],
    vars: { bg: "#F7F7F7", bg2: "#EDEDED", surface: "#FFFFFF", surface2: "#F0F0F0", border: "#C0C0C0", border2: "#A8A8A8", ink: "#111111", ink2: "#444444", ink3: "#888888", leaf: "#E2241A", "leaf-hover": "#CC1810", sky: "#333333", orchid: "#E2241A", honey: "#E2241A", rose: "#E2241A" }
  },
  {
    id: "memphis", label: "Memphis / Post-Modern", light: false, fx: "memphis",
    blurb: "Hot pink + cyan + yellow on near-black. Righteous / Nunito.",
    fonts: "family=Righteous&family=Nunito:wght@400;600;700",
    display: "'Righteous', sans-serif", sans: "'Nunito', sans-serif", mono: "'Righteous', sans-serif",
    base: "#1A1A1A",
    layers: ["radial-gradient(38% 38% at 14% 18%,rgba(237,90,139,.11),transparent 55%)", "radial-gradient(38% 38% at 86% 78%,rgba(40,192,206,.11),transparent 55%)", "radial-gradient(26% 26% at 50% 92%,rgba(255,201,60,.08),transparent 50%)"],
    vars: { bg: "#1A1A1A", bg2: "#222222", surface: "#2A2A2A", surface2: "#323232", border: "#404040", border2: "#505050", ink: "#FFF6E9", ink2: "#CCBFB0", ink3: "#8A8278", leaf: "#ED5A8B", "leaf-hover": "#FF6E9E", sky: "#28C0CE", orchid: "#FFC93C", honey: "#FFC93C", rose: "#ED5A8B" }
  }
];

// ── Decorative "stickers" (inline SVG) + per-era motion ───────────────────
function _decoSunSVG() {
  let rays = "";
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    rays += `<line x1="${(50 + Math.cos(a) * 13).toFixed(1)}" y1="${(50 + Math.sin(a) * 13).toFixed(1)}" x2="${(50 + Math.cos(a) * 49).toFixed(1)}" y2="${(50 + Math.sin(a) * 49).toFixed(1)}"/>`;
  }
  return `<svg class="dc-sun" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="0.7"><circle cx="50" cy="50" r="13"/>${rays}<circle cx="50" cy="50" r="49"/></svg>`;
}
function _decoChevSVG() {
  let c = "";
  for (let i = 0; i < 5; i++) { const y = 24 + i * 14; c += `<polyline points="22,${y} 50,${y - 15} 78,${y}"/>`; }
  return `<svg class="dc-chev" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${c}</svg>`;
}
const _BAROQUE_FLOURISH = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
<path d="M12 92 C 10 54 38 44 50 58 C 60 70 46 82 39 71 C 34 63 43 58 47 64"/>
<path d="M50 58 C 62 36 86 32 90 12 C 92 5 85 3 83 10"/>
<path d="M50 58 C 44 41 56 28 72 31"/>
<path d="M28 90 C 34 71 23 61 13 66"/>
<circle cx="83" cy="11" r="2.3" fill="currentColor" stroke="none"/>
<circle cx="72" cy="31" r="1.8" fill="currentColor" stroke="none"/></svg>`;

function _classicalWreathSVG() {
  let leaves = "";
  for (let i = 0; i <= 11; i++) {
    const deg = 205 + (i / 11) * 130, a = deg * Math.PI / 180;
    const cx = 50 + Math.cos(a) * 34, cy = 50 + Math.sin(a) * 34;
    leaves += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="6" ry="2.5" transform="rotate(${(deg + 90).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
  }
  return `<svg class="cl-wreath" viewBox="0 0 100 100" fill="currentColor" stroke="none">${leaves}</svg>`;
}
function _gothicArchSVG(cls) {
  return `<svg class="${cls}" viewBox="0 0 100 140" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M10 140 V58 Q10 18 50 8 Q90 18 90 58 V140"/><path d="M22 140 V60 Q22 30 50 22 Q78 30 78 60 V140"/><circle cx="50" cy="58" r="9"/><circle cx="39" cy="73" r="7"/><circle cx="61" cy="73" r="7"/></svg>`;
}
function _renCompassSVG() {
  return `<svg class="re-compass" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="0.9"><circle cx="50" cy="50" r="42"/><rect x="20" y="20" width="60" height="60"/><line x1="6" y1="50" x2="94" y2="50"/><line x1="50" y1="6" x2="50" y2="94"/><line x1="20" y1="20" x2="80" y2="80"/><line x1="80" y1="20" x2="20" y2="80"/><circle cx="50" cy="50" r="2.6" fill="currentColor" stroke="none"/></svg>`;
}
function _nouveauVineSVG(cls) {
  return `<svg class="${cls}" viewBox="0 0 100 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M50 198 C 18 162 82 140 50 100 C 18 60 82 40 50 4"/><path d="M50 150 C 72 142 80 122 72 108"/><circle cx="72" cy="106" r="4" fill="currentColor" stroke="none"/><path d="M50 78 C 28 70 20 50 30 38"/><circle cx="30" cy="36" r="4" fill="currentColor" stroke="none"/></svg>`;
}
function _victorianCornerSVG(cls) {
  return `<svg class="${cls}" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M6 6 H42 M6 6 V42"/><path d="M6 30 C 26 30 30 24 30 6"/><path d="M12 12 C 32 14 42 24 44 44 C 46 30 56 24 66 26"/><circle cx="66" cy="26" r="2.2" fill="currentColor" stroke="none"/></svg>`;
}
function _midAtomSVG() {
  let s = ""; const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, len = i % 2 ? 46 : 34;
    const x = 50 + Math.cos(a) * len, y = 50 + Math.sin(a) * len;
    s += `<line x1="50" y1="50" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 2 ? 3 : 2.2}" fill="currentColor" stroke="none"/>`;
  }
  return `<svg class="mc-atom" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="50" cy="50" r="4" fill="currentColor" stroke="none"/>${s}</svg>`;
}
function _midBoomerangSVG() {
  return `<svg class="mc-boom" viewBox="0 0 100 100" fill="currentColor" stroke="none"><path d="M14 26 C 50 8 66 30 86 72 C 70 50 54 46 40 56 C 31 41 22 33 14 26 Z"/></svg>`;
}

// _DE, _VB, _eraHeroSVG, _stkEl, _ERA_MOTION_CSS → loaded from src/04a-era-stickers.js
// as a plain <script> before the Babel block (keeps Babel input under 500 KB).

// ── New era SVG generators (Rococo, Bauhaus, Swiss, Memphis) ──────────────
function _rococoShellSVG() {
  return `<svg class="rc-shell" viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M50 112 C16 90 12 52 28 34 C40 20 50 34 50 34 C50 34 60 20 72 34 C88 52 84 90 50 112 Z"/><path d="M50 104 C40 78 38 54 43 38"/><path d="M50 104 C60 78 62 54 57 38"/><path d="M50 104 L50 42"/><path d="M38 80 C28 70 26 54 34 46"/><path d="M62 80 C72 70 74 54 66 46"/></svg>`;
}
function _rococoFanSVG() {
  return `<svg class="rc-fan" viewBox="0 0 140 100" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M70 96 L18 30 A58 58 0 0 1 122 30 Z"/><line x1="70" y1="96" x2="34" y2="40"/><line x1="70" y1="96" x2="54" y2="28"/><line x1="70" y1="96" x2="70" y2="26"/><line x1="70" y1="96" x2="86" y2="28"/><line x1="70" y1="96" x2="106" y2="40"/><circle cx="70" cy="96" r="5" fill="currentColor"/><path d="M18 30 A58 58 0 0 1 122 30" stroke-width="2"/></svg>`;
}
function _bauhausPrimitivesSVG() {
  return `<svg class="bh-prim" viewBox="0 0 140 60" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="24" cy="30" r="20"/><rect x="52" y="10" width="40" height="40"/><path d="M114 52 L140 52 L127 8 Z"/></svg>`;
}
function _bauhausConcentricSVG() {
  return `<svg class="bh-conc" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="30"/><circle cx="50" cy="50" r="16"/><circle cx="50" cy="50" r="4" fill="currentColor"/></svg>`;
}
function _swissCrossSVG() {
  return `<svg class="sw-cross" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="42" y="16" width="16" height="68"/><rect x="16" y="42" width="68" height="16"/></svg>`;
}
function _swissGridSVG() {
  const ws = [70, 84, 50, 66, 80, 42];
  const bars = ws.map((w, i) => `<line x1="8" y1="${14 + i * 13}" x2="${8 + w}" y2="${14 + i * 13}"/>`).join("");
  return `<svg class="sw-grid" viewBox="0 0 100 90" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">${bars}</svg>`;
}
function _memphisSquiggleSVG() {
  return `<svg class="mp-squig" viewBox="0 0 240 56" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><path d="M8 28 q18 -24 36 0 t36 0 t36 0 t36 0 t36 0"/></svg>`;
}
function _memphisDotsSVG() {
  let d = "";
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      d += `<circle cx="${12 + col * 22}" cy="${12 + row * 22}" r="${[4,3,5,3,4,5,3,4,5,3,4,3][row * 4 + col]}"/>`;
    }
  }
  return `<svg class="mp-dots" viewBox="0 0 90 68" fill="currentColor">${d}</svg>`;
}

function _eraDecorHTML(kind) {
  if (kind === "baroque") return `<div class="bq-flourish tr">${_BAROQUE_FLOURISH}</div><div class="bq-flourish bl">${_BAROQUE_FLOURISH}</div>${_stkEl('baroque')}`;
  if (kind === "deco") return `<div class="dc-grid"></div>${_decoSunSVG()}${_decoChevSVG()}${_stkEl('deco')}`;
  if (kind === "classical") return `<div class="cl-dentil"></div>${_classicalWreathSVG()}`;
  if (kind === "gothic") return `${_gothicArchSVG("go-arch")}${_gothicArchSVG("go-arch l")}`;
  if (kind === "renaissance") return `${_renCompassSVG()}${_stkEl('renaissance')}`;
  if (kind === "nouveau") return `${_nouveauVineSVG("nv-vine")}${_nouveauVineSVG("nv-vine l")}${_stkEl('nouveau')}`;
  if (kind === "victorian") return `${_victorianCornerSVG("vc-corner tr")}${_victorianCornerSVG("vc-corner bl")}${_victorianCornerSVG("vc-corner br")}`;
  if (kind === "midcentury") return `${_midAtomSVG()}${_midBoomerangSVG()}`;
  if (kind === "rococo") return `${_rococoShellSVG()}${_rococoFanSVG()}${_stkEl('rococo')}`;
  if (kind === "bauhaus") return `${_bauhausPrimitivesSVG()}${_bauhausConcentricSVG()}${_stkEl('bauhaus')}`;
  if (kind === "swiss") return `${_swissCrossSVG()}${_swissGridSVG()}${_stkEl('swiss')}`;
  if (kind === "memphis") return `${_memphisSquiggleSVG()}${_memphisDotsSVG()}${_stkEl('memphis')}`;
  return "";
}

function _eraFxCSS(kind) {
  if (kind === "baroque") return `
#ielts-era-decor .bq-flourish{position:absolute;width:240px;height:240px;color:var(--leaf);opacity:.15}
#ielts-era-decor .bq-flourish svg{width:100%;height:100%}
#ielts-era-decor .bq-flourish.tr{top:64px;right:-26px;transform:scaleX(-1)}
#ielts-era-decor .bq-flourish.bl{bottom:-30px;left:210px}
.title-x em{background:linear-gradient(90deg,var(--leaf),#fff3cf 45%,var(--leaf));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;background-size:220% 100%}
.btn.bp{position:relative;overflow:hidden}
.btn.bp::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,246,216,.55) 50%,transparent 65%);transform:translateX(-130%)}
@media (prefers-reduced-motion: no-preference){
  body::before{animation:bq-breathe 9s ease-in-out infinite}
  #ielts-era-decor .bq-flourish{animation:bq-float 15s ease-in-out infinite}
  #ielts-era-decor .bq-flourish.bl{animation-delay:-7.5s}
  .title-x em{animation:bq-shimmer 7s linear infinite}
  .btn.bp:hover::after{animation:bq-sheen .85s ease}
}
@keyframes bq-breathe{0%,100%{opacity:.82}50%{opacity:1}}
@keyframes bq-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-9px) rotate(1.6deg)}}
@keyframes bq-shimmer{to{background-position:220% 0}}
@keyframes bq-sheen{to{transform:translateX(130%)}}
#ielts-era-decor .de-stk{bottom:28px;right:28px;width:92px;height:92px;opacity:.40}`;
  if (kind === "deco") return `
#ielts-era-decor .dc-grid{position:absolute;inset:0;background-image:repeating-linear-gradient(90deg,transparent 0 46px,rgba(212,175,55,.045) 46px 47px),repeating-linear-gradient(0deg,transparent 0 46px,rgba(212,175,55,.04) 46px 47px)}
#ielts-era-decor .dc-sun{position:absolute;top:-130px;right:-130px;width:380px;height:380px;color:var(--leaf);opacity:.13}
#ielts-era-decor .dc-chev{position:absolute;bottom:30px;left:250px;width:120px;height:120px;color:var(--sky);opacity:.2}
.btn.bp{transition:all .18s,letter-spacing .2s}
.title-x em{position:relative}
.title-x em::after{content:"";position:absolute;left:0;right:0;bottom:-5px;height:2px;background:linear-gradient(90deg,var(--leaf),transparent)}
.ni.active{box-shadow:inset 3px 0 0 var(--leaf)}
@media (prefers-reduced-motion: no-preference){
  #ielts-era-decor .dc-sun{animation:dc-rotate 75s linear infinite;transform-origin:50% 50%}
  .btn.bp:hover{letter-spacing:.12em}
  .ni:hover{letter-spacing:.05em}
}
@keyframes dc-rotate{to{transform:rotate(360deg)}}
#ielts-era-decor .de-stk{bottom:24px;left:250px;width:88px;height:88px;opacity:.46}`;
  if (kind === "classical") return `
#ielts-era-decor .cl-dentil{position:absolute;top:0;left:var(--sw,220px);right:0;height:9px;background:repeating-linear-gradient(90deg,var(--leaf) 0 5px,transparent 5px 14px);opacity:.45}
#ielts-era-decor .cl-wreath{position:absolute;bottom:24px;right:48px;width:240px;height:240px;color:var(--leaf);opacity:.14}
@media (prefers-reduced-motion: no-preference){#ielts-era-decor .cl-wreath{animation:cl-bob 12s ease-in-out infinite;transform-origin:50% 50%}}
@keyframes cl-bob{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}`;
  if (kind === "gothic") return `
#ielts-era-decor .go-arch{position:absolute;bottom:0;right:70px;width:190px;height:270px;color:var(--leaf);opacity:.13}
#ielts-era-decor .go-arch.l{right:auto;left:250px;width:150px;height:215px;opacity:.08}
@media (prefers-reduced-motion: no-preference){body::before{animation:go-flicker 6s ease-in-out infinite}}
@keyframes go-flicker{0%,100%{opacity:.86}12%{opacity:1}22%{opacity:.8}38%{opacity:.96}52%{opacity:.78}68%{opacity:1}84%{opacity:.9}}`;
  if (kind === "renaissance") return `
#ielts-era-decor .re-compass{position:absolute;top:90px;right:60px;width:300px;height:300px;color:var(--leaf);opacity:.10}
@media (prefers-reduced-motion: no-preference){body::before{animation:re-drift 26s ease-in-out infinite}#ielts-era-decor .re-compass{animation:re-spin 140s linear infinite;transform-origin:50% 50%}}
@keyframes re-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(2%,-1.6%)}}
@keyframes re-spin{to{transform:rotate(360deg)}}
#ielts-era-decor .de-stk{bottom:18px;left:248px;width:86px;height:86px;opacity:.44}`;
  if (kind === "nouveau") return `
#ielts-era-decor .nv-vine{position:absolute;bottom:-24px;right:54px;width:150px;height:300px;color:var(--leaf);opacity:.16}
#ielts-era-decor .nv-vine.l{right:auto;left:248px;opacity:.10}
@media (prefers-reduced-motion: no-preference){#ielts-era-decor .nv-vine{animation:nv-sway 9s ease-in-out infinite;transform-origin:bottom center}#ielts-era-decor .nv-vine.l{animation-delay:-4.5s}}
@keyframes nv-sway{0%,100%{transform:rotate(-1.8deg)}50%{transform:rotate(1.8deg)}}
#ielts-era-decor .de-stk{top:58px;right:52px;width:92px;height:92px;opacity:.50}`;
  if (kind === "victorian") return `
#ielts-era-decor .vc-corner{position:absolute;width:150px;height:150px;color:var(--leaf);opacity:.22}
#ielts-era-decor .vc-corner.tr{top:62px;right:18px;transform:scaleX(-1)}
#ielts-era-decor .vc-corner.br{bottom:18px;right:18px;transform:scale(-1,-1)}
#ielts-era-decor .vc-corner.bl{bottom:18px;left:248px;transform:scaleY(-1)}
.btn.bp{position:relative}
.btn.bp::after{content:"";position:absolute;left:12px;right:12px;bottom:5px;height:1px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .3s}
.btn.bp:hover::after{transform:scaleX(1)}`;
  if (kind === "midcentury") return `
#ielts-era-decor .mc-atom{position:absolute;top:74px;right:64px;width:155px;height:155px;color:var(--sky);opacity:.5}
#ielts-era-decor .mc-boom{position:absolute;bottom:44px;left:260px;width:140px;height:140px;color:var(--orchid);opacity:.45}
.btn.bp{transition:transform .12s}
.btn.bp:hover{transform:translateY(-1px) scale(1.02)}
@media (prefers-reduced-motion: no-preference){#ielts-era-decor .mc-atom{animation:mc-rot 90s linear infinite;transform-origin:50% 50%}}
@keyframes mc-rot{to{transform:rotate(360deg)}}`;
  if (kind === "rococo") return `
#ielts-era-decor .rc-shell{position:absolute;bottom:-30px;right:56px;width:160px;height:196px;color:var(--leaf);opacity:.20}
#ielts-era-decor .rc-fan{position:absolute;top:56px;left:250px;width:220px;height:158px;color:var(--sky);opacity:.14}
@media (prefers-reduced-motion: no-preference){
  #ielts-era-decor .rc-shell{animation:rc-sway 9s ease-in-out infinite;transform-origin:bottom center}
  #ielts-era-decor .rc-fan{animation:rc-drift 12s ease-in-out infinite}
}
@keyframes rc-sway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
@keyframes rc-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
#ielts-era-decor .de-stk{top:54px;right:18px;width:96px;height:96px;opacity:.54}`;
  if (kind === "bauhaus") return `
#ielts-era-decor .bh-prim{position:absolute;top:64px;right:48px;width:280px;height:122px;color:var(--leaf);opacity:.15}
#ielts-era-decor .bh-conc{position:absolute;bottom:30px;left:260px;width:160px;height:160px;color:var(--sky);opacity:.11}
@media (prefers-reduced-motion: no-preference){
  body::before{animation:bh-pulse 8s ease-in-out infinite}
  #ielts-era-decor .bh-conc{animation:bh-spin 90s linear infinite;transform-origin:50% 50%}
}
@keyframes bh-pulse{0%,100%{opacity:.88}50%{opacity:1}}
@keyframes bh-spin{to{transform:rotate(360deg)}}
#ielts-era-decor .de-stk{bottom:32px;right:24px;width:100px;height:100px;opacity:.58}`;
  if (kind === "swiss") return `
#ielts-era-decor .sw-cross{position:absolute;top:60px;right:56px;width:160px;height:160px;color:var(--leaf);opacity:.18}
#ielts-era-decor .sw-grid{position:absolute;bottom:40px;left:256px;width:158px;height:145px;color:var(--ink3,#8a8276);opacity:.22}
.btn.bp{transition:all .12s cubic-bezier(.85,0,.15,1)}
@media (prefers-reduced-motion: no-preference){
  body::before{animation:sw-flash 7s step-start infinite}
}
@keyframes sw-flash{0%,93%,100%{opacity:1}95%{opacity:.55}97%{opacity:1}}
#ielts-era-decor .de-stk{bottom:28px;left:250px;width:88px;height:88px;opacity:.28}`;
  if (kind === "memphis") return `
#ielts-era-decor .mp-squig{position:absolute;top:80px;right:-20px;width:340px;height:80px;color:var(--leaf);opacity:.24}
#ielts-era-decor .mp-dots{position:absolute;bottom:36px;left:250px;width:130px;height:100px;color:var(--sky);opacity:.32}
.btn.bp{transition:transform .08s,background .13s}
.btn.bp:hover{transform:translateY(-2px) rotate(-1deg) scale(1.03)}
@media (prefers-reduced-motion: no-preference){
  #ielts-era-decor .mp-squig{animation:mp-jitter .5s ease-in-out infinite alternate}
  #ielts-era-decor .mp-dots{animation:mp-bob 3s ease-in-out infinite}
}
@keyframes mp-jitter{0%{transform:translateX(0) skewX(0)}100%{transform:translateX(4px) skewX(-1deg)}}
@keyframes mp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
#ielts-era-decor .de-stk{bottom:32px;right:22px;width:94px;height:94px;opacity:.52}`;
  return "";
}

// Per-era control design: button shape (radius) + primary-button fill/border,
// progress-bar shape + an animated "fill sheen" sweep. Progress SEGMENT colours
// already use CSS vars (auto-themed); here we shape them + add motion.
const _ERA_CONTROLS = {
  classical:   { r: "3px",   br: "2px",   fr: "0",     fill: "linear-gradient(180deg,#d8bd84,#c8a96a)",          bp: "color:#1a140d;border:1px solid #8a6a3a",                                   sheen: "rgba(255,240,200,.32)", sp: "4s" },
  gothic:      { r: "0",     br: "0",     fr: "0",     fill: "linear-gradient(180deg,#e0b63a,#c9a227)",          bp: "color:#0a0d0a;border:1px solid #6b5310",                                   sheen: "rgba(255,220,120,.30)", sp: "5s" },
  renaissance: { r: "6px",   br: "999px", fr: "999px", fill: "linear-gradient(180deg,#cda74f,#b8923f)",          bp: "color:#14100a;border:1px solid #7a5a22",                                   sheen: "rgba(255,235,190,.30)", sp: "3.6s" },
  baroque:     { r: "10px",  br: "999px", fr: "999px", fill: "linear-gradient(180deg,#e6c451,#d4af37 55%,#b8902f)", bp: "color:#0d0805;border:1px solid #8a6a1a;text-shadow:0 1px 0 rgba(255,255,255,.25)", sheen: "rgba(255,246,216,.50)", sp: "3s" },
  nouveau:     { r: "999px", br: "999px", fr: "999px", fill: "linear-gradient(180deg,#cdb070,#b89b5e)",          bp: "color:#1a1f1a;border:1px solid #7d8c6a",                                   sheen: "rgba(230,210,160,.30)", sp: "4.2s" },
  victorian:   { r: "2px",   br: "2px",   fr: "1px",   fill: "var(--leaf)",                                      bp: "color:#fff;border:1px solid #5a2a20",                                      sheen: "rgba(122,59,46,.28)",   sp: "4.6s" },
  deco:        { r: "0",     br: "0",     fr: "0",     fill: "linear-gradient(180deg,#e6c451,#d4af37)",          bp: "color:#0a0c0e;border:1px solid #1f6f5c",                                   sheen: "rgba(255,235,150,.34)", sp: "2.6s" },
  midcentury:  { r: "7px",   br: "7px",   fr: "5px",   fill: "var(--leaf)",                                      bp: "color:#fff",                                                               sheen: "rgba(181,72,47,.22)",   sp: "5s" },
  rococo:      { r: "999px", br: "999px", fr: "999px", fill: "var(--leaf)",                                      bp: "color:#fff;border:1px solid #7a2e48",                                       sheen: "rgba(200,133,160,.30)", sp: "4.8s" },
  bauhaus:     { r: "0",     br: "0",     fr: "0",     fill: "var(--leaf)",                                      bp: "color:#111111;border:0",                                                    sheen: "rgba(242,194,0,.40)",   sp: "2.4s" },
  swiss:       { r: "0",     br: "2px",   fr: "0",     fill: "var(--leaf)",                                      bp: "color:#fff;border:0",                                                       sheen: "rgba(226,36,26,.28)",   sp: "2.8s" },
  memphis:     { r: "999px", br: "4px",   fr: "999px", fill: "linear-gradient(135deg,var(--leaf),var(--sky))",   bp: "color:#fff;border:0",                                                       sheen: "rgba(255,201,60,.36)",  sp: "2.0s" }
};
function _eraControlsCSS(era) {
  const c = _ERA_CONTROLS[era.id];
  if (!c) return "";
  const tint = (a) => _hexToRgba(era.vars.leaf, a);
  return `
.btn,.bsm,.mode-btn,.sublist-btn{border-radius:${c.r}!important}
.btn.bp{background:${c.fill};${c.bp}}
.mode-btn.active{background:${tint(.12)};color:var(--leaf)}
.sublist-btn.active{background:${tint(.12)};border-color:${tint(.4)};color:var(--leaf)}
.pbar,.awl-stack-bar,.awl-total-bar{border-radius:${c.br};position:relative;overflow:hidden}
.pbar-fill,.awl-stack-seg,.awl-total-bar>div{border-radius:${c.fr}}
.pbar::after,.awl-stack-bar::after,.awl-total-bar::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 30%,${c.sheen} 50%,transparent 70%);transform:translateX(-120%)}
@media (prefers-reduced-motion: no-preference){.pbar::after,.awl-stack-bar::after,.awl-total-bar::after{animation:fx-prog ${c.sp} linear infinite}}
@keyframes fx-prog{to{transform:translateX(120%)}}
.btn,.bsm,.mode-btn,.sublist-btn{transition:transform .12s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease}
.btn:active,.bsm:active,.mode-btn:active,.sublist-btn:active{transform:translateY(1px) scale(.985)}
.btn:focus-visible,.bsm:focus-visible,.mode-btn:focus-visible,.sublist-btn:focus-visible{outline:2px solid var(--leaf);outline-offset:2px}`;
}

// Shared ambient orbs that drift in the background of EVERY era (themed by --leaf).
function _sharedDecorHTML() {
  // taste-skill restraint: 2 ambient orbs (was 3) — calmer, avoids "effects on everything".
  return `<div class="fx-orb a"></div><div class="fx-orb b"></div>`;
}

// Shared, accent-themed decoration + motion around titles, kickers, cards,
// inputs, nav items and buttons — applied to every non-modern era.
function _eraElementFxCSS() {
  // taste-skill "motion must be motivated": keep the static accent ornaments + hover/focus
  // feedback, but drop the gratuitous perpetual pulses (underline/tick/dot). Ambient orbs
  // are reduced to 2 and drift slower/shorter for a calmer, more premium feel.
  return `
#ielts-era-decor .fx-orb{position:absolute;border-radius:50%;background:radial-gradient(circle,var(--leaf),transparent 70%);opacity:.05;filter:blur(3px)}
#ielts-era-decor .fx-orb.a{width:280px;height:280px;top:12%;left:32%}
#ielts-era-decor .fx-orb.b{width:200px;height:200px;top:58%;left:64%}
.title-x{position:relative}
.title-x::after{content:"";position:absolute;left:0;bottom:-6px;width:72px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--leaf),transparent)}
.kicker{position:relative;padding-left:15px}
.kicker::before{content:"";position:absolute;left:0;top:50%;width:7px;height:7px;margin-top:-4px;border:1.5px solid var(--leaf);transform:rotate(45deg)}
.card{position:relative}
.card::before{content:"";position:absolute;inset:0;border-radius:12px;border:2px solid transparent;pointer-events:none;transition:border-top-color .4s ease,border-left-color .55s ease .05s}
.card:hover::before{border-top-color:var(--leaf);border-left-color:var(--leaf)}
.btn.bp:hover{box-shadow:0 5px 16px -7px var(--leaf)}
textarea:focus,input[type=text]:focus,input[type=password]:focus,select:focus,input[type=date]:focus{box-shadow:0 0 0 1px var(--leaf),0 0 14px -5px var(--leaf)}
.ni{position:relative}
.ni::before{content:"";position:absolute;left:2px;top:20%;bottom:20%;width:2px;border-radius:2px;background:var(--leaf);transform:scaleY(0);transform-origin:center;transition:transform .2s}
.ni:hover::before,.ni.active::before{transform:scaleY(1)}
@media (prefers-reduced-motion: no-preference){
  #ielts-era-decor .fx-orb.a{animation:fx-drift1 34s ease-in-out infinite}
  #ielts-era-decor .fx-orb.b{animation:fx-drift2 40s ease-in-out infinite}
}
@keyframes fx-drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-22px)}}
@keyframes fx-drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-26px,20px)}}`;
}

function _buildEraCSS(era) {
  const v = era.vars || {};
  const varLines = Object.entries(v).map(([k, val]) => `--${k}:${val};`).join("");
  const leaf = v.leaf || "#a3e635";
  const leafHover = v["leaf-hover"] || leaf;
  const chevronStroke = "%23" + String(leaf).replace("#", "");
  const base = era.base || "#09090b";
  const bg = (era.layers && era.layers.length) ? `${era.layers.join(",")},${base}` : base;
  const primaryText = era.light ? "#fff" : base;
  let css = _ERA_MOTION_CSS + `:root{${varLines}}
body,input,button,select,textarea{font-family:${era.sans}!important}
.brand-name,.brand-name em,.title-x,.title-x em,.sv,.wc-hw,.overall-big,.crit-band{font-family:${era.display}!important}
.brand-tag,.nav-label,.kicker,.card-h,.sl,.crumb,.target-badge,.chip,.pos-pill,.field-label,.ni-badge{font-family:${era.mono}!important}
body{background:${base}!important;color:var(--ink)}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:${bg}}
#ielts-era-decor{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.topbar{background:${_hexToRgba(base, .85)}}
.ni.active{background:${_hexToRgba(leaf, .10)};color:var(--leaf)}
.ni-badge{background:${_hexToRgba(leaf, .14)};color:var(--leaf)}
.target-badge{background:${_hexToRgba(leaf, .08)};border-color:${_hexToRgba(leaf, .22)};color:var(--leaf)}
.bl{background:${_hexToRgba(leaf, .10)};color:var(--leaf);border-color:${_hexToRgba(leaf, .24)}}
.bp{background:var(--leaf);color:${primaryText}}
.bp:hover{background:${leafHover}}
select{background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${chevronStroke}' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e")}`;
  if (era.id === "gothic") {
    // Blackletter is display-only; keep the brand/title readable in size, never body.
    css += `\n.brand-name,.title-x{letter-spacing:.01em}`;
  }
  css += _eraFxCSS(era.fx);
  css += _eraControlsCSS(era);
  css += _eraElementFxCSS();
  return css;
}

function applyDesignEra(eraId) {
  const styleId = "ielts-era-theme", linkId = "ielts-era-fonts", decorId = "ielts-era-decor";
  const era = DESIGN_ERAS.find(e => e.id === eraId);
  let styleEl = document.getElementById(styleId);
  let linkEl = document.getElementById(linkId);
  let decorEl = document.getElementById(decorId);
  // Reset to shipped theme.
  if (!era || era.id === "modern" || !era.vars) {
    if (styleEl) styleEl.remove();
    if (linkEl) linkEl.remove();
    if (decorEl) decorEl.remove();
    document.documentElement.removeAttribute("data-era");
    return;
  }
  if (!linkEl) {
    linkEl = document.createElement("link");
    linkEl.id = linkId; linkEl.rel = "stylesheet";
    document.head.appendChild(linkEl);
  }
  const href = `https://fonts.googleapis.com/css2?${era.fonts}&display=swap`;
  if (linkEl.getAttribute("href") !== href) linkEl.setAttribute("href", href);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl); // appended AFTER styles.css → wins the cascade
  }
  styleEl.textContent = _buildEraCSS(era);

  // Decorative sticker/ornament layer (inline SVG). Removed when the era has none.
  const decorHTML = _eraDecorHTML(era.fx);
  if (decorHTML) {
    if (!decorEl) {
      decorEl = document.createElement("div");
      decorEl.id = decorId;
      decorEl.setAttribute("aria-hidden", "true");
      document.body.appendChild(decorEl);
    }
    decorEl.innerHTML = _sharedDecorHTML() + decorHTML;
  } else if (decorEl) {
    decorEl.remove();
  }

  document.documentElement.setAttribute("data-era", era.id);
}

// Apply the saved era as early as possible (before React mounts) to avoid a flash.
(function _applySavedEraEarly() {
  try {
    const raw = localStorage.getItem("ielts_writing_lab_v1");
    const era = raw ? JSON.parse(raw).designEra : null;
    if (era && era !== "modern") applyDesignEra(era);
  } catch { /* ignore */ }
})();
