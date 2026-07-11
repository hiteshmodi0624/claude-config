---
name: reel-builder
description: Build a 30–35s vertical (1080×1920) + square (1080×1080) marketing reel — two modes. Mode A (CSS-only animation): a self-contained HTML stage becomes the video via Playwright+ffmpeg. Mode B (live-footage stitch): trim raw talking-head clips + audio (silence-cut, denoise, lip-sync-safe), concat, and composite brand-styled caption pills + end card on top, with separate vertical/square caption layouts and a face-centered square crop. Bootstraps marketing/showcase/ infra (Playwright + ffmpeg, recorder/preview/build scripts, README, .gitignore). Enforces ad-platform rules — 3s emotional hook, text safe zones, no brand logo on stage, lean copy ≤7 words per beat, ≥4 animation families, gender-neutral parent copy, child-vibe when child-targeted; footage mode adds shot-anchored caption timing, whisper-driven captions echoing real speech, no synthesized SFX, and end-card overlap to kill flicker. Use when the user asks to make a reel, ad video, social-video creative, Meta/Instagram/TikTok ad, package a static into motion, OR stitch raw video clips + audio into a captioned reel.
---

# Reel Builder

A pipeline for ad-grade 9:16 + 1:1 reels rendered from a single HTML stage. Output: MP4s ready for Meta/Reels/TikTok/Shorts/IG-feed/LinkedIn paid placement.

## When to invoke

- User says: "create a reel", "make a video ad", "social ad video", "Reels creative", "TikTok ad", "package this static into a reel", "do same for square", "build a 30 second video", etc.
- User has a landing page / static / product they want a paid-social video for.
- Existing static creative needs motion translation.

If invoked outside these triggers, do not run this skill.

---

## Two modes

This skill builds reels two ways. Pick by what the user has:

- **A. CSS-animation reel** (default) — no live footage. A self-contained HTML
  stage IS the video; Playwright screenshots its timeline → frames → MP4. Use
  when the user has only a product/landing page/static and wants a fully
  designed motion ad. This is everything below up to "Templates".

- **B. Live-footage reel** — the user has **raw video clips + audio** (a person
  talking to camera, talking-head shots, filmed b-roll) and wants them stitched
  into a captioned ad with branded text overlays. The HTML is a **transparent
  caption overlay** composited ON TOP of the stitched footage — it is NOT the
  video itself. Use when the user points at a folder of `.mp4`/`.m4a` files and
  a script. Jump to **"Live-footage mode"** below.

Both modes share: 1080×1920 + 1080×1080 dual output, brand-token styling, the
caption/animation craft rules, and the preview-before-encode loop. They differ
only in where the pixels come from.

---

## NON-NEGOTIABLE RULES

These are not preferences. Every reel built with this skill MUST satisfy all of them.

### 1. Duration: 30s default, 35s hard ceiling

- Default: **30 seconds**. Acceptable: 25–35s.
- **Never exceed 35s.** Above 35s, completion-rate collapses on paid placements.
- 6 scenes × 5s is the canonical structure. Adjust scene count, not total length.

### 2. The first 3 seconds MUST be an emotional or attention-grabbing hook

- The hook decides whether the user scrolls past or stays.
- Hook is either:
  - **Identity acknowledgment** — call out the target's specific identity marker so they pattern-match instantly. Example: `"₹5 lakh school fees."` for wealthy Mumbai parents.
  - **Open-loop curiosity** — pose a question whose answer the next scenes deliver. Example: `"Pehli salary… sirf 10 saal door."`
  - **Visceral contrast** — pair two stark elements. Example: status premise (`₹5L school`) → gap (`Money sense — ₹0`).
- The hook is NOT a tagline. It is NOT a brand reveal. It is the *single most thumb-stopping moment* in the reel.
- Avoid: confessional first-person (`Mujhe paisa kabhi…`) which reads as personal-story not ad. Avoid: vague questions (`Pehli salary mein kya hoga?`) that don't punch.

