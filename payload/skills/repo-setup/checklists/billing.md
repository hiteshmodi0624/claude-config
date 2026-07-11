# Billing (Subscriptions) Checklist

Source pattern: Extrack/FinanceTracker `packages/billing` + Razorpay. Billing state is a small,
provider-agnostic snapshot (`planKey`, `subscriptionStatus`, …) synced onto the workspace/account
record by a signature-verified webhook — the app never trusts client-reported plan state, and the
provider SDK is walled off behind a Node-only sub-export so the browser bundle never needs
`node:crypto`.

## The pieces

| Path                                                  | Role                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/billing/src/billingPlan.ts`                 | `billingPlanKeySchema` (e.g. `free\|premium\|vip`), `workspaceSubscriptionStatusSchema` (`none\|active\|past_due\|canceled\|trialing\|comp`), `BillingPort` interface, `defaultWorkspaceBillingPlanSnapshot()`. |
| `packages/billing/src/constants.ts`                   | Every env-key name as a constant (`BILLING_ENV_KEYS`, `<PROVIDER>_WEBHOOK_ENV_KEYS`, `<PROVIDER>_CHECKOUT_ENV_KEYS`) plus provider metadata-field-name constants (workspace id, plan key, trial mandate, coupon/attribution). Never inline a raw env-var string elsewhere.                                    |
| `packages/billing/src/effectivePlanKey.ts`            | Layers synthetic tiers (e.g. `pre_trial`, `trial_vip`, `free_limited`) on top of the wire `planKey` — the UI/entitlements never see raw provider states directly.                                                |
| `packages/billing/src/billingPastDueDelinquency.ts`   | Grace-period math: `resolveBillingDelinquencyPhase()` (`none\|past_due_in_grace\|past_due_lapsed`), configurable grace-day window.                                                                               |
| `packages/billing/src/pricing.ts`                     | Single source of truth for list prices per plan/cycle. **Marketing copy must read from here, not duplicate its own price table** (see Gotchas).                                                                 |
| `packages/billing/src/<provider>.ts`                  | Node-only barrel (HMAC verify, `fetch` calls to the provider API) — exported as a **separate package-export subpath** so `apps/web` never bundles it.                                                          |
| `packages/billing/src/<provider>Webhook.ts`           | `verify<Provider>WebhookSignature()` (HMAC, `timingSafeEqual`), a separate `verify<Provider>CheckoutSignature()` (different secret!), envelope parsing, `deriveBillingPatchFrom<Provider>Subscription()`.        |
| `packages/billing/src/<provider>Subscription.ts`      | Thin REST client: create/fetch/cancel subscription calls.                                                                                                                                                        |
| `apps/api/src/handlers/billingWebhooks<Provider>Route.ts` | `POST /api/billing/webhooks/<provider>` — verifies signature, claims idempotency key, upserts billing snapshot, emits metrics.                                                                                |
| `packages/schemas/src/workspaceBilling.ts`            | DynamoDB item schema for the billing snapshot (PK = workspace/user id) — `planKey`, `subscriptionStatus`, `providerCustomerId`, `providerSubscriptionId`, `currentPeriodEnd`, `pastDueSinceIso`, trial fields, attribution fields. |
| `apps/api/src/lib/workspaceBillingSnapshot.ts`        | `getEffectiveWorkspaceBillingSnapshot()` — the one read path every other handler/entitlement check goes through.                                                                                                 |
| `packages/schemas/src/lambdaManagedSecretsRegistry.ts` | Registers every billing secret key so it's validated against the AWS Secrets Manager JSON blob at runtime.                                                                                                       |

## Setup (new repo)

- [ ] Model billing state as a small immutable snapshot type (`planKey` + `subscriptionStatus` +
      provider ids + period/trial timestamps) persisted server-side — never derive plan from a
      client-supplied value.
- [ ] Put the provider SDK/HMAC code behind a **separate Node-only package export** (e.g.
      `@repo/billing/razorpay`) so a browser bundle importing the browser-safe barrel never pulls in
      `node:crypto` or a server-only fetch client.
- [ ] Define `BillingPort` as a provider-agnostic interface even with only one provider implemented —
      it documents the seam for a future second provider without forcing you to build it now.
- [ ] One `constants.ts` holding every env-var name and every provider metadata/notes field name as a
      typed constant — grep for that constant, never for the raw string, anywhere else in the codebase.
- [ ] Webhook route: verify signature over the **raw, unparsed body bytes** (framework body-parsing
      that re-serializes JSON breaks HMAC verification), then claim an idempotency key
      (`provider#<event-id>`) via a conditional DynamoDB put *before* doing any mutation, so a
      redelivered webhook is a no-op.
