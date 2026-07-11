# Writing the Governance Rulebook

Every durable codebase needs one rulebook written before the first line of product code, not
grown line by line as problems come up. This is the process for writing it — no code, no file
paths, just the decisions and the order to make them in.

## When to Use

Starting a brand-new product from scratch, especially one that will be built largely by AI
assistants across many sessions with no shared memory between them. Also use when an existing
project has never had this written down and keeps re-litigating the same arguments.

## The Process

1. **Name the non-negotiables first.** Before anything else, write down the two or three rules
   that, if broken, mean the product is wrong by definition — not "bad practice," but actually
   broken. These are usually about trust, safety, or what the product promises to never do.
2. **Describe the shape of the system in plain words.** What are the major parts, what is each
   one responsible for, and — just as important — what is each part never allowed to do or know
   about. You're drawing boundaries, not a diagram.
3. **Decide how "working" gets proven.** What has to be demonstrated before a piece of work counts
   as done — and decide this is proven before code is written, not after.
4. **Decide where configuration and secrets live**, in principle — and state plainly that neither
   is ever typed directly into product code.
5. **If the product uses AI internally, write its leash.** What is it allowed to decide on its
   own, and what must always be left to a human or to the underlying evidence? Be explicit about
   anything the AI must never be allowed to judge or decide.
6. **If AI usage will run at volume, decide the cost discipline up front** — the order of
   preference for cheap vs. expensive ways of getting the same answer.
7. **Decide how access defaults.** The safe default is that nothing is available unless someone
   explicitly said it should be — write that down as policy, not as an assumption.
8. **If the product ingests outside data, decide what "trustworthy" means for that data** before
   any of it is imported.
9. **Decide how the product will speak to its users** — tone, and whether more than one language
   will ever be needed — even if the answer today is "just one."
10. **Decide the conventions for recording history** — how changes are described and attributed,
    and what must be true before something is considered shipped.
11. **Name the things that must never be faked.** A placeholder, a stub, a "good enough for now"
    — decide explicitly which shortcuts are never acceptable in this project.
12. **Decide tooling conventions once**, as a standing decision, not a per-change argument.
13. **Decide how outstanding work will be tracked** (see
    [checklists/ticket-board-process.md](ticket-board-process.md)) so the rulebook and the backlog
    reinforce each other.
14. **Decide what a fair, honest review looks like here** — what a reviewer checks for beyond "it
    runs."
15. **If the product needs to be found or indexed by outsiders, write that requirement down now**
    — it changes decisions made much later if it's missing today.
16. **If the product has a public identity, decide once how it presents itself** so nobody
    reinvents the name, voice, or look inconsistently later.
17. **Write everything above into one rulebook, in the order that matters most to least**, so
    anyone — human or AI — reads the two or three things that matter most, first.
18. **Re-read it yourself the same day, critically.** The first pass will get at least one real
    decision wrong. Catch it immediately, fix it everywhere it was stated, and don't let the
    mistake sit until someone else trips over it.

## Signs You Did This Right

- A newcomer (or a fresh AI session with zero memory) can read the rulebook once and know what
  they're not allowed to do, before they do it.
- Disagreements about "should we do X" get resolved by pointing at a section, not by re-arguing.
- The rulebook explains _why_, not just _what_ — a rule with no reason gets silently broken by
  whoever doesn't understand it.

## Anti-patterns

- Writing the rulebook gradually, as violations happen — by then the damage already happened once.
- Copying another project's rulebook wholesale without deciding whether each rule actually applies
  here.
- Treating the rulebook as a one-time document instead of revisiting it the day it's written, when
  mistakes are cheapest to catch.
