---
name: orchestrating-parallel-agents
description: Use when asked to run multiple coding subagents in parallel, drain a backlog or ticket board, parallelize independent features across git worktrees, run the "next wave", spin up builders, or coordinate builder+reviewer agents that must not conflict. Triggers include "orchestrate", "parallel agents", "multi-agent", "fan out", "drain the backlog", "run agents in parallel".
---

# Orchestrating Parallel Agents

## Overview

You are the orchestrator, not a builder. You decompose independent work into conflict-free streams,
then **drive build + review through a `Workflow` pipeline** (subagents in isolated git worktrees), and
**you** merge the verified branches serially and run the real gate. Builders write code; you guarantee
quality and integration.

**Core principle: parallelism is only safe when the streams are truly independent and one mind owns
the merge.** Independence is designed up front (disjoint files); the merge is serialized through you.

**Default execution = the Workflow tool's `pipeline()`** (not hand-fanned `Agent` calls). `pipeline`
flows each ticket build → review **independently with no barrier**: the instant one builder lands its
reviewer fires, while siblings are still building, and a freed slot pulls the next queued ticket
automatically. This is the behavior you want. Hand-dispatched `Agent` calls are the fallback only for
a 1–2 ticket round where a workflow is overkill. See `workflow-pipeline.md` for the script.

**The one thing that stays outside the workflow: the merge.** `pipeline` runs stages concurrently
across items, but `git merge` onto the shared branch is a serial resource — two concurrent merges
race and corrupt it. So the workflow does **build + review only** and returns the verified branches;
**you merge them serially in the main thread**, then run the gate. Build/review parallel, merge serial.

## When to use

- User asks to parallelize tickets / features / a backlog across many agents.
- Several independent units of work exist that touch _different_ files.
- A "wave"/"batch" of work where speed matters more than a single linear thread.

**Do NOT use when:** the work is one tightly-coupled change (use a single thread or a plan), the
tasks share the same files (serialize instead), or the request is a quick one-file edit.

## The loop (run in ROUNDS until the disjoint backlog is drained)

Each round:

1. **Triage + verify-not-done.** List candidate work. **Before dispatching ANY builder, grep the
   target branch to confirm the work isn't already shipped** — backlogs drift stale. One
   `grep`/`ls` per candidate. Already-done items: move to merged with the proving SHA, move on. This
   single check routinely saves whole agent runs.
2. **Partition for zero conflict.** Pick tickets whose file footprints are **disjoint**. Run at most
   ONE stream per hot shared area (e.g. one web-heavy ticket, one in a given package). A **phased
   chain** (p1→p2→…) contributes only its ONE current unblocked head this round — the rest waits for
   that head to merge; the _next_ round advances it. Different chains + standalones run in parallel.
   Note the known-good base SHA now. Identify areas another session owns and avoid them. If fewer
   disjoint tickets exist than your width, **that is the ceiling** — idle slots beat colliding ones.
3. **Author + run the Workflow pipeline** (`workflow-pipeline.md`): `pipeline(tickets, build, review)`
   — each builder in an `isolation: 'worktree'` subagent carrying the `builder-and-reviewer-prompts.md`
   non-negotiables; each reviewer (Opus, `schema`-structured verdict) fires the instant its build
   lands. The workflow returns the verified branches (filter out `NEEDS-FIX`). Builders commit to
   their own branch; **nothing merges inside the workflow.**
4. **Merge serially + gate.** YOU merge each verified branch one at a time onto the **current** tip
   (re-read `git rev-parse <base>` each time — it may have moved). Apply any tiny review fix in the
   branch worktree first; a deep `NEEDS-FIX` goes back to a builder next round. Resolve the recurring
   conflicts (see `merge-gate-and-recovery.md`). After ALL merges this round, run the FULL
   build+test+lint gate — cross-package breaks only surface here. Paste real output; fix forward.
5. **Bookkeeping.** Move merged tickets to merged/ with the proving SHA, split any deferred slice into
   its own follow-up ticket (no buried work), refresh the board/counts, prune YOUR merged worktrees +
   branches. Re-check HEAD/base.
6. **Next round.** Re-scout: chain heads that just merged are now unblocked. Repeat until no buildable
   disjoint ticket remains.

## Hard safety rules (non-negotiable)

These are learned from real failures. Violating the letter is violating the spirit.

- **Worktree builders self-verify their OWN package before reporting "done."** Deps are not installed
  in the worktree; instead the builder runs `bash scripts/verify-worktree.sh <their-pkg>`, which
  symlinks the main checkout's `node_modules` and runs a scoped `turbo run build test --filter=<pkg>`.
  It MUST exit 0 before the builder reports done. **Never `yarn install`** in a worktree (it truncates
  the run mid-investigation). Have them `git commit --allow-empty` first so the branch exists, then
  commit after every file. This catches same-package breakage in-loop; CROSS-package breaks still
  surface only at the full gate (below), so the final gate stays mandatory.
