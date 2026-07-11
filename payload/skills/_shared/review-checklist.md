# Shared review checklist (7-lens engine)

Single source of truth for the `review-branch` and `review-uncommitted` skills. Each wrapper
computes a different **diff scope**, then runs this identical engine against that diff.

**The review's job:** confirm the change does exactly what it set out to do, touches **only**
what that goal needs, follows the five engineering principles, and reports **only real,
verified findings** — one hallucinated finding destroys trust in every future review.

## Contents

- Step 0 — establish the goal
- Step 1 — get the diff
- Execution model (parallel lenses)
- Lens 1 — scope discipline
- Lens 2 — goal completeness
- Lens 3 — principle adherence
- Lens 4 — correctness bugs
- Lens 5 — tests to green
- Lens 6 — anti-hallucination verification
- Lens 7 — report format
- Deviation-flag mandate
- Common rationalizations

## Step 0 — Establish the goal

State the **goal of the change** in one sentence before reviewing anything. Sources, in order:
branch name, recent commit messages, the spec/plan in `docs/`, ask the user if still unclear.
Every lens is judged against this sentence — without a stated goal, scope discipline is
impossible.

## Step 1 — Get the diff

Scope differs per wrapper — run the exact command block in the invoking SKILL.md. Produce the
full diff plus the changed-file list. For `review-uncommitted`, also read every **untracked**
file in full: new files are part of the change and must be reviewed.

## Execution model

- **Lenses 1–4 are independent reads of the same diff — fan them out to parallel subagents**
  when the diff is large enough to justify it (there is no fixed concurrency cap). Give each
  lens subagent: the goal sentence, the diff-scope commands, its lens spec below, and this
  return contract: candidate findings only, each as `path:line — claim — quoted evidence`.
  No narrative, no self-grading — the raw candidates go to Lens 6.
- **Lens 5 (tests) runs in the main context.** It executes commands, and its output must be
  pasted first-hand, never relayed second-hand.
- **Lens 6 runs last**, on the pooled candidates from all lenses, and adversarially refutes
  every one of them (see below).
- For a small diff (a handful of files), skip the fan-out and run lenses 1–5 sequentially
  yourself — subagent overhead outweighs the benefit there.

Record findings as **candidates** as you go; **do not fix anything yet** — fixing mid-review
hides the true state of the change.

## Lens 1 — Scope discipline

Every changed line must serve the stated goal. Flag as findings:

- **Dependency / version bumps the feature does not require.** This exact failure has shipped
  before — a version bump smuggled into an unrelated change. A version change is in-scope only
  if a line of the feature needs the new version: prove it or flag it.
- Unrelated edits, opportunistic refactors, renames, or reformatting churn in files the goal
  did not need to touch.
- New files/exports the goal does not use.
- Config, lockfile, or CI changes not entailed by the goal.

Format: `path:line: out-of-scope — <what> is unrelated to "<goal>". Revert or split into its
own change.`

## Lens 2 — Goal completeness

"Done" means done — half-finished changes are what cause many review iterations before merge.

- Every part of the stated goal is implemented; no half-done paths.
- No placeholder / TODO-as-deliverable / stub returning a fake value / "handle later".
- Error/empty/failure paths handled, not just the happy path.
- If phased: this phase's slice is complete and independently shippable.

Emit a verdict: `COMPLETE` or `INCOMPLETE — <what is missing>`.

## Lens 3 — Principle adherence

Check the change against the five engineering principles; cite the rule as the source of each
deviation:

1. **Phased delivery** — a focused, shippable slice, or an oversized everything-PR? PRs of
   ~200–400 changed lines have ~40% fewer defects and merge ~3x faster; a much larger diff is
   itself a finding ("should this be split into phases?").
2. **Test-first (TDD)** — tests exist for the new logic, with evidence they were the spec
   (committed with/before the implementation, covering real behavior, not trivially passing).
   Untested new logic is a finding.
