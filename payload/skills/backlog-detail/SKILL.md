---
name: backlog-detail
description: "Exhaustive ticket planning until implementation needs zero decisions. Use when a backlog must be detailed before any code is written, or when the user says 'detail the tickets', 'plan every ticket', 'ask me questions before building', 'make tickets a weak model can build', 'review the planning', 'split big tickets'. Not for implementing the tickets — route that to backlog-drain."
---

# backlog-detail

## Overview

The planning pass that turns thin tickets into paint-by-numbers specs — run before any code. **The bar is "zero decisions left": a model that CANNOT make decisions could still implement the ticket correctly; if any open decision remains, the ticket is not done.** Detail everything now so implementation time is pure typing, not thinking.

Two structural facts drive the design:

- Interactive drilling cannot happen inside a parallel headless fan-out — subagents cannot talk to the user. Hence four stages, not one pass.
- A spec is cheap markdown, so there is exactly ONE review — after the write — judging approach AND completeness. A wrong-approach rewrite costs only markdown; a separate pre-write review isn't worth a stage.

Loop position: Phase 1. backlog-drain implements (Phase 2); backlog-verify-loop is the outer loop.

## When to use / when NOT

- Use when tickets exist but are thin — no file lists, no signatures, no test assertions — and a human or autonomous drain is about to build them.
- "Review the planning" on already-detailed tickets → run Stage 4 alone.
- NOT for implementing tickets (backlog-drain) or designing a feature from nothing (feature-start).

## Two modes

- **Interactive** (standalone `/backlog-detail`, user present): run all four stages — drill the user.
- **Autonomous** (inside backlog-verify-loop, user away): **skip Drill**. The writer picks the conservative/reversible option for each decision and records `ASSUMPTION: <choice> — chosen because <reason>` in the ticket. The loop never blocks on a human.

## The four stages

Copy this checklist and tick it off:

```
[ ] 1.  Gather — parallel readers emit open decisions only
[ ] 1b. Sanity — main thread eyeballs the consolidated decision list
[ ] 2.  Drill  — interactive only: batched AskUserQuestion, plain language
[ ] 3.  Write  — parallel detailers fill the Rubric template per ticket
[ ] 4.  Review — parallel fresh reviewers: COMPLETE | NEEDS-DETAIL | SPLIT
```

1. **Gather (parallel, cheap).** One agent per ticket reads the real code (grep; `graphify query` if a knowledge graph exists) and returns ONLY the open decisions as `{decision, why it matters, options, recommended}`. No prose, no spec writing, read-only, no worktrees. Then eyeball the consolidated list in the main thread before Drill — "any decision missed? are these the right questions to ask?" — a one-line sanity check that protects the user's time, not a stage.

2. **Drill (main thread; interactive mode only).** Consolidate and dedupe every open decision across all tickets. Ask with AskUserQuestion, obeying the Question Rules below. Ask only where a decision genuinely forks the build; resolve safe-defaultable ones silently and note them. Batch — never one-ticket-at-a-time drip.

3. **Write (parallel).** One detailer per ticket writes the exhaustive `## Implementation Detail` section (frontmatter + existing body intact), baking in the drilled answers. Every REQUIRED slot of the Rubric filled — no TODO/TBD. Each detailer touches only its own ticket file.

4. **Review (parallel, strongest model, never the writer).** A fresh detail-reviewer scores each ticket → `COMPLETE | NEEDS-DETAIL | SPLIT`, judging three things:
   - **Approach sound?** Right design, fits the product/architecture invariants — a plausible-but-wrong spec fails here.
   - **Decision missed?** A fork Gather/Drill overlooked and the writer silently guessed.
   - **Fully specified?** Zero decisions left — every Rubric slot concrete.

   `NEEDS-DETAIL` → back to Write with the gaps named (cheap — it's only markdown). `SPLIT` → auto-split below. Only `COMPLETE` passes: this review is the weak-model-safety guarantee.

**Workflow-tool mapping:** `parallel()` fans out Gather; the sanity check and Drill run in the main thread; then `pipeline(write, review)` per ticket. Autonomous mode collapses to just `pipeline(write, review)`.

## The Rubric — literal fill-in template

The writer copies this block into the ticket and fills every slot; the reviewer enforces it. Structural slots beat prose — an empty or vague slot is a rejection.

```markdown
## Implementation Detail

### SPEC (REQUIRED)

<exact behaviour; quote the product/architecture invariant it respects; one line on design-fit>

### FILES (REQUIRED)

- <path to add/change> — <function/type signatures to write there>

### FAILING TESTS FIRST (REQUIRED)

- <exact test name> — asserts <literal assertion> — registered in <the owning test script/manifest>

### PHASES (REQUIRED)

1. <smallest useful slice — must-have>
2. <next slice — must-have | nice-to-have>

### IO / DEPS (REQUIRED)

<injected IO, boundary schema, any new env var + its env example-file line>

### DECISIONS RESOLVED (REQUIRED)

- <decision> → <drilled answer | ASSUMPTION: <choice> — chosen because <reason>>

### COST (REQUIRED iff the ticket adds/alters an LLM call — otherwise omit)

<model tier, estimated cost per 1,000 records, result-cache + prompt-cache plan>

### CROSS-PACKAGE RISK (REQUIRED — write "none" if none)

<shared types/barrels/enums other modules assert on>
```

**Rejection rule:** reject if a builder would have to choose anything — an unnamed file, a vague "handle errors", a test without assertions, an interface left open.

## Question Rules (Drill stage)

- **Plain language, never raw-technical** — the owner isn't building it. Translate the trade-off into a product/UX choice: not "sync vs batch LLM API call" but "process now (costs more, instant) or overnight (cheaper, next-day)?".
- **Multiple-choice with the recommendation first**; each option is one plain sentence of consequence.
- **Only where it forks the build.** No decision to make → don't ask.
- **Batch** across tickets into as few AskUserQuestion calls as possible.

## Auto-split (Review verdict SPLIT)

Split when a ticket spans cleanly-separable packages, exceeds ~400 changed lines, or holds multiple independently shippable phases — better five small leashed tickets than one a weak model will fumble. Create child tickets `<id>-1`, `<id>-2`, … with a `depends_on` chain and disjoint `touches`; retire/repoint the parent per the repo's board rules. If the repo has board tooling (e.g. `yarn board:check`), run it; otherwise verify ids, dependency links, and path disjointness by hand.

## Model / effort per stage

Never hardcode model ids — pick by capability tier when spawning.

| Stage                           | Tier                              | Effort      |
| ------------------------------- | --------------------------------- | ----------- |
| Gather / Write (single package) | mid-tier workhorse (Sonnet-class) | medium      |
| Write (spans >1 package)        | strongest available               | medium-high |
| Review                          | **strongest available**           | high        |

## Common mistakes

| Mistake                                   | Reality                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Drill inside the parallel fan-out         | Subagents can't reach the user — Gather first, then Drill in the main thread         |
| Ask raw-technical questions               | The owner isn't building it — translate to a plain product choice + a recommendation |
| Ask about everything                      | Only decisions that fork the build; safe-defaultable ones you resolve and note       |
| Ship a ticket with an open choice         | That choice becomes a builder guess — the reviewer must reject it                    |
| One giant ticket a weak model will fumble | Split into leashed child tickets with `depends_on`                                   |
| Skip the review stage                     | "Detailed" ≠ "complete"; the rubric review is what makes it weak-model-safe          |
| Block the autonomous loop on a question   | In-loop = skip Drill, pick the safe default, flag `ASSUMPTION:`                      |
