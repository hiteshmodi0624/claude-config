---
name: backlog-drain
description: "Backlog-to-merged drain loop over parallel builder agents. Use when a detailed ticket backlog must be implemented as fast as safely possible, or when the user says 'drain the backlog', 'build the tickets in parallel', 'run the next wave', 'implement the backlog', 'fan out builders'. Not for an undetailed backlog — run backlog-detail first."
---

# backlog-drain

## Overview

Phase 2 of the detail → drain → verify loop: turn detailed tickets into merged, gate-green code in rounds until no buildable ticket remains. **Parallel within a wave, serial across the merge** — builders fan out in isolated worktrees; one mind (you) owns every merge and runs the real gate.

**REQUIRED SUB-SKILL: orchestrating-parallel-agents** is the engine — round checklist, `pipeline(build, review)` workflow (workflow-pipeline.md), builder/reviewer prompt templates (builder-and-reviewer-prompts.md), serial-merge + conflict + gate playbook with HEAD-drift recovery (merge-gate-and-recovery.md), and the model/effort sizing table. Load it and follow it exactly; this skill adds only the backlog-loop contract.

Runs after backlog-detail (Phase 1). Wrapped by backlog-verify-loop (the outer loop).

## When to use

- A set of detailed, independent tickets touching different files, and speed matters — you want the widest safe parallelism.

**Do NOT use** for one tightly-coupled change (single thread), tickets that share files (serialize those), or an undetailed backlog (backlog-detail first — vague tickets burn builder runs on unmade decisions).

## The drain loop (rounds until drained)

Each round executes the engine's round checklist. The drain contract on top:

1. **Verify-not-done before any dispatch.** One grep/ls against the base branch per candidate; already shipped → retire with the proving SHA, dispatch nothing. WHY: roughly 1 in 3 backlog items is already shipped — each stale dispatch burns a whole agent run.
2. **Partition into a conflict-free wave.** If the repo has board tooling, use it (e.g. `yarn board:waves` prints tickets with satisfied dependencies and non-colliding touched paths); otherwise hand-partition by disjoint file footprints. Width = the wave's disjoint count, never the backlog size. A phased chain contributes only its ONE unblocked head this round.
3. **Build + review through the engine's pipeline.** Nothing merges inside the workflow — it returns verified branches.
4. **You merge serially, then run the FULL gate** (build + test + lint) once after ALL the round's merges — cross-package breaks only surface on the integrated state. Paste real output; fix forward.
5. **Bookkeep — the round is not over until:**
   - every merged ticket is retired with its proving merge SHA (via board tooling if present, e.g. set status then `yarn board:merge <id>`);
   - every deferred slice has a filed follow-up ticket — no buried work;
   - YOUR worktrees/branches are pruned, and HEAD/base re-checked for drift.
6. **Next round.** Just-merged chain heads are now unblocked — recompute the wave. Drained = no buildable ticket remains, not "this round finished".

## Drain-specific mistakes

| Mistake                                      | Reality                                                        |
| -------------------------------------------- | -------------------------------------------------------------- |
| "All tickets in parallel"                    | Width = the wave's disjoint count, not the backlog size        |
| Drain undetailed tickets                     | Builders stall on unmade decisions; run backlog-detail first   |
| Stop after one round                         | Merges unblock chain heads; drained = no buildable ticket left |
| Retire without the proving SHA, bury a slice | The board rots stale — the exact drift step 1 exists to catch  |

Build/merge mistakes (stale-base dispatch, same-file streams, in-workflow merges, per-branch gating, unreviewed merges, chained phases) are owned by orchestrating-parallel-agents — read its table too.
