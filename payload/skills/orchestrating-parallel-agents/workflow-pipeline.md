# The Workflow Pipeline (default execution mechanism)

Build + review run inside ONE `Workflow` call using `pipeline()`. The orchestrator (you, main thread)
merges the verified branches afterward. This file is the script skeleton + the harvest/merge contract.

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

Pass the real builder/reviewer prompt strings from `builder-and-reviewer-prompts.md`. Keep `meta` a
pure literal. `agentType: 'general-purpose'` + `model: 'opus'` for reviewers.

```js
export const meta = {
  name: "backlog-drain-round1",
  description:
    "Build + review disjoint backlog tickets in a no-barrier pipeline",
  phases: [{ title: "Build" }, { title: "Review" }],
};

// VERDICT_SCHEMA forces the reviewer to return structured JSON (no parsing).
const VERDICT_SCHEMA = {
  type: "object",
  required: ["verdict", "branch"],
  properties: {
    verdict: {
      type: "string",
      enum: ["MERGE-AS-IS", "MERGE-WITH-NITS", "NEEDS-FIX"],
    },
    branch: { type: "string" },
    blocking: { type: "array", items: { type: "string" } }, // file:line — problem — fix
    notes: { type: "string" },
  },
  additionalProperties: false,
};

// Each ticket: { slug, builderPrompt, reviewerPrompt }. builderPrompt/reviewerPrompt are the filled
// templates from builder-and-reviewer-prompts.md (base SHA, scope, touch-only files all baked in).
const TICKETS = args; // pass the round's ticket objects in via Workflow's `args`

const results = await pipeline(
  TICKETS,
  // STAGE 1 — build. Worktree-isolated; builder writes code+tests+commits, runs nothing.
  (t) =>
    agent(t.builderPrompt, {
      label: `build:${t.slug}`,
      phase: "Build",
      isolation: "worktree",
      model: t.model ?? "opus", // sonnet for small one-area; opus for cross-package/design
    }).then((report) => ({
      slug: t.slug,
      report,
      reviewerPrompt: t.reviewerPrompt,
    })),

  // STAGE 2 — review. Fires the MOMENT this item's build lands (not after all builds).
  (built) => {
    if (!built) return null; // builder died/skipped → drop
    return agent(built.reviewerPrompt, {
      label: `review:${built.slug}`,
      phase: "Review",
      agentType: "general-purpose",
      model: "opus",
      schema: VERDICT_SCHEMA,
    }).then((verdict) => ({
      slug: built.slug,
      builderReport: built.report,
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
   `git rev-parse <base>` each time). Union the `package.json` test-script conflict (`--ours` + append
   the branch's new entries; never `--theirs` whole).
2. A `NEEDS-FIX` with deep findings → re-queue as a builder next round (don't merge).
3. After all merges this round: full `build && test && lint` gate; fix forward to green; commit the
   fix as one `fix(gate)` commit.
4. Bookkeep, then start the next round (chain heads that merged are now unblocked).

## Watching + resuming

- Watch live with `/workflows`; the tool returns a `runId` (`wf_…`) and notifies on completion.
- It also persists the script to a file under the session dir + returns the path. Iterate by editing
  that file and re-invoking with `{scriptPath}`; resume a stopped/edited run with
  `{scriptPath, resumeFromRunId}` (unchanged `agent()` calls return cached, only new/edited re-run).

## Sizing

- Width per round = the number of truly **disjoint** tickets available (one head per phased chain +
  standalones). If that's 2, run 2 — do not pad with colliding tickets.
- `parallel(thunks)` is the BARRIER variant — use it only when a stage genuinely needs ALL prior
  results at once (e.g. dedupe across every finding before an expensive step). Default is `pipeline`.
