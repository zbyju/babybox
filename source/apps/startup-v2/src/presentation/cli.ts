/**
 * Babybox Startup Application
 *
 * Automatically updates and starts the babybox panel application.
 * Handles git pull, build, deployment, and service management.
 */

import { parseArgs } from "util";

function main(): void {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      ubuntu: { type: "boolean", default: false },
      windows: { type: "boolean", default: false },
      mac: { type: "boolean", default: false },
      install: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
Babybox Startup v2.0.0

Pouziti:
  startup [--ubuntu|--windows|--mac] [--install]

Prepinace:
  --ubuntu     Spustit v Ubuntu rezimu
  --windows    Spustit ve Windows rezimu  
  --mac        Spustit v macOS rezimu
  --install    Provest prvotni instalaci
  --help, -h   Zobrazit tuto napovedu
`);
    process.exit(0);
  }

  // TODO: Implement in subsequent projects
  console.log("Startup aplikace - v priprave");
  console.log("Konfigurace:", values);
}

main();
