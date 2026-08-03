---
name: ticket-board
description: "Conventions for repos that dispatch work through a file-based ticket board — a board:* CLI (board:check, board:build, board:waves, board:merge) over a docs/tickets/ tree. Read before creating, editing, retiring, or parallelising tickets in such a repo. Not for repos without a board."
---

# Ticket boards

The board is the roadmap and the unit of dispatch. Honour its conventions; never route around
them. A repo's own CLAUDE.md wins on specifics — these are the portable parts.

## Facts live in exactly one place

- **Tier = the directory** the ticket sits in (`backlog` / `icebox` / `archive`).
- **Status = the `status:` frontmatter key**, and must be legal for that tier. Never infer
  status from the path.
- **Feature = the folder name.** Never add a `feature:` key — a duplicated fact eventually
  disagrees with itself.

## Frontmatter is a closed schema

An unknown key — including a typo — is a validation error, not an ignored field. Arrays are
written inline on one line. Run `board:check` before any commit that touches the ticket tree.

## Generated files are never hand-edited

`_board/`-style indexes come from `board:build`; a manual edit is silently overwritten next
rebuild. If a number looks wrong, fix the ticket and rebuild.

## Retire through the tool

`board:merge <id>` moves the file to `archive/`, appends the archive record, and rebuilds the
index atomically. A `git mv` desyncs all three.

## `touches` drives parallelism

`board:waves` computes dependency- and file-collision-safe waves from each ticket's
`depends_on` + `touches`. Empty or stale `touches` means two parallel builders collide on the
same file — keep it accurate.

## Golden path for one ticket

Pick from a wave → `git checkout -b ticket/<id>` → `status: in-progress` → failing tests first
→ minimum implementation → repo gate green → independent review → `status: merged` + fill
`solved:` → `board:merge <id>` → merge the branch.
