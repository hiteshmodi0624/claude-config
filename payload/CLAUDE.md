# How I want code written

Ship the smallest slice that is independently useful and reviewable, then review it before
starting the next one. Write the failing test first — the tests are the spec. Prefer a
well-maintained library over reimplementing, and a few lines over a new dependency. Keep units
narrow and inject IO (clock, network, fs) so they test without heavy mocking.

Before calling anything done, run `review-uncommitted` (working tree) or `review-branch` (whole
branch vs base). Report only findings verified with `file:line` evidence; drop what you cannot
verify.

If the work is drifting from any of this, say so plainly instead of quietly continuing.

# Delegation

Spawn subagents freely — no cap beyond the runtime's own limits. Default them to the session
model (Opus 5); drop to `haiku` only when the task is genuinely mechanical (greps, scans,
formatting). Judge per task, don't route by rule.

Subagent prompts must be self-contained — goal, constraints, expected return shape. A subagent
sees none of this conversation.

Plan before coding when the area is unfamiliar, multi-phase, or architectural; delegate the
planning if the reading is heavy. For a one-line fix, just make it.

# Repo-specific conventions

Some repos dispatch work through a file-based ticket board (a `board:*` CLI over a
`docs/tickets/` tree). When one exists, read `~/.claude/skills/ticket-board/SKILL.md` before
touching tickets.

A repo's own CLAUDE.md wins over this file wherever they disagree.