- [ ] Webhook route must handle "event about a subscription/workspace that doesn't have a local record
      yet" (e.g. checkout completed before the app-side provisioning finished) without erroring —
      queue/retry or upsert-on-arrival, don't 500 and lose the event.
- [ ] Cancel-vs-still-active ambiguity: when a provider payload is ambiguous about whether a
      subscription is truly canceled vs. mid-renewal, prefer the persisted paid state over the
      ambiguous payload — a false-positive downgrade is worse than a one-cycle-late downgrade.
- [ ] Register every billing secret (API key, webhook secret, checkout/signing secret, plan ids) in
      `.env.*.example` per this repo's CLAUDE.md env-var rule, AND in the managed-secrets registry if
      secrets are Lambda-runtime — a deploy-time gate should check the *required* subset is non-empty
      before allowing a prod deploy.
- [ ] One pricing source of truth (`pricing.ts`) — marketing/landing-page copy must import from it,
      never hardcode its own price table (see Gotchas for what happens when this drifts).
- [ ] Add a local-only "skip webhook verification" env flag for dev, and hard-fail (or `HARD RULE`
      comment in the `.env.*.example`) against ever setting it in prod.
- [ ] Before going live, exercise the webhook path both ways: locally via the skip-verification flag
      (fast iteration on the upsert logic) AND once against the real provider via its "send test
      webhook" dashboard feature (the only way to catch a signature-verification bug, since the local
      flag bypasses exactly that code path).

## Day-to-day (adding a plan, debugging a stuck subscription)

- [ ] Adding a new plan tier: add the key to `billingPlanKeySchema`, add its price to `pricing.ts`,
      update `effectivePlanKey.ts` if it needs a synthetic pre/trial state, update entitlement
      clamping (see `checklists/entitlements.md`) — a new plan key with no entitlement mapping
      silently falls through to the most restrictive tier, so add it explicitly.
- [ ] Debugging "user paid but app shows free": check the webhook delivery log in the provider
      dashboard first (was it delivered? did it 200?), then check `tryClaim...` idempotency table for
      a claimed-but-failed event, then check the raw snapshot in DynamoDB — don't guess from the UI.
- [ ] Never hand-edit the billing snapshot row directly in a table editor for a "quick fix" — write a
      one-off reconciliation script that goes through the same `deriveBillingPatchFrom...` logic the
      webhook uses, so the same invariants apply.
- [ ] The webhook endpoint must be reachable at whatever hostname the CDN/edge actually routes API
      traffic to — if `www.<domain>` and `api.<domain>` are split (e.g. an edge function only forwards
      one), point the provider's webhook URL at the one that's actually forwarded. Verify with a
      provider-side "send test webhook" before going live.

## Anti-patterns

- Trusting a client-reported plan/subscription state for any entitlement decision — always resolve
  server-side from the persisted snapshot.
- One shared secret for both checkout-signature verification and webhook-signature verification —
  providers commonly use two different secrets for these; conflating them silently breaks one of the
  two verifications with no clear error.
- Letting marketing/landing-page copy hardcode its own price numbers instead of importing from the
  single pricing source — prices drift silently between the checkout flow and what was advertised.
- Retrying a webhook handler on every error class — a network/timeout error after the provider's mutation
  already landed can double-apply a non-idempotent side effect; only retry error classes that are known
  safe to redeliver, and always gate the actual mutation behind the idempotency claim.
- Skipping webhook signature verification "temporarily" outside of a clearly-local-only env flag.
