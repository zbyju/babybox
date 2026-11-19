# Email delivery implementation

Work lives on `feature/email-delivery`. Do not merge into `main` or deploy until
the upgrade and pilot checks below pass. The development implementation now includes
SMTP reception, implicit TLS submission, routing, queue scheduling, persistent
lifecycle history and a Czech maintenance page at `/email`. Physical device and
provider compatibility have not been established yet.

The agreed product specification is in `zbyju/babybox-mono`,
`specs/babybox-email-delivery-project.md` (2026-11-17). That specification remains
authoritative; this file tracks implementation and release gates.

## Sequence

1. Implement bounded volatile message scheduling (implemented): 100 pending
   messages including active delivery, 100 MiB content, 24-hour receipt TTL,
   oldest waiting eviction, new messages before retries, shared connection
   cooldown, configuration failure pause, and explicit eviction/expiry outcomes.
2. Add persistent lifecycle history and per-recipient delivery state (implemented). The queue
   caller must record every discarded result and terminal result, track successful
   recipients, and mark lost volatile content interrupted on restart. Queue IDs
   are process-local scheduling handles, not persistent email identities.
3. Add TLS SMTP submission on 465, error classification, routing modes and sender
   preservation/override (implemented). Confirm provider acceptance semantics and attachment
   preservation with test mail. Never disable TLS certificate verification.
4. Add port 25 reception inside the backend (implemented), restricted to current configured
   engine, thermal and camera IPs. Test actual device AUTH/session behavior and
   camera message sizes. Bind or mail failures must not prevent backend startup.
   Enabled by default on supported runtimes; an older runtime reports it unavailable.
5. Add Czech settings, listener/transport status, history and confirmed queue
   actions on a dedicated page (implemented; human UI review pending). Monitoring
   and watchdog traffic remain in the global app manager.
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
expire. The delivery worker enforces transport timeouts so an active send cannot
hold the reservation forever. Recipient routing and permanent recipient failures
belong to the delivery worker, not this content scheduler. `resume()` is reserved
for explicit retry/settings changes and preserves original receipt time.

## Runtime compatibility and storage

This branch builds on the Bun toolchain upgrade. The relay runs under Bun and
remains disabled on the Node 18 fallback. The Node-only validation below records
the original implementation before the rebase.

The deployed Node 18.12.1 toolchain still installs and builds this branch. Current
SMTP/MIME libraries require Node 20+. Older compatible releases have known security
advisories, so they are not used. Library imports are lazy and guarded: on Node 18
the normal backend and panel run, and the email page reports the runtime requirement.
No listener is opened and no email is accepted by the unsupported runtime. Updating
the panel alone therefore does not activate email on those machines. This is a
release constraint, not an automatic Node upgrade. Adopt a supported LTS runtime
(tested locally: Node 24.22.2) before migrating a site's email. Verify the updater
and startup process use that runtime, including their build step. No startup script
or deployed Node version is changed by this branch.

`email` is an optional configuration section. Configer merges the new defaults into
old configurations in memory without rewriting their files. Device mode and enabled
reception are defaults; no outbound credentials are assumed. The email page PATCHes
only this section and asks the backend to reload it. SMTP listener changes take
effect on the next email worker tick; device allowlisting reads the current config.
AUTH LOGIN/PLAIN is accepted only for allowed peers; device credentials are ignored,
never logged and never reused upstream. Real device sessions are still needed to
validate their behavior. The page uses the existing maintenance navigation gate,
not a new API authentication boundary; existing trusted-LAN assumptions still apply.

History lives in repository-root `email-data/history.json`, outside replaceable
`dist`/`dist2` folders. `EMAIL_DATA_DIR` can select another writable directory and
must be consistent across restarts. Writes are serialized, atomic and fsynced
(directory fsync is skipped on Windows). Corrupt history is preserved and a visible
recording error is reported. The queue is volatile; unfinished history is marked
interrupted on restart. Definitively failed messages retain bounded content for
explicit manual retry until eviction, deletion or expiry. Accepted recipients are
never included in those retries. MIME parsing runs in a worker; only useful text,
headers and attachment metadata are retained in history, never attachment bytes.
Diagnostic text and headers are limited to 64 KiB each per email.

## Current validation (Windows, 2026-11-20)

- Frozen workspace install and schema/backend/panel/configer builds passed on
  Node 18.12.1 and pnpm 7.5.0.
- Node 18 backend: 124 passed, three runtime-specific tests skipped. Node 24 email:
  all 35 passed, including real SMTP exchanges with/without AUTH, occupied-port isolation and worker
  parsing of a camera-style MIME attachment. Panel: 140 passed. Config schema:
  58 passed. Configer: 52 passed, including pre-email config upgrade without disk
  rewrite. The directory fsync test now reflects the implementation's existing
  Windows behavior; no configer runtime code was changed.
- Standalone backend production-only install passed outside the workspace. Compiled
  relay loaded safely on Node 18; all three mail dependencies loaded on Node 24.
  Full standalone backend startup smoke tests on both versions returned HTTP 200
  from monitoring status and email status using isolated test configuration.
- The explicit panel app typecheck still reports errors in untouched settings,
  Moment/reactive types and an empty module; no EmailView errors remain. The
  repository's existing panel production build passes. This wider typecheck debt
  is not claimed fixed here.
- CI now has a Node 24 email job alongside the existing Node 18 compatibility job.
  Remote CI has not run. No independent agent review, browser visual review,
  updater rehearsal, real-provider inbox test or real-device pilot was performed.
  These local results do not establish fleet upgrade readiness.
