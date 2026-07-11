# Copy-Based UI-Text Structure Checklist

Source pattern: Extrack/FinanceTracker `packages/copy` (`@repo/copy`). Every user-visible string in
`apps/web`/`apps/ops` is a named export from this package — components render values, they never
contain string literals a user would read. This buys three things: one place to find/change any
label, trivial i18n later, and a single reviewable diff when copy changes (instead of copy changes
buried inside unrelated component diffs).

## The pieces

| Path                                    | Role                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/copy/package.json`            | `main`/`types` point at `dist/`; `exports` map exposes both the barrel (`.`) AND per-file deep imports (`./*`) so bundlers can import a single page's copy directly.  |
| `packages/copy/src/index.ts`            | Barrel: `export * from './x'` for every top-level feature file (`auth`, `billing`, `brand`, `nav`, `emails`, `pages`, …).                                             |
| `packages/copy/src/pages/index.ts`      | Same flat `export *` pattern, one line per page file — one file per page/feature area, named for the page.                                                            |
| `packages/copy/src/<feature>.ts`        | A page/feature's copy: one `const X_PAGE = {...} as const` object of static strings, named after the page (`LOGIN_PAGE`, `ACCOUNTS_PAGE`). Cross-page shared strings go in one shared constant (e.g. `AUTH_COMMON`), not duplicated per page. |
| `packages/copy/src/<feature>.ts` (fns)  | Dynamic/pluralized/interpolated strings are named exported **functions**, co-located in the same file as the constant they belong to (e.g. `accountsBulkDeleteBody({count})`). |
| `packages/copy/src/emails/`             | Separate barrel for email copy. Unlike page copy, every export is a typed **factory function** (never a bare `as const` object) since email copy is always parameterized (brand/user-name interpolation). |
| `packages/copy/src/emails/_escapeHtml.ts` | HTML-escaping helper — any email copy field that gets interpolated into an HTML template must run through this before use, since email HTML doesn't get React's automatic escaping. |
| `packages/copy/src/copy.test.ts`        | Enforcement: hand-written assertions pinning static constants' literal values and exercising every dynamic function's branches (zero/one/many, interpolation, HTML-escaping). Not a generic "no duplicates" scanner — a maintained content audit. |

## Setup (new repo)

- [ ] Create `packages/copy` as its own workspace package: `main`/`types` → `dist/`, `exports` map
      with both the root barrel and a `./*` wildcard so consumers can deep-import one page's copy
      without pulling in every other page's bundle.
- [ ] Plain `tsc` build (no bundler needed) — the package ships compiled `.js`/`.d.ts`, so **every
      consumer reads `dist/`, not `src/`**. Any copy edit needs a rebuild before the consuming app
      picks it up.
- [ ] One file per page/feature area under `src/pages/` (or `src/` for cross-cutting areas like
      `auth`, `billing`), each exporting one constant named after the page in SCREAMING_SNAKE
      (`<PAGE>_PAGE`).
- [ ] Dynamic strings (counts, pluralization, interpolation) are exported functions co-located in the
      same file as the static constant they support — never split a page's copy across an "static"
      file and a "dynamic" file.
- [ ] Give email copy its own subdirectory (`src/emails/`) with factory functions instead of bare
      constants, plus a shared HTML-escaping helper any HTML-interpolated field must pass through —
      email copy has an injection surface page copy doesn't (raw HTML strings, see
      `checklists/email-service.md`).
- [ ] Wire the build graph so a copy edit propagates: mark the app's build task as depending on the
      copy package's build (e.g. Turborepo `dependsOn: ["^build"]`), and if using Next.js, add the
      copy package to both `transpilePackages` (dev-mode source resolution) and
      `experimental.optimizePackageImports` (so the barrel import gets rewritten to per-file imports
      at build time instead of shipping every page's copy into every chunk).
- [ ] Write `copy.test.ts` as a living content audit from day one — assert literal values for static
      constants and exercise every branch of every dynamic function (this is what actually catches a
      copy regression; a generic "non-empty string" check catches almost nothing).
- [ ] Decide your enforcement mechanism for "no hardcoded strings" up front and write it down — a
      lint rule is strongest but needs an AST check (JSX text nodes, string-literal props) that most
      out-of-the-box ESLint configs don't provide; the pragmatic fallback is a dedicated review
      subagent/skill that greps diffs for the offending patterns before merge (see Gotchas — this repo
      runs on the fallback, not a lint gate).

## Day-to-day (adding copy, auditing for hardcoded strings)

- [ ] Before adding a string, check whether it belongs in an existing shared constant (e.g.
      `AUTH_COMMON`) rather than creating a near-duplicate in a new page file.
- [ ] After any copy edit, rebuild the package (`turbo run build --filter=@repo/copy` or equivalent)
      before relying on the consuming app picking it up — a stale `dist/` is a silent bug, not a
      compile error, if the app was already built.
- [ ] Quick manual audit for regressions: grep the diff for JSX text nodes and string-literal props
      that look like real words (e.g. `>[A-Z][a-zA-Z ]{3,}<` in `.tsx` files) — treat any hit as a
      hardcoded-copy candidate to route into the right file.
- [ ] New page → new copy file named after the page, exported from the pages barrel, imported by name
      into the page component — never inline even a single placeholder string "for now."

## Anti-patterns

- Splitting a page's static and dynamic copy across two different files — keep them co-located so a
  reader sees the full picture of what that page can say in one place.
- Consuming `src/` directly via a monorepo path alias instead of the built `dist/` — it works until
  someone builds in CI-only mode and the alias silently resolves to stale or missing files.
- Interpolating user-controlled data into an email's HTML field without the escaping helper — page
  copy rendered through JSX is auto-escaped; raw HTML email strings are not.
- Treating the copy package's own `eslint src` as coverage for "no hardcoded strings in the apps" —
  it only lints the copy package's own source, not the consuming apps.
- A generic test asserting "no duplicate keys" or "all exports non-empty" as the *only* enforcement —
  it won't catch a literal that should have been pulled from copy but wasn't; you need per-string
  value assertions or a diff-scanning review step.