- **Re-check HEAD after every worktree cleanup.** Worktree auto-clean can silently move the primary
  checkout's HEAD onto an agent branch, and a stray reset can move the base ref _backward_. After
  each harvest: check `git rev-parse --abbrev-ref HEAD` AND the base ref; if drifted, `git checkout
  <base>` and `git reset --hard <known-good-SHA>`. Note the known-good SHA before you start.
- **Merges live in the main thread, never in the workflow.** `pipeline` stages run concurrently across
  items; a `git merge` stage would fire for several branches at once and race the shared branch. The
  workflow returns verified branches; you merge them serially yourself.
- **Serialize merges.** Only you merge, one at a time. Never merge while another session merges.
- **Never reset the base branch backward.** Another session may push the base forward between your
  merges — fine; merge onto the current tip. If the base moved _backward_ unexpectedly, STOP →
  `git reflog <base>` → reset to the real tip. If a backward reset is blocked (harness/auto-mode),
  **merge forward** instead — the superseded partial commits become harmless ancestors.
- **Opus reviews before every merge.** Builders self-report "done" optimistically; trust the review —
  and the gate, not the builder.
- **Run the full gate after all merges, not per-branch.** A required field added to a shared type
  breaks sibling fixtures invisibly until the whole graph compiles.
- **Verify each ticket against the base before dispatch** (phase 1). Stale backlogs waste agents.

## Ticket sizing (keep the leash short)

- One agent = one **disjoint package** (or a small file-set within one package) — small enough that
  `verify-worktree.sh <pkg>` is a meaningful proof of done.
- Prefer **≤3–4 truly-disjoint streams** over 6 colliding ones. Idle slots beat merge conflicts.
- A ticket whose footprint spans many packages is too big — split it before dispatch.

## Quick reference

**Model / effort per stream:**

| Stream                                                                                            | Model                                              |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Small, well-scoped, one area (config setter, button, copy)                                        | sonnet                                             |
| Complex / cross-package / heavy investigation (new pkg, typed error across layers, store cascade) | opus (sonnet truncates in the investigation phase) |
| Design-critical UI (landing, showcase surface)                                                    | opus                                               |
| Every reviewer                                                                                    | **opus** (mandatory)                               |

**Recurring merge conflict — stale-base `package.json` test-script (or any append-only manifest):**
take `--ours` (base's full list) then append the branch's NEW entry. Never take `--theirs` whole —
it silently drops entries the base added since the branch forked (silent test loss). Detail +
recovery in `merge-gate-and-recovery.md`.

## Common mistakes

| Mistake                                            | Reality                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dispatch builders before grepping the base         | 1-in-3 backlog items are already shipped; you burn a full run finding out         |
| Two concurrent streams in the same file/package    | Merge conflicts + lost work; partition by disjoint files instead                  |
| Run `yarn install` in a worktree to "verify"       | No — it truncates the run; use `scripts/verify-worktree.sh <pkg>` (symlinks deps) |
| Skip `verify-worktree.sh` and report "done"        | Same-package breaks then reach the gate; run it, see exit 0 first                 |
| Trust the builder's "all green" as cross-package   | Scoped verify proves SAME-package only; cross-package truth is still the gate     |
| Gate per-branch, skip the final full run           | Cross-package breaks hide until the whole graph builds                            |
| Merge an unreviewed branch because it "looks fine" | The Opus review is the quality bar the user asked for                             |
| Forget to re-check HEAD/base after cleanup         | Silent HEAD-hijack / base-ref-rewind orphans a whole batch                        |
| Put `git merge` inside a `pipeline` stage          | Stages run concurrently → two merges race the branch; merge in main thread        |
| Force a full batch width when only 2 are disjoint  | Idle slots beat colliding builders; the disjoint count IS the ceiling             |
| Parallelize phases of one chain                    | Phase N+1 needs N merged; run one head/round, advance next round                  |

## Reference files

- `workflow-pipeline.md` — the `Workflow` `pipeline(tickets, build, review)` script skeleton (the
  default execution mechanism) + how to harvest verified branches for the serial merge.
- `builder-and-reviewer-prompts.md` — copy-paste builder + Opus-reviewer prompt templates with the
  non-negotiables baked in (these are the strings you pass to `agent()` inside the pipeline).
- `merge-gate-and-recovery.md` — serial-merge + conflict-resolution + full-gate playbook, and the
  HEAD-hijack / base-rewind recovery commands.

## Provenance

Distilled from real orchestration runs (Workflow `pipeline` build → Opus review → serial-merge → full
gate), not abstract theory. The pipeline mechanism replaced hand-fanned `Agent` waves once it proved
the no-barrier review + auto-queue behavior; serial merge stayed in the main thread because concurrent
`git merge` races. Per Anthropic's skill guidance, iterate by observing real agent behavior: when a
round surfaces a new failure mode, add the explicit counter here.
