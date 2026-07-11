// ════════════════════════════════════════════════════════════════════════
// LIVE-FOOTAGE REEL BUILD TEMPLATE  (reel-builder skill, mode B)
//
// Stitches raw talking-head clips + audio into a captioned vertical + square
// reel. Copy into the project's ad-creative dir, then replace placeholders:
//   TOPIC            → kebab slug (e.g. founder-story)
//   RAW_FOOTAGE_DIR  → folder (relative to ROOT) holding the Shot N.mp4 / .m4a
// Then fill STORYBOARD (shot order + in-points) and BEAT_SCHEDULE (captions),
// and author the matching showcase-TOPIC-overlay.html.
//
// Pipeline per shot:
//   1. silencedetect (-30dB, d=0.35) on camera audio in [vFrom, vFrom+dur].
//   2. Build keep intervals (inverse of silences, 0.08s padding, merged).
//   3. Apply select + aselect to BOTH camera video and camera audio at the
//      same intervals → lip sync preserved. setpts/asetpts re-time.
//   4. afftdn FFT denoiser on audio to cut room hiss / ambient noise.
//   5. scale=1080:1920 portrait, H.264 yuv420p.
//      NOTE: assumes source auto-rotates to portrait (rotation=-90 metadata).
//      ffprobe the rotation + a test frame before trusting any crop — never
//      crop a sub-strip of an already-portrait clip, it ejects the subject.
// Then concat shots, inject shot-anchored caption keyframes into the overlay,
// render overlay twice (vertical + square layout), composite each on its base,
// mux cleaned audio, emit vertical + face-centered square.
//
// Run:
//   node marketing/showcase/build-TOPIC-reel.mjs
//
// SKIP_OVERLAY=1 reuses overlay PNG sequence. SQUARE_ONLY=1 skips vertical.

import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FOOTAGE_DIR = path.join(ROOT, 'RAW_FOOTAGE_DIR');
const OVERLAY_HTML = path.join(__dirname, 'showcase-TOPIC-overlay.html');
const FRAMES_VERT = path.join(__dirname, 'frames-TOPIC-overlay-vert');
const FRAMES_SQUARE = path.join(__dirname, 'frames-TOPIC-overlay-square');
const TMP = path.join(__dirname, '_tmp_TOPIC');
const OUT = path.join(__dirname, 'output');
const OUT_VERTICAL = path.join(OUT, 'extrack-reel-TOPIC-1080x1920.mp4');
const OUT_SQUARE = path.join(OUT, 'extrack-reel-TOPIC-1080x1080.mp4');

const FPS = 30;

// Storyboard (raw windows in source files). dur = pre-cleanup window length.
// Per-shot dialogue content (transliterated from whisper of each Shot N.mp4):
//   shot1 — "Aaj usse kuch nahi aata, lekin pehli salary pe — sab."
//   shot2 — "Mere beti ki salary 10 saal door hai. Track karna seekh gaya.
//            Chhoti choti entries — pocket money, kharcha, savings. Pehli
//            salary pe socha-samjha decision lega. Galti nahi karega."
//   shot3 — "Doosre bachche pehli salary pe seekhenge. Mera bachcha tab tak
//            10 saal aage hoga."
//   shot4 — "Isi liye maine Extrack Family ka waitlist join kar liya.
//            Bachche ke liye apna app aa raha hai. Pocket money, kharcha,
//            saving. Roz do minute — woh khud likhega."
//   shot5a — "Pehli salary aayegi, pehla credit card aayega, aur mera beta
//             jaanega kya karna hai. Bina mujh-se poochhe."   (EMOTIONAL PEAK)
//   shot5b — "Aap bhi waitlist join karlo. Launch se pehle ₹99 lock.
//             Baad mein ₹199. Ek chai se kam — pehli salary se 10 saal aage."
//             (CTA + PRICE)
const STORYBOARD = [
  { id: 'shot1', file: 'Shot 1.mp4', useFrom: 1.4, useDur: 3.55 },
  { id: 'shot2', file: 'Shot 2.mp4', useFrom: 3.1, useDur: 11.15 },
  { id: 'shot3', file: 'Shot 3.mp4', useFrom: 2.73, useDur: 4.35 },
  { id: 'shot4', file: 'Shot 4.mp4', useFrom: 2.07, useDur: 10.4 },
  { id: 'shot5a', file: 'Shot 5a.mp4', useFrom: 1.8, useDur: 6.55 },
  { id: 'shot5b', file: 'Shot 5b.mp4', useFrom: 2.7, useDur: 7.55 },
];

