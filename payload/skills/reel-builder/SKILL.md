---
name: reel-builder
description: "Builds 30-35s vertical (1080x1920) + square (1080x1080) marketing reels, two modes: CSS-animated HTML stage or live-footage stitch with branded captions. Use when the user asks to make a reel, a video ad, a Meta/Instagram/TikTok creative, to animate a static into motion, or to stitch raw clips and audio into a captioned reel. Not for static images or non-video creative — use an image or copywriting skill instead."
---

# Reel Builder

Ad-grade 9:16 + 1:1 reel production from a single HTML source. Output: MP4s ready for Meta / Reels / TikTok / Shorts / IG-feed / LinkedIn paid placement, plus a timed voiceover script. **Every reel must satisfy every non-negotiable rule below — a reel that misses even one is rejected and reworked, never shipped.**

## When to use / when NOT to use

- Use when the user says: "create a reel", "make a video ad", "social ad video", "Reels creative", "TikTok ad", "build a 30 second video", "do same for square", "package this static into motion" — or points at a folder of raw `.mp4`/`.m4a` clips plus a script to stitch into a captioned ad.
- Do NOT use for static image creatives, long-form video, screen recordings, or copy-only asks. If invoked outside these triggers, stop and say so.

## Pick a mode — by what the user HAS

| Mode                            | The user has                                    | The HTML is                                                                                                      | Pipeline detail                |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **A — CSS animation** (default) | only a product / landing page / static          | **the video itself** — Playwright screenshots its animated timeline → frames → MP4                               | `references/mode-a-css.md`     |
| **B — live-footage stitch**     | raw filmed clips + audio (talking head, b-roll) | a **transparent caption overlay** composited ON TOP of the stitched footage — you are an editor, not an animator | `references/mode-b-footage.md` |

Both modes share: dual 1080×1920 + 1080×1080 output, brand-token styling, every rule below, and the preview-before-encode loop. They differ only in where the pixels come from.

## Non-negotiable rules

