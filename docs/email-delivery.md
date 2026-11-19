# Email delivery implementation

Work lives on `feature/email-delivery`. Do not merge into `main` or deploy until
the complete V1 and upgrade checks below pass. This first slice is an isolated
queue module; it is intentionally not imported by backend startup. It opens no
ports, changes no configuration and sends no mail.

The agreed product specification is in `zbyju/babybox-mono`,
`specs/babybox-email-delivery-project.md` (2026-11-17). That specification remains
authoritative; this file tracks implementation and release gates.

## Sequence

1. Implement bounded volatile message scheduling (current slice): 100 pending
   messages including active delivery, 100 MiB content, 24-hour receipt TTL,
   oldest waiting eviction, new messages before retries, shared connection
   cooldown, configuration failure pause, and explicit eviction/expiry outcomes.
2. Add persistent lifecycle history and per-recipient delivery state. The queue
   caller must record every discarded result and terminal result, track successful
   recipients, and mark lost volatile content interrupted on restart. Queue IDs
   are process-local scheduling handles, not persistent email identities.
3. Add TLS SMTP submission on 465, error classification, routing modes and sender
   preservation/override. Confirm provider acceptance semantics and attachment
   preservation with test mail. Never disable TLS certificate verification.
4. Add port 25 reception inside the backend, restricted to current configured
   engine, thermal and camera IPs. Test actual device AUTH/session behavior and
   camera message sizes. Bind or mail failures must not prevent backend startup.
   Enable by default only when the complete relay is ready.
5. Add Czech settings, listener/transport status, history and confirmed queue
   actions on a dedicated page. Monitoring and watchdog traffic must continue.
6. Validate upgrades and pilot real Windows/Ubuntu devices before fleet rollout.

## Upgrade and release gates

- Existing main.json files remain readable without manual edits. Defaults merge
  with older settings; neither auto-update nor config migration writes device
  SMTP settings or redirects devices. SMS is unchanged.
- Test unchanged installations with no redirected devices: polling, local alarms,
  watchdog and current direct device mail continue working.
- Test startup and monitoring with port 25 occupied, no bind privilege, missing
  outbound configuration, broken history storage and failing outbound transport.
- Use the deployed Node 18.12.1 / pnpm 7.5.0 toolchain, frozen workspace install,
  full build and production-only standalone backend install, as startup does.
  The backend must not gain a runtime workspace dependency.
- Test both routing modes, partial recipient rejection without resending completed
  recipients, attachment preservation, queue limits, retries, expiry, history
  retention, restart loss and settings reload. SMTP acceptance is not inbox proof.
- Verify the updater/build path and Windows 10/11 and Ubuntu launch paths. Do not
  assume every running installation updates immediately. Windows 7 feasibility
  remains unproven.
- A pilot needs real device SMTP samples, a stable panel LAN IP, inbound firewall
  access, provider sender acceptance, actual outbound connectivity and verified
  inbox receipt before manually redirecting any device. No live migration is
  authorized by development work.

## Queue contract

`source/apps/backend/src/email/queue.ts` performs scheduling only. `take()` reserves
one message until `settle()`; active content counts against capacity and is never
evicted. Raw buffers are copied to prevent transport callers changing queued mail.
Callers must consume discarded outcomes returned by enqueue, take, settle and
expire. The future worker must enforce transport timeouts so an active send cannot
hold the reservation forever. Recipient routing and permanent recipient failures
belong to the delivery worker, not this content scheduler. `resume()` is reserved
for explicit retry/settings changes and preserves original receipt time.

## First-slice validation (Windows, 2026-11-19)

- Frozen workspace install and schema/backend/panel/configer builds passed on
  Node 18.12.1 and pnpm 7.5.0.
- Backend: 105 tests passed, including 13 queue tests. Panel: 137 passed. Config
  schema: 58 passed. Email module ESLint and Git whitespace checks passed.
- Configer: 50 passed, one existing test failed. `main.test.ts` expects a directory
  fsync after rename, but `syncDir()` explicitly returns on Windows. No configer
  code was changed in this slice. This suite still needs a platform-aware test
  and Linux validation before release.
- No UI, SMTP reception, transport, independent agent review, standalone runtime
  install, updater rehearsal or real-device pilot was performed in this slice.
  These local results do not establish fleet upgrade readiness.
