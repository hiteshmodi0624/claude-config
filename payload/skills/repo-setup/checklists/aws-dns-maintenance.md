# AWS DNS Maintenance Checklist

Source pattern: Quri's `apps/infra` — one Route53 hosted zone per apex domain, its records declared
in a single JSON file, deployed through its own CDK app. The console is never a source of truth;
every change is file → diff → deploy.

## The pieces

| File                                 | Role                                                                                                                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/infra/dns-records.json`        | The DNS records themselves — a plain JSON array, hand-edited to add/change a record.                                                                                              |
| `apps/infra/lib/dns-records.ts`      | Types + `parseDnsRecords`/`loadDnsRecords` — reads the JSON, throws on any malformed entry (bad `type`, non-positive `ttlSeconds`, empty `values`, etc.) before CDK ever sees it. |
| `apps/infra/lib/public-dns-stack.ts` | `PublicDnsStack` — creates the `PublicHostedZone` for the apex domain, then upserts each loaded record (`TxtRecord`/`CnameRecord`/`ARecord`/`MxRecord`) via a switch on `type`.   |
| `apps/infra/bin/dns.ts`              | The CDK app entrypoint — reads `QURI_DNS_ZONE_NAME` (defaults to the apex domain), loads `dns-records.json` if present, instantiates `PublicDnsStack`.                            |
| `apps/infra/package.json` scripts    | `diff:dns` / `deploy:dns` — the only sanctioned way to change DNS.                                                                                                                |

Record JSON shape (`DnsRecord` in `dns-records.ts`):

```json
{
  "name": "www",
  "type": "CNAME",
  "ttlSeconds": 1800,
  "values": ["target.example.com"]
}
```

- `name` is `@` for the apex itself, otherwise a label relative to the zone (`www`, `_dmarc`,
  `<selector>._domainkey`) — never include the apex domain in `name`, CDK appends the zone suffix.
- `type` is one of `TXT` / `CNAME` / `A` / `MX`.
- `MX` values are `"<priority> <hostname>"` strings, split by the stack's `addRecord`.

## Setup (new domain / new repo)

- [ ] `PublicDnsStack` (or your equivalent) lives in its own stack, deployed independently of app
      stacks — the zone is a one-time resource, not something that gets torn down with app infra.
- [ ] `dns-records.json` starts as `[]` (or omitted — `bin/dns.ts` treats a missing file as no extra
      records) and grows one entry per record as they're needed (SES DKIM CNAMEs, SPF/DMARC TXT,
      verification TXT records, etc.).
- [ ] The stack outputs `HostedZoneId` and `NameServers` via `CfnOutput`. After the first
      `yarn deploy:dns`: delegate the domain at the registrar to the printed name servers, and copy
      `HostedZoneId` into the env var the app stacks read (`QURI_HOSTED_ZONE_ID` pattern) in
      `.env.dev`/`.env.prod`.
- [ ] The app/API stack **imports** the existing zone (`HostedZone.fromHostedZoneAttributes`) — it
      does not create its own — and provisions the custom-domain ACM cert + alias record from it.
- [ ] ACM certs are DNS-validated, provisioned in the correct region for the consumer (`us-east-1`
      for CloudFront/edge, the API's own region for a regional API Gateway custom domain).
- [ ] The custom domain (e.g. `api.<domain>`) is mapped via the API Gateway custom-domain construct
      to the intended stage (commonly `$default`) — not left on the raw `execute-api` URL. Keep that
      raw `execute-api` URL noted somewhere; it's the fastest way to isolate "is it DNS or the API".

## Changing a record or adding a subdomain

- [ ] Edit `dns-records.json` directly — add, remove, or change an entry. Never touch Route53 in the
      AWS Console.
- [ ] Run `yarn diff:dns` (wraps `cdk diff --app "npx tsx bin/dns.ts"` under the `quri-prod`-style
      named profile) and confirm only the intended record changes.
- [ ] Run `yarn deploy:dns` to apply.
- [ ] Verify against an **external** resolver, not your machine's: `dig @8.8.8.8 <record>` — a local
      resolver can cache a stale answer and lie about what's actually live.
- [ ] For a new custom-domain mapping specifically, verify both layers independently: the Route53
      alias record resolves, **and** the API Gateway custom-domain mapping is attached to a stage —
      either one missing breaks the domain even if the other looks fine.
- [ ] A malformed `dns-records.json` entry fails loudly at `loadDnsRecords` (throws before synth) —
      if `diff:dns`/`deploy:dns` errors immediately with "Invalid DNS records file: …", the file
      itself is the bug, not CDK/AWS.

## Outage diagnosis order (domain resolves to nothing / 500s upstream)

Known failure mode: the custom-domain mapping exists in API Gateway but the Route53 alias record
was missing or deleted — the whole app 500s even though the API itself is healthy. Check in this
order, don't skip ahead:

1. **Route53**: does the A/AAAA alias record for the subdomain exist in the zone at all?
2. **ACM**: is the cert validated and actually attached to the custom domain (not just requested)?
3. **API Gateway**: is the custom-domain mapping attached to a stage, and does that stage route to
   the right integration?
4. **Direct reachability**: does the raw `execute-api` URL work? If yes, the backend is fine and the
   problem is purely in the domain/cert/mapping chain (steps 1–3).
5. **External DNS**: `dig @8.8.8.8 <domain>` — confirm what the wider internet actually sees, since a
   local resolver's cached/stale answer will otherwise send you chasing the wrong layer.

## Anti-patterns

- Editing a record in the AWS Console "just this once" — the next `deploy:dns` either reverts it
  silently or the state permanently drifts from `dns-records.json`.
- Hand-editing Route53 because "the JSON file is slower" — the JSON file is the audit trail; a
  console edit has no diff, no review, no rollback.
- Trusting local `dig`/browser resolution as ground truth during an incident — always cross-check
  with an external resolver (`dig @8.8.8.8`).
- A second hosted zone or duplicate DNS stack per environment — one zone per apex domain, one
  `dns-records.json`, shared across whatever environments actually exist.
