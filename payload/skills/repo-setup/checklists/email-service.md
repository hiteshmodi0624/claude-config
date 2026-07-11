# Transactional Email Service Checklist

Source pattern: Extrack/FinanceTracker `packages/email-service` on AWS SES v2. Two genuinely
separate delivery paths exist — auth-flow emails triggered synchronously by Cognito, and
product-notification emails triggered directly by app code — sharing one send/retry/template layer.
Templates own HTML composition only; all copy comes from `@repo/copy` (see
`checklists/copy-based-structure.md`).

## The pieces

| Path                                                       | Role                                                                                                                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/email-service/src/config.ts`                     | Env parsing: required `EMAIL_FROM` (throws if missing), `EMAIL_SES_REGION` (falls back to `AWS_REGION`), optional `EMAIL_REPLY_TO`, `EMAIL_SES_CONFIGURATION_SET`, retry tuning.       |
| `packages/email-service/src/service.ts`                    | `EmailService.send`/`sendBatch` — lazy `SESv2Client` construction, `maxAttempts: 1` on the SDK client (this package owns retry logic itself, not the SDK). Also owns the error-class classification (`rate_limited`/`provider_error` are retryable, `network_error` is not) that it feeds into `retry.ts`'s generic backoff. |
| `packages/email-service/src/retry.ts`                      | Generic backoff/retry mechanism (exponential backoff + jitter) parameterized by an injected `shouldRetry` predicate — the mechanism itself is provider-agnostic.                     |
| `packages/email-service/src/triggers.ts`                   | `EmailTriggers` — one typed method per business event (`sendWelcome`, `sendVerifyEmail`, `sendPasswordReset`, `sendSubscription`, …). This is the API the rest of the app calls.        |
| `packages/email-service/src/templates/baseLayout.ts`        | Shared HTML shell (`renderBaseLayout`) + helpers (`escapeHtml`, `renderButton`, `htmlToText` for the plain-text fallback). Raw HTML strings with inline styles — not React Email/MJML, because most email clients strip `<style>` blocks and ignore classes. |
| `packages/email-service/src/templates/<event>.ts`           | One pure function per email: pulls copy from `@repo/copy/emails`, composes `bodyHtml`, wraps via `renderBaseLayout`, returns `{subject, html, text}`. Zero hardcoded copy — snapshot-testable. |
| `packages/email-service/src/server/`                        | Lambda-facing pieces: audit log writer, SNS bounce/complaint handler, CloudWatch SES metrics, operator-dashboard routes.                                                               |
| `packages/email-service/src/ui/`                            | Optional React operator console (peer deps on `react`/`@tanstack/react-query`) for browsing send history.                                                                              |
| `infrastructure/lambdas/cognito-post-confirmation.ts`       | Cognito `POST_CONFIRMATION` trigger — sends the welcome email via `EmailTriggers` directly (product-notification path).                                                                |
| `infrastructure/lambdas/cognito-custom-email-sender.ts`     | Cognito `CustomEmailSender_*` trigger (verify/reset/MFA/admin-invite) — decrypts Cognito's KMS-wrapped code, dispatches through `EmailTriggers` (auth-flow path). Routes on `event.triggerSource`, not `request.type` (the latter is always the same literal). |
| `infrastructure/scripts/diagnose-cognito-email.sh`          | Ops script: inspects both Lambdas' deployed config + tails CloudWatch logs — the fastest path to "why didn't this email send."                                                          |
| `packages/schemas/src/lambdaManagedSecretsRegistry.ts`      | Registers non-SES-credential secrets used downstream of sending: unsubscribe signing secret, app/API base URLs for links, lifecycle-cron feature flags.                                |

## Setup (new repo)

- [ ] Pick a provider with IAM-based auth if you're already on AWS (SES) — no API-key secret to
      rotate, credentials come from the Lambda execution role via the standard SDK provider chain.
- [ ] Build the send layer as three separated concerns: a thin provider client (`service.ts`), a
      retry policy that's explicit about which error classes are safe to retry (`retry.ts`), and a
      typed per-business-event API (`triggers.ts`) that the rest of the app calls — never call the
      provider client directly from a handler.
- [ ] Explicitly decide retry-ability per error class: never retry a network/timeout error if the
      provider has no send-idempotency token, since the original send may have already succeeded —
      only retry error classes the provider guarantees didn't mutate anything (rate limits, 5xx
      before the request was accepted).
- [ ] Raw-HTML-with-inline-styles templates, not a React-Email/MJML dependency, unless you have a
      concrete reason to need one — most email clients strip `<style>` blocks and ignore class
      selectors, so the extra abstraction buys little. Always escape any interpolated value and
      generate a plain-text fallback (`htmlToText`) for every template.
- [ ] Import ALL copy for templates from the copy package (`checklists/copy-based-structure.md`) —
      templates own markup/layout only, never inline a subject line or body sentence.
- [ ] If using Cognito (or an equivalent managed-auth provider) for signup/login, recognize it has
      its own built-in email-sending path (custom email sender trigger) that is separate from your
      app-triggered notification emails — decide explicitly which events go through which path, and
      route on the trigger's event-source field (not a generic "request type" field that may be a
      constant across all trigger kinds).
- [ ] If decrypting a provider-supplied encrypted payload (e.g. Cognito's KMS-wrapped verification
      code), set the crypto SDK's commitment policy to allow-decrypt-only-of-non-committed data if the
      upstream provider doesn't attach key-commitment metadata — the strict "require commitment"
      policy will silently fail every invocation.
- [ ] Verify the sending domain (DKIM CNAMEs) and request production access (exit sandbox mode) as an
      explicit deploy-blocking step — SES sandbox silently rejects sends to unverified recipients, and
      Cognito surfaces that as a generic sign-up error with no obvious cause. Add SES-specific DNS
      records (DKIM CNAMEs, custom MAIL FROM domain, DMARC policy) alongside — don't assume the
      generic Route53 setup (`checklists/aws-dns-maintenance.md`) already covers deliverability, it
      only covers the record-as-code mechanics.
- [ ] Register `EMAIL_FROM`, region, reply-to, and any configuration-set name in `.env.*.example`; put
      a `HARD RULE` comment against any "skip verification"/sandbox-only flag ever being set in prod.
- [ ] Make audit-log writes best-effort (log-and-continue on failure) — the email already left the
      provider by the time you're writing the audit record, so a logging failure must never look like
      a send failure to the caller.

## Day-to-day (adding an email, debugging a missing send)

- [ ] New email type: add a template function (pure, testable), add its copy to
      `@repo/copy/src/emails/`, add a method to the triggers API, call it from exactly one place in
      app code (or the auth-provider trigger, if it's an auth-flow email).
- [ ] Debugging "user says they didn't get the email": run the diagnose script (or equivalent) first —
      check both Lambdas'/handlers' logs, since auth-flow and product-notification emails go through
      different code paths and a bug in one doesn't imply a bug in the other.
- [ ] Never interpolate raw user input into an HTML template field without the escaping helper.
- [ ] Snapshot-test new templates (`{subject, html, text}` shape) the same way existing ones are
      tested — this is what catches an accidental copy/markup regression, not a manual send test.

## Anti-patterns

- Calling the provider SDK client directly from a route handler instead of going through the typed
  triggers API — bypasses the shared retry/audit-log/metrics wrapping.
- Retrying every error class uniformly — turns a transient network blip into a duplicate send.
- Storing SES/provider API keys as a secret when the deploy environment already grants IAM access —
  needless secret to rotate and a needless leak surface.
- Treating the auth-provider's built-in email trigger and your app's notification emails as one
  code path — they usually have different invocation contracts (sync trigger vs. async call) and
  conflating them makes the "why didn't this send" diagnosis much harder.
- Hardcoding subject lines or body copy directly in a template file instead of importing from the
  copy package — the exact violation the copy-based-structure checklist exists to prevent, and email
  copy is easy to forget since it "isn't really UI."
