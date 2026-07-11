# Choosing Repo-Wide Tooling Standards

A handful of standing decisions, made once at the very start, save endless small re-arguments
later — pick them deliberately rather than letting the first contributor's habits become the
accidental standard.

## When to Use

Starting a new codebase, especially one where multiple people or many separate AI sessions will
be contributing over time without necessarily talking to each other first.

## The Process

1. **Decide the strictness level for the whole codebase up front.** Starting strict is far
   cheaper than tightening the rules onto code that already exists and already breaks them.
2. **Pick one test approach and one style/consistency checker for the whole project.** Having two
   competing tools for the same job isn't flexibility — it's a permanent source of confusion about
   which one is authoritative.
3. **Decide the bar a piece of work must clear before it's acceptable, and make that bar absolute**
   — "no warnings" is a real bar; "warnings are usually fine" quietly isn't a bar at all.
4. **Pick exactly one way dependencies get installed and managed**, and make it structurally hard
   to accidentally use a different one — inconsistent tooling here causes subtle, hard-to-diagnose
   breakage later.
5. **Decide how a growing codebase avoids re-checking everything for every small change.** Only
   the parts actually affected by a change should need re-verifying, so feedback stays fast as the
   project grows instead of getting slower with every addition.
6. **Write these decisions down once, right at the start**, so they're a settled fact newcomers
   read rather than a debate that gets reopened every few months.

## Signs You Did This Right

- New contributors don't ask "which tool should I use for X" — there's already one obvious answer.
- The acceptable-quality bar hasn't quietly slipped over time; it's the same bar today as it was
  on day one.
- Feedback on a small change stays fast even as the codebase grows much larger.

## Anti-patterns

- Letting strictness be "whatever the first few contributors happened to do," then trying to
  retrofit stricter standards onto a codebase that's already grown past them.
- Allowing two tools to coexist for the same job "just in case," which mostly just creates
  confusion about which one to trust.
- A quality bar that's technically defined but routinely waved through in practice — that's not a
  bar, that's a suggestion.