### 3. ALL text lives in the TOP 1080px of the canvas (=56%)

- Vertical (1080×1920): text must be inside y = 0–1080px. Bottom 840px reserved for ad-platform CTA overlay.
- Square (1080×1080): top-anchored crop of the portrait — content centered at y=540 = exact center of square frame.
- Enforce via `.scene { position: absolute; top: 0; left: 0; right: 0; height: 1080px; }` on the portrait stage.
- **Why 1080 not 1152**: choosing 1080 makes the top-anchored 1080×1080 square crop center content at y=540 = true square center. If you use 1152, the square crop is off-center by ~36px (content sits slightly below the midline). Always use 1080.

### 4. NO brand logo on the stage

- No brand pill, no wordmark, no app icon overlay. The ad platform owns brand surfaces (handle in caption + page name).
- The brand identity is conveyed through **design tokens** (matching colors / font / phone mockup design), not through an explicit logo.

### 5. Lean copy — fewer words = more emotion

- Hard cap: **≤7 words per beat**.
- Each scene shows ONE thought, not three.
- Cut every adjective that doesn't pivot meaning.
- If you need a long explanation, you picked the wrong scene type. Replace with visual.

### 6. Always produce BOTH formats

- Vertical 1080×1920 → Reels, TikTok, Shorts, IG Stories.
- Square 1080×1080 → IG feed, FB feed, LinkedIn, X.
- Both come from the same HTML via the recorder's two encode passes.

### 7. Advanced CSS animations — not fade-only

The reel must feel cinematic. Required animation families used across scenes:

- **Spring-overshoot scale** (`scale(0) → scale(1.15) → scale(.95) → scale(1)`) — for hero numbers, badges, key reveals.
- **Stagger cascade** — multi-element entries with sequential `animation-delay` (or per-element keyframes) so items appear in rhythm, not all at once.
- **Slide-in with rotation overshoot** — e.g. phone mockup enters from the right with `translateX(700px) rotate(18deg)` → settles at `translateX(0) rotate(3deg)`.
- **Strike-through draw** — `transform: scaleX(0) → scaleX(1)` from left, for old prices or rejected options.
- **Padlock / mechanical click** — for urgency moments, with a small overshoot-then-settle on the shut.
- **Pulse glow loop** on CTA buttons — never-ending breathing for action elements.
- **Ambient parallax** — background doodles drift slowly on a 12–18s loop, completely independent of scene timeline. Subtle (opacity ≤ .2).
- **Background breath / breathe** — 12s ease-in-out radial gradient pulse to add warmth.
- **Typewriter / typed reveal** for hooks — optional, use sparingly. Don't typewrite everything.

A reel that uses only opacity fades is **rejected**. Use 4+ different animation families from the list per reel.

### 8. Visuals beat words

- Where a visual can replace text, use it. Examples:
  - Compounding habit → 10×12 dot-grid that fills cascading (not "compounds daily").
  - Urgency → padlock shut animation (not "lock now!").
  - Price contrast → ₹X → strike → ₹Y swoop (not "save 50%").
  - Product reveal → phone mockup with live ledger (not "see our app").
- Use SVG or pure CSS for graphics. Avoid raster stock images unless the visual specifically needs photography (rare).
- If using stock, pick royalty-free (Unsplash / Pexels) and credit in the HTML comment.

### 9. Gender-neutral copy when the target is "parent of a child"

- Don't write "beta" (masculine — son) or "beti" (feminine — daughter). Use "baccha" / "bacche" (kid) which work for both, or English "kid" / "your kid".
- Don't write "Papa will pay" — say "You'll pay" (addresses viewer) or "Mumma/Papa pay karenge".
- Don't use a single-gender Indian name (Aarav, Aanya) in product mockups. Use a generic kid emoji 🧑 or "Your kid" label.
- The ad must work whether the viewing parent has a son or daughter. Half the audience switching off because the copy felt off-gender is preventable.

