# Serial Merge, Gate, and Recovery Playbook

You (the orchestrator) own integration. Builders never merge. This file is the mechanical detail —
commands are copy-paste with `<placeholders>` to fill.

## Contents

- Before you start: note the known-good base
- Serial merge loop
- Resolving the stale-base manifest conflict (silent-test-loss trap)
- The full gate (run AFTER all merges)
- Fixing the cross-package break the gate catches
- HEAD-hijack / base-rewind recovery
- Cleanup + bookkeeping

## Before you start

```bash
git rev-parse HEAD            # note the known-good base SHA — write it down
git rev-parse --abbrev-ref HEAD
git worktree list             # know which worktrees other sessions own — leave them alone
```

## Serial merge loop

Merge ONE reviewed branch at a time. Reviewed = a strongest-tier reviewer returned MERGE-\*
(with any blocking fixes already applied in the branch worktree).

```bash
git merge --no-ff <branch> -m "<conventional subject> (merge <slug>)

Reviewed <VERDICT> (<reviewer tier>). <one line on the key risk confirmed>.
Co-Authored-By: <the model that authored the work>"
git diff --name-only --diff-filter=U      # list conflicts (often empty for disjoint streams)
```

If a pre-commit hook blocks the merge commit, commit with `--no-verify` (you run the gate
manually anyway). After each merge, re-verify HEAD/base didn't drift (see recovery section).

## Resolving the stale-base manifest conflict (the recurring one)

Append-only manifests (a package manifest's test-script list, a barrel file, a registry) conflict
when a branch forked before the base added entries. **Union = base's full list + the branch's NEW
entry.**

```bash
git checkout --ours <manifest>            # take the BASE's full version (has the newest entries)
# find what the branch actually added:
git diff $(git merge-base <base> <branch>)..<branch> -- <manifest>
# append ONLY that entry, anchored to a stable neighbor:
perl -0pi -e 's{(<stable-anchor-entry>)}{$1 <branch-new-entry>}' <manifest>
grep -c '<<<<<<<\|>>>>>>>' <manifest>      # must be 0
git add <manifest> && git commit --no-verify --no-edit
```

**Never `git checkout --theirs` the whole manifest** — the branch's stale version is MISSING every
entry the base added since the fork, so you silently drop other people's registered tests/exports.
Always start from `--ours` and add back only what's genuinely new.

## The full gate — run AFTER all branches are merged

Per-branch gating misses cross-package breaks. Run the whole graph, build first (type breaks are
the fastest signal):

```bash
<build all>     # e.g. turbo run build   — or the repo's full-build command
<test all>      # e.g. turbo run test
<lint all>      # e.g. turbo run lint
```

Paste the real pass/fail counts. Green on all three = the wave is sound. Do not claim done without
this output. Check each builder's `crossPackageRisks` report first — it tells you where the gate
will break before it does.

## Fixing the cross-package break the gate catches

Most common: a branch made a field **required** on a shared type (or renamed/added to a shared
contract), breaking sibling fixtures/call-sites that weren't in any branch's diff.

1. Read the error — it names the file:line and the missing/required member.
2. Decide: is `required` the correct contract (the runtime always provides it)? If yes, FIX THE
   CALL SITES (add the field), don't weaken the type. If the field is genuinely optional, make it
   optional instead.
3. **The first build often truncates the error list** — after fixing the named files, re-run the
   build to surface the next batch; repeat until clean. Use a line-gated `perl` to edit only the
   exact flagged lines when a literal repeats elsewhere validly.
4. Commit the fix as its own `fix(...)` commit explaining the cross-package cause.

## HEAD-hijack / base-rewind recovery

Worktree auto-clean can move the primary HEAD onto an agent branch; a stray reset can move the base
ref backward and orphan committed work. After every cleanup:

Run the steps **in this exact order** — `git reset --hard` moves whichever branch is currently
checked out, so resetting before you are back on the base branch rewrites the WRONG ref (e.g. an
agent branch) and leaves the base still broken:

```bash
git rev-parse --abbrev-ref HEAD            # 1. should be your base branch
git rev-parse <base>                       # 2. should be >= your known-good SHA
# if HEAD hijacked — fix this FIRST, before any reset:
git checkout <base>
# only now, if the base ref moved BACKWARD (lost commits):
git reflog <base>                          # find the real tip
git reset --hard <real-tip-SHA>            # safe: you are ON <base>, so this moves <base>
```

Mitigations that prevent the incident: keep worktree-agent count within the disjoint width, harvest
and clean serially, note the known-good SHA before each wave, and prefer inline work for tiny
tickets (agents truncate before their first commit anyway).

## Cleanup + bookkeeping

```bash
# remove only YOUR merged worktrees — never another session's
git worktree remove --force .../<your-agent-worktree>
git worktree prune
git branch -D <your-merged-branches>       # leave other sessions' branches alone
rm -f .git/gc.log                          # silence the gc nag if it appears
```

Then ticket bookkeeping: move each merged ticket to its done state with the proving commit SHA
recorded (if the repo has board tooling — e.g. a `board:merge <id>` script — use it; otherwise
update the ticket file directly). Split any deferred slice into a NEW follow-up ticket that links
back (no buried work — a builder's non-empty `phasesRemaining` means a follow-up MUST exist before
the ticket retires). Refresh the board counts.
