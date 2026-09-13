/** The nav password field. The panel itself is 100vh, so this sits below it. */
export const PANEL_PASSWORD_INPUT_ID = "panel-password";

/**
 * Scrolls to the nav password field and focuses it.
 * Use it when a maintainer clicks the Babybox title on the panel.
 */
export function focusPanelPassword(doc: Document = document): void {
  const input = doc.getElementById(PANEL_PASSWORD_INPUT_ID);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  /*
   * Smooth-scroll the field into view. Focus with preventScroll so the
   * browser does not add a second, instant jump on top of that scroll.
   */
  input.scrollIntoView({ behavior: "smooth", block: "end" });
  input.focus({ preventScroll: true });
}

/**
 * Scrolls the window to the top of the page.
 * Use it from the floating button on settings and config.
 */
export function scrollWindowToTop(
  win: Pick<Window, "scrollTo"> = window,
): void {
  win.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}