// Beat → shot mapping. start/end can be either absolute seconds from shot start
// (positive) OR `endOffset` (positive number = seconds before shot end).
// Each entry resolves to {start, end} in absolute reel time after we know
// cleaned shot durations.
const BEAT_SCHEDULE = [
  // Shot 1 (Hook)
  { id: 'b1', shot: 0, start: 0.05, end: 1.45 },
  { id: 'b2', shot: 0, start: 1.45, endOffset: 0.0 },
  // Shot 2 (Compounding)
  { id: 'b3', shot: 1, start: 0.1, end: 4.5 },
  { id: 'b4', shot: 1, start: 4.5, endOffset: 1.4 },
  { id: 'b3b', shot: 1, startOffset: 1.4, endOffset: 0.0 },
  // Shot 3 (Status flip)
  { id: 'b5', shot: 2, start: 0.1, endOffset: 0.0 },
  // Shot 4 (App reveal)
  { id: 'b6', shot: 3, start: 0.1, endOffset: 0.0 },
  // Shot 5a (Emotional peak)
  { id: 'b7', shot: 4, start: 0.1, endOffset: 1.5 },
  { id: 'peak', shot: 4, startOffset: 1.5, endOffset: 0.0 },
  // Shot 5b (CTA + price + endcard)
  { id: 'b8', shot: 5, start: 0.1, endOffset: 2.6 },
  { id: 'endcard', shot: 5, startOffset: 2.6, endOffset: 0.0 },
];

const SKIP_OVERLAY = process.env.SKIP_OVERLAY === '1';
// SQUARE_ONLY=1 renders/composites only the 1080×1080 output (skips vertical
// frame render + vertical composite). The shared base video is still built.
const SQUARE_ONLY = process.env.SQUARE_ONLY === '1';
// silenceremove tuning
const SILENCE_THRESH_DB = -30; // anything below = silence candidate
const SILENCE_MIN_DUR = 0.35; // ignore silences shorter than this
const KEEP_PAD = 0.08; // re-pad each kept speech segment by this (sec)
// afftdn (FFT denoiser): nr = reduction dB, nf = noise floor dB
const DENOISE_FILTER = 'afftdn=nr=14:nf=-32:tn=1';
// Square crop face-centering: y offset within 1920 portrait
const SQUARE_Y_OFFSET = 540;

function findSystemFfmpeg() {
  for (const p of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']) {
    if (existsSync(p)) return p;
  }
  return null;
}
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
const FFMPEG = process.env.FFMPEG || findSystemFfmpeg() || (await findBundledFfmpeg());
if (!FFMPEG) {
  console.error('ffmpeg not found.');
  process.exit(1);
}
const FFPROBE = FFMPEG.replace(/ffmpeg([^/]*)$/, 'ffprobe$1');

