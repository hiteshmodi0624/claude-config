# Bootstrapping the Build/Release Pipeline

Deciding how code gets checked and released is a decision worth making deliberately on day one —
not something that accretes by accident, and not something you're obligated to automate just
because it's possible.

## When to Use

Standing up a brand-new repository and deciding, for the first time, how changes will be checked
and how releases will happen.

## The Process

1. **Decide on purpose whether you want a pipeline that runs on every change, or a controlled
   process a person runs by hand before every release.** Both are legitimate choices — the mistake
   is not deciding, and ending up with neither.
2. **Decide the shape early, even before there's real code to check.** What gates a release is
   worth deciding on day one, even if most of the gates can't do anything useful yet.
3. **Decide the non-negotiable gates** — the small list of things that must be true before
   anything ships: it behaves as tested, it's written to the agreed standard, it actually builds.
4. **If a gate can't possibly pass yet because there's no code for it to check, say so plainly and
   turn it off** — don't leave a check running that's guaranteed to fail; a broken check nobody
   looks at is worse than no check at all, because it trains people to ignore red.
5. **Write down, in plain language, exactly what has to become true before it's turned back on.**
   Someone reading it later shouldn't have to guess why it was disabled.
6. **Decide who or what approves a release** — a human confirming by hand, an automatic decision
   once the gates pass, or some mix — and be explicit about which.
7. **Come back to it once real code exists and make an active decision, not a default.** A
   "temporarily disabled" pipeline that's never revisited quietly becomes "no pipeline" — decide
   that on purpose if that's genuinely the right call, don't let it happen by neglect.

## Signs You Did This Right

- Nobody on the project is confused about what currently gates a release.
- A disabled check has a plain-language reason and a plain-language condition for turning it back
  on — not silence.
- The decision to have (or not have) an automatic pipeline was made once, deliberately, and
  everyone can point to why.

## Anti-patterns

- Wiring a pipeline and leaving it red "for now" instead of turning it off with a stated reason.
- Assuming an automatic pipeline is always the right answer — a single, controlled, human-run
  release process can be the more honest choice for a small or fast-moving project.
- Letting "we'll turn it back on later" quietly become the permanent state without ever deciding
  that on purpose.
