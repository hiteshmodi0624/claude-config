# Implementation patterns

Architecture, package boundaries and landmines that survive across projects. Companion to
`SKILL.md` (design rules) and `evidence-base.md` (research).

---

## 1. Cross-platform component architecture

**The decision that matters: do NOT adopt a cross-platform styling runtime** (Tamagui, NativeWind,
react-strict-dom, Unistyles) unless you have re-verified the landscape. As of mid-2026:

- `react-native-web` — the substrate all of them sit on — had **stalled** (no commits for ~9 months)
  and costs **~75 KB gzip** before any component code.
- The "modern" NativeWind v5 / gluestack v5 branch **had no Next.js support at all**.
- **Every layer below styling is platform-specific anyway.** Radix, Base UI, Ark/Zag and React Aria
  are all DOM-only (Ark's "framework-agnostic" claim is scoped to _browser_ frameworks — its
  machines call `document.querySelectorAll`). Virtualizers, charts, date pickers, motion and
  keyboard handling do not cross the runtime.

So a styling runtime buys the _cheapest_ layer and never delivers "write once".

**Instead — one package, one public API, two implementations:**

```
packages/ui/src/primitives/<Name>/
  index.ts          # the contract — one type BOTH skins must satisfy
  use<Name>.ts      # shared hook, owns ALL state, returns props
  <Name>.web.tsx    # markup only
  <Name>.native.tsx # markup only (added when the native app starts, not before)
```

Web bundlers resolve `.web.tsx`; Metro resolves `.native.tsx`. One import path for every app.

**Rules that keep it honest:**

- The hook owns _all_ state. Skins own only markup.
- A prop one skin needs and the other doesn't is a **design smell to fix**, not a feature to add.
- **Extract on the third use, not the first.** Speculative generality is what makes codebases
  hard to change.

**The asymmetry that justifies it:** if a unified runtime later becomes viable, you still keep the
tokens, the brand package, the hooks, the display models and the shared logic layer. You lose only
the thinnest, most replaceable layer. That trade is why the split wins even if you're wrong.

---

## 2. Design tokens: the four-consumer problem

A token system usually has to serve more than the web app. Enumerate consumers **before** picking a
tool:

| Consumer             | Needs                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Web app              | CSS custom properties / Tailwind theme                                        |
| Native app           | plain JS style objects (no CSS cascade, no media queries)                     |
| **HTML email**       | **fully-resolved literal values** — clients strip classes _and_ CSS variables |
| Second brand/product | same token _names_, different values, swapped at build                        |

**The email row disqualifies most options.** A CSS-variable-only system cannot produce inline-styled
email. StyleX is compiler-locked (values unreadable as plain JS). Panda CSS has no native story.

**Working pipeline:** DTCG JSON source → **Style Dictionary** → four artifacts per brand.

```
packages/tokens/
  src/core/          # brand-agnostic: spacing, radii, type, motion, breakpoints, z, elevation
  src/brands/<name>.json   # palette + type family only, referencing core
  build.mjs          # brand × platform
  dist/<brand>/
    tokens.css         # :root { --color-*: … }        → web
    tailwind.cjs       # theme object                   → web
    tokens.native.ts   # flat JS object                 → native
    tokens.literal.ts  # every ref resolved to literals → email
```

Style Dictionary wins because it is a **format generator, not a styling engine** — that is exactly
the property that lets it serve incompatible consumers.

**Rules:**

- `dist/` is gitignored and CI-generated. A hand-edited generated file is a defect.
- The web skin writes `var(--color-*)` or utility classes — **never a literal**.
- A second brand is a build-time swap. Components reference token _names_ only, never
  `brandNameAmber`.
- Add the token build as a turbo `dependsOn` edge before UI and email packages.

**A separate `brand` package** (product name, domains, sender identities, logo assets, social,
store ids, legal entity) is plain TypeScript with **no build step** — it is data, not tokens. Keep
both packages **zero-dependency leaves** so anything can import them without creating cycles.

---

## 3. Package boundaries

