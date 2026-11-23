import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

// The panel waits five seconds between heartbeat requests. Give a tab that
// survived the restart time to finish its current request and send another.
const RECONNECT_WINDOW_MS = 12_000;
const FIREFOX_RESTORE_WINDOW_MS = 25_000;
const run = promisify(execFile);

export async function restoreFirefoxSession(): Promise<boolean> {
  if (
    process.platform !== "linux" ||
    (!process.env["DISPLAY"] && !process.env["WAYLAND_DISPLAY"])
  )
    return false;
  const { stdout } = await run("xdg-settings", ["get", "default-web-browser"], {
    timeout: 2_000,
  });
  if (!/^firefox(?:[_.-]|$)/i.test(stdout.trim())) return false;
  const uid = process.getuid?.();
  if (uid === undefined) return false;
  try {
    await run("pgrep", ["-u", String(uid), "-x", "firefox"], {
      timeout: 2_000,
    });
    return false;
  } catch (error) {
    // pgrep exits 1 when Firefox is absent. Other errors leave launch to the
    // usual default-browser handler after the reconnect window.
    if (!(error instanceof Error && "code" in error && error.code === 1))
      return false;
  }
  return new Promise((resolve) => {
    // Starting without a URL lets Firefox restore the previous window without
    // also asking it to open a second copy of the panel.
    const browser = spawn("firefox", [], { detached: true, stdio: "ignore" });
    browser.once("error", () => resolve(false));
    browser.once("spawn", () => {
      browser.unref();
      resolve(true);
    });
  });
}

export function desktopPanel(
  open: () => void,
  restoreBrowser: () => Promise<boolean> = async () => false
) {
  let started = false;
  let checkedIn = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    checkIn(peer: string | undefined) {
      if (peer !== "127.0.0.1" && peer !== "::1" && peer !== "::ffff:127.0.0.1")
        return;
      checkedIn = true;
      clearTimeout(timer);
    },
    async openIfMissing() {
      if (started || checkedIn) return;
      started = true;
      const restoring = await restoreBrowser().catch(() => false);
      if (!checkedIn)
        timer = setTimeout(
          open,
          restoring ? FIREFOX_RESTORE_WINDOW_MS : RECONNECT_WINDOW_MS
        );
    },
  };
}
