---
name: backlog-detail
description: Use when a backlog of tickets/issues must be planned so thoroughly that implementation needs zero decisions - brainstorming and drilling the user in plain language, writing exhaustive specs (files, signatures, exact test assertions), reviewing that detail, and splitting oversized tickets. Triggers - "detail the tickets", "plan every ticket", "ask me questions before building", "make tickets a weak model can build", "review the planning", "split big tickets".
---

# backlog-detail

## Overview

The PLANNING pass that turns thin tickets into paint-by-numbers specs — run before any code.
**Core principle: the bar is a model that CANNOT make decisions can still implement it correctly. If
any open decision remains in the ticket, it is not done.** Detail as much as possible now so
implementation time is pure typing, not thinking.

**The central constraint:** interactive drilling CANNOT happen inside a parallel headless fan-out —
subagents can't talk to the user. So detailing is **4 stages**, not one pass.

Phase 1 of the loop. See [[backlog-drain]] (Phase 2) and [[backlog-verify-loop]] (outer loop).

## Two modes

- **Interactive** (standalone `/backlog-detail`, user present): run all 4 stages — drill the user.
- **Autonomous** (inside [[backlog-verify-loop]], user away): **skip the Drill stage**; the writer
  picks the conservative/reversible option for each decision and records
  `ASSUMPTION: <choice> — chosen because <reason>` in the ticket. The loop never blocks on a human.

## The 4 stages

1. **Gather (parallel, sonnet, cheap).** One agent per ticket reads the REAL code (grep/graphify) and
   emits ONLY the list of open decisions — `{decision, why it matters, options, recommended}`. No prose,
   no writing yet. Docs-read-only, no worktrees.
2. **Drill (main thread, interactive mode only).** Consolidate + dedupe every open decision across all
   tickets. Ask the user with **AskUserQuestion**, obeying the Question Rules below. **Ask only where a
   decision genuinely forks the build**; safe-defaultable ones you resolve silently and note. Batch —
   never one-ticket-at-a-time drip.
3. **Write (parallel, sonnet; opus if >1 package).** One detailer per ticket writes the exhaustive
   `## Implementation Detail` section (frontmatter + existing body intact), baking in the answers. It
   MUST contain every field in the Rubric — no `TODO`/`TBD`. Touches only its own ticket file.
4. **Review (parallel, opus).** A detail-reviewer scores each ticket against the Rubric and returns
   `COMPLETE | NEEDS-DETAIL | SPLIT`. `NEEDS-DETAIL` → back to Write with the gaps named. `SPLIT` →
   auto-split (below). Only `COMPLETE` tickets pass. This is the "properly reviewed" guarantee.

Mechanics: Workflow `parallel()` for Gather → main-thread Drill → Workflow `pipeline(write, review)`.
Autonomous mode collapses to just `pipeline(write, review)`.

## The Rubric (writer fills, reviewer enforces — "zero decisions left")

- **SPEC** — exact behaviour; the product/architecture invariant it respects (quote it); design-fit.
- **FILES** — every path to add/change, each with the **function/type signatures** to write.
- **FAILING TESTS FIRST** — exact test names + the literal assertions; which manifest `test` script each registers in.
- **PHASES** — smallest useful slice first, then rest; must-have vs nice-to-have.
- **IO / DEPS** — injected IO, boundary schema, any new env var (+ example-file line).
- **DECISIONS RESOLVED** — each drilled answer (or `ASSUMPTION:` in autonomous mode), baked into the spec.
- **COST** — only if it adds/alters an LLM call: model, est cost/1000 records, cache plan.
- **CROSS-PACKAGE RISK** — shared types/barrels/enums other modules assert on.

Reviewer rejects if a builder would have to **choose** anything: an unnamed file, a vague "handle
errors", a test without assertions, an interface left open.

## Question Rules (Drill stage)

- **Plain language, never raw-technical.** Translate the trade-off into a product/UX choice. Not "sync
  vs batch Anthropic call" → "process now (costs more, instant) or overnight (cheaper, next-day)?".
- **Multiple-choice with a recommendation first**, each option one plain sentence of consequence.
- **Only where it forks the build.** No decision to make → don't ask.
- **Batch** across tickets in as few AskUserQuestion calls as possible.

## Auto-split (Review verdict SPLIT)

Split when a ticket spans cleanly-separable packages, exceeds ~400 changed lines, or holds multiple
independently-shippable phases. Create child tickets (`<id>-1`, `<id>-2`, …) with a `depends_on`
chain + disjoint `touches`, retire/repoint the parent per the board rules, `board:check`. Better five
small leashed tickets than one a weak model will fumble.

## Model / effort

| Stage                           | Model    | Effort      |
| ------------------------------- | -------- | ----------- |
| Gather / Write (single package) | sonnet   | medium      |
| Write (spans >1 package)        | opus     | medium-high |
| Review                          | **opus** | high        |

## Common mistakes

| Mistake                                   | Reality                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Drill inside the parallel fan-out         | Subagents can't reach the user — Gather first, then Drill in the main thread         |
| Ask raw-technical questions               | The owner isn't building it — translate to a plain product choice + a recommendation |
| Ask about everything                      | Only decisions that fork the build; safe-defaultable ones you resolve and note       |
| Ship a ticket with an open choice         | That choice becomes a builder guess — reviewer must reject it                        |
| One giant ticket a weak model will fumble | Split into leashed child tickets with depends_on                                     |
| Skip the review stage                     | "Detailed" ≠ "complete"; the rubric review is what makes it weak-model-safe          |
| Block the autonomous loop on a question   | In-loop = skip Drill, pick safe default, flag `ASSUMPTION:`                          |