| Package           | Holds                                                       | Never holds                                   |
| ----------------- | ----------------------------------------------------------- | --------------------------------------------- |
| `tokens`          | every style primitive                                       | anything brand-specific                       |
| `brand`           | identity data                                               | style values                                  |
| `ui`              | components (hook + skins)                                   | business logic, math, API calls, copy strings |
| `api`             | the **only** bridge to the backend                          | business decisions                            |
| `<domain>-shared` | math whose signature mentions a domain type; display models | React components                              |
| `calculations`    | math on primitives only                                     | domain-type imports                           |
| `copy`            | every user-visible string                                   | logic                                         |
| `entitlements`    | capability keys, plan policy, quotas, guards                | UI                                            |
| `analytics`       | typed event union + one `track()` facade                    | direct SDK calls from app code                |

**Math placement rule:** does the function signature mention a domain/schema type?
Yes → domain-shared. No → primitives-only package. **Never in a component or handler.**
If an arithmetic step needs a name to be understood, give it that name in the right package.

**Watch for dependency cycles.** If `schemas` already depends on `calculations`, then `calculations`
must never import `schemas` — that's why the leaf-vs-domain split is load-bearing rather than
stylistic.

---

## 4. The API layer

**One package is the only thing that talks to the backend.** No component, page or hook outside it
may call `fetch`. This is grep-able, so make it a CI check.

Three layers:

- **transport** — the typed client
- **contracts** — types from the schema package **plus runtime response validation**, so a backend
  change fails loudly at the boundary instead of rendering `undefined` into a money figure
- **hooks** — query/mutation hooks owning query keys, invalidation, optimistic updates, **and the
  offline outbox**

**Why it earns its place:**

- It is the only layer a second platform must swap (token storage and network differ; everything
  above is identical).
- Query keys and invalidation live in one place — scattered invalidation is where stale-balance
  bugs come from.
- The offline outbox belongs here, not in the app, or the second platform reimplements it.
- Entitlement/quota errors are normalized once, so one paywall component switches on one shape.

**Keep it thin.** It moves data; it does not decide anything.

---

## 5. Entitlements and gating

**Two gate types that fail differently:**

- **Capability** — boolean. Can you do this at all.
- **Quota** — numeric, often with rolling windows. You can, but you've used 47 of 50.

**Rules:**

- Gating is a **primitive component**, not per-screen `if` statements. A component declares the
  capability it needs; the gate decides render / disable-with-reason / upsell.
- **Every feature declares its capability key at design time, in the wireframe.**
- **Quota gates show what remains _before_ the wall**, never an error after. A meter that fails
  open on fetch error is correct — a timeout must never fabricate a paywall.
- **One paywall component**, always at the point of the blocked action, naming what is blocked,
  what unblocks it, and the price.
- **Client gating is UX only. The server stays authoritative.**
- **Opt-out ≠ gate.** A user opt-out renders _nothing_; a capability gate renders the control
  _disabled_ with the paywall. State that rule once, globally.

**Read the actual policy code before designing gates.** Design work reliably uncovers live
packaging bugs: capabilities defaulted off for every tier (so the feature is unreachable),
binary gates where a windowed one was intended, quota constants that no tier sets. **Collect every
required policy edit into one tracked list** and land them as a single deliberate change with
tests — discovering them one at a time during implementation is how billing breaks on staging.

---

## 6. Analytics that answers "is this working"

- **Typed event union.** Event names are a TypeScript union, not strings. Adding a feature without
  declaring its events is a **compile error**.
- **One `track()` facade.** No component calls a vendor SDK directly.
- **Five-event contract per feature:** `exposed / engaged / completed / failed(reason) / abandoned`.
  This yields a per-feature funnel automatically, which distinguishes _discoverable-but-unwanted_
  (high exposure, low engagement) from _wanted-but-broken_ (high engagement, low completion). Those
  need opposite fixes and page-view analytics cannot tell them apart.
- **Emit from the primitives** so coverage is free: the sheet emits opened/abandoned, the gate emits
  blocked-with-capability-and-plan, the form emits validation-failure reasons.