function run(args, label) {
  const r = spawnSync(FFMPEG, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[${label}] ffmpeg failed (status ${r.status})`);
    process.exit(r.status || 1);
  }
}
function probeDuration(file) {
  const r = spawnSync(
    FFPROBE,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      file,
    ],
    { encoding: 'utf8' }
  );
  if (r.status === 0) return parseFloat(r.stdout.trim()) || 0;
  return 0;
}

console.log('[build] ffmpeg:', FFMPEG);

await mkdir(OUT, { recursive: true });
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

// ───────────────────────────────────────────────────────────────
// STEP 1 — Detect silences + build cleaned shot per source mp4
// ───────────────────────────────────────────────────────────────
function detectSilences(srcMp4, ssWindow, durWindow) {
  const r = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-nostdin',
      '-ss',
      String(ssWindow),
      '-i',
      srcMp4,
      '-t',
      String(durWindow),
      '-af',
      `silencedetect=noise=${SILENCE_THRESH_DB}dB:d=${SILENCE_MIN_DUR}`,
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' }
  );
  const stderr = r.stderr || '';
  const sils = [];
  let curStart = null;
  for (const line of stderr.split('\n')) {
    const ms = line.match(/silence_start:\s*(-?[\d.]+)/);
    const me = line.match(/silence_end:\s*(-?[\d.]+)/);
    if (ms) curStart = Math.max(0, parseFloat(ms[1]));
    if (me && curStart !== null) {
      sils.push([curStart, Math.min(durWindow, parseFloat(me[1]))]);
      curStart = null;
    }
  }
  return sils;
}

function buildKeepIntervals(durWindow, silences) {
  const sorted = [...silences].sort((a, b) => a[0] - b[0]);
  const keeps = [];
  let cursor = 0;
  for (const [s, e] of sorted) {
    if (s > cursor) keeps.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < durWindow) keeps.push([cursor, durWindow]);
  // Pad and clamp
  const padded = keeps.map(([a, b]) => [
    Math.max(0, a - KEEP_PAD),
    Math.min(durWindow, b + KEEP_PAD),
  ]);
  // Merge overlaps after padding
  const merged = [];
  for (const iv of padded.sort((a, b) => a[0] - b[0])) {
    if (merged.length && iv[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);
    } else {
      merged.push([...iv]);
    }
  }
  return merged;
}

const cleanedShots = [];
for (const shot of STORYBOARD) {
  const src = path.join(FOOTAGE_DIR, shot.file);
  if (!existsSync(src)) {
    console.error('[build] missing footage:', src);
    process.exit(1);
  }
  console.log(`\n[clean ${shot.id}] window ${shot.useFrom}s + ${shot.useDur}s`);

  const sils = detectSilences(src, shot.useFrom, shot.useDur);
  const keeps = buildKeepIntervals(shot.useDur, sils);
  const cleanedDur = keeps.reduce((sum, [a, b]) => sum + (b - a), 0);
  console.log(
    `  silences: ${sils.length} | keep intervals: ${keeps.length} | dur ${shot.useDur.toFixed(2)} → ${cleanedDur.toFixed(2)}s`
  );

  // Build select expression. ffmpeg select operates on the trimmed segment
  // (because we pass -ss/-t BEFORE -i), so intervals are 0-based.
  const expr = keeps.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join('+');

  const cleanedMp4 = path.join(TMP, `${shot.id}_clean.mp4`);
  // select on video + aselect on audio with SAME interval expression preserves
  // lip sync (cut points identical in both streams).
  run(
    [
      '-y',
      '-hide_banner',
      '-nostdin',
      '-ss',
      String(shot.useFrom),
      '-i',
      src,
      '-t',
      String(shot.useDur),
      '-filter_complex',
      `[0:v]select='${expr}',setpts=N/FRAME_RATE/TB,scale=1080:1920:flags=lanczos,setsar=1[v];` +
        `[0:a]aselect='${expr}',asetpts=N/SR/TB,${DENOISE_FILTER}[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-r',
      String(FPS),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-movflags',
      '+faststart',
      cleanedMp4,
    ],
    `clean-${shot.id}`
  );

  const measured = probeDuration(cleanedMp4);
  console.log(`  cleaned mp4 dur (measured): ${measured.toFixed(2)}s`);
  cleanedShots.push({ ...shot, cleanedMp4, actualDur: measured || cleanedDur });
}

const TOTAL_DUR = cleanedShots.reduce((a, s) => a + s.actualDur, 0);
const TOTAL_FRAMES = Math.max(1, Math.round(FPS * TOTAL_DUR));
const frameDigits = String(TOTAL_FRAMES).length;
console.log(`\n[total] cleaned reel duration: ${TOTAL_DUR.toFixed(2)}s (${TOTAL_FRAMES} frames)`);

