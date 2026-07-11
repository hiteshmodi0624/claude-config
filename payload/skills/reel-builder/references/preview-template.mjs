// REEL PREVIEW TEMPLATE — captures one PNG per scene-midpoint, no encode.
// Use this between iterations to eyeball composition without sitting through
// a full 900-frame encode.
//
// CUSTOMIZE before running:
//   1. Set TOPIC.
//   2. Confirm HTML filename.
//   3. Edit `shots` to match your scene timestamps.
//
// Run:
//   node <this-file-path>.mjs

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ── Customize ───────────────────────────────────────────────
const TOPIC = 'REPLACE_ME'; // e.g. 'family-warm'
const HTML_FILENAME = `showcase-${TOPIC}-vertical.html`;
// Scene midpoints — adjust to your actual scene timings.
// Default: 6 scenes × 5s on a 30s timeline.
const shots = [
  ['s1-hook-a-line1', 1300],
  ['s1-hook-b-both', 3200],
  ['s2-problem', 8500],
  ['s3-product', 13500],
  ['s4-aspiration', 18500],
  ['s5-urgency', 23500],
  ['s6-cta', 28500],
];
// ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, HTML_FILENAME);
const OUT = path.join(__dirname, `frames-${TOPIC}-preview`);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();

await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'load' });
await page.waitForLoadState('networkidle').catch(() => {});
await page.evaluate(async () => {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
});
await page.waitForTimeout(500);

await page.evaluate(() => {
  document.getAnimations({ subtree: true }).forEach((a) => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  });
});

for (const [label, tMs] of shots) {
  await page.evaluate((ms) => {
    document.getAnimations({ subtree: true }).forEach((a) => {
      try {
        a.currentTime = ms;
      } catch {}
    });
  }, tMs);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const out = path.join(OUT, `${label}.png`);
  await page.screenshot({ path: out, type: 'png' });
  console.log('  ✓', label, `(t=${(tMs / 1000).toFixed(2)}s)`);
}

await ctx.close();
await browser.close();
console.log('\nPreview frames at', path.relative(process.cwd(), OUT));