### 10. Child-targeted reels MUST signal "for child" instantly

If the product / message targets a child (kid-finance, kid-education, kid-health, parent-bought-for-kid):

- Use **child-coded design tokens** that signal "for child" within the first scene:
  - Warm sunny palette (amber `#f7a700`, cream `#ffe2a0`, ink `#1a1208`).
  - Playful handwritten accent font (Patrick Hand or similar) alongside Inter.
  - Sticker / chip style elements with slight ±1.5° rotations for hand-placed feel.
  - Rounded radii (≥22px) on tiles and pills.
  - Emoji or kid-friendly iconography (piggy / pocket money / stickers).
- Parent should know within the first 2 seconds that the ad is about/for their child, even with sound off.
- The reel `apps/web/src/app/family/page.tsx` static and `marketing/social-launch/family-emi-static.html` are the canonical visual reference.

---

## Reel structure (canonical 30s × 6 scenes)

Each scene is ~5 seconds. Enter (0.3s) + hold (4.4s) + exit (0.3s). Adjust per content density.

| s | t | psychology | typical content |
|---|---|---|---|
| 1 | 0–5s | **HOOK** — pattern interrupt + open loop | 5–10 words. Identity, gap, or open question. |
| 2 | 5–10s | **PROBLEM** — relatable concrete moment | Show the pain in 3 staggered beats (bubbles, story). Not abstract jargon. |
| 3 | 10–15s | **PRODUCT** — visual demo / availability heuristic | Phone mockup / hero visual with cascading detail. |
| 4 | 15–20s | **ASPIRATION** — compounding / future-pace | Hero number + supporting claim + visual proof (grid, timeline). |
| 5 | 20–25s | **URGENCY** — loss aversion / scarcity | Padlock click, countdown, lock-in moment. No price here. |
| 6 | 25–30s | **CTA** — peak-end rule + BJ Fogg prompt | Lead line + price + JOIN button + URL. The ONLY price moment. |

### Rules on price screens

- **Maximum ONE product-price screen across the entire reel** (the CTA).
- Don't repeat the price in 3 scenes. Repetition cheapens the offer and bores the viewer.
- Anchor prices (old vs new) live in the CTA tile, not as a standalone scene.

### Rules on copy register

Match the target's natural speech register. Three common registers for India-targeted reels:

- **Mumbai-affluent (1980–1990 born)** — English-led Hinglish. Reserve Hindi for warmth (beta, baccha, papa, chai). Example: `"Beta ka daily scene: Saw it. Loved it. Order placed. 'Papa will pay.'"`
- **Tier-2/3 mass-market** — Hinglish balanced or Hindi-led. Example: `"Bachche ka apna money app. Roz, 2 minute."`
- **Pure English (corporate / global)** — fully English. Example: `"Your kid's first salary. 10 years away."`

Pick the register before writing copy. Don't mix registers within a single reel.

---

## Mandatory psychology stack (apply across timeline)

A reel that doesn't cover at least 5 of these is too weak. Map each scene to one or two:

| Trigger | Where it fits |
|---|---|
| Pattern interrupt / Zeigarnik | s1 hook |
| Identity acknowledgment | s1 hook |
| Loss aversion | s1 (gap), s5 (urgency) |
| Mimetic desire / social comparison | s2 (others) |
| Availability heuristic | s3 (concrete demo) |
| Compounding / aspirational anchor | s4 (10 years ahead) |
| IKEA effect / activation reduction | s5 (easy commit) |
| Anchoring + mental accounting | s6 (₹X → ₹Y, chai analogy) |
| BJ Fogg prompt (Motivation × Ability × Prompt) | s6 (clear CTA + low friction) |
| Peak-end rule | s6 (memorable close) |

See `marketing-psychology` skill for full model catalog if needed.

---

## Design token defaults (warm-amber kid-coded — for child-targeted reels)