// ───────────────────────────────────────────────────────────────
// STEP 2 — Patch overlay HTML: --dur + per-beat absolute keyframes
// ───────────────────────────────────────────────────────────────
// Caption timing was previously a proportional scale of the original 36s
// timeline — that drifts because shots clean by different amounts. Now we
// anchor every beat to its CLEANED shot start + a shot-relative offset,
// then generate keyframe % values from those absolute times.
const shotStartTimes = [];
{
  let t = 0;
  for (const s of cleanedShots) {
    shotStartTimes.push(t);
    t += s.actualDur;
  }
}

function resolveBeat(beat) {
  const s = shotStartTimes[beat.shot];
  const d = cleanedShots[beat.shot].actualDur;
  const startRel = beat.start !== undefined ? beat.start : d - beat.startOffset;
  const endRel = beat.end !== undefined ? beat.end : d - beat.endOffset;
  return { id: beat.id, absStart: s + startRel, absEnd: s + endRel };
}
const resolvedBeats = BEAT_SCHEDULE.map(resolveBeat);
console.log('\n[overlay] beat schedule (absolute reel seconds):');
for (const b of resolvedBeats) {
  console.log(`  ${b.id.padEnd(8)} ${b.absStart.toFixed(2)} → ${b.absEnd.toFixed(2)}`);
}

function pct(t) {
  return ((t / TOTAL_DUR) * 100).toFixed(4) + '%';
}

function genMainKeyframes(b) {
  // Generic chunky pill entry/exit. Used for b1, b2, b3, b3b, b5, b6, b7, b8.
  const pre = Math.max(0, b.absStart - 0.05);
  const settle = b.absStart + 0.25;
  const settle2 = b.absStart + 0.5;
  const holdEnd = Math.max(b.absStart + 0.5, b.absEnd - 0.08);
  return `@keyframes ${b.id}-life {
  0%, ${pct(pre)}        { opacity: 0; transform: translate(0, 24px); }
  ${pct(b.absStart)}     { opacity: 0; transform: translate(0, 24px); }
  ${pct(settle)}         { opacity: 1; transform: translate(-2px, -3px); }
  ${pct(settle2)}        { transform: translate(0, 0); }
  ${pct(holdEnd)}        { opacity: 1; transform: translate(0, 0); }
  ${pct(b.absEnd)}       { opacity: 0; transform: translate(0, -10px); }
  100%                   { opacity: 0; }
}`;
}

function genB3bKeyframes(b) {
  // b3b has a slight scale punch (pop)
  const pre = Math.max(0, b.absStart - 0.05);
  const settle = b.absStart + 0.3;
  const settle2 = b.absStart + 0.6;
  const holdEnd = Math.max(b.absStart + 0.6, b.absEnd - 0.08);
  return `@keyframes b3b-life {
  0%, ${pct(pre)}        { opacity: 0; transform: translate(0, 24px) scale(.96); }
  ${pct(b.absStart)}     { opacity: 0; transform: translate(0, 24px) scale(.96); }
  ${pct(settle)}         { opacity: 1; transform: translate(-2px, -3px) scale(1.04); }
  ${pct(settle2)}        { transform: translate(0, 0) scale(1); }
  ${pct(holdEnd)}        { opacity: 1; transform: translate(0, 0) scale(1); }
  ${pct(b.absEnd)}       { opacity: 0; transform: translate(0, -10px) scale(.98); }
  100%                   { opacity: 0; }
}`;
}

function genPeakKeyframes(b) {
  const pre = Math.max(0, b.absStart - 0.05);
  const settle = b.absStart + 0.35;
  const settle2 = b.absStart + 0.6;
  const holdEnd = Math.max(b.absStart + 0.6, b.absEnd - 0.08);
  return `@keyframes peak-life {
  0%, ${pct(pre)}        { opacity: 0; transform: scale(.6) rotate(-6deg); }
  ${pct(b.absStart)}     { opacity: 0; transform: scale(.6) rotate(-6deg); }
  ${pct(settle)}         { opacity: 1; transform: scale(1.05) rotate(-1.2deg); }
  ${pct(settle2)}        { transform: scale(1) rotate(-1.2deg); opacity: 1; }
  ${pct(holdEnd)}        { opacity: 1; transform: scale(1) rotate(-1.2deg); }
  ${pct(b.absEnd)}       { opacity: 0; transform: scale(1.06) rotate(-1.2deg); }
  100%                   { opacity: 0; }
}`;
}

