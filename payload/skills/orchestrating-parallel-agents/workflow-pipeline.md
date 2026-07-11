# The Workflow Pipeline (default execution mechanism)

Build + review run inside ONE `Workflow` call using `pipeline()`. The orchestrator (you, main thread)
merges the verified branches afterward. This file is the script skeleton + the harvest/merge contract.

## Contents

- Why `pipeline` (not hand-fanned `Agent` calls)
- The hard boundary: NO merge inside the workflow
- Script skeleton (with builder-report + verdict schemas)
- Harvest + merge (main thread)
- Watching + resuming
- Sizing / `parallel()` vs `pipeline()`

## Why `pipeline` (not hand-fanned `Agent` calls)

`pipeline(items, stageA, stageB)` flows each item through the stages **independently — no barrier**:
the instant item A finishes `build` its `review` starts, while item B is still building, and the
concurrency cap (`min(16, cores-2)`) auto-queues the rest so a freed slot pulls the next ticket. That
is exactly the "don't wait for siblings; pick up the next when a slot frees" behavior. Hand-dispatched
`Agent` calls only make sense for a 1–2 ticket round where authoring a script is overkill.

## The hard boundary: NO merge inside the workflow

`pipeline` runs stages concurrently across items. `git merge` onto the shared base is a serial
resource — a merge stage would fire for several branches at once and corrupt the branch. So the
workflow does **build + review only** and RETURNS the verified branches. You merge them serially in
the main thread (see `merge-gate-and-recovery.md`), then run the full gate.

## Script skeleton

Pass the real builder/reviewer prompt strings from `builder-and-reviewer-prompts.md`, pre-filled
with base SHA, scope, and touch-only files. Keep `meta` a pure literal (no computed values).

```js
export const meta = {
  name: "parallel-build-round1",
  description:
    "Build + review disjoint backlog tickets in a no-barrier pipeline",
  phases: [{ title: "Build" }, { title: "Review" }],
};

// Tier aliases — set once per session to the tiers actually available.
// Never hardcode dated model ids in a reusable script.
const STRONGEST = "opus"; // strongest tier: reviewers + complex/cross-package builds
const MID = "sonnet"; // mid tier: small, well-scoped one-area builds

// BUILD_REPORT_SCHEMA forces the builder to return structured facts —
// the orchestrator programmatically builds the merge gate from these.
const BUILD_REPORT_SCHEMA = {
  type: "object",
  required: [
    "branch",
    "files",
    "phasesDone",
    "phasesRemaining",
    "testsRegistered",
    "envVars",
    "crossPackageRisks",
    "selfVerify",
  ],
  properties: {
    branch: { type: "string" },
    files: { type: "array", items: { type: "string" } }, // exact files added/changed
    phasesDone: { type: "array", items: { type: "string" } },
    phasesRemaining: { type: "array", items: { type: "string" } },
    // "test file → which manifest test-script it was registered in"
    testsRegistered: { type: "array", items: { type: "string" } },
    envVars: { type: "array", items: { type: "string" } }, // new env vars, if any
    // shared types/barrels/enums consumed elsewhere — what the gate must watch
    crossPackageRisks: { type: "array", items: { type: "string" } },
    selfVerify: { type: "string", enum: ["green", "could-not-self-verify"] },
  },
  additionalProperties: false,
};

// VERDICT_SCHEMA forces the reviewer to return a closed verdict (no parsing).
const VERDICT_SCHEMA = {
  type: "object",
  required: ["verdict", "branch"],
  properties: {
    verdict: {
      type: "string",
      enum: ["MERGE-AS-IS", "MERGE-WITH-NITS", "NEEDS-FIX"],
    },
    branch: { type: "string" },
    blocking: { type: "array", items: { type: "string" } }, // "file:line — problem — fix"
    notes: { type: "string" },
  },
  additionalProperties: false,
};

// Each ticket: { slug, builderPrompt, reviewerPrompt, model? } — filled templates
// from builder-and-reviewer-prompts.md, passed in via Workflow's `args`.
const TICKETS = args;

const results = await pipeline(
  TICKETS,
  // STAGE 1 — build. Worktree-isolated; builder writes code+tests+commits, never merges.
  (t) =>
    agent(t.builderPrompt, {
      label: `build:${t.slug}`,
      phase: "Build",
      isolation: "worktree",
      model: t.model ?? STRONGEST, // MID for small one-area tickets
      schema: BUILD_REPORT_SCHEMA,
    }).then((report) => ({
      slug: t.slug,
      report,
      reviewerPrompt: t.reviewerPrompt,
    })),

  // STAGE 2 — review. Fires the MOMENT this item's build lands (not after all builds).
  // REDACTION: reviewerPrompt is pre-filled from the ticket/spec ONLY. Never interpolate
  // built.report into it — a reviewer fed the builder's self-assessment rubber-stamps.
  (built) => {
    if (!built) return null; // builder died/skipped → drop
    return agent(built.reviewerPrompt, {
      label: `review:${built.slug}`,
      phase: "Review",
      agentType: "general-purpose",
      model: STRONGEST,
      schema: VERDICT_SCHEMA,
    }).then((verdict) => ({
      slug: built.slug,
      builderReport: built.report, // for YOUR gate-planning — not shown to the reviewer
      verdict,
    }));
  },
);

// Hand the orchestrator everything it needs to merge serially.
return results.filter(Boolean);
```

## Harvest + merge (main thread, after the workflow returns)

The `<task-notification>` returns the array. Then, NOT in the workflow:

1. For each result with `verdict.verdict !== 'NEEDS-FIX'`: apply any 1-line `verdict.blocking` fix in
   that branch's worktree, then `git merge --no-ff <branch>` onto the **current** base tip (re-read
   `git rev-parse <base>` each time). Union any append-only-manifest conflict (`--ours` + append the
   branch's new entries; never `--theirs` whole — see `merge-gate-and-recovery.md`).
2. A `NEEDS-FIX` with deep findings → re-queue as a builder next round (don't merge).
3. Use each `builderReport` to plan the gate: `crossPackageRisks` predicts what the full run will
   break; `selfVerify: "could-not-self-verify"` means the gate is that branch's ONLY proof;
   non-empty `phasesRemaining` → file a follow-up ticket before retiring.
4. After all merges this round: full `build && test && lint` gate; fix forward to green; commit the
   fix as one `fix(gate)` commit.
5. Bookkeep, then start the next round (chain heads that merged are now unblocked).

## Watching + resuming

- Watch live with `/workflows`; the tool returns a `runId` (`wf_…`) and notifies on completion.
- It also persists the script to a file under the session dir + returns the path. Iterate by editing
  that file and re-invoking with `{scriptPath}`; resume a stopped/edited run with
  `{scriptPath, resumeFromRunId}` (unchanged `agent()` calls return cached, only new/edited re-run).

## Sizing / `parallel()` vs `pipeline()`

- Width per round = the number of truly **disjoint** tickets available (one head per phased chain +
  standalones). If that's 2, run 2 — do not pad with colliding tickets.
- `parallel(thunks)` is the BARRIER variant — use it only when a stage genuinely needs ALL prior
  results at once (e.g. dedupe across every finding before an expensive step). Default is `pipeline`.
