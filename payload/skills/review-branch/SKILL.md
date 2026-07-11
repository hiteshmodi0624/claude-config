---
name: review-branch
description: "Review the entire current branch vs its base (git merge-base) against the five engineering principles before opening or merging a PR. Catches scope creep / unneeded dependency bumps across the whole branch, verifies the PR goal is actually complete, runs tests to green, and reports ONLY verified, non-hallucinated findings. Trigger: 'review branch', 'review the PR', 'review before merge', 'review this branch'."
---

# review-branch

Review the whole branch as it will land in the PR. Same engine as `review-uncommitted`; the
only difference is the **diff scope** below. The full review logic lives in the shared
checklist — read it and follow all seven lenses:

**Read first:** `~/.claude/skills/_shared/review-checklist.md`

## Diff scope for this skill

Diff the entire branch against where it forked from its base (default base `main`; use the
repo's actual default branch — `develop`/`master` — if that is the integration target):

```bash
git rev-parse --abbrev-ref HEAD                       # current branch
BASE=main                                             # or develop/master per repo
MB=$(git merge-base "$BASE" HEAD)                      # fork point
git diff --stat "$MB"..HEAD                            # changed-files overview
git diff "$MB"..HEAD                                   # full branch diff
git log --oneline "$MB"..HEAD                          # commits = the branch's story/goal
```

Using the merge-base (not a raw `main..HEAD`) avoids attributing base-branch commits to this
branch. The commit log gives the branch's intended goal for Step 0.

Also flag, under Lens 1, **commits or files unrelated to the branch's stated goal** — a branch
should tell one coherent story.

## Then run the shared 7-lens engine

Against that scope, run lenses 1-7 from the shared checklist:

1. Scope discipline — flag out-of-scope files/commits and **unneeded dependency/version bumps**
   anywhere in the branch.
2. Goal completeness — is the PR's goal fully delivered? verdict COMPLETE / INCOMPLETE.
3. Principle adherence — is the branch a focused, shippable slice or an oversized everything-PR?
   tests written first? low-coupling? library-first? flag deviations.
4. Correctness bugs — reuse `/code-review` for the bug pass where available.
5. Tests to green — run the suite + `tsc`/build; paste real output; loop to green.
6. Anti-hallucination pass — verify every finding at `path:line`; default-reject the unverifiable.
7. Output — verified findings only, in the shared report format.

## Goal note

The point of this skill is to make sure a PR merges **without many iterations**: the branch's
goal is fully met, nothing extra crept in, and the findings handed back are all real. If the
branch is too large to review as one PR, that itself is a phased-delivery finding — recommend
splitting it.
