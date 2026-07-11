---
name: review-uncommitted
description: "Reviews the working tree — staged, unstaged, and untracked changes vs HEAD — against the five engineering principles. Use before committing a finished change, or when the user says 'review uncommitted', 'review my changes', 'review before commit', 'review working tree'. Not for reviewing a whole branch or PR — use review-branch for that."
---

# review-uncommitted

Review everything not yet committed. **Same 7-lens engine as `review-branch`; this wrapper
only defines the diff scope.** The full review logic lives in the shared engine — read it and
follow all seven lenses:

**Read first:** `~/.claude/skills/_shared/review-checklist.md`
Lenses: 1 scope discipline · 2 goal completeness · 3 principle adherence · 4 correctness ·
5 tests to green · 6 anti-hallucination verify · 7 report.

## Checklist

Copy and tick off:

```
- [ ] Read ~/.claude/skills/_shared/review-checklist.md
- [ ] Step 0: state the goal of the change in one sentence
- [ ] Capture the scope with the commands below — including every untracked file
- [ ] Run lenses 1–4 (parallelizable as subagents); lens 5 in the main context
- [ ] Lens 6: adversarially refute every candidate; default-reject the unverifiable
- [ ] Report in the shared format — verified findings only, candidates-vs-verified counts
```

## Diff scope for this skill

Capture the complete uncommitted change set — staged, unstaged, AND untracked:

```bash
git status --short                          # overview, including untracked
git diff HEAD                               # staged + unstaged vs HEAD (tracked files only)
git ls-files --others --exclude-standard    # list untracked files...
# ...then read each untracked file in full — new files are part of the change
```

**Hard rule — untracked files are mandatory reading.** `git diff HEAD` silently omits them,
and a brand-new file is exactly where scope creep, missing tests, and stub implementations
hide. A review that skipped untracked files reviewed only part of the change.

## Why this exists

Catch problems **before they are committed** — especially scope creep and incomplete work —
so the eventual PR is small, focused, and merges without many iterations. If the working tree
is drifting from the five engineering principles, say so plainly.
