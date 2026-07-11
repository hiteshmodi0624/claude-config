---
name: feature-start
description: "Run BEFORE any new feature, architecture, product, or non-trivial change. Front-loads the five engineering principles (design-fit & business value, library-first, phased delivery, test-first/TDD, low-coupling/minimal-deps) as a preflight, then hands off to superpowers:brainstorming (or feature-factory in OpsPilot) for the design dialogue. Trigger: build/create/implement/add/'new feature'/'new architecture'/'new product'/redesign."
---

# feature-start — engineering principles preflight

Invoke this the moment work is "build / create / implement / add / design a new feature,
architecture, or product." It does NOT do the design dialogue itself — it front-loads the five
principles, then delegates to brainstorming so the design is principled from line one.

Create a TodoWrite item per lens and complete them in order. Keep answers concrete; if a lens
needs the user, ask one question at a time.

## Lens 1 — Design-fit & business value

- What business problem does this solve, in one sentence?
- How does it fit the existing application — which subsystems it touches, what it reuses.
- What is the **thinnest slice that delivers value**? (Feeds Lens 3.)

If it does not fit the app or has no clear business value, surface that to the user before
designing anything.

## Lens 2 — Library-first (the "don't reinvent" rule)

- Search for an existing, vetted library/tool/service that already does this — including a
  **web search** when the space is unfamiliar.
- Record what exists and the explicit **build-vs-adopt decision** with its reason.
- Default to adopting a well-maintained library over hand-rolling; default to a small in-repo
  unit over a heavy dependency for something trivial. State which way you went and why.

## Lens 3 — Phased delivery

- Decompose into **independently shippable phases**. Define **Phase 1 = the smallest useful
  slice** that ships and can be reviewed on its own (e.g. "add a queue + error handling" before
  the whole pipeline). List later phases as a backlog.
- Target small PRs: ~200-400 changed lines review ~3x faster and carry ~40% fewer defects than
  large ones. If a phase is much bigger, split it further.
- Use feature toggles to merge incomplete-but-safe code rather than one giant branch.
- Output: an ordered phase list. Only Phase 1 goes into this design cycle; the rest are
  recorded for later spec→plan cycles.

## Lens 4 — Test-first (TDD-as-spec)

- Enumerate the **test specs that define "done"** for Phase 1 — the behaviors, edge cases, and
  failure paths. These are written first and must fail before implementation.
- The tests are the specification. No implementation is designed that no test pins down.

## Lens 5 — Low-coupling / minimal-deps design

- Shape Phase 1 as **self-contained units** with one clear responsibility, communicating through
  narrow interfaces, **unit-testable without heavy mocking**.
- Minimize external dependencies and off-site/network calls — add them only when genuinely
  required. Inject IO (clock, network, fs) so units stay pure and testable.

## Terminal step — hand off to the design dialogue

Carry the five lenses' answers forward and invoke the right design skill:

- **In the OpsPilot repo** → invoke `feature-factory` (its spec→test→impl loop already encodes
  the repo's hard rules).
- **Anywhere else** → invoke `superpowers:brainstorming`, feeding in the Phase-1 slice, the
  build-vs-adopt decision, the phase list, and the test specs.

Do not write implementation code here. This skill ends by delegating to the design skill.

## Deviation-flag mandate

If at any point the work starts to ignore a principle (one giant unphased build, no failing
tests first, a dependency added without a library-first check), stop and tell the user plainly:
_"This was set as an engineering rule, and X is not following it."_
