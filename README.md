# Babybox panel app

Monitoring panel for a babybox: a Vue panel, an Express backend that talks to the
hardware units, and configer, which holds the configuration. `docs/` has the detail,
starting with [docs/plans](docs/plans) and [docs/decisions.md](docs/decisions.md).

## Changing a box's configuration

Open the panel, unlock the nav with the app password, and pick **Konfigurace**. The
page edits everything in `source/apps/configer/configs/main.json` as a form, so the
file no longer has to be edited by hand over a remote session.

Saving writes the config, asks the backend to re-read it, and reloads the panel. Most
fields are live at that point. Two are not:

- `backend.port` and `backend.url` take effect only when the backend is restarted.
  The page shows a banner after the save saying so.
- `configer.port` and `configer.url` are shown read-only. The API refuses to write
  them, because nothing outside configer follows a change and the box would come up
  serving nothing. Edit `main.json` and restart configer.

The form asks for confirmation before saving a change to the app password, the
backend port or prefix, a unit IP, the operating system or the refresh limit — the
fields that can leave a maintainer unable to reach the box. It shows the question on
the page and waits for a second press of Save, so the panel keeps running.

## Who can reach the box

The backend and configer have **no authentication**, listen on every interface and
allow every origin. Anything that can route to the box can read its configuration,
including the app password, and can open the doors. The password in the panel is
checked in the browser and guards against a mis-tap, nothing more. That is a recorded
decision and it assumes the box sits on a trusted hospital network — see
[docs/decisions.md](docs/decisions.md), "No auth on the configer write endpoint".

## Development

Both commands run from `source/`, which is where the only `package.json` lives.

```bash
cd source
pnpm dev     # start all services
pnpm build   # build for production
```

Use pnpm 7.5.0 on Node 18. A newer pnpm rewrites the lockfile. The box's workspace
install uses `--frozen-lockfile`. The runtime folder installs production dependencies
only. See [docs/learnings.md](docs/learnings.md).
