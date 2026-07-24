---
name: designing-with-evidence
description: Use when designing any app screen, section, feature, visual direction, or palette — including redesigns, new surfaces, and "make this less complex" work. Also use when a design is finished and needs checking before build.
---

# Designing with Evidence

## Overview

Most design output fails in two ways that are invisible until users hit them: **it omits the
non-visual parts of a screen** (gates, events, states, error paths), and **it asserts claims that
sound like evidence but aren't**.

Both are fixable with structure. This skill supplies the structure.

**Core principle:** a screen is not a picture. It is a contract — what it shows, who may see it,
what it emits, and how it behaves when things go wrong. A design that only specifies the picture
is roughly a third of a design.

## Files in this skill

| File                         | Load when                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `SKILL.md` (this)            | always — design rules, screen contract, anti-slop, process                                                       |
| `evidence-base.md`           | you need the actual numbers, sources, or the do-not-cite list                                                    |
| `implementation-patterns.md` | architecture, packages, tokens, gating, analytics, platform landmines, process discipline, working with an owner |

## Before anything else: open the client's assets

**Do not invent a palette. Find the existing one first.**

```bash
find . -iname "*logo*" -o -iname "*icon*" -o -iname "*favicon*" | grep -v node_modules
grep -rohE "#[0-9a-fA-F]{6}" <email-templates-or-theme-files> | sort | uniq -c | sort -rn
```

A logo file is a design brief. It carries the hue, the letterform, the weight and the level of
confidence the brand already committed to. Designing a palette without opening it produces a
different company's product — and it is the single most common serious error in this work.

If no brand exists, derive one from the subject's own world, then check it against the AI-slop
tells below.

## The screen contract — every screen, every time

The baseline failure this skill exists to fix is **omission**. Fill every field. A screen missing
one is not "mostly designed", it is undesigned in that dimension.

```
### <route or component name> — <human name>
PURPOSE   one line, from the user's point of view
GATE      capability key(s) + quota(s) — or the literal word "none"
EVENTS    exposed / engaged / completed / failed(reason enum) / abandoned
COPY      which copy constant owns these strings
CALC      functions needed + which package owns them
API       endpoints/hooks used
STATES    loading · empty · error · offline · gated · permission-denied
PARITY    what this replaces; anything dropped, with a one-line reason
```

**The five-event contract is what makes a feature measurable.** Without it you cannot tell
_"nobody found it"_ from _"everybody found it and it broke"_ — those need opposite fixes, and
page-view analytics cannot separate them.

- `exposed` — the entry point rendered and was visible
- `engaged` — the user started
- `completed` — it worked
- `failed` — with a **reason enum**, not free text
- `abandoned` — they left mid-flow

**Never put financial data, names, or free text in an event.** Ids, enums, counts, durations,
booleans only. Analytics pipelines are third parties.

**STATES is where designs are thinnest.** Offline and error are real states with real screens, not
footnotes. If data can fail to load, that screen exists — draw it.

## Palette: recipe, not vibes

1. **Derive from existing brand assets** (see above).
2. **Three active hues maximum**, roughly 60% dominant / 30% secondary / 10% accent.
3. **Off-black and off-white, never `#000` or `#fff`.** Pure white on pure black causes halation
   and hurts small numerals worst.
4. **Semantic colour is separate from the accent** and never carries meaning alone — always a word,
   a sign, or an icon alongside.

### The 2026 AI-design tells — check your output against these

Cross-corroborated across independent sources. If your design has these, it reads as machine-made:

- **Any gradient in the 200–290° hue band** (blue→purple/indigo). Tailwind's creator publicly
  apologised for `bg-indigo-500` seeding this.
- **Inter, Roboto, or `system-ui` alone** — measured at 47–73% of AI-generated frontends. A pairing
  is required. Sora, Space Grotesk and Plus Jakarta are the same trap one step later.
- **`rounded-2xl shadow-md` cards floating on a soft tint.** `backdrop-blur` glassmorphism nav.
- **`grid-cols-3` icon + heading + paragraph feature rows.** Uniform `py-20`/`py-24` rhythm.
- **`transition-all duration-300`**, universal fade-up-on-scroll, no `prefers-reduced-motion`.
- **Copy tics:** _delve_ (28× post-LLM frequency), _seamless, elevate, unlock, leverage, robust,
  holistic_; "not just X, but Y"; tricolons; symmetric bullets; emoji in headings.
- **Empty state = centred "Ask me anything."** That is the absence of design.

**Antidote:** write the constraints down as explicit "nevers" _before_ generating, and ship **one
deliberately hand-made element** — a numeral treatment, a custom empty state, a chart nobody else
has. Better prompt adjectives do not work; a written constraint list does.

## Rules that are actually evidence-backed

Full findings, numbers and sources: **`evidence-base.md`** in this skill directory.
The ones violated most often:

| Rule                                                         | Why                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Optimise the cost of logging/entry above features**        | Cost of collection is the #1 documented cause of tracker abandonment (57.1%)                           |
| **Never open with a verdict**                                | The ostrich effect is measured in real login data — usage falls when the news is bad                   |
| **Guilt, never shame**                                       | Shame-primed users made the corrective choice 23% of the time vs 69% guilt-primed                      |
| **AI output must be editable field-by-field**                | Letting users modify an algorithm moved adoption 32%→76%; _how much_ they could change barely mattered |
| **Never show a confidence percentage**                       | Calibrates trust without improving accuracy. Mark the uncertain _field_ instead                        |
| **No welcome tours**                                         | ~92% dismissed; completion falls 40.5%→21% between a 4- and 5-step flow                                |
| **First session must complete something**                    | Ownership effects vanish entirely when a task is abandoned                                             |
| **Progress bars fill for savings, deplete for spending**     | A filling bar toward a spending cap accelerates spending toward the line                               |
| **Zero-baseline every bar chart**                            | 83.5% misjudge truncated bars — and warning them does not help                                         |
| **Every chart needs a sentence takeaway**                    | ~1 in 3 people have both low graph literacy and low numeracy                                           |
| **Text labels on every nav icon**                            | An unlabelled icon got clicks from zero test participants; hidden nav halves discovery                 |
| **44×44 CSS px minimum, ~15 mm physical for commit actions** | From 120M real touch events: error climbs sharply below 15 mm, exceeds 40% below 8 mm                  |
| **Swipe always has a visible fallback**                      | Gesture execution fails for ~1 in 5 even after being taught                                            |

## Do not cite these — they are false

Traced to source and found fabricated or misattributed. Citing them destroys credibility:

- **"The Doherty Threshold — 400 ms feels instant."** The figure appears nowhere in the 1982 IBM
  report. It traces to a blog whose author says he learned it _watching a television drama_.
- **"Nielsen's 0.1/1/10 s comes from Miller 1968."** Miller explicitly rejects a universal number.
- **The thumb-zone heat map.** Its author publicly retracted the framing in 2017; people
  centre-bias and do hit corners.
- **"Skeleton screens improve perceived performance."** The largest controlled test found them
  _worst_ on every measure; a spinner beat them.
- **"Pie charts are bad because people misjudge angles."** Angle is the least-used cue. And there
  is no evidenced maximum slice count.
- **"63% more likely to abandon a habit after one missed day."** Not in its supposed source.
- **Any `prefers-reduced-motion` prevalence figure.** All trace to blogs citing blogs. Honour the
  media query anyway — it costs one query.

**When you find yourself about to cite a number, ask where you read it.** If the answer is "it's
well known", either fetch the source or drop the number and make the argument without it.

## Process for a large surface

1. **Parity inventory first** for any redesign — enumerate what exists before deciding what stays.
   A feature that vanishes without a recorded decision is a regression, not a simplification.
2. **Write a design constitution** — one document of binding rules (vocabulary ban-list, gating,
   copy placement, math placement, chart rules, analytics contract). Every later decision cites it.
3. **Wireframe against the contract above.** Annotations are the deliverable, not decoration.
4. **Independent reconciliation review** before building — different agent/person than the authors.
5. **Phase it.** ~200–400 changed lines per shippable slice.

### Vocabulary is the intuitiveness lever

Ban the domain's internal nouns from the interface. In finance: _ledger, leg, debit, credit,
reconcile, post, rollup, occurrence, series_. Replace with what a person would say: _paid,
received, moved, lent, got back, just this one, all future ones_.

**Never show a signed number to express a relationship.** "Rahul owes you ₹2,400" beats "−2,400",
which needs a convention the user must memorise — and which teams reliably explain three different
ways in three places.

## Multi-agent design: failure modes

When parallel agents produce parts of one design:

| Failure                                                                                                           | Countermeasure                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Binding doc edited mid-flight** — agents read different versions and "resolve" conflicts in opposite directions | Freeze binding docs while agents run. Queue amendments and apply after                                    |
| **Cross-file claims are wrong** — an agent reports a sibling's file as broken because it read a pre-edit version  | **Verify every cross-file claim by grep before acting.** Never relay one agent's report of another's file |
| **Same concept, different names** — tab labels, action verbs, field names drift                                   | Name shared vocabulary in the constitution, in one constant, before fan-out                               |
| **Silent parity regressions** — a feature nobody ported and nobody dropped                                        | Reconciliation pass walks the parity inventory item by item                                               |
| **Two owners for one surface** — first-run designed twice, two copy constants, split funnel                       | Assign each cross-cutting concern to exactly one document, explicitly                                     |

## Common mistakes

| Mistake                                       | Fix                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Palette invented without opening the logo     | Read the brand assets first. Always                                           |
| No analytics events declared                  | Five-event contract per feature, at design time, in the wireframe             |
| STATES omitted                                | Offline and error are screens. Draw them                                      |
| Confidence percentage shown for AI output     | Mark the uncertain field instead                                              |
| A toggle for a feature with no backend        | A preference controlling nothing is a lie. Cut it or design the mechanism     |
| Red for routine negative data                 | Red is for destructive actions and failures. Routine spending is not an error |
| "Users expect…" with no source                | Either cite it or make the argument without the false authority               |
| Adding a config knob "for the future product" | Extract on the third use. Brand-agnostic naming ≠ a config layer              |

## Red flags — stop and re-check

- About to pick a colour without having looked for existing brand assets
- Writing a screen description with no GATE, EVENTS or STATES line
- Reaching for indigo, Inter, `rounded-2xl`, or a centred hero with two buttons
- Citing a UX statistic you cannot name a source for
- Designing a preference toggle before the thing it controls exists
- Relaying another agent's claim about a file you have not read yourself
- Dropping a feature without writing down that you dropped it, and why