function genStrikeDraw(b) {
  // b2's strike-draw — fires inside b2 window. Start strike at midpoint.
  const drawStart = b.absStart + Math.min(1.4, (b.absEnd - b.absStart) * 0.55);
  const drawEnd = drawStart + 0.25;
  const holdEnd = Math.max(drawEnd + 0.1, b.absEnd - 0.08);
  return `@keyframes strike-draw {
  0%, ${pct(drawStart)}  { transform: scaleX(0); }
  ${pct(drawEnd)}        { transform: scaleX(1); }
  ${pct(holdEnd)}        { transform: scaleX(1); }
  ${pct(b.absEnd)}       { transform: scaleX(0); }
  100%                   { transform: scaleX(0); }
}`;
}

function genChipPop(b) {
  // b4's chip-pop — chips pop in at start, hold, exit
  const pre = Math.max(0, b.absStart - 0.05);
  const popPeak = b.absStart + 0.3;
  const settled = b.absStart + 0.55;
  const holdEnd = Math.max(settled, b.absEnd - 0.08);
  return `@keyframes chip-pop {
  0%, ${pct(pre)}        { transform: scale(0); opacity: 0; }
  ${pct(b.absStart)}     { transform: scale(0); opacity: 0; }
  ${pct(popPeak)}        { transform: scale(1.14); opacity: 1; }
  ${pct(settled)}        { transform: scale(1); }
  ${pct(holdEnd)}        { transform: scale(1); opacity: 1; }
  ${pct(b.absEnd)}       { transform: scale(.96); opacity: 0; }
  100%                   { transform: scale(.96); opacity: 0; }
}`;
}

function genBadgePop(b) {
  // b6's badge-pop
  const pre = Math.max(0, b.absStart - 0.05);
  const popPeak = b.absStart + 0.35;
  const settled = b.absStart + 0.65;
  const holdEnd = Math.max(settled, b.absEnd - 0.08);
  return `@keyframes badge-pop {
  0%, ${pct(pre)}        { transform: scale(0); opacity: 0; }
  ${pct(b.absStart)}     { transform: scale(0); opacity: 0; }
  ${pct(popPeak)}        { transform: scale(1.12); opacity: 1; }
  ${pct(settled)}        { transform: scale(1); }
  ${pct(holdEnd)}        { transform: scale(1); opacity: 1; }
  ${pct(b.absEnd)}       { transform: scale(.96); opacity: 0; }
  100%                   { transform: scale(.96); opacity: 0; }
}`;
}

function genPricePop(b) {
  // b8's price-pop. b8 active window must contain the price tile.
  const pre = Math.max(0, b.absStart - 0.05);
  const popPeak = b.absStart + 0.4;
  const settled = b.absStart + 0.7;
  const holdEnd = Math.max(settled, b.absEnd - 0.08);
  return `@keyframes price-pop {
  0%, ${pct(pre)}        { transform: scale(0); opacity: 0; }
  ${pct(b.absStart)}     { transform: scale(0); opacity: 0; }
  ${pct(popPeak)}        { transform: scale(1.14); opacity: 1; }
  ${pct(settled)}        { transform: scale(1); }
  ${pct(holdEnd)}        { transform: scale(1); opacity: 1; }
  ${pct(b.absEnd)}       { transform: scale(.96); opacity: 0; }
  100%                   { transform: scale(.96); opacity: 0; }
}`;
}

function genStrikeOld(b) {
  // b8's strike on ₹199
  const drawStart = b.absStart + 0.6;
  const drawEnd = drawStart + 0.3;
  const holdEnd = Math.max(drawEnd + 0.1, b.absEnd - 0.08);
  return `@keyframes strike-old {
  0%, ${pct(drawStart)}  { transform: scaleX(0); }
  ${pct(drawEnd)}        { transform: scaleX(1); }
  ${pct(holdEnd)}        { transform: scaleX(1); }
  ${pct(b.absEnd)}       { transform: scaleX(0); }
  100%                   { transform: scaleX(0); }
}`;
}

