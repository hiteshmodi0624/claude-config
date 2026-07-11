// Fast preview: screenshots the overlay HTML at scene midpoints + a few key
// beats, plus a sample composited frame on top of a representative base frame.
// No video encode. Output PNGs in frames-TOPIC-preview/.
//
// Run:
//   node marketing/showcase/preview-TOPIC.mjs

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, 'showcase-TOPIC-overlay.html');
const OUT = path.join(__dirname, 'frames-TOPIC-preview');

const FPS = 30;
const DURATION_S = 36;

// Mid-window seconds for each on-screen element (steady-state).
const BEATS = [
  { name: '01_hook_beat1', t: 0.75 },
  { name: '02_hook_beat2_strike', t: 2.7 },
  { name: '03_subtitle_compound', t: 5.5 },
  { name: '04_equation_overlay', t: 9.0 },
  { name: '05_galti_nahi', t: 12.5 },
  { name: '06_status_flip', t: 16.5 },
  { name: '07_app_reveal', t: 22.0 },
  { name: '08_first_salary', t: 26.4 },
  { name: '09_peak_bina_poochhe', t: 28.5 },
  { name: '10_price_strike', t: 31.2 },
  { name: '11_endcard', t: 34.5 },
];

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
await page.waitForTimeout(300);

await page.evaluate(() => {
  document.getAnimations({ subtree: true }).forEach((a) => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  });
});

for (const b of BEATS) {
  const ms = b.t * 1000;
  await page.evaluate((t) => {
    document.getAnimations({ subtree: true }).forEach((a) => {
      try {
        a.currentTime = t;
      } catch {}
    });
  }, ms);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
  const transparent = path.join(OUT, `${b.name}_t${b.t.toFixed(2)}s_alpha.png`);
  const opaque = path.join(OUT, `${b.name}_t${b.t.toFixed(2)}s_onDark.png`);
  await page.screenshot({ path: transparent, type: 'png', omitBackground: true });
  await page.evaluate(() => {
    document.body.style.background = '#1a1208';
  });
  await page.screenshot({ path: opaque, type: 'png', omitBackground: false });
  await page.evaluate(() => {
    document.body.style.background = 'transparent';
  });
  console.log('[preview] wrote', path.basename(transparent), '+ on-dark variant');
}

await browser.close();
console.log('\n[preview] done →', OUT);
