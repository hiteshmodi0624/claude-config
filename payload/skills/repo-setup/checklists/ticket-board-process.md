# Standing Up the Work-Tracking Board (Process)

The backlog should be written down before work starts, as the actual roadmap — not filled in
gradually as an afterthought once people are already mid-task. This is the decision-making
process; for the technical engine (frontmatter schema, generated indexes, CLI commands), see
[checklists/ticket-board-and-tools.md](ticket-board-and-tools.md).

## When to Use

Starting a new project and deciding, for the first time, how work will be tracked. Also use when
an existing project's "tracking" has become scattered across chat, memory, and tribal knowledge.

## The Process

1. **Decide the one place that holds the true state of a piece of work.** Not scattered across
   conversations or people's memory — one place, checked before trusting any other account of
   what's done.
2. **Decide the small set of states a piece of work can be in**, and make sure every state means
   exactly one unambiguous thing to everyone using it.
3. **Before any work starts, write down the full backlog of everything you believe needs
   building.** The backlog itself is the roadmap — it should exist as a complete first draft, not
   accumulate one item at a time as work happens to get discovered.
4. **Group the backlog along the product's natural seams** (by data source, by user-facing
   surface, by underlying capability) so related work stays easy to find as the list grows.
5. **Keep an explicit, permanent "we decided not to build this, and here's why" list.** This isn't
   a todo list — it's a guardrail so a rejected idea doesn't get silently re-proposed every few
   months by someone who wasn't there for the original decision.
6. **Decide how one piece of work depends on another**, so it's clear what can start immediately
   versus what has to wait — this matters even more once multiple people or agents work in
   parallel.
7. **Decide the retirement process** — how something gets marked genuinely finished and moved out
   of the active view, and who or what makes sure the record of what was actually done doesn't get
   lost in the process.
8. **Step back periodically and look at the whole backlog, not just item by item.** This is the
   only way to catch the roadmap quietly drifting away from what the product actually needs now.

## Signs You Did This Right

- Anyone can answer "what's the current state of X" by looking in one place, with confidence.
- The rejected-ideas list actually stops the same forbidden idea from being re-proposed and
  re-argued from scratch.
- Looking at the backlog as a whole tells a coherent story of where the product is headed, not
  just a pile of disconnected tasks.

## Anti-patterns

- Starting real work before the initial backlog is written down — work discovered piecemeal tends
  to miss the bigger picture the backlog was supposed to capture.
- A "rejected ideas" list that isn't actually consulted, so the same forbidden feature gets
  re-proposed and re-argued every few months.
- Letting "done" work linger in the active view indefinitely, so the active list stops being a
  reliable picture of what's actually outstanding.
