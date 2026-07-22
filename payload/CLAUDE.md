# graphify

- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
  When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# Subagents

- Spawning subagents is allowed and encouraged whenever it helps — there is **no fixed concurrency cap**.
- In **workflows** (the Workflow tool), fan out freely. The only bounds are the runtime's own limits
  (concurrent `agent()` ≈ min(16, CPU cores − 2); 1000-agent lifetime backstop; 4096 items per call).

# Default Development Workflow (delegate-first)

Every non-trivial task follows the delegate-first loop in @WORKFLOW.md:
**research (if unfamiliar) → plan via subagent → approval gate if large → implement one phase at
a time via subagents → independent review subagent → done-criteria**. The main agent coordinates;
it does not deep-plan or bulk-implement in its own context.

# Model & Effort Routing (STRICT — auto-enforced)

**Default-cheap, escalate-on-evidence.** Full matrix in @WORKFLOW.md; summary:

- **haiku / low** — mechanical scans, greps, formatting, triage.
- **sonnet / medium** — DEFAULT for ALL implementation, research, and explore subagents.
- **opus / high** — planning + review/verification ONLY, or one task explicitly escalated with
  `[ESCALATED: <reason>]` after a sonnet attempt failed.
- **Every subagent spawn sets `model` explicitly** — an omitted model inherits the expensive
  session model. Never hardcode dated model ids; aliases only.
- Enforced by the PreToolUse hook `hooks/model-routing-guard.js`: it BLOCKS unjustified
  opus/fable-tier spawns, model-less generic spawns, and Workflow scripts without model routing.
  If it blocks a call, fix the routing — do not work around the hook.

# Ticket Boards (board-driven repos)

Some repos dispatch work through a **file-based ticket board** — Markdown tickets under a
`docs/tickets/`-style tree with a `board:*` CLI (`board:check`, `board:build`, `board:waves`,
`board:merge`). When a repo has one, the board is the roadmap and the unit of dispatch; honour its
conventions and never route around them. A repo's own CLAUDE.md wins on specifics; the portable
conventions are:

- **Tier = directory, status = frontmatter, feature = directory name.** A ticket's tier
  (`backlog`/`icebox`/`archive`) is the directory it sits in; its `status:` is a frontmatter key
  legal for that tier; its feature is the folder name. Never infer status from the path, and never
  add a `feature:` key — a duplicated fact eventually disagrees with itself.
- **The frontmatter schema is closed.** An unknown key (including a typo) is a validation error,
  not an ignored field. Arrays are written inline on one line.
- **Generated index files are never hand-edited.** `_board/`-style outputs come from `board:build`;
  a manual edit is silently overwritten. If a number looks wrong, fix the ticket and rebuild.
- **Retire through the tool, never `git mv`.** `board:merge <id>` moves the file to `archive/`,
  appends the archive record, and rebuilds the index atomically; a hand move desyncs all three.
- **`touches` drives parallelism.** `board:waves` uses each ticket's `depends_on` + `touches` to
  compute dependency- and file-collision-safe waves — never leave `touches` empty or stale, or two
  parallel builders collide on the same file.

Golden path for one ticket: pick from a wave → `git checkout -b ticket/<id>` → set
`status: in-progress` → failing tests first → minimum implementation → repo gate green → independent
review → set `status: merged` + fill `solved:` → `board:merge <id>` → merge the branch. Run
`board:check` before any commit that touches the ticket tree.

# Engineering Principles (STRICT)

These five principles apply to ALL code work in EVERY repository. They override default
behaviour and faster paths. If work drifts from any of them, STOP and say plainly:
_"this was set as an engineering rule, and X is not following it."_ Three skills enforce them;
a SessionStart + per-prompt hook keeps them in view.

1. **Phased delivery.** Decompose a feature into independently shippable phases. Phase 1 = the
   smallest useful slice (e.g. "add a queue + error handling" before the whole pipeline). Ship →
   review → next phase. Never one giant PR (aim ~200-400 changed lines: ~3x faster review, ~40%
   fewer defects).
2. **Test-first (TDD-as-spec).** Write the failing test specs first; they ARE the spec; pass them
   one by one. No implementation before a failing test.
3. **Low-coupling, minimal-deps.** Self-contained units, one responsibility each, narrow
   interfaces, unit-testable without heavy mocking. Few external dependencies and no off-site/
   network calls unless genuinely required. Inject IO (clock, network, fs).
4. **Rigorous honest review.** Before "done", run **`review-uncommitted`** (working tree) or
   **`review-branch`** (whole branch vs base): catch scope creep & needless dependency/version
   bumps, confirm the goal is actually complete, run tests to green, and report ONLY verified,
   non-hallucinated findings (`file:line` + evidence; default-reject the unverifiable).
5. **Design-fit & library-first.** Before building, state how it fits the app + its business
   value, and search for an existing library/tool before reimplementing.

**Skills (invoke automatically — do not wait to be asked):**

- Any new feature / architecture / product / non-trivial change → invoke **`feature-start`**
  first (preflight on all five, then hands off to `superpowers:brainstorming` or `feature-factory`).
- Finishing a change → invoke **`review-uncommitted`** or **`review-branch`** before claiming done.

Full review engine: `~/.claude/skills/_shared/review-checklist.md`. These global rules complement
each repo's own CLAUDE.md (e.g. OpsPilot's hard rules); where a repo is stricter, the repo wins.

<!-- RTK removed 2026-07-12: rtk binary was not installed, so its instructions + hook were
     dead weight. RTK.md and hooks/rtk-rewrite.sh are preserved in
     ~/.claude/backups/rtk-removed-2026-07-12/. To re-enable: install rtk
     (github.com/rtk-ai/rtk), restore both files, re-add the PreToolUse Bash hook entry in
     settings.json, and restore the line: @RTK.md -->