```css
:root {
  --amber: #f7a700;
  --amber-soft: #ffb84d;
  --amber-cream: #ffe2a0;
  --ink: #1a1208;
  --ink-mute: rgba(26, 18, 8, .68);
  --ink-line: rgba(26, 18, 8, .14);
  --tile: rgba(255, 246, 220, .55);
  --tile-strong: #0b0b0d;
  --pop-mint: #3ddc97;
  --pop-rose: #ff6b81;
  --pop-rose-deep: #c44a5e;
}
```

Fonts: Inter (500–900) + Patrick Hand (handwritten accents). Both from Google Fonts.

For non-child reels, choose a palette that matches the brand. Keep the same structure — only swap tokens. The rest of the scaffolding is reusable.

---

## Layout scaffold

```css
.viewport { position: fixed; inset: 0; display: grid; place-items: center; background: #000; }
.stage {
  position: relative;
  width: 1080px; height: 1920px;       /* always portrait base */
  overflow: hidden;
  background: /* … your gradient … */;
  border-radius: 24px;
}
@media (max-width: 1080px), (max-height: 1920px) {
  .stage { transform: scale(min(calc(100vw / 1080), calc(100vh / 1920))); transform-origin: center; }
}
.scene {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1152px;                       /* TOP 60% safe zone */
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  padding: 200px 70px 50px;
  opacity: 0;
  animation-duration: 30s;              /* match total reel length */
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(.22, .8, .32, 1);
  animation-fill-mode: both;
}
```

Each `.sN` class gets its own keyframe that animates `opacity` + small `translateY` over its scene window (e.g. s1 occupies `0% → 16.67%` of a 30s timeline).

Each sub-element inside the scene gets its OWN keyframe animation tied to the same 30s timeline, with percentages corresponding to its in-scene entry/exit.

---

## Live-footage mode — stitch raw shots into a captioned reel

When the user has filmed clips + audio, you are an editor, not an animator. The
job: trim each shot to its clean dialogue, denoise, stitch in order, and lay
brand-styled caption pills + an end card on top — vertical AND square.

The whole pipeline is shipped as `references/build-from-footage-template.mjs`
(+ `footage-overlay-template.html`, `preview-footage-template.mjs`). Copy them
in, replace placeholders, fill the storyboard, iterate. These three files are
**battle-tested** — every rule below is encoded in them. Read them before
hand-rolling anything.

### The pipeline (what the build script does, in order)

1. **Per shot: detect silence** via `silencedetect=noise=-30dB:d=0.35` on the
   shot's window. Build the **inverse** (speech keep-intervals), pad each by
   0.08s, merge overlaps. This is the stammer/dead-air cleanup.
2. **Per shot: cut + denoise.** Apply `select` to video and `aselect` to audio
   with the **identical interval expression** → cut points match in both
   streams → lip sync survives. Re-time with `setpts`/`asetpts`. Denoise audio
   with `afftdn=nr=14:nf=-32:tn=1`. Scale to 1080×1920.
3. **Measure** each cleaned shot's real duration (ffprobe). Sum = reel length.
4. **Anchor caption beats** to cleaned shot starts (cumulative), NOT to a
   proportional scale of the raw timeline. Generate `@keyframes` per beat from
   the measured times and inject them into the overlay HTML at build time.
5. **Render the overlay twice** — once with `body.vertical` (captions upper
   third), once with `body.square` (captions lower third) — as transparent PNG
   sequences.
6. **Composite**: overlay-vert on the stitched base → vertical MP4. Crop the
   base to a face-centered 1080×1080, composite overlay-square on it → square
   MP4. Mux the cleaned audio. Done.

### Hard-won rules (each one cost a rebuild — do not relearn them)

1. **Check rotation metadata first.** Phone footage is often `rotation=-90`
   with stored dims `7680×4320` but DISPLAY dims `4320×7680` (already portrait).
   ffmpeg auto-rotates on read. So just `scale=1080:1920` — **never `crop` a
   sub-strip**, that ejects the subject out of frame. Verify with
   `ffprobe -show_entries stream_side_data=rotation` and a test frame BEFORE
   trusting any crop.