function genEndcardLife(b) {
  // Endcard fades in once, holds till 100%
  const pre = Math.max(0, b.absStart - 0.2);
  const settle = b.absStart + 0.5;
  return `@keyframes end-life {
  0%, ${pct(pre)}        { opacity: 0; transform: scale(.98); }
  ${pct(b.absStart)}     { opacity: 0; transform: scale(.98); }
  ${pct(settle)}         { opacity: 1; transform: scale(1.01); }
  ${pct(b.absStart + 0.9)} { opacity: 1; transform: scale(1); }
  100%                   { opacity: 1; transform: scale(1); }
}`;
}

const beatById = Object.fromEntries(resolvedBeats.map((b) => [b.id, b]));
const overrideCss = [
  ':root { --dur: ' + TOTAL_DUR.toFixed(3) + 's; }',
  // Main beat-life keyframes
  ...['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'].map((id) => genMainKeyframes(beatById[id])),
  genB3bKeyframes(beatById.b3b),
  genPeakKeyframes(beatById.peak),
  // Sub-animations bound to specific beats
  genStrikeDraw(beatById.b2),
  genChipPop(beatById.b4),
  genBadgePop(beatById.b6),
  genPricePop(beatById.b8),
  genStrikeOld(beatById.b8),
  genEndcardLife(beatById.endcard),
].join('\n\n');

const overlaySrc = await readFile(OVERLAY_HTML, 'utf8');
const overlayPatched = path.join(TMP, 'overlay-patched.html');
const patched = overlaySrc.replace(
  '</style>',
  `\n/* ── BUILD-TIME OVERRIDES (computed from cleaned shot durations) ── */\n${overrideCss}\n</style>`
);
await writeFile(overlayPatched, patched, 'utf8');
console.log(`[overlay] injected ${resolvedBeats.length} beat keyframe overrides`);

// ───────────────────────────────────────────────────────────────
// STEP 3 — Render overlay PNG sequence (vertical + square layouts)
// ───────────────────────────────────────────────────────────────
async function renderOverlayLayout(layout, framesDir, viewportW, viewportH) {
  console.log(
    `[overlay:${layout}] rendering ${TOTAL_FRAMES} PNG frames @ ${viewportW}×${viewportH} (alpha) …`
  );
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: viewportW, height: viewportH },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(overlayPatched).toString(), { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  if (layout === 'square') {
    await page.evaluate(() => document.body.classList.add('square'));
  }
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

  // Seek all animations to a given time, force a layout/style flush, then wait
  // three composited paints. The flush + extra rAF makes the seeked frame far
  // more likely to be committed before the screenshot is taken.
  async function seekAndSettle(ms) {
    await page.evaluate((t) => {
      document.getAnimations({ subtree: true }).forEach((a) => {
        try {
          a.currentTime = t;
        } catch {}
      });
      // Force style + layout flush so the seeked frame is committed.
      document.documentElement.getBoundingClientRect();
    }, ms);
    await page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))
        )
    );
  }

  const shot = () =>
    page.screenshot({
      type: 'png',
      omitBackground: true,
      clip: { x: 0, y: 0, width: viewportW, height: viewportH },
    });

  // One extra composited paint (used between stability probes).
  const nextPaint = () =>
    page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const tMs = (f / FPS) * 1000;
    const out = path.join(framesDir, `f_${String(f).padStart(frameDigits, '0')}.png`);

    // The animation seek and the screenshot race: a capture can land while the
    // overlay is only partway painted (e.g. text drawn but the background fill
    // not yet), producing a one-frame flicker. Guessing "enough" rAFs does not
    // fix this reliably. Instead, capture repeatedly and only accept the frame
    // once two consecutive captures are byte-identical — i.e. the frame has
    // stopped changing and is fully settled.
    await seekAndSettle(tMs);
    let buf = await shot();
    let stable = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      await nextPaint();
      const next = await shot();
      if (next.equals(buf)) {
        buf = next;
        stable = true;
        break;
      }
      buf = next;
    }
    if (!stable) console.warn(`[overlay:${layout}] frame ${f} not stable after 8 probes`);
    await writeFile(out, buf);

    if ((f + 1) % 60 === 0 || f === TOTAL_FRAMES - 1)
      console.log(`[overlay:${layout}] frame ${f + 1}/${TOTAL_FRAMES}`);
  }
  await browser.close();
}

