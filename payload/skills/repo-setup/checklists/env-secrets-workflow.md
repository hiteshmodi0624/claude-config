# Deciding the Config & Secrets Workflow

Configuration and secrets handling should be a small number of deliberate decisions made once, not
something that grows one inconsistent exception at a time.

## When to Use

Starting a new project, or noticing an existing one has drifted into hand-copied config values,
secrets pasted into places they shouldn't be, or no clear story for how a value gets from "someone
typed it in" to "the running system actually uses it."

## The Process

1. **Decide the small number of environments that genuinely exist.** Resist inventing more than
   you actually need — often a single production environment plus local development is enough,
   and every extra environment is another thing to keep in sync.
2. **Write down every piece of configuration the system needs, in one inventory**, and mark which
   ones are truly required versus optional — so nothing is missing silently at the worst moment.
3. **Decide, as a firm rule, that no secret is ever written directly into code or committed
   anywhere** — and decide instead where secrets genuinely live (a managed, access-controlled
   store), not "wherever was convenient this time."
4. **Decide the one path configuration takes from "a person typed it in" to "the running system
   sees it,"** and make that path a single, repeatable step — never a manual, error-prone copy
   between places.
5. **Decide what happens when a new secret needs adding later: additive only, never a silent
   overwrite** — so a routine update can never accidentally wipe out something already working in
   production.
6. **Name, explicitly, the handful of steps that are genuinely one-time and manual** — creating an
   account, minting a credential only a human can create — versus everything else, which should be
   automated. Write the manual ones down plainly rather than pretending the whole process is
   automatic when it isn't.

## Signs You Did This Right

- Nobody is ever unsure whether a value is safe to say out loud or paste into a chat.
- Adding a new required setting is a documented, one-line addition — not a scramble to remember
  every place it needs to be copied to.
- The honest list of "still-manual, one-time steps" is short, explicit, and nobody's pretending it
  doesn't exist.

## Anti-patterns

- Letting the number of environments grow past what's actually needed, each one slightly out of
  sync with the others.
- A secret living in more than one place with no single source of truth for which copy is current.
- Claiming a fully automated setup while quietly still doing some steps by hand undocumented.