2. **Lip sync = same cut expr on both streams.** `select='EXPR'` on video and
   `aselect='EXPR'` on audio with the exact same `between(t,a,b)+…` string.
   Different expressions or re-timing one stream desyncs the mouth.
3. **Caption timing is shot-anchored, never proportional.** Shots clean by
   different amounts; a beat pinned to "50% of the original 36s" drifts off the
   speech once durations change. Resolve each beat to
   `cleanedShotStart[shot] + offset`, then convert to % of the FINAL total.
4. **Transcribe to write captions.** Run whisper on each shot's audio
   (`whisper-cli -m ggml-base.bin -f shot.wav -l <lang>`) to learn what is
   actually said and where. Captions should **echo her real words**, one short
   phrase per beat — not paraphrase, not a wall of subtitle text.
5. **Square is a SEPARATE layout, not a crop of the vertical overlay.** Person
   sits in the upper portion of the square; captions go to the LOWER third
   (`body.square .beat { top: …720px… }`). Crop the base with a face-centered
   y-offset (`crop=1080:1080:0:540`), then composite the square overlay on it.
   A top-anchored crop of a talking-head leaves dead space above the head and
   slices the chin.
6. **End card must OVERLAP the last beat's exit.** A gap of even 2 frames where
   nothing is visible reads as a flicker ("appears, disappears, reappears").
   Set `animation-iteration-count: 1` on every beat (infinite wraps and
   re-flashes at loop end), and start the end-card fade-in ~0.2s before the
   last caption finishes fading out.
7. **No synthesized SFX.** Lavfi-generated hook thumps / whooshes / chimes
   sound cheap and were rejected every time. Let the dialogue carry it. If the
   user explicitly wants sound design, source real samples — don't synth.
8. **Caption pill contrast.** Brand-warm default = cream pill + ink text;
   accent beats = amber pill + ink text. Any strike-through / faded element
   must contrast the PILL background (ink strike on cream pill — never a faded
   cream value on a cream pill, which vanishes). Avoid pure-black pills if the
   brand is warm — they read as foreign.
9. **Duration follows dialogue.** The 35s ceiling is for designed CSS ads.
   A talking-head testimonial runs as long as the speech needs (this one landed
   ~40s). Don't truncate her mid-sentence to hit 35.

### Steps when invoked in footage mode

1. **Inventory the footage.** `ffprobe` each clip for duration, dims, rotation,
   audio streams. Note whether audio is embedded (camera) or separate `.m4a`,
   and whether the separate track is sync-aligned with the video start.
2. **Transcribe** each shot (whisper). Write down what's said + rough in/out.
3. **Storyboard.** Order the shots, decide the in-point (`useFrom`) and window
   (`useDur`) per shot — trim pre-roll silence and flubs. Map each caption beat
   to a shot + offset in `BEAT_SCHEDULE`.
4. **Copy templates**, patch `RAW_FOOTAGE_DIR`, `TOPIC`, `STORYBOARD`,
   `BEAT_SCHEDULE`, and the overlay caption text/positions.
5. **Preview** the overlay beats (`preview-footage-template.mjs`) on a dark bg
   to check copy + sizing + safe-zone, before the slow encode.
6. **Build**, then sample 6–10 frames across the timeline at the shot
   boundaries and caption beats (vertical AND square) and eyeball: subject in
   frame, captions land on the right words, no flicker, brand colors only.
7. **Iterate** copy/timing/crop-offset and re-run. Use `SKIP_OVERLAY=1` to
   reuse frames when only the ffmpeg stage changed.

### Tunable knobs (top of the build template)

- `SILENCE_THRESH_DB` / `SILENCE_MIN_DUR` / `KEEP_PAD` — stammer cleanup
  aggressiveness vs. natural breathing room.
