# Builder & Reviewer Prompt Templates

Copy these, fill the `<...>` slots. The non-negotiables are pre-baked — do not strip them.

## Contents

- Builder prompt template
- Reviewer prompt template (Opus)
- Resume / finish-a-truncated-builder template

---

## Builder prompt template

Dispatch with an **isolated git worktree**. Pick the model per the SKILL.md table.

```
You are a top-tier software engineer in <REPO/STACK: e.g. a yarn-workspaces TS monorepo>.
You are in an ISOLATED git worktree. Implement ONE ticket to a high bar, write tests, and COMMIT
to a branch. Do NOT merge.

TICKET: <path/to/ticket>. Read it fully first.

GOAL / SCOPE:
<the concrete phased scope — list phases; mark the must-have slice vs nice-to-have. Tell them to
ship the smallest useful slice first and STOP+report remaining if runway runs low.>

HARD REPO RULES (obey exactly — cite the repo's CLAUDE.md/AGENTS.md):
<e.g. TDD failing-test-first; REGISTER every new *.test file in the owning package manifest's test
script; SPI-first (no provider branch in core); inject IO (fetch/clock) as deps; validate
boundaries with a schema; named tested helper for any math; ESM .js import extensions; strict, no
any; NO hardcoded user-visible strings → copy module; update .env.example same-change; Conventional
Commits.>

ENVIRONMENT CONSTRAINT (critical): this worktree has no node_modules of its own (deps hoist to the
main checkout). DO NOT `yarn install` and do NOT run the full build/test/lint — they truncate the
run. You SELF-VERIFY your OWN package only, via `bash scripts/verify-worktree.sh <your-pkg>` (it
symlinks the main checkout's node_modules and runs a scoped `turbo build test --filter`). That is the
only command you run. Still be rigorous on cross-package edges — the scoped verify does NOT re-check
sibling packages; the orchestrator catches those at the merge gate.

WORKFLOW:
1. FIRST: `git commit --allow-empty -m "chore: start <slug>"` so the branch exists immediately.
   Confirm your branch with `git rev-parse --abbrev-ref HEAD`.
2. Investigate ONLY the files each phase needs (don't over-explore — that's where runs truncate).
3. Implement phase-by-phase, committing after EVERY file with `git commit --no-verify` (lint-staged
   isn't wired in the worktree). Small Conventional commits.
4. Touch ONLY <the in-scope files/area>. Do NOT touch <areas other agents own>. Leave docs/tickets
   alone (the orchestrator moves them).
5. BEFORE delivering: run `bash scripts/verify-worktree.sh <your-pkg>` from the worktree root and
   confirm it EXITS 0. If it fails, fix and re-run until green. Your "done" is only valid with a
   green scoped verify. (Do NOT `yarn install`.)

DELIVER (final message — the orchestrator builds the gate from this): branch name; exact files
added/changed; phases done vs remaining; every new test file + WHICH manifest test-script you
registered it in; any new env vars; and cross-package risks the gate must watch (e.g. a shared type
/ barrel export consumed elsewhere, a required field added to a shared schema, an enumeration list
that other tests assert).
```

**Why each clause exists:** the no-node_modules + commit-after-every-file clauses stop the #1
failure (truncation before the first real commit loses everything). The "cross-package risks"
deliverable is what lets you predict gate breaks. The "touch ONLY" clause is the conflict firewall.

---

## Reviewer prompt template (Opus — mandatory before merge)

Read-only. The reviewer does NOT need a worktree; it diffs the branch in the main checkout.

```
You are a rigorous OPUS code reviewer. Review ONE feature branch (read-only). Do NOT merge or edit.
Report VERIFIED findings only — cite file:line + evidence; default-reject anything you cannot verify
by reading the actual code.

REPO: <path>. BRANCH: <branch>.
Compute the true delta via merge-base (branches may be stale-based):
  git diff $(git merge-base <base> <branch>)..<branch>
Ignore anything outside that delta — it's base drift, not the branch's work.

EXPECTED DELTA: <one-line summary of what should have changed>.

REVIEW AGAINST:
1. Correctness — <the specific risk for this ticket: backward-compat of a new optional field; a
   changed error type breaking callers; tenant/security scoping; broken existing behavior>.
2. Repo rules — TDD real assertions (not assert(true)); EVERY new test registered in the owning
   manifest; schema at boundaries; no any; ESM .js imports; no hardcoded user-visible strings.
3. Scope / blast radius — only in-scope files touched; no needless dependency bumps; no enumeration
   / shared-type change left un-reconciled across the repo.
4. <Domain checks: a11y/responsive for UI; failure-isolation + by-construction scoping for
   destructive ops; no import cycle for new package edges.>

Read the ACTUAL files. Then a verdict block:
- VERDICT: MERGE-AS-IS | MERGE-WITH-NITS | NEEDS-FIX
- BLOCKING findings: `file:line — problem — concrete fix`
- NON-BLOCKING nits
- Explicitly confirm the #1 risk for this ticket (quote the relevant lines). Terse + honest; if
  clean, say so plainly.
```

**Reviewer caveat:** in a no-node_modules worktree the reviewer also can't run the suite reliably;
its job is code-level review. The real build/test/lint is YOUR gate after merge. A `NEEDS-FIX`
verdict with a 1-line fix → apply it in the branch worktree, commit, then merge.

---

## Resume / finish a truncated builder

Builders truncate during long investigation (more on sonnet). If a branch has only the empty
scaffold commit (or partial phases), either re-dispatch fresh with a tighter scope, or — if it
committed real phases — resume it:

```
Continue your work on <ticket> in your worktree (branch <branch>). You already committed <phases
done>. REMAINING = <phase>. <Concrete spec of the remaining slice.> Commit each file with
`git commit --no-verify`. Do NOT `yarn install`. Before reporting done, run
`bash scripts/verify-worktree.sh <your-pkg>` and confirm exit 0. Do NOT merge. Report the
final branch tip + files + any cross-package risk.
```

If truncated before its first real commit, its uncommitted work survives only while the worktree
exists: salvage with `git -C <worktree> diff <scaffold-sha> > /tmp/x.patch` then `git apply
--3way` onto a fresh branch — OR just re-dispatch (usually cleaner for a barely-started ticket).
