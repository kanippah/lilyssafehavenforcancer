// One-time generator for the sample-catalog artwork in public/seed/.
// Consistent "garden press" line art: ink-green product icons on soft paper
// tones with a lily sprig in the corner.
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "seed");
mkdirSync(outDir, { recursive: true });

const INK = "#2F4A3A";
const ROSE = "#C98CA0";
const TONES = ["#F3EBE5", "#EFE7DA", "#F6EAE6", "#ECEDE3", "#F2E7E0", "#EDE9E0"];

// Product icons drawn in a 100×100 box, stroke-only.
const ICONS = {
  mug: `
    <rect x="24" y="30" width="40" height="42" rx="8"/>
    <path d="M64 38h8a8 8 0 0 1 0 20h-8"/>
    <path d="M36 22c0-4 3-5 3-8M47 22c0-4 3-5 3-8"/>
  `,
  tee: `
    <path d="M36 24l-16 10 6 12 8-4v34h32V42l8 4 6-12-16-10a12 12 0 0 1-28 0z"/>
    <path d="M44 52c3-5 12-5 12 1 0 5-6 7-6 11" fill="none"/>
    <circle cx="50" cy="69" r="1" fill="${INK}" stroke="none"/>
  `,
  hoodie: `
    <path d="M38 26l-18 10 6 13 8-4v31h32V45l8 4 6-13-18-10c-2 6-6 9-12 9s-10-3-12-9z"/>
    <path d="M42 26c1 5 4 8 8 8s7-3 8-8"/>
    <path d="M46 44v10M54 44v10"/>
  `,
  tote: `
    <path d="M28 40h44l-4 36H32l-4-36z"/>
    <path d="M38 40c0-16 24-16 24 0"/>
    <path d="M42 54c3-4 10-4 10 1 0 4-5 5-5 9M47 68v1" />
  `,
  candle: `
    <rect x="32" y="38" width="36" height="38" rx="6"/>
    <path d="M32 46h36"/>
    <path d="M50 30c-4-5 0-8 0-12 3 4 4 8 0 12z"/>
    <path d="M50 30v6"/>
  `,
  blanket: `
    <path d="M26 40c16-8 32 8 48 0v32c-16 8-32-8-48 0V40z"/>
    <path d="M26 52c16-8 32 8 48 0M26 64c16-8 32 8 48 0"/>
  `,
  journal: `
    <rect x="30" y="24" width="40" height="52" rx="5"/>
    <path d="M38 24v52"/>
    <path d="M58 24v14l5-4 5 4V24"/>
    <path d="M46 48h16M46 56h16M46 64h10"/>
  `,
  beanie: `
    <path d="M28 62c0-20 10-32 22-32s22 12 22 32"/>
    <rect x="26" y="62" width="48" height="12" rx="6"/>
    <circle cx="50" cy="26" r="5"/>
    <path d="M38 46c4-6 8 2 12-4M50 42c4-6 8 2 12-4" />
  `,
  bracelet: `
    <circle cx="50" cy="52" r="22"/>
    <circle cx="50" cy="30" r="4"/><circle cx="66" cy="37" r="4"/><circle cx="72" cy="52" r="4"/>
    <circle cx="66" cy="67" r="4"/><circle cx="50" cy="74" r="4"/><circle cx="34" cy="67" r="4"/>
    <circle cx="28" cy="52" r="4"/><circle cx="34" cy="37" r="4"/>
  `,
  kit: `
    <rect x="24" y="38" width="52" height="36" rx="6"/>
    <path d="M24 50h52"/>
    <path d="M40 38c0-8 20-8 20 0"/>
    <path d="M50 56v12M44 62h12"/>
  `,
  socks: `
    <path d="M34 22h14v26l10 8a9 9 0 0 1-11 14l-13-10V22z"/>
    <path d="M34 30h14"/>
    <path d="M56 22h14v20l6 5a9 9 0 0 1-10 14l-6-4" />
    <path d="M56 30h14"/>
  `,
  bottle: `
    <path d="M42 32h16v8c6 4 8 9 8 16v14a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V56c0-7 2-12 8-16v-8z"/>
    <rect x="42" y="22" width="16" height="10" rx="3"/>
    <path d="M40 56h8M40 64h8M40 72h8"/>
  `,
};

const sprig = `
  <g stroke="${ROSE}" stroke-width="2.4" fill="none" stroke-linecap="round">
    <path d="M672 736c0-36-6-60-4-88"/>
    <path d="M668 664c-38-6-58-30-60-62 34 4 56 26 60 54"/>
    <path d="M669 656c10-38 34-56 62-58-2 34-26 54-60 62"/>
  </g>`;

function art(name, icon, tone, opts = {}) {
  const scale = opts.scale ?? 5.6;
  const size = 100 * scale;
  const offset = (800 - size) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect width="800" height="800" fill="${tone}"/>
  <circle cx="400" cy="392" r="252" fill="#FFFFFF" fill-opacity="0.5"/>
  <g transform="translate(${offset} ${offset - 20}) scale(${scale})" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${icon}
  </g>
  ${sprig}
</svg>`;
  writeFileSync(path.join(outDir, `${name}.svg`), svg);
  console.log("wrote", name + ".svg");
}

let i = 0;
for (const [name, icon] of Object.entries(ICONS)) {
  art(name, icon, TONES[i++ % TONES.length]);
}
// Alternate colorways used by second products of the same type.
art("mug-2", ICONS.mug, "#EAE4D8");
art("tee-2", ICONS.tee, "#F1E4E6");

// Collection covers: sprig-only compositions on deeper tones.
const covers = {
  "collection-comfort": "#E8DFD3",
  "collection-apparel": "#E5E7DB",
  "collection-kitchen": "#F0E2DC",
  "collection-keepsakes": "#EFE0E3",
};
for (const [name, tone] of Object.entries(covers)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect width="800" height="800" fill="${tone}"/>
  <g stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(150 120) scale(1.28)">
    <path d="M200 480c0-90-15-150-10-220"/>
    <path d="M194 330c-50-10-85-45-90-95 45 5 80 35 90 75"/>
    <path d="M195 320c25-95 85-140 155-145-5 85-65 135-150 155"/>
    <path d="M199 300c20-50 50-85 90-105"/>
    <circle cx="295" cy="190" r="8" fill="${INK}"/>
  </g>
  <g stroke="${ROSE}" stroke-width="5" fill="none" stroke-linecap="round">
    <path d="M600 690c0-30-5-50-3-73"/>
    <path d="M597 630c-32-5-48-25-50-52 28 3 46 22 50 45"/>
    <path d="M598 623c8-32 28-47 52-48-2 28-22 45-50 52"/>
  </g>
</svg>`;
  writeFileSync(path.join(outDir, `${name}.svg`), svg);
  console.log("wrote", name + ".svg");
}
console.log("done:", outDir);
