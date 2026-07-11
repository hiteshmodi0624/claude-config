# Establishing Brand & Copy Foundations

Decide how the product presents itself, and how it speaks, before a single user-facing screen is
built — otherwise every screen quietly invents its own slightly different version of both.

## When to Use

Before any user-facing product work begins, especially on a new product or a new public-facing
surface of an existing one.

## The Process

1. **Decide the product's name, identity, and voice once, in one place.** Every later mention of
   it should be drawn from this decision, not re-typed slightly differently by whoever happens to
   be building that particular screen.
2. **Decide every visual constant in the same pass** — the colors, the typography — for the same
   reason: these tend to drift subtly across a product when each screen picks its own version.
3. **Treat the words a product uses with users as their own concern**, separate from how a screen
   is laid out. Labels, messages, and errors deserve the same one-source-of-truth treatment as the
   visual identity.
4. **Decide, on day one, whether the product will ever need more than one language** — even if
   today's answer is "just one." Deciding this later, after screens already assume a single
   language, is far more expensive than deciding it now.
5. **Make it a standing rule that no screen invents its own wording or its own colors inline** —
   it always draws from the one source of truth, without exception.
6. **Build nothing else user-facing until this foundation exists.** Every later screen should be
   assembling from an already-decided identity and vocabulary, not improvising around a gap.

## Signs You Did This Right

- The product's name, colors, and tone read consistently no matter which part of the product
  you're looking at.
- Adding a new language later is a data problem, not a redesign — because no screen ever assumed
  there'd only be one.
- Nobody has to ask "what's our exact wording for this kind of error" — there's already an answer.

## Anti-patterns

- Letting the first few screens each invent their own wording and colors "just to ship something,"
  assuming it'll get unified later — it rarely does.
- Treating multi-language support as a problem for a future redesign rather than a day-one
  decision, even if the first language shipped is the only one for a long while.
- Building user-facing product screens before this foundation exists at all.