- `DENOISE_FILTER` — `afftdn` strength (raise `nr` for hissier rooms).
- `SQUARE_Y_OFFSET` — vertical position of the square crop window (face framing).
- `STORYBOARD[].useFrom / useDur` — per-shot in-point and length.
- `BEAT_SCHEDULE` — caption timing, shot-anchored.
- `SKIP_OVERLAY=1`, `SQUARE_ONLY=1` env flags for faster iteration.

---

## Templates

Three files are shipped in `references/` alongside this SKILL.md. When invoked, read them and adapt:

- `references/reel-template.html` — full self-contained HTML scaffold (stage + ambient + progress + 6 scene shells with example animations). Replace example content + keyframe percentages.
- `references/recorder-template.mjs` — Playwright + ffmpeg pipeline. Captures 900 frames at 30fps from the HTML, encodes vertical 1080×1920 + square 1080×1080 (top-anchored crop) MP4s.
- `references/preview-template.mjs` — fast scene-midpoint screenshots for visual review without sitting through full encode.

For **live-footage mode** (mode B), three more are shipped:

- `references/build-from-footage-template.mjs` — the full stitch pipeline:
  per-shot silence-cut + denoise + lip-sync-safe trim, concat, shot-anchored
  caption keyframe injection, dual vertical/square overlay composite. Patch
  `RAW_FOOTAGE_DIR`, `TOPIC`, `STORYBOARD`, `BEAT_SCHEDULE`.
- `references/footage-overlay-template.html` — transparent caption-pill overlay
  with `body.vertical` (captions top) / `body.square` (captions bottom) layouts,
  brand-warm cream/amber pills, price tile, end card. Build-time `@keyframes`
  are injected by the build script, so author positions + copy here.
- `references/preview-footage-template.mjs` — beat-midpoint screenshots of the
  overlay on a dark bg for copy/sizing review before encode.

Copy these into the project's `marketing/showcase/` (or equivalent ad-creative dir), rename per topic (e.g. `showcase-<topic>-vertical.html`, `record-<topic>.mjs`).

---

## Reference reels in this codebase

If working in the FinanceTracker repo, study these for inspiration:

- `marketing/showcase/showcase-family-warm-vertical.html` — warm-amber child-targeted reel for parents (`Beta ka apna money app`). Reference for child-vibe + Hinglish + phone mockup + dot grid + padlock animation + chai cup CSS.
- `marketing/showcase/record-family-warm.mjs` — recorder pattern.
- `marketing/showcase/voiceover-family-warm.md` — VO script with timing per scene.
- `marketing/social-launch/family-emi-static.html` — companion static creative. Match its design tokens for reel + static parity.

---

## Render commands

After dropping the templates and writing content:

```bash
# Render BOTH formats in one go
node marketing/showcase/record-<topic>.mjs
```

Outputs (in `marketing/showcase/output/`):
- `extrack-reel-<topic>-1080x1920.mp4` — vertical (Reels / TikTok / Shorts)
- `extrack-reel-<topic>-1080x1080.mp4` — square (IG feed / FB feed / LinkedIn / X)

Quick scene-midpoint preview (no encode, just PNGs):
```bash
node marketing/showcase/preview-<topic>.mjs
```

Requires: Node ≥ 18, Playwright installed (`yarn add -D playwright`), ffmpeg (`brew install ffmpeg` on macOS — the recorder also falls back to Playwright's bundled ffmpeg if system one isn't found).

The square output is a **top-anchored 1080×1080 crop** of the portrait via ffmpeg filter `crop=1080:1080:0:0`. This is intentional — content already lives in the top 60% of the portrait, so the top-anchored crop centers it perfectly in the square frame.

---

## Voiceover script

Always produce a companion `voiceover-<topic>.md` next to the reel HTML. Structure:

```markdown
# <Brand> — <Topic> Reel — Voiceover Script

**Reel**: `showcase-<topic>-vertical.html`
**Duration**: 30 seconds
**Outputs**: 1080×1920 + 1080×1080
**Target**: <one-line audience description>

## Voice direction
- Tone, pace, gender hint, language register, reference voice (e.g. "Vidya Balan calm narrator").

## Timed script
- 6 blocks, one per scene. Use **ellipses (***...***)** to mark beat-breaks where the visual should land before the VO continues.
- Aim ~144 wpm. Total spoken words ~65–75 for 30s with breathing room.
- Match URL closely on the final beat — say "dot com slash family" not "DOT COM".

## Recording notes
- Single take, dry, 48kHz / 24-bit WAV. Trim aggressively. Beat-align to scene start/exit ±150ms.

## Optional A/B alts
- 2–3 alternate hooks / closes for testing.
```

The VO is mandatory output. Don't ship a reel without one.

---

## Workflow when invoked

### Step 0 — Bootstrap (run first, every time)

Before writing any reel, check whether the project already has the reel infrastructure. If not, set it up.

**Detect**: look for `marketing/showcase/` (preferred) OR `marketing/reels/` OR a similar ad-creative folder. The signal is a `record-*.mjs` recorder file alongside a `showcase-*-vertical.html`.

**If infrastructure exists**: skip to step 1.

**If infrastructure does NOT exist**: bootstrap it before going further.

#### Bootstrap actions (in order)

1. **Create the directory**:
   ```bash
   mkdir -p marketing/showcase/output
   ```

2. **Check dependencies**:
   ```bash
   # Required
   command -v node >&2 || { echo "Install Node ≥ 18 first" >&2; exit 1; }
   command -v ffmpeg >&2 || { echo "Install ffmpeg: brew install ffmpeg (macOS) / apt install ffmpeg (Linux)" >&2; exit 1; }

   # Live-footage mode (B) only: whisper for transcribing shot dialogue.
   #   macOS:  brew install whisper-cpp  (binary: whisper-cli)
   #   model:  curl -sL https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ~/.cache/whisper/ggml-base.bin
   # Transcribe a shot:  ffmpeg -i shot.m4a -ar 16000 -ac 1 s.wav && whisper-cli -m ~/.cache/whisper/ggml-base.bin -f s.wav -l hi

   # Playwright — install in the project if missing
   node -e "require.resolve('playwright')" 2>/dev/null || \
     (yarn add -D playwright 2>/dev/null || npm install --save-dev playwright)

   # Chromium browser for Playwright
   npx playwright install chromium
   ```

   Use `yarn` if the repo has a `yarn.lock`, else `npm`. Check `pnpm-lock.yaml` for pnpm.

3. **Copy the three reference templates** into `marketing/showcase/` and rename for the topic. Reference paths are inside this skill:

   ```bash
   SKILL_REF=~/.claude/skills/reel-builder/references
   TOPIC=<your-topic>   # e.g. family-warm, billing-launch, ai-search

   cp "$SKILL_REF/reel-template.html"     "marketing/showcase/showcase-${TOPIC}-vertical.html"
   cp "$SKILL_REF/recorder-template.mjs"  "marketing/showcase/record-${TOPIC}.mjs"
   cp "$SKILL_REF/preview-template.mjs"   "marketing/showcase/preview-${TOPIC}.mjs"
   cp "$SKILL_REF/voiceover-template.md"  "marketing/showcase/voiceover-${TOPIC}.md"
   ```

4. **Patch the TOPIC constant** in the recorder + preview files (both have `const TOPIC = 'REPLACE_ME'` near the top):
   ```bash
   sed -i.bak "s/REPLACE_ME/${TOPIC}/g" marketing/showcase/record-${TOPIC}.mjs marketing/showcase/preview-${TOPIC}.mjs
   rm marketing/showcase/*.bak
   ```

