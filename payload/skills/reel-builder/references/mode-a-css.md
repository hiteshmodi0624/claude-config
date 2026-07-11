# Mode A — CSS-animation reel pipeline

The HTML stage IS the video: a self-contained page animates a 30s CSS timeline; Playwright screenshots it frame by frame; ffmpeg encodes vertical + square MP4s. All non-negotiable rules live in SKILL.md — this file is the execution detail.

## Contents

- Scene structure (canonical 30s × 6 scenes)
- Psychology stack
- Design token defaults (child-coded warm amber)
- Layout scaffold + keyframe timeline
- Step 0 — Bootstrap
- Steps 1–9 — Build the reel
- Render commands & requirements
- Voiceover script (mandatory output)
- Reference reels (FinanceTracker repo only)

## Scene structure (canonical 30s × 6 scenes)

Each scene ≈ 5 seconds: enter 0.3s + hold 4.4s + exit 0.3s. Adjust per content density.

| s   | t      | psychology                                         | typical content                                                           |
| --- | ------ | -------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | 0–5s   | **HOOK** — pattern interrupt + open loop           | 5–10 words. Identity, gap, or open question.                              |
| 2   | 5–10s  | **PROBLEM** — relatable concrete moment            | Show the pain in 3 staggered beats (bubbles, story). Not abstract jargon. |
| 3   | 10–15s | **PRODUCT** — visual demo / availability heuristic | Phone mockup / hero visual with cascading detail.                         |
| 4   | 15–20s | **ASPIRATION** — compounding / future-pace         | Hero number + supporting claim + visual proof (grid, timeline).           |
| 5   | 20–25s | **URGENCY** — loss aversion / scarcity             | Padlock click, countdown, lock-in moment. No price here.                  |
| 6   | 25–30s | **CTA** — peak-end rule + BJ Fogg prompt           | Lead line + price + JOIN button + URL. The ONLY price moment.             |

## Psychology stack

A reel that maps fewer than 5 of these triggers is too weak. Assign one or two per scene:

| Trigger                                        | Where it fits                 |
| ---------------------------------------------- | ----------------------------- |
| Pattern interrupt / Zeigarnik                  | s1 hook                       |
| Identity acknowledgment                        | s1 hook                       |
| Loss aversion                                  | s1 (gap), s5 (urgency)        |
| Mimetic desire / social comparison             | s2 (others)                   |
| Availability heuristic                         | s3 (concrete demo)            |
| Compounding / aspirational anchor              | s4 (10 years ahead)           |
| IKEA effect / activation reduction             | s5 (easy commit)              |
| Anchoring + mental accounting                  | s6 (₹X → ₹Y, chai analogy)    |
| BJ Fogg prompt (Motivation × Ability × Prompt) | s6 (clear CTA + low friction) |
| Peak-end rule                                  | s6 (memorable close)          |

If a marketing-psychology skill is available in the session, consult it for the full model catalog.

## Design token defaults (warm-amber, child-coded — for child-targeted reels)

```css
:root {
  --amber: #f7a700;
  --amber-soft: #ffb84d;
  --amber-cream: #ffe2a0;
  --ink: #1a1208;
  --ink-mute: rgba(26, 18, 8, 0.68);
  --ink-line: rgba(26, 18, 8, 0.14);
  --tile: rgba(255, 246, 220, 0.55);
  --tile-strong: #0b0b0d;
  --pop-mint: #3ddc97;
  --pop-rose: #ff6b81;
  --pop-rose-deep: #c44a5e;
}
```

Fonts: Inter (500–900) + Patrick Hand (handwritten accents), both from Google Fonts.

For non-child reels, choose a palette that matches the brand. Keep the same structure — only swap tokens; the rest of the scaffolding is reusable.

## Layout scaffold + keyframe timeline

