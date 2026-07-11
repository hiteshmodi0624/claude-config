# Writing Onboarding Documentation

The goal is a stranger — human or AI, with zero prior context — reading these documents once and
knowing exactly what to do, without anyone standing over their shoulder.

## When to Use

A new repository needs its first onboarding material, or an existing project's onboarding has
gone stale and new people keep asking the same questions that should already be answered.

## The Process

1. **Write one ordered path from "nothing set up" to "made a first change,"** assuming no prior
   knowledge of this specific project at all. Someone should be able to follow it top to bottom
   without skipping ahead to guess a missing step.
2. **Keep three different kinds of writing separate:** what the product actually is and why it
   exists, how the codebase is put together, and how to do one specific common task. Cramming all
   three into one document makes each harder to find.
3. **List every outside account or access a newcomer will need**, and say plainly who to ask or
   where to request it — don't let "figure out access" become its own hidden onboarding step.
4. **Write down the reasoning behind a decision, not just the decision.** A rule stated without
   its reason gets silently broken by the next person who doesn't understand why it's there.
5. **Describe, concretely, what "a piece of work is finished" looks like** in this specific
   project — not in the abstract, but the actual, checkable bar.
6. **Make updating these docs part of finishing any change that invalidates them.** A stale
   onboarding document is worse than none — it actively sends people down the wrong path with
   false confidence.
7. **Read your own onboarding document back the same day, as a stranger would.** You will find at
   least one gap or one step that assumes knowledge you actually have but a newcomer wouldn't.

## Signs You Did This Right

- A newcomer stops asking questions that are already answered in the docs — and when they do ask,
  the answer is "it's in the doc, and if it's unclear there, that's a real gap, let's fix it."
- Nobody has to keep an unwritten mental list of "the actual current setup steps" in their head.
- The docs read as still-true today, not as a snapshot of how things worked months ago.

## Anti-patterns

- One giant document trying to be the product pitch, the architecture map, and the task
  cookbook all at once.
- Explaining what a rule is without ever explaining why — it invites the rule being "fixed away"
  by someone who didn't know it was load-bearing.
- Letting onboarding docs quietly go stale because updating them didn't feel like "real work."
