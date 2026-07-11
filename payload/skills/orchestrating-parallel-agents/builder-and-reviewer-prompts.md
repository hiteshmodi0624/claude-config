# Builder & Reviewer Prompt Templates

Copy these, fill the `<...>` slots. The non-negotiables are pre-baked — do not strip them.
Every delegation carries four parts: **objective, boundaries, tool/environment guidance, output
contract** — a vague prompt produces overlapping, truncated, or unmergeable work.

Shortcut: the non-negotiables are also installed as reusable subagents —
`~/.claude/agents/worktree-builder.md` and `~/.claude/agents/branch-reviewer.md`. Dispatch with
`agentType: 'worktree-builder'` / `'branch-reviewer'` (Workflow `agent()` or the Agent tool) and
your prompt only needs the per-ticket slots (OBJECTIVE/SCOPE, HARD REPO RULES, BOUNDARIES,
verify-script path; EXPECTED DELTA + #1 risk for the reviewer). The full templates below remain
the source of truth and the fallback when the agents aren't installed.

## Contents

- Builder prompt template
- Worktree-verify script: use or create (recipe)
- Reviewer prompt template (strongest tier)
- Resume / finish-a-truncated-builder template

---

## Builder prompt template

Dispatch with an **isolated git worktree** (`isolation: 'worktree'`). Pick the tier per the
SKILL.md table. Pair it with `BUILD_REPORT_SCHEMA` from `workflow-pipeline.md` so the report
comes back structured.

```
You are a top-tier software engineer in <REPO/STACK: e.g. a yarn-workspaces TS monorepo>.
You are in an ISOLATED git worktree. Implement ONE ticket to a high bar, write tests, and COMMIT
to a branch. Do NOT merge.

OBJECTIVE
TICKET: <path/to/ticket>. Read it fully first.
SCOPE: <the concrete phased scope — list phases; mark the must-have slice vs nice-to-have. Ship
the smallest useful slice first; if runway runs low, STOP and report what remains.>

HARD REPO RULES (obey exactly — cite the repo's CLAUDE.md/AGENTS.md):
<e.g. TDD failing-test-first; REGISTER every new *.test file in the owning package manifest's test
script; SPI-first (no provider branch in core); inject IO (fetch/clock) as deps; validate
boundaries with a schema; named tested helper for any math; ESM .js import extensions; strict, no
any; NO hardcoded user-visible strings → copy module; update .env.example same-change; Conventional
Commits.>

ENVIRONMENT (critical): this worktree has no node_modules of its own (deps hoist to the main
checkout). DO NOT run a dependency install and DO NOT run the full build/test/lint — they truncate
the run. You SELF-VERIFY your OWN package only, via `bash <verify-script> <your-pkg>` (it symlinks
the main checkout's node_modules and runs a scoped build+test for your package). That is the only
verification command you run. If no verify script exists and you cannot create one, set
selfVerify: "could-not-self-verify" in your report — never fake a green. The scoped verify does
NOT re-check sibling packages; the orchestrator catches those at the merge gate.

BOUNDARIES: touch ONLY <the in-scope files/area>. Do NOT touch <areas other agents own>. Leave
docs/tickets alone (the orchestrator moves them).

WORKFLOW:
1. FIRST: `git commit --allow-empty -m "chore: start <slug>"` so the branch exists immediately.
   Confirm your branch with `git rev-parse --abbrev-ref HEAD`.
2. Investigate ONLY the files each phase needs (don't over-explore — that's where runs truncate).
3. Implement phase-by-phase, committing after EVERY file with `git commit --no-verify` (commit
   hooks aren't wired in the worktree). Small Conventional commits.
4. BEFORE delivering: run the verify script from the worktree root and confirm it EXITS 0. If it
   fails, fix and re-run until green. Your "done" is only valid with a green scoped verify.

DELIVER (structured report — the orchestrator builds the merge gate from it):
branch; exact files added/changed; phases done vs remaining; every new test file + WHICH manifest
test-script you registered it in; any new env vars; selfVerify green | could-not-self-verify; and
cross-package risks the gate must watch (a shared type / barrel export consumed elsewhere, a
required field added to a shared schema, an enumeration list other tests assert).
```

**Why each clause exists:** the no-install + commit-after-every-file clauses stop the #1 failure
(truncation before the first real commit loses everything). The `crossPackageRisks` deliverable is
what lets you predict gate breaks. The BOUNDARIES clause is the conflict firewall. The structured
DELIVER means you never parse prose to plan the gate.

---

## Worktree-verify script: use or create

**If the repo has one** (look in `scripts/`, e.g. `scripts/verify-worktree.sh`), pass its path into
the builder prompt. **If not, create one before dispatching** — the pattern is: symlink the main
checkout's deps, then run a scoped build+test for only the builder's package:

```bash
#!/usr/bin/env bash
# verify-worktree.sh <pkg> — scoped self-verify for a deps-less git worktree
set -euo pipefail
PKG="$1"
MAIN="<absolute path to the main checkout>"
# 1. Symlink hoisted deps (repeat for nested node_modules if the repo hoists partially)
ln -sfn "$MAIN/node_modules" node_modules
# 2. Scoped build+test for ONLY this package (use the repo's task runner)
npx turbo run build test --filter="$PKG"   # or: yarn workspace "$PKG" build && ... test
```

If neither exists nor can be created (non-Node stack, no scoped runner): the builder reports
`could-not-self-verify` and your post-merge gate is the only proof for that branch — weigh that
when choosing merge order.

---

## Reviewer prompt template (strongest tier — mandatory before every merge)

Read-only; no worktree needed — it diffs the branch in the main checkout. **REDACTION RULE: the
reviewer never sees the builder's report or self-assessment** — fill this template from the
ticket/spec only. A reviewer fed the implementer's confident narrative rubber-stamps buggy code;
redaction measurably multiplies findings. Pair with `VERDICT_SCHEMA` for a structured verdict.

```
You are a rigorous code reviewer. Review ONE feature branch (read-only). Do NOT merge or edit.
Report VERIFIED findings only — cite file:line + evidence; default-reject anything you cannot
verify by reading the actual code.

REPO: <path>. BRANCH: <branch>.
Compute the true delta via merge-base (branches may be stale-based):
  git diff $(git merge-base <base> <branch>)..<branch>
Ignore anything outside that delta — it's base drift, not the branch's work.

EXPECTED DELTA: <one-line summary of what should have changed, from the ticket — NOT from the
builder>.

REVIEW AGAINST:
1. Correctness — <the specific #1 risk for this ticket: backward-compat of a new optional field; a
   changed error type breaking callers; tenant/security scoping; broken existing behavior>.
2. Repo rules — TDD real assertions (not assert(true)); EVERY new test registered in the owning
   manifest; schema at boundaries; no any; ESM .js imports; no hardcoded user-visible strings.
3. Scope / blast radius — only in-scope files touched; no needless dependency bumps; no enumeration
   / shared-type change left un-reconciled across the repo.
4. <Domain checks: a11y/responsive for UI; failure-isolation + by-construction scoping for
   destructive ops; no import cycle for new package edges.>

Read the ACTUAL files. Then deliver:
- VERDICT: MERGE-AS-IS | MERGE-WITH-NITS | NEEDS-FIX  (closed enum — pick exactly one)
- BLOCKING findings: `file:line — problem — concrete fix`
- NON-BLOCKING nits
- Explicitly confirm the #1 risk for this ticket (quote the relevant lines). Terse + honest; if
  clean, say so plainly.
```

**Reviewer caveat:** in a deps-less worktree the reviewer can't run the suite reliably; its job is
code-level review. The real build/test/lint is YOUR gate after merge. A `NEEDS-FIX` verdict with a
1-line fix → apply it in the branch worktree, commit, then merge.

---

## Resume / finish a truncated builder

Builders truncate during long investigation (more often on mid-tier models). If a branch has only
the empty scaffold commit (or partial phases), either re-dispatch fresh with a tighter scope, or —
if it committed real phases — resume it:

```
Continue your work on <ticket> in your worktree (branch <branch>). You already committed <phases
done>. REMAINING = <phase>. <Concrete spec of the remaining slice.> Commit each file with
`git commit --no-verify`. Do NOT run a dependency install. Before reporting done, run
`bash <verify-script> <your-pkg>` and confirm exit 0. Do NOT merge. Report the final branch tip +
files + any cross-package risk.
```

If truncated before its first real commit, its uncommitted work survives only while the worktree
exists: salvage with `git -C <worktree> diff <scaffold-sha> > /tmp/x.patch` then `git apply
--3way` onto a fresh branch — OR just re-dispatch (usually cleaner for a barely-started ticket).
