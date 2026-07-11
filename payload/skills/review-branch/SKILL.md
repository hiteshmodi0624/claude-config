---
name: review-branch
description: "Reviews the entire current branch vs its base (git merge-base) against the five engineering principles. Use before opening or merging a PR, when a finished branch needs a final check, or when the user says 'review branch', 'review the PR', 'review before merge', 'review this branch'. Not for uncommitted working-tree changes — use review-uncommitted for those."
---

# review-branch

Review the whole branch as it will land in the PR. **Same 7-lens engine as
`review-uncommitted`; this wrapper only defines the diff scope.** The full review logic lives
in the shared engine — read it and follow all seven lenses:

**Read first:** `~/.claude/skills/_shared/review-checklist.md`
Lenses: 1 scope discipline · 2 goal completeness · 3 principle adherence · 4 correctness ·
5 tests to green · 6 anti-hallucination verify · 7 report.

## Checklist

Copy and tick off:

```
- [ ] Read ~/.claude/skills/_shared/review-checklist.md
- [ ] Compute the merge-base diff scope with the commands below
- [ ] Step 0: state the branch goal in one sentence (commit log is the primary source)
- [ ] Run lenses 1–4 (parallelizable as subagents); lens 5 in the main context
- [ ] Lens 1 extra: flag commits/files unrelated to the branch's story
- [ ] Lens 6: adversarially refute every candidate; default-reject the unverifiable
- [ ] Report in the shared format — verified findings only, candidates-vs-verified counts
```

## Diff scope for this skill

Diff the entire branch against where it forked from its base (default base `main`; use the
repo's actual default branch — `develop`/`master` — if that is the integration target):

```bash
git rev-parse --abbrev-ref HEAD                       # current branch
BASE=main                                             # or develop/master per repo
MB=$(git merge-base "$BASE" HEAD)                     # fork point
git diff --stat "$MB"..HEAD                           # changed-files overview
git diff "$MB"..HEAD                                  # full branch diff
git log --oneline "$MB"..HEAD                         # commits = the branch's story/goal
```

**Why merge-base:** a raw `main..HEAD` diff attributes base-branch commits to this branch —
the merge-base isolates only what this branch adds. The commit log is the primary input to
Step 0's goal statement.

## Branch-specific check (add to Lens 1)

Flag **commits or files unrelated to the branch's stated goal** — a branch should tell one
coherent story. An unrelated commit is a scope-discipline finding even when its individual
hunks look harmless.

## Why this exists

A PR should merge **without many iterations**: the branch's goal fully met, nothing extra
crept in, every reported finding real. If the branch is too large to review as one PR, that is
itself a phased-delivery finding — recommend splitting it.