if (!SKIP_OVERLAY) {
  if (!SQUARE_ONLY) await renderOverlayLayout('vertical', FRAMES_VERT, 1080, 1920);
  else console.log('[overlay] SQUARE_ONLY=1 — skipping vertical frames');
  await renderOverlayLayout('square', FRAMES_SQUARE, 1080, 1080);
} else {
  console.log('[overlay] SKIP_OVERLAY=1 — reusing existing frames');
}

// ───────────────────────────────────────────────────────────────
// STEP 4 — Concat cleaned shots
// ───────────────────────────────────────────────────────────────
const concatList = path.join(TMP, 'concat.txt');
await writeFile(
  concatList,
  cleanedShots.map((s) => `file '${s.cleanedMp4.replace(/'/g, "'\\''")}'`).join('\n') + '\n',
  'utf8'
);
const baseMp4 = path.join(TMP, 'base.mp4');
console.log('\n[concat] joining cleaned shots …');
run(['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', baseMp4], 'concat');

// ───────────────────────────────────────────────────────────────
// STEP 5a — Composite vertical overlay on vertical base
// ───────────────────────────────────────────────────────────────
if (!SQUARE_ONLY) {
  console.log('[composite] vertical 1080×1920 …');
  run(
    [
      '-y',
      '-i',
      baseMp4,
      '-framerate',
      String(FPS),
      '-i',
      path.join(FRAMES_VERT, `f_%0${frameDigits}d.png`),
      '-filter_complex',
      '[0:v]format=yuv420p[bg];[1:v]format=rgba[ol];[bg][ol]overlay=0:0:format=auto:shortest=1,format=yuv420p[v]',
      '-map',
      '[v]',
      '-map',
      '0:a',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-r',
      String(FPS),
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      '+faststart',
      OUT_VERTICAL,
    ],
    'composite-vert'
  );
  console.log('[composite] →', OUT_VERTICAL);
} else {
  console.log('[composite] SQUARE_ONLY=1 — skipping vertical composite');
}

// ───────────────────────────────────────────────────────────────
// STEP 5b — Crop base to square, composite SQUARE overlay on it
// ───────────────────────────────────────────────────────────────
const squareBase = path.join(TMP, 'base_square.mp4');
console.log(`[crop] square base 1080×1080 @ y=${SQUARE_Y_OFFSET} …`);
run(
  [
    '-y',
    '-i',
    baseMp4,
    '-vf',
    `crop=1080:1080:0:${SQUARE_Y_OFFSET}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-c:a',
    'copy',
    '-movflags',
    '+faststart',
    squareBase,
  ],
  'crop-square-base'
);

console.log('[composite] square 1080×1080 …');
run(
  [
    '-y',
    '-i',
    squareBase,
    '-framerate',
    String(FPS),
    '-i',
    path.join(FRAMES_SQUARE, `f_%0${frameDigits}d.png`),
    '-filter_complex',
    '[0:v]format=yuv420p[bg];[1:v]format=rgba[ol];[bg][ol]overlay=0:0:format=auto:shortest=1,format=yuv420p[v]',
    '-map',
    '[v]',
    '-map',
    '0:a',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-r',
    String(FPS),
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    '-movflags',
    '+faststart',
    OUT_SQUARE,
  ],
  'composite-square'
);
console.log('[composite] →', OUT_SQUARE);

console.log('\n[done]');
console.log('  duration:', TOTAL_DUR.toFixed(2) + 's');
console.log('  vertical:', OUT_VERTICAL);
console.log('  square:  ', OUT_SQUARE);
