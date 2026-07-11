# Mode B — live-footage stitch pipeline

The user has filmed clips + audio; you are an **editor, not an animator**. The job: trim each shot to its clean dialogue, denoise, stitch in order, and composite brand-styled caption pills + an end card on top — vertical AND square. The HTML is a transparent overlay, never the video itself.

The whole pipeline ships as `build-from-footage-template.mjs` (+ `footage-overlay-template.html`, `preview-footage-template.mjs`) in this directory. Copy them into the project, replace placeholders, fill the storyboard, iterate. These three files are **battle-tested — every rule below is encoded in them. Read them before hand-rolling anything.**

## Contents

- The pipeline (what the build script does, in order)
- Hard-won rules (each one cost a rebuild)
- Steps when invoked
- Tunable knobs
- Whisper setup (transcription)
- Templates

## The pipeline (what the build script does, in order)

1. **Per shot: detect silence** via `silencedetect=noise=-30dB:d=0.35` on the shot's window. Build the **inverse** (speech keep-intervals), pad each by 0.08s, merge overlaps. This is the stammer/dead-air cleanup.
2. **Per shot: cut + denoise.** Apply `select` to video and `aselect` to audio with the **identical interval expression** → cut points match in both streams → lip sync survives. Re-time with `setpts`/`asetpts`. Denoise audio with `afftdn=nr=14:nf=-32:tn=1`. Scale to 1080×1920.
3. **Measure** each cleaned shot's real duration (ffprobe). Sum = reel length.
4. **Anchor caption beats** to cleaned shot starts (cumulative), NOT to a proportional scale of the raw timeline. Generate `@keyframes` per beat from the measured times and inject them into the overlay HTML at build time.
5. **Render the overlay twice** — once with `body.vertical` (captions upper third), once with `body.square` (captions lower third) — as transparent PNG sequences.
6. **Composite**: overlay-vert on the stitched base → vertical MP4. Crop the base to a face-centered 1080×1080, composite overlay-square on it → square MP4. Mux the cleaned audio. Done.

## Hard-won rules (each one cost a rebuild — do not relearn them)

1. **Check rotation metadata first.** Phone footage is often `rotation=-90` with stored dims `7680×4320` but DISPLAY dims `4320×7680` (already portrait). ffmpeg auto-rotates on read. So just `scale=1080:1920` — **never `crop` a sub-strip**, that ejects the subject out of frame. Verify with `ffprobe -show_entries stream_side_data=rotation` and render a test frame BEFORE trusting any crop.
2. **Lip sync = same cut expression on both streams.** `select='EXPR'` on video and `aselect='EXPR'` on audio with the exact same `between(t,a,b)+…` string. Different expressions, or re-timing one stream, desyncs the mouth.
3. **Caption timing is shot-anchored, never proportional.** Shots clean by different amounts; a beat pinned to "50% of the original 36s" drifts off the speech once durations change. Resolve each beat to `cleanedShotStart[shot] + offset`, then convert to % of the FINAL total.
4. **Transcribe to write captions.** Run whisper on each shot's audio to learn what is actually said and where. Captions must **echo the speaker's real words**, one short phrase per beat — not paraphrase, not a wall of subtitle text.
5. **Square is a SEPARATE layout, not a crop of the vertical overlay.** The person sits in the upper portion of the square; captions go to the LOWER third (`body.square .beat { top: …720px… }`). Crop the base with a face-centered y-offset (`crop=1080:1080:0:540`), then composite the square overlay on it. A top-anchored crop of a talking head leaves dead space above the head and slices the chin.
6. **The end card must OVERLAP the last beat's exit.** A gap of even 2 frames where nothing is visible reads as a flicker ("appears, disappears, reappears"). Set `animation-iteration-count: 1` on every beat (infinite wraps and re-flashes at loop end), and start the end-card fade-in ~0.2s before the last caption finishes fading out.
7. **No synthesized SFX.** Lavfi-generated hook thumps / whooshes / chimes sound cheap and were rejected every time. Let the dialogue carry it. If the user explicitly wants sound design, source real samples — never synthesize.
8. **Caption pill contrast.** Brand-warm default = cream pill + ink text; accent beats = amber pill + ink text. Any strike-through / faded element must contrast the PILL background (ink strike on a cream pill — never a faded cream value on a cream pill, which vanishes). Avoid pure-black pills on a warm brand — they read as foreign.
9. **Duration follows dialogue.** The 35s ceiling is for designed CSS ads. A talking-head testimonial runs as long as the speech needs (a real one landed ~40s). Never truncate the speaker mid-sentence to hit 35.