3. **Low-coupling / minimal deps** — a new external dependency that a small amount of in-repo
   code would replace; new tight coupling; a mock-heavy test where a self-contained unit +
   unit test would do.
4. **Design-fit & library-first** — reimplementing what a vetted library already does, or the
   reverse: a heavy dependency added for something trivial.
5. **The repo's own CLAUDE.md hard rules** — check the diff against them (typical examples:
   layer/import boundaries, mandatory test registration, env-template updates, no inline
   domain logic in handlers). Flag violations and cite the specific repo rule.

Format: `Principle deviation — <principle>: <what> at path:line. <rule says X>.`

## Lens 4 — Correctness bugs

Find real defects: logic errors, off-by-one, wrong conditionals, unhandled nulls, race
conditions, security issues, broken types. **Reuse, don't reinvent:** if a `/code-review`
skill is available in the session, invoke it for this pass and merge its verified findings;
this engine adds the scope/goal/principle lenses on top.

## Lens 5 — Tests to green (main context — run them, don't assume)

- Discover the test command (package.json `test` script, repo README, CLAUDE.md).
- Run the affected tests **and** the type-checker/build (`tsc`, `yarn build`, or the repo's
  equivalent).
- Any failure: report it with **pasted real output**. A failure caused by the change is a
  top-severity finding. Loop — re-run after fixes — until green, or state precisely why it
  cannot pass.
- **Never claim green without pasted output.** "Should pass" is not a test result.

## Lens 6 — Anti-hallucination verification (mandatory)

This pass is what makes the review trustworthy. After pooling candidates from lenses 1–5:

- **Adversarially re-examine every candidate.** Open the actual `path:line` and confirm the
  code really says what the claim asserts.
- A finding survives only with **concrete evidence**: exact file, exact line, exact quoted
  code or output. No "this might…", "consider possibly…", "could lead to…" without a
  demonstrated path.
- **Default-reject anything you cannot stand behind with evidence.** Dropping an uncertain
  finding is correct behavior, not a miss.
- **Verifier independence + redaction:** when the diff or candidate list is large, spawn a
  fresh verifier subagent that did not generate the candidates. Feed it only the raw claims
  (`path:line` + one-sentence claim) and repo access — never the finder's confident narrative
  or reasoning. A verifier fed the finder's story anchors on it and rubber-stamps; a redacted
  verifier actually refutes. Its explicit job is to refute every candidate; the survivors are
  real.
- Discard everything that fails this pass. Report counts: candidates raised vs verified.

## Lens 7 — Report format

Only verified findings appear. Use exactly this structure:

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

Severity tags: 🔴 blocker · 🟠 should-fix · 🟡 minor. No praise, no scope creep in the review
itself, no speculative findings.

## Deviation-flag mandate

If the **work as a whole** is drifting from the five principles (one giant unphased PR; tests
clearly written after the fact), say so plainly to the user: _"This was set as an engineering
rule, and X is not following it."_ The review is also where skipped principles get caught.

## Common rationalizations

| Excuse                                              | Reality                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| "The version bump is harmless, leave it"            | Unrequired bumps are the canonical scope-creep bug. Prove a feature line needs it, or flag. |
| "Tests will obviously pass, no need to run them"    | Pasted output or it didn't happen. Lens 5 exists because "obviously" has been wrong.        |
| "The finding is plausible — report it to be safe"   | Plausible ≠ verified. Unverified findings destroy review trust; default-reject.             |
| "I'll just fix this small thing while reviewing"    | Fixing mid-review hides the true state of the change. Record, report, fix afterwards.       |
| "Untracked files aren't in the diff, skip them"     | New files are exactly where scope creep and missing tests hide. Read them in full.          |
| "The verifier can see my reasoning — it saves time" | A verifier fed the finder's narrative rubber-stamps. Redact the claims; make it refute.     |