```css
.viewport {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: #000;
}
.stage {
  position: relative;
  width: 1080px;
  height: 1920px; /* always portrait base */
  overflow: hidden;
  background: /* … your gradient … */;
  border-radius: 24px;
}
@media (max-width: 1080px), (max-height: 1920px) {
  .stage {
    transform: scale(min(calc(100vw / 1080), calc(100vh / 1920)));
    transform-origin: center;
  }
}
.scene {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1080px; /* TOP 1080px safe zone — see SKILL.md rule 3 for why 1080, not 1152 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 200px 70px 50px;
  opacity: 0;
  animation-duration: 30s; /* match total reel length */
  animation-iteration-count: infinite;
  animation-timing-function: cubic-bezier(0.22, 0.8, 0.32, 1);
  animation-fill-mode: both;
}
```

- Each `.sN` class gets its own keyframe animating `opacity` + a small `translateY` over its scene window (e.g. s1 occupies `0% → 16.67%` of a 30s timeline).
- Each sub-element inside a scene gets its OWN keyframe tied to the same 30s timeline, with percentages for its in-scene entry/exit.

## Step 0 — Bootstrap (run first, every time)

**Detect**: look for `marketing/showcase/` (preferred) or `marketing/reels/` or a similar ad-creative folder. The signal is a `record-*.mjs` recorder beside a `showcase-*-vertical.html`. If present, skip to step 1. If not, bootstrap:

1. Create the directory:

   ```bash
   mkdir -p marketing/showcase/output
   ```

2. Check dependencies:

   ```bash
   command -v node >&2 || { echo "Install Node >= 18 first" >&2; exit 1; }
   command -v ffmpeg >&2 || { echo "Install ffmpeg: brew install ffmpeg (macOS) / apt install ffmpeg (Linux)" >&2; exit 1; }

   # Playwright — install in the project if missing
   node -e "require.resolve('playwright')" 2>/dev/null || \
     (yarn add -D playwright 2>/dev/null || npm install --save-dev playwright)

   # Chromium browser for Playwright
   npx playwright install chromium
   ```

   Use `yarn` if the repo has a `yarn.lock`, `pnpm` if it has `pnpm-lock.yaml`, else `npm`. (Mode B additionally needs whisper — setup lives in `mode-b-footage.md`.)

3. Copy the four Mode A templates and rename for the topic:

   ```bash
   SKILL_REF=~/.claude/skills/reel-builder/references
   TOPIC=<your-topic>   # e.g. family-warm, billing-launch, ai-search

   cp "$SKILL_REF/reel-template.html"     "marketing/showcase/showcase-${TOPIC}-vertical.html"
   cp "$SKILL_REF/recorder-template.mjs"  "marketing/showcase/record-${TOPIC}.mjs"
   cp "$SKILL_REF/preview-template.mjs"   "marketing/showcase/preview-${TOPIC}.mjs"
   cp "$SKILL_REF/voiceover-template.md"  "marketing/showcase/voiceover-${TOPIC}.md"
   ```

4. Patch the TOPIC constant in the recorder + preview files (both have `const TOPIC = 'REPLACE_ME'` near the top):

   ```bash
   sed -i.bak "s/REPLACE_ME/${TOPIC}/g" marketing/showcase/record-${TOPIC}.mjs marketing/showcase/preview-${TOPIC}.mjs
   rm marketing/showcase/*.bak
   ```

