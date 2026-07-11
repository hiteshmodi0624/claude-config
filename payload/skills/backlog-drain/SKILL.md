---
name: backlog-drain
description: Use when implementing many backlog tickets/features across parallel agents as fast as safely possible - partitioning into conflict-free waves, building + Opus-reviewing each in an isolated worktree, then merging serially and running the full gate. Triggers - "drain the backlog", "build the tickets in parallel", "run the next wave", "implement the backlog", "fan out builders".
---

# backlog-drain

## Overview

Phase 2 of the detail → drain → verify loop: turn detailed tickets into merged, gate-green code.
**Core principle: parallel within a wave, serial across the merge.** Builders run concurrently in
isolated worktrees; **one mind (you) owns the merge** onto the shared branch and runs the real gate.

**REQUIRED SUB-SKILL:** this skill is the _driver_; the mechanics (the Workflow `pipeline(build,
review)` script, builder/reviewer prompt templates, serial-merge + conflict + gate playbook, HEAD-drift
recovery) live in **orchestrating-parallel-agents** — load it and follow it exactly. This file adds the
backlog-loop framing on top.

Runs after [[backlog-detail]] (Phase 1). Wrapped by [[backlog-verify-loop]] (the outer loop).

## When to use

- A set of detailed, independent tickets touching _different_ files, and speed matters.
- You want the widest safe parallelism, not one linear thread.

**Do NOT use** for one tightly-coupled change (single thread), tickets that share the same files
(serialize them), or an undetailed backlog (run [[backlog-detail]] first).

## Procedure (rounds until drained)

1. **Verify-not-done + partition.** `yarn board:waves` (or hand-partition by disjoint file footprints).
   **Grep the base to confirm each ticket isn't already shipped** — stale backlogs waste whole agent
   runs. Width per round = the wave's truly disjoint tickets; **one stream per hot shared area**. A
   phased chain contributes only its ONE current head this round.
2. **Run the build+review pipeline** (from orchestrating-parallel-agents): each builder in an
   `isolation:'worktree'` subagent carrying that skill's builder template (self-verify via the repo's
   worktree-verify script, commit after every file, touch ONLY in-scope files, obey the repo's
   CLAUDE.md/AGENTS.md); each reviewer **opus**, structured verdict, fires the instant its build lands.
   **No merge inside the workflow** — it returns the verified branches.
3. **Merge serially + gate.** YOU merge each non-`NEEDS-FIX` branch one at a time onto the _current_
   base tip (re-read it each time); union the append-only-manifest conflict (`--ours` + append the
   branch's new entry, never `--theirs` whole). After ALL merges this round, run the FULL
   `build && test && lint` gate — cross-package breaks only surface here. Paste real output; fix forward.
4. **Bookkeep.** Retire merged tickets with the proving SHA, file follow-ups for any deferred slice
   (no buried work), refresh the board, prune YOUR worktrees/branches, re-check HEAD/base didn't drift.
5. **Next round.** Chain heads that just merged are now unblocked. Repeat until no buildable ticket remains.

## Model / effort

| Stream                                                   | Model                                         |
| -------------------------------------------------------- | --------------------------------------------- |
| Small, one area (config/button/copy)                     | sonnet                                        |
| Cross-package / heavy investigation / design-critical UI | **opus** (sonnet truncates mid-investigation) |
| **Every reviewer**                                       | **opus** (mandatory, before every merge)      |

## Common mistakes

| Mistake                              | Reality                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| "All tickets in parallel"            | Only _disjoint_ tickets — width = the wave, not the backlog size             |
| Dispatch before grepping base        | ~1-in-3 backlog items already shipped; you burn a full run finding out       |
| Two streams in the same file/package | Merge corruption + lost work; partition by disjoint files                    |
| `git merge` inside the workflow      | Stages run concurrently → merges race the branch; merge in main thread       |
| Gate per-branch, skip the full run   | Cross-package breaks hide until the whole graph compiles                     |
| Merge an unreviewed branch           | The Opus review is the quality bar; trust the review + gate, not the builder |
| Parallelize phases of one chain      | Phase N+1 needs N merged; one head/round, advance next round                 |
