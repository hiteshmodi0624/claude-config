---
name: backlog-verify-loop
description: "Autonomous drain-then-browser-verify loop until the app is clean. Use when a backlog should be driven to completion hands-off with every page and link verified each round, or when the user says 'loop until the site works', 'verify every page and link', 'integration-test the whole app in a loop', 'keep draining and re-checking', 'playwright verify then fix then repeat'. Not for a single ticket or a UI-less backend — use backlog-drain instead."
---

# backlog-verify-loop

## Overview

The outer loop: plan → implement → browser-verify → repeat until the app is provably clean. **The browser pass is a discovery engine that mints bug tickets — never a red/green gate.** Its one hard job is separating a CODE BUG from a missing-data empty state: conflate them and the loop never terminates, churning forever on data gaps that no amount of code can fix.

Composes backlog-detail (Phase 1, autonomous mode) → backlog-drain (Phase 2) → browser verify (Phase 3) → repeat.

## When to use / when NOT

- Use for hands-off "drain the backlog, prove the app actually works, fix what's broken, repeat" — a self-closing loop, not a one-shot.
- The app must have crawlable routes (public pages, links, data states) worth asserting.
- NOT for a single ticket, a backend with no UI to crawl, or when the user wants to approve each round — run the phases by hand instead.

## The round — copy this checklist

```
[ ] 1. Build + serve the LOCAL merged build; wait for ready
[ ] 2. Crawl every route type + every in-page link (contract below)
[ ] 3. Classify EVERY finding: CODE BUG | data gap | nit
[ ] 4. Terminate? zero new code-bug tickets AND empty backlog → STOP, final report
[ ] 5. Repair: backlog-detail (autonomous) → backlog-drain → back to 1
[ ] 6. Print the round report
```

1. **Build + serve locally.** Run the repo's production build (e.g. `yarn build`), start the app, wait for ready. **Test the LOCAL merged build, never prod** — local isolates code bugs from deploy lag, infra noise, and prod data emptiness. Prod-only issues get separate tickets outside the loop.

2. **Crawl.** Use the browser MCP available in the session (e.g. Playwright or chrome-devtools). Visit every route _type_ — home plus one live instance of each dynamic template (e.g. profile, detail/item, topic, search, source) — and follow every in-page link. Per page assert:

   ```
   [ ] HTTP 200 — no 4xx/5xx
   [ ] No crash, no hydration error in the console
   [ ] The page shell renders (no blank page / error boundary)
   [ ] Every internal <a> href resolves — no dangling 404
   [ ] Client-side nav stays client-side — no full-page reload where SPA nav is expected
   ```

3. **Classify — the whole point of the pass:**

   | Finding                                                                            | Verdict                                                                                                              |
   | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
   | 500 / crash / hydration error / broken internal link / unexpected full-page reload | **CODE BUG** → file a ticket (proper frontmatter; run the repo's board check if it has one, e.g. `yarn board:check`) |
   | Page 200 but empty because no data is ingested yet                                 | **NOT a failure** → log a data-coverage note; do NOT file a ticket, do NOT loop on it                                |
   | Slow / cosmetic                                                                    | nit → optional ticket, never a loop blocker                                                                          |

   When bug-vs-no-data is ambiguous, escalate that one call to the strongest reasoning available — mislabeling "no data yet" as a bug is exactly what makes the loop non-terminating.

4. **Terminate?** Concrete predicate, both halves required: this round filed **zero code-bug tickets** AND the backlog (tickets with status `backlog` or `in-progress`) is **empty** → STOP and print the final report. Otherwise continue.

5. **Repair.** Run backlog-detail in **autonomous mode** on the new + remaining tickets — no human in the loop, so it skips its Drill stage; the writer picks the safe/reversible default and records `ASSUMPTION: <choice> — <reason>` per ticket. Then backlog-drain builds and merges them gate-green. Loop back to step 1.

6. **Round report, every round:** routes crawled · code bugs found + filed · data gaps noted · tickets merged · gate result. Keep rounds small — the report is the user's interrupt point.

## Running it detached

Wrap the loop with the /loop skill (self-paced) so it survives across turns and re-fires each round on its own — the user can walk away. Without /loop it still runs, but only inside one open session (keep the tab open).

## Model / effort

Never hardcode model ids; pick by capability tier when spawning.

| Role                                         | Tier                             | Why                                                   |
| -------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Orchestrator (this session)                  | strongest available, high effort | owns merge, gate, and the code-vs-data call           |
| Browser crawler                              | mid-tier workhorse               | mechanical navigation + assertions                    |
| Code-vs-data classifier (ambiguous findings) | strongest available              | this judgement is the loop's single failure-mode risk |

## Common mistakes

| Mistake                               | Reality                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Treat an empty-data page as a bug     | Loop never terminates — you cannot code your way out of a dead data source  |
| Crawl prod instead of the local build | Conflates code bugs with deploy lag + data emptiness; slower feedback       |
| Skip the classify step                | Every finding becomes a "fix me" ticket → infinite churn                    |
| No concrete termination predicate     | "Until clean" must mean: zero new code-bug tickets AND empty backlog        |
| One giant round                       | Small rounds; report between them so the user can interrupt                 |
| Block the loop on a question          | Autonomous mode: backlog-detail skips Drill and records `ASSUMPTION:` lines |
