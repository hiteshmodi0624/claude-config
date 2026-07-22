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

## Board-driven repos (when a ticket board exists)

If the repo dispatches through a file-based ticket board (a `board:*` CLI over a `docs/tickets/`
tree), the board *is* this loop's work queue — see the Ticket Boards standard in `~/.claude/CLAUDE.md`
for the conventions. Concretely: pick the next wave with `board:waves` (dependency- and
file-collision-safe, so it maps straight onto step 4's parallel worktrees), one ticket per
`ticket/<id>` branch, set `status: in-progress` before building and `status: merged` + `solved:`
after review, then retire with `board:merge <id>` — never `git mv` a ticket or hand-edit the
generated `_board/` index. Run `board:check` before each commit that touches the ticket tree.

## Model & effort routing (STRICT — auto-enforced by `hooks/model-routing-guard.js`)

**Default-cheap, escalate-on-evidence.** Omitting `model` on a subagent inherits the session
model — usually the MOST expensive tier — so **every subagent spawn sets `model` explicitly**
(and `effort` where the mechanism supports it: Workflow `agent()` opts, agent frontmatter).
The strong-orchestrator + cheap-workers pattern retains ~96% of all-top-tier quality at roughly
half the cost (Anthropic multi-agent benchmarks); the strong reviewer is what makes the cheap
builder safe.

| Role                                                        | Model                     | Effort |
| ----------------------------------------------------------- | ------------------------- | ------ |
| Mechanical: scans, greps, formatting, doc lookups, triage    | haiku                     | low    |
| Research / explore / codebase reading                        | sonnet (haiku if trivial) | low–medium |
| Implementation / builders — **default for ALL code-writing** | sonnet                    | medium |
| Hard implementation (cross-package, concurrency, migrations, security-sensitive, design-critical UI) | sonnet first at high effort; opus only via escalation | high |
| Planning / architecture                                      | opus (or inherit session) | high   |
| Review / verification / judging (never the implementer)      | opus                      | high   |
| Orchestration                                                | the main session itself   | —      |

- **Escalation is evidence-based and per-task**: escalate one task to opus with an
  `[ESCALATED: <reason>]` marker only after a sonnet attempt fails, truncates, or a reviewer
  bounces it — never pre-emptively for a whole batch.
- Prefer dropping **effort** before dropping model tier, and raising effort before raising tier.
- **Never hardcode dated model ids** — use the `haiku` / `sonnet` / `opus` aliases only.
- The PreToolUse hook blocks: opus/fable-tier spawns whose prompt is not plan/review/escalated,
  model-less spawns of generic agent types, and Workflow scripts with no model routing.

## Context hygiene

- Several focused subagents beat one giant context. Keep unrelated work out of the same
  conversation; suggest `/clear` between unrelated tasks; compact when a session drags.
- Subagent prompts must be self-contained (goal, constraints, applicable repo rules, expected
  return shape) — a subagent does not see the conversation.

This workflow composes with the five engineering principles (phased delivery, TDD-first,
low-coupling, honest review, design-fit & library-first): the principles define what good work
is; this workflow defines who does each step. Where a repo's CLAUDE.md is stricter, the repo wins.