5. **Write a one-time `marketing/showcase/README.md`** (only if it doesn't already exist):

   ```markdown
   # Marketing reels

   This folder holds CSS-only vertical (1080×1920) + square (1080×1080) reels for paid social.

   Per topic, you get four files:
   - `showcase-<topic>-vertical.html` — the animation stage
   - `record-<topic>.mjs` — Playwright + ffmpeg pipeline → MP4
   - `preview-<topic>.mjs` — fast scene-midpoint PNGs (no encode)
   - `voiceover-<topic>.md` — timed VO script

   Render: `node marketing/showcase/record-<topic>.mjs`
   Preview only: `node marketing/showcase/preview-<topic>.mjs`

   Outputs in `output/`:
   - `extrack-reel-<topic>-1080x1920.mp4` (vertical)
   - `extrack-reel-<topic>-1080x1080.mp4` (square crop)

   Hard rules enforced by every reel (see `~/.claude/skills/reel-builder/SKILL.md`):
   - First 3s = emotional hook
   - All text in top 1080px of the 1920 portrait stage
   - No brand logo on stage
   - ≤7 words per beat
   - ≤1 product-price screen
   - ≥4 distinct animation families
   ```

6. **Add `.gitignore` entries** (append to project `.gitignore` if not already present):
   ```
   marketing/showcase/output/
   marketing/showcase/frames-*/
   marketing/showcase/frames-*-preview/
   ```

   Skip if these patterns already match. The `frames-*/` directories are heavy (~200MB per reel) — never commit them.

After bootstrap, the project is ready. Proceed to step 1.

### Steps 1–9 — Build the reel

1. **Confirm target + topic + register**. Ask one clarifying question if ambiguous: "Who's the target audience, and what's the single most thumb-stopping line you want to test?"
2. **Pick palette**: child-vibe (warm amber) if child-targeted, otherwise propose 2 palettes for user pick.
3. **Draft 6-scene outline** with copy + psychology stack mapped. Show it to user for sign-off before coding.
4. **Edit the copied HTML** — replace placeholder content `[BRACKETED]` in `showcase-${TOPIC}-vertical.html` with real copy. Adjust keyframe percentages if you change scene count or timing.
5. **Verify recorder paths** — TOPIC is already patched. Confirm `DURATION_S` matches the reel length (default 30, max 35).
6. **Run preview script** to capture scene midpoints:
   ```bash
   node marketing/showcase/preview-${TOPIC}.mjs
   ```
   Read each PNG. Verify:
   - Top-1080 constraint holds (no text below y=1080 on portrait).
   - No brand logo on stage.
   - Hook lands in first 3s.
   - Animations feel cinematic (not just fades).
   - Square crop (`crop=1080:1080:0:0`) would center content — eyeball each frame as if the bottom 840px were missing.
7. **Iterate** copy + animation based on previews. Re-run preview after each change.
8. **Write VO script** matching final scene timings. Use the copied `voiceover-${TOPIC}.md` template.
9. **Hand off render command** to the user:
   ```bash
   node marketing/showcase/record-${TOPIC}.mjs
   ```
   Do NOT run the full encode without user request — it's a 3–5 min job they may want to gate.

---

## Output checklist (verify before reporting done)

- [ ] Vertical HTML at `marketing/showcase/showcase-<topic>-vertical.html`
- [ ] Recorder at `marketing/showcase/record-<topic>.mjs`
- [ ] Preview script at `marketing/showcase/preview-<topic>.mjs`
- [ ] Voiceover script at `marketing/showcase/voiceover-<topic>.md`
- [ ] Preview PNGs reviewed at `marketing/showcase/frames-<topic>-preview/`
- [ ] All text within top 60% (y ≤ 1152px on portrait stage)
- [ ] No brand logo / wordmark visible on stage
- [ ] First 3s contains the hook
- [ ] Total ≤ 35s (default 30s)
- [ ] At least 4 distinct animation families used
- [ ] ≤ 1 product-price screen
- [ ] Each beat ≤ 7 words
- [ ] If child-targeted: warm palette + handwritten accent + sticker chips present
- [ ] Render command provided to user
