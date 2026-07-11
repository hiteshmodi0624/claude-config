# Serial Merge, Gate, and Recovery Playbook

You (the orchestrator) own integration. Builders never merge. This file is the mechanical detail.

## Contents

- Before you start: note the known-good base
- Serial merge loop
- Resolving the stale-base manifest conflict (silent-test-loss trap)
- The full gate (run AFTER all merges)
- Fixing the cross-package break the gate catches
- HEAD-hijack / base-rewind recovery
- Cleanup

## Before you start

```bash
git rev-parse HEAD            # note the known-good base SHA — write it down
git rev-parse --abbrev-ref HEAD
git worktree list             # know which worktrees other sessions own — leave them alone
```

## Serial merge loop

Merge ONE reviewed branch at a time. Reviewed = an Opus reviewer returned MERGE-\* (fixes applied).

```bash
git merge --no-ff <branch> -m "<conventional subject> (merge <slug>)

Reviewed <VERDICT> (OPUS). <one line on the key risk confirmed>.
Co-Authored-By: ..."
git diff --name-only --diff-filter=U      # list conflicts (often empty for disjoint streams)
```

If the pre-commit hook blocks the merge commit, commit with `--no-verify` (you run the gate
manually). After each merge, re-verify HEAD/base didn't drift (see recovery section).

## Resolving the stale-base manifest conflict (the recurring one)

Append-only manifests (the package test-script list, a barrel, a registry) conflict when a branch
forked before the base added entries. **Union = base's full list + the branch's NEW entry.**

```bash
git checkout --ours <manifest>            # take the BASE's full version (has the newest entries)
# append ONLY the entry the branch added (find it: git diff <merge-base>..<branch> -- <manifest>)
perl -0pi -e 's{(<stable-anchor-entry>)}{$1 <branch-new-entry>}' <manifest>
grep -c '<<<<<<<\|>>>>>>>' <manifest>      # must be 0
git add <manifest> && git commit --no-verify --no-edit
```

**Never `git checkout --theirs` the whole manifest** — the branch's stale version is MISSING every
entry the base added since the fork, so you silently drop other people's registered tests/exports.
Always start from `--ours` and add back only what's genuinely new.

## The full gate — run AFTER all branches are merged

Per-branch gating misses cross-package breaks. Run the whole graph:

```bash
<build all>     # e.g. turbo run build  — catches type breaks first (fastest signal)
<test all>      # e.g. turbo run test
<lint all>      # e.g. turbo run lint
```

Paste the real pass/fail counts. Green on all three = the wave is sound. Do not claim done without
this output.

## Fixing the cross-package break the gate catches

Most common: a branch made a field **required** on a shared type (or renamed/added to a shared
contract), breaking sibling fixtures/call-sites that weren't in any branch's diff.

1. Read the error — it names the file:line and the missing/required member.
2. Decide: is `required` the correct contract (the runtime always provides it)? If yes, FIX THE
   CALL SITES (add the field), don't weaken the type. If the field is genuinely optional, make it
   optional instead.
3. The first build often truncates the error list — after fixing the named files, re-run the build
   to surface the next batch; repeat until clean. Use a line-gated `perl` to edit only the exact
   flagged lines when a literal repeats elsewhere validly.
4. Commit the fix as its own `fix(...)` commit explaining the cross-package cause.

## HEAD-hijack / base-rewind recovery

Worktree auto-clean can move the primary HEAD onto an agent branch; a stray reset can move the base
ref backward and orphan committed work. After every cleanup:

```bash
git rev-parse --abbrev-ref HEAD            # should be your base branch
git rev-parse <base>                       # should be >= your known-good SHA
# if HEAD hijacked:
git checkout <base>
# if the base ref moved BACKWARD (lost commits):
git reflog <base>                          # find the real tip
git reset --hard <real-tip-SHA>
```

Mitigations that prevent the incident: cap concurrent worktree agents to a sane number, harvest +
clean serially, note the known-good SHA before each wave, and prefer inline work for tiny tickets
(agents truncate before their first commit anyway).

## Cleanup

```bash
# remove only YOUR merged worktrees — never another session's
git worktree remove --force .../<your-agent-worktree>
git worktree prune
git branch -D <your-merged-branches>       # leave other sessions' branches alone
rm -f .git/gc.log                          # silence the gc nag if it appears
```

Then do ticket bookkeeping: move each merged ticket to its done state with the proving commit SHA in
its banner; split any deferred slice into a NEW follow-up ticket that links back (no buried work);
refresh the board counts.
