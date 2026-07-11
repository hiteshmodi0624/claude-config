---
name: orchestrating-parallel-agents
description: "Multi-agent build orchestration across git worktrees. Use when running multiple coding subagents in parallel, parallelizing independent tickets or features, coordinating builder+reviewer agents that must not conflict, or when the user says 'orchestrate', 'parallel agents', 'multi-agent', 'fan out', 'run the next wave', 'spin up builders', 'drain the backlog'. Not for one tightly-coupled change or a quick edit — use a single thread."
---

# Orchestrating Parallel Agents

## Overview

You are the orchestrator, not a builder. Decompose independent work into conflict-free streams, drive build + review through a `Workflow` `pipeline()` (builders in isolated git worktrees), then merge the verified branches serially yourself and run the real gate. **Parallelism is only safe when the streams are truly independent and one mind owns the merge** — independence is designed up front (disjoint files); the merge is serialized through you.

Default execution is the Workflow tool's `pipeline()`, not hand-fanned `Agent` calls: `pipeline` flows each ticket build → review with **no barrier** — the instant one builder lands, its reviewer fires while siblings are still building, and a freed slot pulls the next queued ticket automatically. Hand-dispatched `Agent` calls are the fallback only for a 1–2 ticket round where a workflow is overkill. The one thing that stays **outside** the workflow is the merge: pipeline stages run concurrently across items, and `git merge` onto the shared branch is a serial resource — two concurrent merges race and corrupt it. The workflow does build + review only and returns the verified branches; you merge them serially in the main thread, then gate.

## When to parallelize (decide BEFORE spawning anything)

| Signal                                                        | Verdict                                                                                                              |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Several independent tickets touching different files/packages | Parallelize — this skill                                                                                             |
| A wave/batch of divisible work where speed matters            | Parallelize — this skill                                                                                             |
| Tasks share files or one hot package                          | Serialize — one stream per hot area                                                                                  |
| One tightly-coupled change, however large                     | Single thread + plan; do not fan out                                                                                 |
| Quick one-file edit                                           | Just do it inline                                                                                                    |
| Work not clearly divisible, or low value                      | Single thread — multi-agent burns roughly 15× the tokens of one session; only fan out when the split pays for itself |

## The loop (run in ROUNDS until the disjoint backlog is drained)

Copy this checklist at the start of every round and tick it off:

```
Round N — base: <branch> @ <known-good SHA>
[ ] 1. Triage + verify-not-done: one grep/ls against the base branch PER candidate
       before dispatching any builder. Already shipped → retire with the proving SHA.
[ ] 2. Partition zero-conflict: pick tickets with disjoint file footprints; max ONE
       stream per hot shared area; a phased chain contributes only its ONE unblocked
       head this round. Note the known-good base SHA. Skip areas another session owns.
[ ] 3. Run the Workflow pipeline (workflow-pipeline.md) with prompts from
       builder-and-reviewer-prompts.md. Builders isolation:'worktree'; reviewers
       strongest tier with a schema verdict. Nothing merges inside the workflow.
[ ] 4. Merge serially + gate (merge-gate-and-recovery.md): one verified branch at a
       time onto the CURRENT tip, then the FULL build+test+lint gate. Paste real output.
[ ] 5. Bookkeep: retire merged tickets with the proving SHA; file follow-up tickets for
       deferred slices (no buried work); prune YOUR worktrees/branches; re-check HEAD/base.
[ ] 6. Next round: chain heads that just merged are now unblocked. Repeat until drained.
```

Step notes:

- **Step 1** — backlogs drift stale: roughly 1 in 3 candidates is already shipped. This one check routinely saves whole agent runs.
- **Step 2** — if fewer disjoint tickets exist than your desired width, that count IS the ceiling. Idle slots beat colliding builders.
- **Step 4** — re-read `git rev-parse <base>` before each merge (another session may have moved it). A 1-line review fix → apply in the branch worktree first; a deep NEEDS-FIX goes back to a builder next round.

## Hard safety rules (each learned from a real failure)

