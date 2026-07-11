---
name: review-uncommitted
description: "Review the current working-tree changes (staged + unstaged + untracked vs HEAD) against the five engineering principles before committing. Catches scope creep / unneeded dependency bumps, verifies the goal is actually complete, runs tests to green, and reports ONLY verified, non-hallucinated findings. Trigger: 'review uncommitted', 'review my changes', 'review before commit', 'review working tree'."
---

# review-uncommitted

Review everything not yet committed. Same engine as `review-branch`; the only difference is the
**diff scope** below. The full review logic lives in the shared checklist — read it and follow
all seven lenses:

**Read first:** `~/.claude/skills/_shared/review-checklist.md`

## Diff scope for this skill

Capture the complete uncommitted change set — staged, unstaged, AND untracked:

```bash
git status --short                          # overview, including untracked
git diff HEAD                               # staged + unstaged vs HEAD (tracked files)
git ls-files --others --exclude-standard    # list untracked files...
# ...then read each untracked file in full — new files are part of the change
```

`git diff HEAD` omits untracked files, so reading them explicitly is mandatory — a new file is
exactly where scope creep and missing tests hide.

## Then run the shared 7-lens engine

Against that scope, run lenses 1-7 from the shared checklist:

1. Scope discipline — flag out-of-scope edits and **unneeded dependency/version bumps**.
2. Goal completeness — is the change actually done? verdict COMPLETE / INCOMPLETE.
3. Principle adherence — phased? test-first? low-coupling? library-first? flag deviations.
4. Correctness bugs — reuse `/code-review` for the bug pass where available.
5. Tests to green — run the suite + `tsc`/build; paste real output; loop to green.
6. Anti-hallucination pass — verify every finding at `path:line`; default-reject the unverifiable.
7. Output — verified findings only, in the shared report format.

## Goal note

The point of this skill is to catch problems **before they are committed** — especially scope
creep and incomplete work — so the eventual PR is small, focused, and merges without many
iterations. If the working tree is drifting from the five principles, say so plainly.
