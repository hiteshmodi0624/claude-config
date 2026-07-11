// REEL RECORDER TEMPLATE — drop-in for any 9:16 marketing reel.
// Opens <showcase-html> at 1080×1920, pauses every CSS animation, seeks the
// timeline frame-by-frame, screenshots one PNG per frame, then stitches the
// frames to MP4 via ffmpeg.
//
// Outputs (in ./output/):
//   extrack-reel-<TOPIC>-1080x1920.mp4  — vertical (Reels / TikTok / Shorts)
//   extrack-reel-<TOPIC>-1080x1080.mp4  — square (IG feed / FB feed / LinkedIn)
//
// Square = top-anchored crop of the portrait. Content lives in top 60% of the
// portrait stage, so the top-anchored crop centers it in the square frame
// and discards the empty bottom 840px (CTA safe zone).
//
// CUSTOMIZE before running:
//   1. Set TOPIC below.
//   2. Confirm HTML filename matches your showcase file.
//   3. Confirm DURATION_S matches the total reel length (max 35).
//
// Run:
//   node <this-file-path>.mjs

import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ── Customize ───────────────────────────────────────────────
const TOPIC = 'REPLACE_ME'; // e.g. 'family-warm'
const HTML_FILENAME = `showcase-${TOPIC}-vertical.html`;
const FPS = 30;
const DURATION_S = 30; // 25–35 max. Never above 35.
// ────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, HTML_FILENAME);
const FRAMES = path.join(__dirname, `frames-${TOPIC}`);
const OUT = path.join(__dirname, 'output');
const OUT_MP4_PORTRAIT = path.join(OUT, `extrack-reel-${TOPIC}-1080x1920.mp4`);
const OUT_MP4_SQUARE = path.join(OUT, `extrack-reel-${TOPIC}-1080x1080.mp4`);
const TOTAL_FRAMES = FPS * DURATION_S;

async function findBundledFfmpeg() {
  const cacheRoot = path.join(process.env.HOME || '', 'Library/Caches/ms-playwright');
  if (!existsSync(cacheRoot)) return null;
  const dirs = (await readdir(cacheRoot)).filter((d) => d.startsWith('ffmpeg-'));
  for (const d of dirs) {
    for (const bin of ['ffmpeg-mac', 'ffmpeg-linux', 'ffmpeg.exe', 'ffmpeg']) {
      const p = path.join(cacheRoot, d, bin);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function findSystemFfmpeg() {
  for (const p of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']) {
    if (existsSync(p)) return p;
  }
  return null;
}

const FFMPEG = process.env.FFMPEG || findSystemFfmpeg() || (await findBundledFfmpeg());
if (!FFMPEG) {
  console.error('ffmpeg not found (set FFMPEG=/path/to/ffmpeg).');
  process.exit(1);
}
console.log('[record] ffmpeg:', FFMPEG);

await rm(FRAMES, { recursive: true, force: true });
await mkdir(FRAMES, { recursive: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();

console.log('[record] loading', HTML_FILENAME, '…');
await page.goto(pathToFileURL(HTML).toString(), { waitUntil: 'load' });
await page.waitForLoadState('networkidle').catch(() => {});

await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((r) => {
            img.addEventListener('load', r, { once: true });
            img.addEventListener('error', r, { once: true });
          }),
    ),
  );
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
});
await page.waitForTimeout(400);

await page.evaluate(() => {
  document.getAnimations({ subtree: true }).forEach((a) => {
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  });
});

console.log(`[record] capturing ${TOTAL_FRAMES} frames @ ${FPS}fps (${DURATION_S}s) …`);
const t0 = Date.now();

for (let i = 0; i < TOTAL_FRAMES; i++) {
  const tMs = (i / FPS) * 1000;
  await page.evaluate((ms) => {
    const all = document.getAnimations({ subtree: true });
    for (const a of all) {
      try {
        a.currentTime = ms;
      } catch {}
    }
  }, tMs);
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const file = path.join(FRAMES, `f-${String(i).padStart(5, '0')}.png`);
  await page.screenshot({ path: file, type: 'png' });
  if (i % 30 === 0 || i === TOTAL_FRAMES - 1) {
    const pct = ((i / TOTAL_FRAMES) * 100).toFixed(1);
    process.stdout.write(`\r  ${pct.padStart(5)}% (${i + 1}/${TOTAL_FRAMES})`);
  }
}
process.stdout.write(
  `\r   100% (${TOTAL_FRAMES}/${TOTAL_FRAMES})  ${((Date.now() - t0) / 1000).toFixed(1)}s\n`,
);

await ctx.close();
await browser.close();

function encode(outPath, vfChain) {
  console.log(`[record] encoding → ${path.relative(process.cwd(), outPath)}`);
  const args = [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(FRAMES, 'f-%05d.png'),
    '-vf',
    vfChain,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'slow',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    outPath,
  ];
  const r = spawnSync(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) {
    console.error('  ffmpeg exit', r.status);
    return false;
  }
  try {
    const kb = (statSync(outPath).size / 1024).toFixed(0);
    console.log(`  ✓ ${kb} KB`);
  } catch {}
  return true;
}

// Portrait: native 1080×1920 (Reels / TikTok / Shorts).
encode(OUT_MP4_PORTRAIT, 'scale=1080:1920:flags=lanczos,format=yuv420p');
// Square: top-anchored 1080×1080 crop. Discards the empty bottom CTA zone
// and centers the top-60% content in the square frame.
encode(OUT_MP4_SQUARE, 'crop=1080:1080:0:0,format=yuv420p');

console.log(
  '\nDone. Frames retained at',
  path.relative(process.cwd(), FRAMES),
  '(delete to reclaim disk).',
);