5. Write a one-time `marketing/showcase/README.md` (only if it doesn't already exist):

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

   Hard rules enforced by every reel (see `~/.claude/skills/reel-builder/SKILL.md`):

   - First 3s = emotional hook
   - All text in top 1080px of the 1920 portrait stage
   - No brand logo on stage
   - ≤7 words per beat
   - ≤1 product-price screen
   - ≥4 distinct animation families
   ```

6. Append `.gitignore` entries (skip any pattern already matched):

   ```
   marketing/showcase/output/
   marketing/showcase/frames-*/
   marketing/showcase/frames-*-preview/
   ```

   The `frames-*/` directories are heavy (~200MB per reel) — never commit them.

## Steps 1–9 — Build the reel

1. **Confirm target + topic + register.** Ask one clarifying question if ambiguous: "Who's the target audience, and what's the single most thumb-stopping line you want to test?"
2. **Pick palette**: child-vibe (warm amber above) if child-targeted; otherwise propose 2 brand-matched palettes for the user to pick.
3. **Draft the 6-scene outline** with copy + psychology trigger per scene. Show it to the user for sign-off before writing any code.
4. **Edit the copied HTML** — replace every `[BRACKETED]` placeholder in `showcase-<topic>-vertical.html` with real copy. Adjust keyframe percentages if scene count or timing changed.
5. **Verify the recorder** — TOPIC already patched; confirm `DURATION_S` matches the reel length (default 30, max 35).
6. **Preview**: `node marketing/showcase/preview-<topic>.mjs`, then read each PNG and verify: text within top 1080px · no brand logo · hook lands in the first 3s · animation cinematic (≥4 families, not fade-only) · square crop centers content (eyeball each frame as if the bottom 840px were missing).
7. **Iterate** copy + animation from the previews; re-run the preview after every change.
8. **Write the VO script** matching final scene timings, into the copied `voiceover-<topic>.md` (format below).
9. **Hand off the render command** to the user — do NOT run the full encode unrequested (3–5 min job they may want to gate).

## Render commands & requirements

```bash
# Render BOTH formats in one go (3–5 min)
node marketing/showcase/record-<topic>.mjs

# Fast scene-midpoint preview (no encode, just PNGs)
node marketing/showcase/preview-<topic>.mjs
```

- Outputs land in `marketing/showcase/output/` as `<prefix>-reel-<topic>-1080x1920.mp4` (vertical) and `<prefix>-reel-<topic>-1080x1080.mp4` (square). The templates default the prefix to `extrack` (their home repo's brand) — patch the `OUT_MP4_*` constants to the current brand when working elsewhere.
- The square output is a **top-anchored `crop=1080:1080:0:0`** of the portrait — intentional: content already lives in the top 1080px, so the top-anchored crop centers it perfectly in the square frame.
- Requires: Node ≥ 18, Playwright installed in the project, ffmpeg (`brew install ffmpeg` on macOS; the recorder falls back to Playwright's bundled ffmpeg if no system ffmpeg is found).
- Recorder mechanics: captures 900 frames at 30fps from the HTML timeline, then two encode passes.

## Voiceover script (mandatory output)

Always produce a companion `voiceover-<topic>.md` next to the reel HTML — never ship a designed reel without one. Structure:

```markdown
# <Brand> — <Topic> Reel — Voiceover Script

**Reel**: `showcase-<topic>-vertical.html`
**Duration**: 30 seconds
**Outputs**: 1080×1920 + 1080×1080
**Target**: <one-line audience description>

## Voice direction

- Tone, pace, gender hint, language register, reference voice (e.g. "Vidya Balan calm narrator").

## Timed script

- 6 blocks, one per scene. Use ellipses (…) to mark beat-breaks where the visual should land before the VO continues.
- Aim ~144 wpm. Total spoken words ~65–75 for 30s with breathing room.
- Say the URL naturally on the final beat — "dot com slash family", not "DOT COM".

## Recording notes

- Single take, dry, 48kHz / 24-bit WAV. Trim aggressively. Beat-align to scene start/exit ±150ms.

## Optional A/B alts

- 2–3 alternate hooks / closes for testing.
```

## Reference reels (FinanceTracker repo only)

If — and only if — working in the FinanceTracker repo, study these for inspiration; otherwise skip this section:

- `marketing/showcase/showcase-family-warm-vertical.html` — warm-amber child-targeted reel for parents ("Beta ka apna money app"). Reference for child-vibe + Hinglish + phone mockup + dot grid + padlock animation + chai-cup CSS.
- `marketing/showcase/record-family-warm.mjs` — recorder pattern.
- `marketing/showcase/voiceover-family-warm.md` — VO script with per-scene timing.
- `marketing/social-launch/family-emi-static.html` — companion static creative; match its design tokens for reel + static parity. Together with `apps/web/src/app/family/page.tsx` it is the canonical child-vibe visual reference.
