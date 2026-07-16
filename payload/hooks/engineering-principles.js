#!/usr/bin/env node
// Engineering-principles reminder hook.
//   node engineering-principles.js full    -> SessionStart: full five-principle reminder
//   node engineering-principles.js nudge   -> UserPromptSubmit: one-line nudge
// Emits the reminder on stdout, which Claude Code injects as additional context.
// Consumes stdin (the hook payload) but does not depend on it; always exits 0 so it
// can never block a session or a prompt.

const mode = process.argv[2] === "nudge" ? "nudge" : "full";

// Drain stdin so the parent process never blocks on an unread pipe.
try {
  require("fs").readFileSync(0, "utf8");
} catch (_) {
  /* no stdin is fine */
}

const NUDGE =
  "Engineering principles active: phased delivery · TDD-first · low-coupling/minimal-deps · honest review · design-fit & library-first. Run feature-start before new work, review-uncommitted/review-branch before done. Flag any deviation. Non-trivial task? Delegate-first workflow (~/.claude/WORKFLOW.md): plan subagent → phased implement subagents → independent review subagent.";

const FULL = [
  "ENGINEERING PRINCIPLES (STRICT) — apply to all code work this session:",
  "1. Phased delivery — ship the smallest useful slice first (Phase 1), review, then next phase. Never one giant PR.",
  "2. Test-first (TDD) — write the failing test specs first; the tests are the spec; pass them one by one.",
  "3. Low-coupling / minimal-deps — self-contained units, few external dependencies unless required, unit-testable without heavy mocks.",
  '4. Honest review — before "done", run review-uncommitted or review-branch: catch scope creep & needless dependency bumps, confirm the goal is complete, run tests to green, report ONLY verified (non-hallucinated) findings.',
  "5. Design-fit & library-first — first ask how it fits the app + the business value, and search for an existing library before reimplementing.",
  'Before any new feature/architecture/product → invoke the feature-start skill. If work drifts from these, say so plainly: "this was set as a rule, and X is not following it."',
  "DEFAULT WORKFLOW (delegate-first, ~/.claude/WORKFLOW.md) — for every non-trivial task: research subagent if unfamiliar → planning subagent (never start coding immediately) → approval gate if large/architectural/destructive → implementation subagents, one phase at a time (test+lint+build per phase) → independent review subagent (never the implementer). MODEL ROUTING (auto-enforced): sonnet/medium = default for ALL implementation+research subagents; haiku/low = mechanical; opus/high = plan+review ONLY or [ESCALATED: reason]; always set model explicitly. Main agent coordinates, not implements.",
].join("\n");

process.stdout.write(mode === "nudge" ? NUDGE : FULL);
process.exit(0);