## Steps when invoked

1. **Inventory the footage.** `ffprobe` each clip for duration, dims, rotation, audio streams. Note whether audio is embedded (camera) or a separate `.m4a`, and whether the separate track is sync-aligned with the video start.
2. **Transcribe** each shot (whisper, setup below). Write down what's said + rough in/out points.
3. **Storyboard.** Order the shots; decide the in-point (`useFrom`) and window (`useDur`) per shot — trim pre-roll silence and flubs. Map each caption beat to a shot + offset in `BEAT_SCHEDULE`.
4. **Copy the templates**; patch `RAW_FOOTAGE_DIR`, `TOPIC`, `STORYBOARD`, `BEAT_SCHEDULE`, and the overlay caption text/positions. (Output filenames default to an `extrack-` prefix from the templates' home repo — patch the `OUT_*` constants to the current brand.)
5. **Preview** the overlay beats (`preview-footage-template.mjs`) on a dark bg to check copy + sizing + safe zone before the slow encode.
6. **Build**, then sample 6–10 frames across the timeline at shot boundaries and caption beats (vertical AND square) and eyeball: subject in frame, captions land on the right words, no flicker, brand colors only.
7. **Iterate** copy / timing / crop offset and re-run. Use `SKIP_OVERLAY=1` to reuse rendered overlay frames when only the ffmpeg stage changed.

## Tunable knobs (top of the build template)

- `SILENCE_THRESH_DB` / `SILENCE_MIN_DUR` / `KEEP_PAD` — stammer-cleanup aggressiveness vs natural breathing room.
- `DENOISE_FILTER` — `afftdn` strength (raise `nr` for hissier rooms).
- `SQUARE_Y_OFFSET` — vertical position of the square crop window (face framing).
- `STORYBOARD[].useFrom / useDur` — per-shot in-point and length.
- `BEAT_SCHEDULE` — caption timing, shot-anchored.
- `SKIP_OVERLAY=1`, `SQUARE_ONLY=1` env flags for faster iteration.

## Whisper setup (transcription)

```bash
# macOS install (binary: whisper-cli)
brew install whisper-cpp

# model
curl -sL https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o ~/.cache/whisper/ggml-base.bin

# transcribe a shot (whisper wants 16kHz mono WAV; -l = language, e.g. hi)
ffmpeg -i shot.m4a -ar 16000 -ac 1 s.wav && whisper-cli -m ~/.cache/whisper/ggml-base.bin -f s.wav -l hi
```

## Templates

- `build-from-footage-template.mjs` — the full stitch pipeline: per-shot silence-cut + denoise + lip-sync-safe trim, concat, shot-anchored caption keyframe injection, dual vertical/square overlay composite. Patch `RAW_FOOTAGE_DIR`, `TOPIC`, `STORYBOARD`, `BEAT_SCHEDULE`.
- `footage-overlay-template.html` — transparent caption-pill overlay with `body.vertical` (captions top) / `body.square` (captions bottom) layouts, brand-warm cream/amber pills, price tile, end card. Build-time `@keyframes` are injected by the build script, so author only positions + copy here.
- `preview-footage-template.mjs` — beat-midpoint screenshots of the overlay on a dark bg for copy/sizing review before encode.

Copy these into the project's `marketing/showcase/` (or equivalent ad-creative dir) and rename per topic (e.g. `showcase-<topic>-overlay.html`, `build-<topic>-reel.mjs`).
