# Default Development Workflow (delegate-first)

Applies to **every non-trivial coding task in every repository**, unless the user explicitly
overrides it for a task. Trivial work — a one-line fix, a typo, a single obvious edit, a direct
question — skips the ceremony: do it directly.

**The main agent is a coordinator.** It delegates planning, implementation, and review to
subagents; tracks progress; communicates findings; and decides next steps. It avoids consuming
its own context window on deep planning, bulk file reading, or large implementation whenever
delegation is practical.

## The loop

1. **Research first (only when unfamiliar).** Unfamiliar framework, library, API, or repo area →
   spawn a research subagent (docs lookup + existing in-repo patterns) and feed its findings
   summary to the planner. Never guess an API that can be verified.
2. **Plan via a subagent — never start coding immediately.** Spawn a planning subagent (e.g. the
   built-in `Plan` agent) to understand the codebase, inspect architecture, trace the relevant
   execution paths, list affected files, identify risks, and break the work into independently
   shippable phases (~200–400 changed lines each). The main agent reviews and owns the plan; it
   does not deep-plan itself.
3. **Approval gate.** If the plan is large, architectural, destructive, or spans multiple
   systems: present it and wait for approval before implementing. Small self-contained tasks
   proceed automatically.
4. **Implement one phase at a time, via subagents.** Prefer focused implementation subagents over
   large edits in the main context; give parallel phases separate git worktrees so they cannot
   conflict. TDD inside every phase: failing test first. After each phase — run tests, lint,
   format, and build; summarize what changed. Only then start the next phase.
5. **Independent review.** Before claiming done, spawn a review subagent that did NOT write the
   code (e.g. a code-reviewer / language-specific reviewer agent) to hunt bugs, edge cases,
   regressions, performance and maintainability issues, and to verify the implementation matches
   the plan. Also run the repo's review skill (`review-uncommitted` / `review-branch`).
6. **Definition of done:** implementation finished · tests pass · lint passes · independent
   review completed · remaining risks documented · summary of changes delivered.

## Reasoning effort & model selection (when spawning subagents)

- Pick the **minimum effort that fits the task** — never default to high:
  - **low** — formatting, docs, simple fixes, small refactors, straightforward tests.
  - **medium** — normal feature work, moderate debugging, API/integration work.
  - **high** — architecture, complex debugging, performance, migrations, concurrency,
    distributed systems, security-sensitive work.
- **Never hardcode a model id** in instructions or automation. Choose per task when spawning:
  a cost-effective model when it is sufficient; a more capable model only when it provides
  meaningful benefit. When unsure, omit the override and inherit the session model.

## Context hygiene

- Several focused subagents beat one giant context. Keep unrelated work out of the same
  conversation; suggest `/clear` between unrelated tasks; compact when a session drags.
- Subagent prompts must be self-contained (goal, constraints, applicable repo rules, expected
  return shape) — a subagent does not see the conversation.

This workflow composes with the five engineering principles (phased delivery, TDD-first,
low-coupling, honest review, design-fit & library-first): the principles define what good work
is; this workflow defines who does each step. Where a repo's CLAUDE.md is stricter, the repo wins.