- **Gate-blocked events are a pricing instrument** — what users try to do and can't, by plan.
- **Instrument the north-star metric once, in one place, under one name.** Three teams instrumenting
  "time to complete the core action" under three names means no dashboard can sum it.
- **Never send financial data, names, or free text.** Ids, enums, counts, durations, booleans.

---

## 7. Platform landmines

Re-verify these; they were true in mid-2026 and cost real time.

- **Do not upgrade zod 3 → 4 if React Native is a target.** Three separate RN/Hermes failures:
  `navigator.userAgent` read unconditionally, Hermes `instanceof` breaking schemas, and
  react-hook-form resolvers **silently failing to submit**.
- **In shared form code use `Controller`/`useController`, never `register`.** `register()` needs a
  DOM ref; RN's `TextInput` has none, so it fails _silently_ — values untracked, validation never
  fires.
- **React Native has no variable-font-axis support.** Build the type scale on discrete static
  weights (400/500/600/700). Never put `font-variation-settings` in a token.
- **Never ship Reanimated to a web bundle.** Its web mode is JS-only and the Babel worklets plugin
  can inflate a web bundle badly if mis-scoped.
- **Skia on web downloads ~2.9 MB gzip of CanvasKit WASM.** Fine on native, disqualifying on a
  performance-sensitive web page.
- **Charts belong behind a route-level dynamic import**, never in the home-screen bundle.
- **Prefer `content-visibility: auto` + `contain-intrinsic-size` over a JS virtualizer** for
  few-hundred-row lists — Baseline since late 2025, and it avoids scroll-anchoring bugs. Keep the
  virtualizer as a measured escape hatch.
- **Keyboard-stable layout:** anchor fixed panels to `window.visualViewport`, never
  `window.innerHeight`. iOS Safari resizes only the _visual_ viewport; Android Chrome converged on
  the same behaviour in Chrome 108. `VirtualKeyboard API` / `env(keyboard-inset-*)` is **not**
  Baseline. Extract the geometry as a **pure function** so it is testable in Node and portable to
  the native adapter.
- **`Intl.NumberFormat` compact notation is broken for `en-IN`** — renders ₹1,00,000 as "100K"
  instead of "1L". Grouping is correct; short forms must be hand-rolled.

---

## 8. Process discipline

**Phased delivery.** Independently shippable slices, ~200–400 changed lines. Phase 1 is the smallest
thing that ships real value. Feature-flag incomplete-but-safe code rather than running a long branch.

**Test-first.** Failing specs before implementation. Co-locate tests **and register them in the
owning package's test script** — an unregistered test never runs, which is worse than no test
because it looks like coverage.

**Per-phase gate:** test, lint, build green. Flows touched → integration/e2e.

**Independent reviewer per phase, never the implementer.**

**Ship the new thing in parallel behind a flag.** Leave the old app untouched until parity is
proven, then switch.

**Update env/secret templates in the same commit** as the var change. Templates are the
documentation.

**Verify, don't relay.** When one agent or person reports that another's file is broken, **grep it
yourself before acting**. Concurrent work produces false positives constantly — reports are read
against pre-edit versions. A ten-second check prevents hours of pointless rework.

**Freeze binding documents while parallel work runs.** Editing a spec that agents are actively
reading makes them resolve the same phantom conflict in opposite directions. Queue amendments.

---

## 9. Working with an owner

**Decide the routine, escalate the load-bearing.** Ask when different answers produce materially
different work; decide and state your reasoning otherwise.

**Record every decision with its trade-off**, including the ones you argued against. A decision log
that only contains agreements is useless six weeks later when someone asks why.

**Surface contradictions between the owner's own decisions.** "You chose X earlier and Y now; these
conflict because Z" is one of the most valuable things you can do — and much cheaper before code
than after.

**State a concern once, then build what was asked.** If the owner reaffirms, document the concern
in the spec and proceed. Repeating an objection is not diligence.

**Name the metric that would prove the concern real.** "Watch conversion and D30 together; if
conversion holds but D30 collapses, this is the cause" turns a disagreement into a testable claim.

**Own errors plainly and move on.** "I designed a palette without opening the logo — straight miss"
costs one sentence and buys the credibility you need for the next recommendation.
