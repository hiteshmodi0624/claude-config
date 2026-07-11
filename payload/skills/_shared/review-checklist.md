# Shared review checklist (engineering principles)

Single source of truth for `review-uncommitted` and `review-branch`. Both skills compute a
different **diff scope**, then run this identical 7-lens engine against that diff.

The review's job: confirm the change does exactly what it set out to do, touches **only** what
that goal needs, follows the five engineering principles, and reports **only real, verified
findings** — never hallucinated ones.

---

## Step 0 — Establish the goal

Before reviewing, state the **goal of the change** in one sentence. Get it from: the branch
name, the most recent commits, the spec/plan in `docs/`, or ask the user if unclear. Every
later lens is judged against this goal. Without a stated goal, scope discipline is impossible.

## Step 1 — Get the diff (scope differs per skill — see each SKILL.md)

Produce the full diff plus the list of changed files. Also capture **untracked** files
(`review-uncommitted`) — new files are part of the change and must be reviewed.

## The 7 lenses

Run every lens. Record findings as you go; do not fix yet.

### Lens 1 — Scope discipline (the boss's headline concern)

Every changed line must serve the stated goal. Flag, as findings:

- **Dependency / version bumps** that the feature does not require (the exact bug the boss
  caught). A version change is in-scope only if a line of the feature needs the new version —
  prove it or flag it.
- Unrelated edits, opportunistic refactors, renames, or reformatting churn in files the
  feature did not need to touch.
- New files/exports the goal does not use.
- Config, lockfile, or CI changes not entailed by the goal.

For each: `path:line: out-of-scope — <what> is unrelated to "<goal>". Revert or split into its
own change.`

### Lens 2 — Goal completeness

The feature must be **actually done** — the boss's "many iterations before merge" pain.

- Every part of the stated goal is implemented; no half-done paths.
- No placeholder / TODO-as-deliverable / stub returning a fake value / "handle later".
- Error/empty/failure paths handled, not just the happy path.
- If phased: this phase's slice is complete and independently shippable.

Emit a **goal-completeness verdict**: `COMPLETE` or `INCOMPLETE — <what is missing>`.

### Lens 3 — Principle adherence (verify the five rules were followed)

Check the change against the five engineering principles and flag each deviation, **citing the
rule as the source**:

1. **Phased delivery** — is this a focused, shippable slice, or an oversized everything-PR?
   (Reference: PRs of 200-400 lines have ~40% fewer defects and merge ~3x faster than large
   ones. A much larger diff is itself a finding: "should this be split into phases?")
2. **Test-first (TDD)** — do tests exist for the new logic, and is there evidence they were
   written as the spec (tests committed with/before impl, covering the real behavior, not
   trivially-passing)? Untested new logic is a finding.
3. **Low-coupling / minimal deps** — any new external dependency that a small amount of
   in-repo code would replace? Any new tight coupling or mock-heavy test where a self-contained
   unit + unit test would do? Flag it.
4. **Design-fit & library-first** — if the change reimplements something a vetted library
   already does, flag it; if it adds a heavy dependency for something trivial, flag the reverse.
5. **This-conversation rules** — for OpsPilot, also check the repo's own CLAUDE.md hard rules
   (SPI-first core, env templates, test registration, no inline math). Flag violations.

Phrase deviations as: `Principle deviation — <principle>: <what> at path:line. <rule says X>.`

### Lens 4 — Correctness bugs

Find real defects: logic errors, off-by-one, wrong conditionals, unhandled nulls, race
conditions, security issues, broken types. **Reuse, don't reinvent**: if the `/code-review`
skill is available in this environment, invoke it for the correctness pass and merge its
verified findings here; this checklist adds the scope/goal/principle lenses on top.

### Lens 5 — Tests to green (run them, don't assume)

- Discover the test command (package.json `test` script, repo README, CLAUDE.md).
- **Run the affected tests AND the type-checker / build** (`tsc` / `yarn build`).
- If anything fails: report the failure with **pasted real output**; if the failure is caused
  by the change, that is a top-severity finding. Loop — re-run after fixes — until green or
  until you can state precisely why it cannot pass. **Never claim green without pasted output.**

### Lens 6 — Anti-hallucination verification pass (mandatory)

This is what makes the review trustworthy. After collecting candidate findings from lenses
1-5, **re-examine every finding adversarially before reporting it**:

- Open the actual `path:line` and confirm the cited code really says what the finding claims.
- A finding survives only with **concrete evidence**: exact file, exact line, exact quoted
  code/output. No "this might…", "consider possibly…", "could lead to…" without a demonstrated
  path.
- **Default-reject** anything you cannot stand behind with evidence. A dropped uncertain
  finding is correct behaviour, not a miss.
- Optionally delegate this pass to a subagent for an independent read (respect the global
  **≤2 concurrent subagents** cap). The subagent's job is to _refute_ each finding; survivors
  are real.

Discard every finding that fails this pass. Report counts: candidates raised vs. verified.

### Lens 7 — Output

Report in this structure. **Only verified findings appear.**

```
## Review: <goal> (scope: <uncommitted | branch vs base>)

Goal-completeness: COMPLETE | INCOMPLETE — <missing>
Tests: PASS | FAIL (<pasted summary>) | NOT RUN — <why>
Findings: <verified count> (from <candidate count> candidates; <n> rejected as unverifiable)

### Scope discipline
- path:line: <severity> — <out-of-scope thing>. <fix>.

### Principle deviations (from the five engineering rules)
- <principle>: <what> at path:line. <which rule, what it requires>.

### Correctness
- path:line: <severity> — <real bug>. <fix>.

### Notes
- <only if materially useful; no praise, no filler>
```

Severity tags: 🔴 blocker, 🟠 should-fix, 🟡 minor. No praise, no scope creep in the review
itself, no speculative findings.

## Deviation-flag mandate

If, during review, the **work as a whole** is drifting from the five principles (e.g. it is
one giant unphased PR, or tests were clearly written after the fact), say so plainly to the
user: _"This was set as an engineering rule, and X is not following it."_ The review is also
the place to catch that the principles themselves are being skipped.
