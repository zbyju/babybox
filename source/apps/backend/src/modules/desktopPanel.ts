// The panel waits five seconds between heartbeat requests. Give a tab that
// survived the restart time to finish its current request and send another.
const RECONNECT_WINDOW_MS = 12_000;

export function desktopPanel(open: () => void) {
  let checkedIn = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    checkIn(peer: string | undefined) {
      if (peer !== "127.0.0.1" && peer !== "::1" && peer !== "::ffff:127.0.0.1")
        return;
      checkedIn = true;
      clearTimeout(timer);
    },
    openIfMissing() {
      if (!checkedIn) timer = setTimeout(open, RECONNECT_WINDOW_MS);
    },
  };
}
