# Setting Up the AI Coding Harness

Before an AI assistant does real work in a repository, decide on purpose how it should behave —
don't let its habits form by accident through whatever the first few sessions happened to do.

## When to Use

Standing up a new repository (or a new team) that will lean heavily on AI assistants, especially
across many sessions with no memory carried between them.

## The Process

1. **Decide what must be re-said every single turn**, not just once. Pick the handful of rules
   people (and models) forget under pressure or after a long session — those need repeating, not
   just documenting once and hoping it sticks.
2. **Decide what the assistant should already know the moment a session starts** — enough
   situational awareness (what's currently in progress, what's outstanding) that it doesn't waste
   the first few exchanges asking things it could have already known.
3. **Decide what must be blocked outright, regardless of how it's asked.** Some actions are risky
   enough that "the assistant judged it was fine" isn't good enough — decide which ones need a
   hard stop no instruction can override: touching real secrets, rewriting shared history,
   overwriting another person's in-progress work.
4. **Decide what should happen automatically after every change**, quietly, without being asked —
   the small cleanups nobody should have to remember to request each time.
5. **Decide whether this project needs its own specific playbook** for the kind of work it does
   most often, on top of whatever general working habits already exist — a generic process is
   fine until the project has a repeating shape worth encoding specifically.
6. **Test the blocks, don't just declare them.** Try the risky action on purpose and confirm it's
   actually stopped — a rule that was never tested is a rule you're only hoping works.
7. **Treat a surprising action as a missing rule, not a one-off mistake.** Every time the
   assistant does something unexpected, ask what standing instruction should have prevented it,
   and add that instead of just correcting it in the moment.

## Signs You Did This Right

- The assistant stops itself before a genuinely risky action, without being told in the moment.
- Repeated mistakes actually stop repeating, because the fix was made structural, not just
  corrected once in conversation.
- A brand-new session behaves consistently with an experienced one, because the important context
  is re-supplied automatically rather than depending on memory.

## Anti-patterns

- Relying on "I told it once" for a rule that matters every single time.
- Blocking so much that routine, low-risk work now needs constant manual approval — match the
  block to the actual blast radius of the action, not to general nervousness.
- Adding a rule after a mistake but never verifying it would actually have prevented it.
