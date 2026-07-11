---
name: feature-start
description: "Engineering-principles preflight gate before feature design begins. Use when work is about to start on a new feature, architecture, product, or non-trivial change, or when the user says 'build', 'create', 'implement', 'add', 'new feature', 'new architecture', 'new product', 'redesign'. Not for trivial one-line fixes or reviewing finished work — use review-uncommitted or review-branch for that."
---

# feature-start — engineering-principles preflight

Run this the moment work turns into "build / create / implement / add / design something new" — before any design dialogue and before any code. **Answer the five engineering lenses first, then hand the answers to the design skill; never design or implement inside this skill.**

## When to use / when NOT to use

- Use for: any new feature, architecture, product, or non-trivial change about to begin.
- Skip for: one-line fixes and typos (just do them); reviewing finished work (review-uncommitted / review-branch); mid-implementation drift (re-run only the affected lens, and apply the deviation-flag mandate below).

## Procedure

Create a task per lens (use whatever task tracking the harness provides) and complete them in order. Keep answers concrete; if a lens needs the user, ask one question at a time.

```
Preflight checklist
- [ ] Lens 1 — design-fit & business value stated
- [ ] Lens 2 — build-vs-adopt decision recorded with reason
- [ ] Lens 3 — ordered phase list; Phase 1 named
- [ ] Lens 4 — Phase-1 test specs enumerated
- [ ] Lens 5 — units/interfaces shaped; deps + IO injection stated
- [ ] Preflight summary block filled
- [ ] Handed off to the design skill with the block
```

### Lens 1 — design-fit & business value

- State the business problem this solves in one sentence, and how it fits the existing application: subsystems touched, what it reuses.
- Name the **thinnest slice that delivers value** (feeds Lens 3).
- If it does not fit the app or has no clear business value, surface that to the user before designing anything.

### Lens 2 — library-first (don't reinvent)

- Search for an existing, vetted library/tool/service that already does this — including a **web search** when the space is unfamiliar.
- Record what exists and the explicit **build-vs-adopt decision** with its reason.
- Defaults: a well-maintained library over hand-rolling; a small in-repo unit over a heavy dependency for something trivial. State which way you went and why.

### Lens 3 — phased delivery

- Decompose into **independently shippable phases**. Phase 1 = the smallest useful slice that ships and can be reviewed on its own (e.g. "add a queue + error handling" before the whole pipeline).
- Keep a phase to ~200-400 changed lines (reviews ~3x faster, ~40% fewer defects); split anything bigger.
- Use feature toggles to merge incomplete-but-safe code rather than one giant branch.
- Output: an ordered phase list. Only Phase 1 enters this design cycle; record the rest for later spec→plan cycles.

### Lens 4 — test-first (TDD-as-spec)

- Enumerate the **test specs that define "done"** for Phase 1 — behaviors, edge cases, failure paths. These are written first and must fail before implementation.
- The tests are the specification. Design nothing that no test pins down.

### Lens 5 — low-coupling / minimal deps

- Shape Phase 1 as **self-contained units** with one clear responsibility, narrow interfaces, **unit-testable without heavy mocking**.
- Minimize external dependencies and off-site/network calls — add them only when genuinely required. Inject IO (clock, network, fs) so units stay pure and testable.

## Output contract — preflight summary block

Fill this block (one line per lens) and carry it verbatim into the design dialogue:

```
PREFLIGHT SUMMARY
Fit/value:   <business problem in one sentence; subsystems touched/reused>
Build/adopt: <adopt <library> | build in-repo — one-line reason>
Phases:      <Phase 1 = smallest useful slice; later phases listed>
Test specs:  <the failing-test specs that define Phase-1 "done">
Coupling:    <units + interfaces; IO injected; new deps: none | list>
```

## Terminal step — hand off to the design dialogue

- If the current repo provides its own feature-design skill (check the available-skills list and the repo's CLAUDE.md; e.g. a `feature-factory`), invoke it — it already encodes the repo's hard rules.
- Otherwise invoke `superpowers:brainstorming`.

Open the design dialogue with the preflight summary block. Do not write implementation code here — this skill ends by delegating to the design skill.

## Deviation-flag mandate (hard rule)

If at any point the work starts to ignore a principle — one giant unphased build, implementation before a failing test, a dependency added without a library-first check — stop and tell the user plainly:

_"This was set as an engineering rule, and X is not following it."_

WHY: this exact sentence is quoted by the user's global rules and hooks — it is the agreed drift signal. Keep the wording verbatim.

## Common mistakes

| Rationalization                                    | Reality                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "The feature is obvious — skip the preflight"      | Obvious features are where scope balloons; five one-line answers cost minutes.                |
| "I'll pick a library during implementation"        | A build-vs-adopt decision made after code exists is sunk cost, not a decision. Record it now. |
| "Phase 1 is the whole feature; it's all connected" | If it cannot ship and be reviewed alone at ~200-400 lines, split further.                     |
| "Design now, write tests later"                    | The tests are the spec; anything no test pins down is undesigned.                             |