1. **30s default, 35s hard ceiling.** Acceptable range 25–35s; canonical structure is 6 scenes × 5s — adjust scene count, never total length. WHY: above 35s, completion rate collapses on paid placements. _Mode B carve-out:_ a talking-head testimonial runs as long as the speech needs (one landed ~40s) — never truncate the speaker mid-sentence to hit 35.
2. **The first 3 seconds are an emotional hook.** One of three types: **identity acknowledgment** (call out the target's identity marker so they pattern-match instantly — e.g. "₹5 lakh school fees." for wealthy Mumbai parents), **open-loop curiosity** (a question the next scenes answer — e.g. "Pehli salary… sirf 10 saal door."), or **visceral contrast** (two stark elements — status "₹5L school" → gap "Money sense — ₹0"). The hook is NOT a tagline and NOT a brand reveal; it is the single most thumb-stopping moment. Avoid confessional first-person ("Mujhe paisa kabhi…" reads as personal story, not ad) and vague questions that don't punch.
3. **All text lives in the top 1080px of the 1920 portrait** (=56%). The bottom 840px is reserved for the platform's CTA overlay. Enforce with `.scene { position: absolute; top: 0; left: 0; right: 0; height: 1080px; }`. **WHY 1080 and not 1152:** the square output is a top-anchored 1080×1080 crop of the portrait, so a 1080px zone centers content at y=540 — the exact square center. A 1152px zone leaves the square crop ~36px off-center (content sits below the midline). Always 1080.
4. **No brand logo on the stage.** No brand pill, wordmark, or app-icon overlay — the ad platform owns brand surfaces (handle in caption + page name). Brand identity comes from design tokens: matching colors, fonts, phone-mockup design.
5. **Lean copy: ≤7 words per beat.** One thought per scene, never three. Cut every adjective that doesn't pivot meaning. If a beat needs a long explanation, the scene type is wrong — replace the words with a visual.
6. **Always produce BOTH formats** from the same source: vertical 1080×1920 (Reels / TikTok / Shorts / Stories) and square 1080×1080 (IG feed / FB feed / LinkedIn / X).
7. **≥4 animation families per reel — a fade-only reel is rejected.** Families: spring-overshoot scale (`scale(0)→1.15→.95→1`, hero numbers/badges) · stagger cascade (sequential `animation-delay`) · slide-in with rotation overshoot (`translateX(700px) rotate(18deg)` → `translateX(0) rotate(3deg)`) · strike-through draw (`scaleX(0)→scaleX(1)`, old prices) · padlock/mechanical click with overshoot-settle (urgency) · pulse-glow loop on CTA · ambient parallax doodles (12–18s loop, opacity ≤.2, independent of scene timeline) · background breath (12s radial-gradient pulse) · typewriter (hooks only, sparingly).
8. **Visuals beat words.** Canonical swaps: compounding → 10×12 dot-grid cascading fill; urgency → padlock shut; price contrast → ₹X strike → ₹Y swoop; product reveal → phone mockup with live ledger. SVG or pure CSS, not raster; if stock is truly needed (rare), royalty-free (Unsplash/Pexels) and credited in an HTML comment.
9. **Maximum ONE price screen per reel** — the CTA. Repeating the price cheapens the offer and bores the viewer; anchor prices (old vs new) live inside the CTA tile, never as a standalone scene.
10. **Gender-neutral copy when targeting "parent of a child".** Say "baccha/bacche" or "kid", never "beta"/"beti"; say "You'll pay" or "Mumma/Papa pay karenge", never "Papa will pay"; no single-gender names (Aarav, Aanya) in mockups — use a generic 🧑 or "Your kid". WHY: half the audience switching off over off-gender copy is a preventable loss.
11. **Child-targeted reels signal "for child" instantly** — first scene, within 2 seconds, sound-off: warm sunny palette (amber `#f7a700`, cream `#ffe2a0`, ink `#1a1208`), playful handwritten accent font (Patrick Hand) beside Inter, sticker chips with ±1.5° rotations, radii ≥22px, kid iconography (piggy / pocket money / stickers).
12. **Pick ONE copy register before writing — never mix registers in a reel.** India-target examples: Mumbai-affluent (born 1980–1990) = English-led Hinglish, Hindi reserved for warmth ("Beta ka daily scene: Saw it. Loved it. Order placed. 'Papa will pay.'"); tier-2/3 mass-market = Hinglish/Hindi-led ("Bachche ka apna money app. Roz, 2 minute."); corporate/global = pure English ("Your kid's first salary. 10 years away.").
13. **Preview before encode, always.** Render preview PNGs and read every one before any full encode. Do NOT run the full encode without the user asking — it is a 3–5 minute job they may want to gate.
14. **A designed reel (Mode A) ships with a timed voiceover script** (`voiceover-<topic>.md`) — never without one. Mode B's audio IS the footage dialogue.

## Mode A checklist (copy and tick off)

Full detail — scaffold CSS, tokens, bootstrap, VO format: `references/mode-a-css.md`.

```
- [ ] 0. Bootstrap: detect marketing/showcase/ infra; if missing, create + install deps + copy templates (see mode-a-css.md)
- [ ] 1. Confirm target + topic + register (one clarifying question if ambiguous: "Who's the target audience, and what's the single most thumb-stopping line you want to test?")
- [ ] 2. Palette: child-targeted → warm amber tokens; else propose 2 palettes for user pick
- [ ] 3. Draft 6-scene outline (copy + psychology trigger per scene) → user sign-off BEFORE coding
- [ ] 4. Edit the copied HTML: replace [BRACKETED] placeholders; adjust keyframe % if scene count/timing changed
- [ ] 5. Verify recorder: TOPIC patched, DURATION_S matches reel length (default 30, max 35)
- [ ] 6. Preview: node marketing/showcase/preview-<topic>.mjs → read every PNG
- [ ] 7. Verify on previews: text ≤ y=1080 · no logo · hook lands in 3s · ≥4 animation families · square OK (eyeball each frame as if the bottom 840px were gone)
- [ ] 8. Iterate copy/animation; re-preview after each change
- [ ] 9. Write voiceover-<topic>.md matching final scene timings
- [ ] 10. Hand the render command to the user: node marketing/showcase/record-<topic>.mjs (don't run it unasked)
- [ ] 11. Final gate: <=35s · <=7 words/beat · <=1 price screen · both formats render · child extras if child-targeted
```

## Mode B checklist (copy and tick off)

Full pipeline — the nine hard-won rules, tunable knobs, whisper setup: `references/mode-b-footage.md`. The three Mode B templates are battle-tested — every rule is encoded in them; read them before hand-rolling anything.

```
- [ ] 1. Inventory footage: ffprobe every clip — duration, dims, ROTATION metadata, audio streams (embedded vs separate .m4a, sync alignment)
- [ ] 2. Transcribe each shot with whisper; note what is said and where
- [ ] 3. Storyboard: shot order, per-shot in-point/window (useFrom/useDur — trim pre-roll + flubs), caption beats mapped to shot + offset
- [ ] 4. Copy templates; patch RAW_FOOTAGE_DIR, TOPIC, STORYBOARD, BEAT_SCHEDULE + overlay copy/positions
- [ ] 5. Preview overlay beats on a dark bg (preview-footage-template.mjs) BEFORE the slow encode
- [ ] 6. Build, then sample 6-10 frames at shot boundaries + caption beats, vertical AND square
- [ ] 7. Verify on frames: subject in frame · captions echo the real spoken words · no end-card flicker · pill contrast · brand colors only
- [ ] 8. Iterate copy/timing/crop offset; SKIP_OVERLAY=1 to reuse frames when only the ffmpeg stage changed
```

## Common mistakes

| Mistake                                                      | Reality                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| "1152px safe zone is fine — it's still the top 60%"          | The square crop centers at y=540 only with a 1080px zone; 1152 shifts content ~36px off-center. Always 1080.                                |
| "One more scene won't hurt — 38s total"                      | Completion collapses past 35s on paid placements. Cut a scene instead. (Mode B dialogue is the only exception.)                             |
| "Fades look clean and minimal"                               | Fade-only reads as cheap; the reel is rejected. Use ≥4 animation families.                                                                  |
| "Put the price early so viewers know the deal"               | One price moment — the CTA. Early/repeated price cheapens the offer.                                                                        |
| "Crop the raw phone footage to portrait first"               | Phone clips carry rotation metadata; ffmpeg auto-rotates on read. Cropping a sub-strip ejects the subject. Check rotation, then scale only. |
| "Captions at 50% of the timeline, roughly where she says it" | Silence-cutting changes every shot's length — proportional timing drifts off the speech. Anchor beats to cleaned shot starts.               |
| "Paraphrase the dialogue into nicer captions"                | Captions must echo the real spoken words (from the whisper transcript), one short phrase per beat.                                          |
| "Add a whoosh/thump for punch"                               | Synthesized SFX sound cheap and were rejected every time. Dialogue carries it; real samples only if the user insists.                       |
| "Square = crop the vertical overlay"                         | Square is a separate caption layout (captions lower third) over a face-centered crop; a top-anchored talking-head crop slices the chin.     |
| "Skip the preview, the encode is only a few minutes"         | Preview-before-encode is rule 13. Preview frames catch safe-zone, logo, hook and contrast failures before you burn encode cycles.           |
| "Commit the frames dir so the user can inspect"              | `frames-*/` is ~200MB per reel — gitignore it, never commit.                                                                                |

## References (all one hop from here)

- `references/mode-a-css.md` — Mode A pipeline: scene structure + psychology stack, design tokens, layout scaffold, bootstrap, build workflow, render commands, voiceover format.
- `references/mode-b-footage.md` — Mode B pipeline: silence-cut/denoise/lip-sync mechanics, the nine hard-won rules, workflow, tunable knobs, whisper setup.
- `references/reel-template.html` — Mode A stage scaffold (viewport + stage + ambient + progress + 6 scene shells with example animations).
- `references/recorder-template.mjs` — Mode A Playwright+ffmpeg recorder: 900 frames @ 30fps → vertical + square MP4s.
- `references/preview-template.mjs` — Mode A scene-midpoint PNGs (no encode).
- `references/voiceover-template.md` — VO script template.
- `references/build-from-footage-template.mjs` — Mode B stitch pipeline (silence-cut, denoise, lip-sync-safe trim, concat, shot-anchored caption injection, dual composite).
- `references/footage-overlay-template.html` — Mode B transparent caption overlay (`body.vertical` / `body.square` layouts, pills, price tile, end card).
- `references/preview-footage-template.mjs` — Mode B beat-midpoint overlay previews on dark bg.
