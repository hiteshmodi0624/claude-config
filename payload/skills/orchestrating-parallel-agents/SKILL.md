---
name: orchestrating-parallel-agents
description: "Multi-agent build orchestration across git worktrees, and the round loop that drains a ticket backlog to merged. Use when running coding subagents in parallel, parallelizing independent tickets, coordinating builder+reviewer agents that must not conflict, or when the user says 'orchestrate', 'parallel agents', 'fan out', 'spin up builders', 'drain the backlog', 'implement the backlog', 'build the tickets in parallel', 'run the next wave'. Not for one tightly-coupled change or a quick edit (single thread), and not for an undetailed backlog — detail it first with backlog-detail."
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
| A chain of phases (N+1 needs N merged)                        | One head per round; the rest advance next round                                                                      |
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

## Hard rules (each learned from a real failure)

- **Builders self-verify their OWN package before reporting done.** Worktrees have no deps installed. If the repo has a worktree-verify script (check `scripts/`, e.g. `scripts/verify-worktree.sh <pkg>`), the builder runs it and must see exit 0; if none exists, create one from the recipe in builder-and-reviewer-prompts.md; if that's impossible, the builder must report `could-not-self-verify` and the merge gate is the only proof. WHY: unverified "done" reports push same-package breakage into your gate.
- **A scoped verify proves SAME-package only — never treat a builder's "all green" as cross-package truth.** Cross-package truth is the full gate in step 4, and nothing else.
- **Never run a full dependency install (e.g. `yarn install`) in a worktree.** WHY: it truncates the agent's run mid-investigation — the verify script symlinks the main checkout's deps instead.
- **Builders commit early and often:** `git commit --allow-empty` first so the branch exists, then commit after every file. WHY: truncation before the first real commit loses everything.
- **Never feed a builder's report to its own reviewer.** WHY: a reviewer shown the self-assessment rubber-stamps it. Redact it — the reviewer reads the diff.
- **Strongest-tier review before every merge.** WHY: builders self-report "done" optimistically; trust the review and the gate, never the builder's narrative.
- **Merges live in the main thread, never in the workflow, and only one at a time.** WHY: pipeline stages fire concurrently, and concurrent `git merge` races corrupt the shared branch. Never merge while another session is merging.
- **Run the full gate after ALL merges, not per branch.** WHY: a field made required on a shared type breaks sibling fixtures invisibly until the whole graph compiles.
- **Re-check HEAD and the base ref after every worktree cleanup.** WHY: worktree auto-clean can silently move the primary checkout's HEAD onto an agent branch, and a stray reset can move the base ref backward — either orphans a whole batch. Recovery commands in merge-gate-and-recovery.md.
- **Never reset the base branch backward.** Base pushed forward by another session is fine — merge onto the current tip. Base moved BACKWARD is an incident: STOP → `git reflog <base>` → reset to the real tip. If a backward reset is blocked (harness/auto-mode), merge forward — superseded partial commits become harmless ancestors.

## Sizing & effort scaling

- One builder = one **disjoint package** (or a small file-set within one package) — small enough that a scoped verify is meaningful proof of done. A ticket whose footprint spans many packages is too big: split it before dispatch.
- A few genuinely disjoint streams beat many colliding ones (3–4 disjoint > 6 colliding). The disjoint count is the width — never pad it.
- Scale investment to the task, not the round (multi-agent research rule of thumb: simple lookup ≈ 1 agent / 3–10 tool calls; comparison ≈ 2–4 agents / 10–15 calls each; only genuinely complex work justifies 10+ agents).

Builders and reviewers both run on the strongest tier — the code an agent writes unsupervised in a worktree is what gets merged, so buying quality at write time is cheaper than catching it at review time. Drop a stream to the cheapest tier only when it is genuinely mechanical.

| Stream                                                | Tier / effort                     |
| ------------------------------------------------------- | ----------------------------------- |
| Every builder — **DEFAULT**                           | Strongest tier (Opus), high effort |
| Every reviewer — never the implementer                | Strongest tier (Opus), high effort |
| Mechanical (triage greps, retire-checks, bookkeeping) | Cheapest tier (Haiku), low effort  |

Never hardcode dated model ids; use the haiku/sonnet/opus aliases.

## Draining a ticket backlog

Same loop, with a backlog as the queue. Three things it adds:

- **Precondition: the tickets must already be detailed.** Vague tickets burn builder runs on unmade decisions — run `backlog-detail` first.
- **Let the board compute the wave.** If the repo has board tooling, `board:waves` prints exactly the tickets whose dependencies are satisfied and whose `touches` do not collide — that is step 2, done for you. Otherwise hand-partition by disjoint file footprints. Retire through the tool (`board:merge <id>` after setting `status: merged` + `solved:`), never `git mv`. See the `ticket-board` skill.
- **Drained means no buildable ticket remains — not "this round finished".** Merging a chain head unblocks the next one, so recompute the wave and go again.

For the hands-off version that also crawls the running app each round and mints bug tickets from what it finds, use `backlog-verify-loop`, which wraps this loop.

## Quick reference

**Recurring merge conflict — a stale-base append-only manifest** (a package manifest's test-script list, a barrel file, a registry): take `--ours` (the base's full list) then append the branch's NEW entry. Never take `--theirs` whole — it silently drops entries the base added since the branch forked (silent test loss). Commands in merge-gate-and-recovery.md.

## Reference files

- `workflow-pipeline.md` — the `pipeline(tickets, build, review)` script skeleton (default execution mechanism), builder-report + verdict schemas, harvest contract, watch/resume.
- `builder-and-reviewer-prompts.md` — copy-paste builder + reviewer prompt templates with the non-negotiables baked in, the worktree-verify script recipe, and the resume/salvage flow.
- `merge-gate-and-recovery.md` — serial merge, manifest-conflict resolution, full gate, cross-package break fix, HEAD-hijack / base-rewind recovery, cleanup.

## Provenance

Distilled from real orchestration runs, not theory. The pipeline mechanism replaced hand-fanned `Agent` waves once it proved the no-barrier review + auto-queue behavior; the merge stayed in the main thread because concurrent `git merge` races. When a round surfaces a new failure mode, add the explicit counter to the hard rules.
