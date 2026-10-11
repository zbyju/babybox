/*
 * backend.url is the free-text "Předpona API" field on the config page.
 * path-to-regexp 8, which express 5 uses, throws at registration for
 * { } ( ) [ ] + ? ! and for : or * with no name after them.
 * That throw happens before app.listen, so a typo there would leave a box
 * with nothing serving and no way in. An empty prefix answers the wrong
 * paths, which the config page can still fix.
 */
const UNSAFE = /[{}()[\]+?!]|[:*](?![A-Za-z_])/;

export function safeRoutePrefix(prefix: string): string {
  return UNSAFE.test(prefix) ? "" : prefix;
}
