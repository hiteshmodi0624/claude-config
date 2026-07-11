---
name: backlog-detail
description: Use when a backlog of tickets/issues is too thin to implement directly and you want each one filled with exhaustive implementation detail (spec, exact files, failing-test plan, phases) BEFORE any code is written. Triggers - "detail the tickets", "flesh out the backlog", "add implementation detail", "make tickets buildable", "plan every ticket".
---

# backlog-detail

## Overview

A separate, cheap PLANNING pass that turns thin tickets into buildable specs — run before any
implementation. **Core principle: detailing only writes each ticket's own file, so every ticket is
disjoint by construction** — fan them ALL out at once, no worktrees, no merge conflicts, no code touched.

This is Phase 1 of the detail → drain → verify loop. See [[backlog-drain]] (Phase 2) and
[[backlog-verify-loop]] (the outer loop).

## When to use

- Tickets exist but say _what_ not _how_ — no file list, no test plan, no phases.
- You are about to run parallel builders and want them on a short leash (a detailed ticket = a
  meaningful "done").
- Before `backlog-drain`, always — a builder with a vague ticket over-explores and truncates.

**Do NOT use** for a single ticket you're about to build yourself (just plan inline), or to write code.

## Procedure

1. **Enumerate the backlog.** If the repo has a board (`yarn board:waves` / `docs/tickets/`), read the
   active set (status `backlog`/`in-progress`); **skip any icebox/forbidden tier**. Otherwise the
   backlog is the set of open task files / issues.
2. **Fan out one detailer per ticket** via a Workflow `parallel()` barrier — docs-only work, so
   **NO `isolation:'worktree'`** (they each touch only their one ticket file; zero collision).
   Model: **sonnet**; **opus** for any ticket whose footprint spans >1 package/module.
3. **Each detailer, for its ONE ticket**, appends an `## Implementation Detail` section (leaving
   frontmatter + existing body intact), grounded in the REAL code it reads (grep/graphify — no
   hand-waving, no `TODO`/`TBD`):
   - **SPEC** — exact behaviour; the product/architecture invariant it must respect (quote it); design-fit.
   - **FILES** — every path to add/change + one line each.
   - **FAILING TESTS FIRST** — the test cases (names + assertions) that ARE the spec, and which
     manifest `test` script each new test file registers in (unregistered test = never runs).
   - **PHASES** — smallest useful slice first, then the rest; must-have vs nice-to-have.
   - **IO / DEPS** — injected IO (fetch/clock), boundary schema, any new env var (+ example-file line).
   - **COST** — only if it adds/alters an LLM call: model, est cost/1000 records, cache plan.
   - **CROSS-PACKAGE RISK** — shared types/barrels/enums other modules assert on.
4. **Gate + commit.** Run the board check (`yarn board:check` if present). Report a table:
   ticket → files-touched → phase count. Commit as `docs(tickets): implementation detail for backlog`.

## Model / effort

| Ticket                                   | Model  | Effort      |
| ---------------------------------------- | ------ | ----------- |
| Single package/module                    | sonnet | medium      |
| Spans >1 package, or heavy investigation | opus   | medium-high |

## Common mistakes

| Mistake                         | Reality                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Give detailers worktrees        | Docs-only work — worktrees are pure cost, no collision to prevent                   |
| Let a detailer touch code       | This phase writes SPECS, not implementations. Code is [[backlog-drain]].            |
| Detail icebox/forbidden tickets | Wasted work — they'll never build. Skip that tier.                                  |
| Vague "improve X" spec          | A builder can't leash to it → over-explores → truncates. Demand files + test names. |
| Skip the failing-test plan      | The test IS the spec (TDD). No test plan = the builder guesses the contract.        |