- **Builders self-verify their OWN package before reporting done.** Worktrees have no deps installed. If the repo has a worktree-verify script (check `scripts/`, e.g. `scripts/verify-worktree.sh <pkg>`), the builder runs it and must see exit 0; if none exists, create one from the recipe in builder-and-reviewer-prompts.md; if that's impossible, the builder must report `could-not-self-verify` and the merge gate is the only proof. WHY: unverified "done" reports push same-package breakage into your gate.
- **Never run a full dependency install (e.g. `yarn install`) in a worktree.** WHY: it truncates the agent's run mid-investigation — the verify script symlinks the main checkout's deps instead.
- **Builders commit early and often:** `git commit --allow-empty` first so the branch exists, then commit after every file. WHY: truncation before the first real commit loses everything.
- **Merges live in the main thread, never in the workflow.** WHY: pipeline stages fire concurrently — a merge stage races the shared branch for several items at once.
- **Serialize merges.** Only you merge, one at a time, never while another session merges. WHY: concurrent merges corrupt the shared branch.
- **Re-check HEAD and the base ref after every worktree cleanup.** WHY: worktree auto-clean can silently move the primary checkout's HEAD onto an agent branch, and a stray reset can move the base ref backward — either orphans a whole batch. Recovery commands in merge-gate-and-recovery.md.
- **Never reset the base branch backward.** Base pushed forward by another session is fine — merge onto the current tip. Base moved BACKWARD is an incident: STOP → `git reflog <base>` → reset to the real tip. If a backward reset is blocked (harness/auto-mode), merge forward — superseded partial commits become harmless ancestors.
- **Strongest-tier review before every merge.** WHY: builders self-report "done" optimistically; trust the review and the gate, never the builder's narrative.
- **Run the full gate after ALL merges, not per branch.** WHY: a field made required on a shared type breaks sibling fixtures invisibly until the whole graph compiles.

## Sizing & effort scaling

- One builder = one **disjoint package** (or a small file-set within one package) — small enough that a scoped verify is meaningful proof of done. A ticket whose footprint spans many packages is too big: split it before dispatch.
- A few genuinely disjoint streams beat many colliding ones (3–4 disjoint > 6 colliding). The disjoint count is the width — never pad it.
- Scale investment to the task, not the round (multi-agent research rule of thumb: simple lookup ≈ 1 agent / 3–10 tool calls; comparison ≈ 2–4 agents / 10–15 calls each; only genuinely complex work justifies 10+ agents):

| Stream                                                     | Tier / effort                                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Small, well-scoped, one area (config setter, button, copy) | Mid tier (e.g. Sonnet), low–medium effort                                                     |
| Complex / cross-package / heavy investigation              | Strongest tier (e.g. Opus), high effort — mid-tier models truncate in the investigation phase |
| Design-critical UI (landing, showcase surface)             | Strongest tier                                                                                |
| Every reviewer                                             | **Strongest tier — mandatory**                                                                |

Never hardcode dated model ids; pick tiers per session.

## Quick reference

**Recurring merge conflict — a stale-base append-only manifest** (a package manifest's test-script list, a barrel file, a registry): take `--ours` (the base's full list) then append the branch's NEW entry. Never take `--theirs` whole — it silently drops entries the base added since the branch forked (silent test loss). Commands in merge-gate-and-recovery.md.

## Common mistakes

| Mistake                                                | Reality                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Dispatch builders before grepping the base             | ~1-in-3 backlog items are already shipped; you burn a full run finding out   |
| Two concurrent streams in the same file/package        | Merge conflicts + lost work; partition by disjoint files instead             |
| Full dependency install in a worktree to "verify"      | It truncates the run; the verify script symlinks the main checkout's deps    |
| Skip the scoped verify and report "done"               | Same-package breaks then reach the gate; run it, see exit 0 first            |
| Trust the builder's "all green" as cross-package truth | Scoped verify proves SAME-package only; cross-package truth is the full gate |
| Gate per-branch, skip the final full run               | Cross-package breaks hide until the whole graph builds                       |
| Merge an unreviewed branch because it "looks fine"     | The strongest-tier review is the quality bar; no review, no merge            |
| Feed the builder's report to its reviewer              | Reviewers fed the builder's self-assessment rubber-stamp; redact it          |
| Forget the HEAD/base re-check after cleanup            | Silent HEAD-hijack / base-rewind orphans a whole batch                       |
| Put `git merge` inside a `pipeline` stage              | Stages run concurrently → merges race the branch; merge in the main thread   |
| Force full batch width when only 2 are disjoint        | Idle slots beat colliding builders; the disjoint count IS the ceiling        |
| Parallelize phases of one chain                        | Phase N+1 needs N merged; run one head per round, advance next round         |

## Reference files

- `workflow-pipeline.md` — the `pipeline(tickets, build, review)` script skeleton (default execution mechanism), builder-report + verdict schemas, harvest contract, watch/resume.
- `builder-and-reviewer-prompts.md` — copy-paste builder + reviewer prompt templates with the non-negotiables baked in, the worktree-verify script recipe, and the resume/salvage flow.
- `merge-gate-and-recovery.md` — serial merge, manifest-conflict resolution, full gate, cross-package break fix, HEAD-hijack / base-rewind recovery, cleanup.

## Provenance

Distilled from real orchestration runs, not theory. The pipeline mechanism replaced hand-fanned `Agent` waves once it proved the no-barrier review + auto-queue behavior; the merge stayed in the main thread because concurrent `git merge` races. When a round surfaces a new failure mode, add the explicit counter here.
