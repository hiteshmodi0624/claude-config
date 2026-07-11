# Entitlements (Capabilities) Checklist

Source pattern: Extrack/FinanceTracker `packages/entitlements`. A single leaf package (zero
dependency on billing, API, or web) owns one schema of boolean capability flags and the pure
functions that resolve them. Billing depends on entitlements (to clamp capabilities per plan) —
entitlements never depends back on billing. Every API route and every UI gate reads from the same
resolved capability object; nothing re-derives "can this user do X" locally.

## The pieces

| Path                                              | Role                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/entitlements/src/capabilitiesSchema.ts`  | `userCapabilitiesSchema` — one boolean field per capability (e.g. `ledgerRead`, `ledgerWrite`, `adminDashboard`, `marketingTools`). `CapabilityKey = keyof UserCapabilities`. Coarse read/write gates AND-combine with per-resource flags — not independent. |
| `packages/entitlements/src/resolve.ts`             | `userIsAdmin(identity, env)` / `userIsMarketing(identity, env)` — Cognito-group check OR an explicit allowlist env var. `resolveUserCapabilities(identity, env)` — the single function everything else calls. |
| `packages/entitlements/src/groups.ts`              | `capabilitiesForPlatformWorkspaceAdmin(isAdmin)` — the base capability set before plan clamping.                                                                          |
| `packages/entitlements/src/guards.ts`              | Per-resource "effective" predicates, e.g. `effectiveAccountsRead = ledgerRead && accountsRead` — the coarse+fine AND-combination lives here, once, not re-implemented per handler. |
| `packages/entitlements/src/billingPlanCapabilities.ts` | `applyBillingPlanKeyCapabilityPolicy(planKey, caps)` — clamps capabilities down per plan tier. Defines its own leaf `EntitlementsBillingPlanKey` union rather than importing billing's type, to avoid a dependency cycle. |
| `packages/entitlements/src/env.ts`, `constants.ts` | Env-driven overrides for group names (`cognitoAdminGroupFromEnv`, default e.g. `<app>-admin`) and the admin-subs allowlist — so group names aren't hardcoded string literals scattered through the codebase. |
| `apps/api/src/lib/effectiveCapabilities.ts`        | `getEffectiveUserCapabilities()` — the API-side glue: `resolveUserCapabilities` → merge any per-user Dynamo grants → apply billing-plan clamp (skipped for admins).       |
| `apps/api/src/handlers/router.ts` (or equivalent)  | Single chokepoint calling an `assert...ApiAccessIfNeeded()` guard per route+method — not per-handler middleware scattered across files.                                   |
| `GET /api/me/preferences`                          | The one response that ships the resolved capability object to the client. UI never computes capabilities itself, only reads this.                                        |

## Setup (new repo)

- [ ] One schema, one package, zero framework/app dependencies (only a validation library like
      Zod). This is the single source of truth — resist ever duplicating a capability-key mapping in
      the API app or the web app.
- [ ] Model capabilities as booleans on a flat object, not a permission-string list — booleans are
      exhaustively type-checked (`keyof`), a string-based permission system silently accepts typos.
- [ ] Split coarse resource gates (`ledgerRead`) from fine per-resource gates (`accountsRead`) and
      AND-combine them in one guards file — this lets you disable a whole resource class (e.g. during
      an incident) without touching every fine-grained flag.
- [ ] Resolve admin/staff status from an identity provider group first, with an explicit allowlist env
      var as a fallback/bootstrap mechanism (useful before the group exists or for a break-glass
      account) — never hardcode a user id as "the admin" in application logic.
- [ ] If billing/plan tiers exist, let the billing package depend on entitlements (to know what a
      plan should grant) — never the reverse. If entitlements needs a plan-key type, define its own
      leaf union instead of importing billing's type, so the dependency graph stays acyclic.
- [ ] Enforce server-side at a single chokepoint (one router-level guard call per route+method) rather
      than as middleware duplicated per handler — one place to audit, one place to add a new gated
      route correctly.
- [ ] Ship the resolved capability object to the client via one "my profile/preferences" endpoint;
      the client never computes its own capability logic — it only reads booleans and hides/shows UI.
      A UI-only gate with no matching server-side check is a security bug, not a UX shortcut.
- [ ] Add an env-driven kill-switch for at least your highest-blast-radius capability (e.g. force a
      flag false regardless of resolved capabilities) — useful for an incident where a feature needs
      to go dark instantly without a deploy.
- [ ] Write the schema-parsing tests, the admin-resolution tests (both via group and via allowlist),
      and the guard-combination tests in the entitlements package itself — they should pass with zero
      mocking, since the package has no I/O.

## Day-to-day (adding a capability, gating a new route)

- [ ] New capability: add the boolean field to the schema, decide its default in
      `capabilitiesForPlatformWorkspaceAdmin`, decide whether/how billing plans clamp it, add it to
      whatever "assignable capability keys" list drives any per-user grant UI. A capability with no
      plan-clamp mapping silently falls through to whatever the base default is — make that
      intentional, not accidental.
- [ ] New gated API route: add it to the router-level guard's path/method table — don't add an
      ad-hoc capability check inside the handler itself, or it becomes invisible to anyone auditing
      "what's gated" from the guard table.
- [ ] New gated UI surface: read the capability boolean from the already-fetched
      preferences/profile response — never fetch or compute it separately, and never treat the
      UI-side check as sufficient on its own.
- [ ] A separate "internal/staff" exclusion group (e.g. for hiding test accounts from analytics) is a
      DIFFERENT mechanism from capability gating — don't conflate "is this an internal test user" with
      "does this user have capability X." Keep them as two independent lookups if both exist.

## Anti-patterns

- Computing "can this user do X" inline in a component or handler instead of calling the shared
  resolver/guard — guarantees the logic drifts between two call sites eventually.
- A UI-only capability check with no server-side enforcement — trivially bypassed by calling the API
  directly.
- Letting the entitlements package import billing, schemas-with-DB-types, or any app package — it
  should be leaf-level and reusable without pulling in unrelated dependencies.
- Hardcoding an admin user id or a Cognito group name as a string literal at the call site instead of
  going through the env-driven resolver — makes rotating/renaming the admin group a multi-file grep
  instead of a one-line env change.
- Skipping the plan-clamp step for a new capability "because it's obviously free-tier" — write the
  clamp explicitly so a plan-tier audit can see every capability's policy in one file.
