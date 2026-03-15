/**
 * Babybox Startup Application - CLI Entry Point
 *
 * Automatically updates and starts the babybox panel application.
 * Handles git pull, build, deployment, and service management.
 */

import { parseArgs } from "node:util";
import { createAppContext } from "../application/context.js";
import { startup } from "../application/orchestrators/index.js";
import { createCombinedLogger } from "../infrastructure/logging/index.js";
import { VERSION, getVersionInfo } from "../version.js";
import { resolveOS } from "./os-detection.js";
import { createAdapters } from "./adapter-factory.js";
import { loadConfig, getLogLevel } from "./config-loader.js";

const HELP_TEXT = `
Babybox Startup v${VERSION}

Automaticky aktualizuje a spousti babybox panel aplikaci.

Pouziti:
  startup [prepinace]

Prepinace:
  --ubuntu       Spustit v Ubuntu rezimu
  --windows      Spustit ve Windows rezimu
  --mac          Spustit v macOS rezimu
  --help, -h     Zobrazit tuto napovedu
  --version, -v  Zobrazit verzi

Priklady:
  startup                    # Auto-detekce OS, normalni startup
  startup --ubuntu           # Explicitne Ubuntu
  startup --mac              # Explicitne macOS

Promenne prostredi:
  BABYBOX_REPO_PATH     Cesta k repozitari (vychozi: auto-detekce)
  BABYBOX_LOG_LEVEL     Uroven logovani: debug, info, warn, error
  BABYBOX_MAX_RETRIES   Maximalni pocet opakovani (vychozi: 5)
`;

type ParsedArgs = {
  ubuntu: boolean;
  windows: boolean;
  mac: boolean;
  help: boolean;
  version: boolean;
};

function parseCliArgs(): ParsedArgs | null {
  try {
    const { values } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        ubuntu: { type: "boolean", default: false },
        windows: { type: "boolean", default: false },
        mac: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
      strict: true,
    });

    return {
      ubuntu: values.ubuntu ?? false,
      windows: values.windows ?? false,
      mac: values.mac ?? false,
      help: values.help ?? false,
      version: values.version ?? false,
    };
  } catch {
    return null;
  }
}

async function main(): Promise<number> {
  // Parse arguments
  const args = parseCliArgs();

  if (args === null) {
    console.error("Chyba: Neplatny argument");
    console.error(HELP_TEXT);
    return 1;
  }

  // Handle --help
  if (args.help) {
    console.log(HELP_TEXT);
    return 0;
  }

  // Handle --version
  if (args.version) {
    console.log(`Babybox Startup ${getVersionInfo()}`);
    return 0;
  }

  // Load configuration
  const config = loadConfig();
  const logLevel = getLogLevel();

  // Create logger
  const logger = createCombinedLogger({
    logDir: config.logsPath,
    filePrefix: "startup",
    consoleLevel: logLevel,
    fileLevel: "debug",
  });

  // Resolve OS
  const os = resolveOS({
    ubuntu: args.ubuntu,
    windows: args.windows,
    mac: args.mac,
  });

  logger.info("startup", `Detekovan OS: ${os.kind}`);
  logger.debug("startup", `Konfigurace: ${JSON.stringify(config, null, 2)}`);

  // Create adapters
  const adapters = createAdapters(os, config);

  // Create context
  const ctx = createAppContext({
    config,
    os,
    logger,
    git: adapters.git,
    fs: adapters.fs,
    process: adapters.process,
    packageManager: adapters.packageManager,
  });

  // Run startup
  try {
    const result = await startup(ctx);

    // Flush logs before exit
    await logger.flush();

    // Handle Result type
    if (result.isErr()) {
      return 1;
    }

    // Return appropriate exit code
    switch (result.value.kind) {
      case "success":
        return 0;
      case "partial_success":
        return 0; // Services started, some warnings
      case "failed":
        return 1;
    }
  } catch (e) {
    // This should never happen if we followed the "never throw" principle
    // But handle it just in case
    const message = e instanceof Error ? e.message : String(e);
    logger.error("startup", `Neocekavana chyba: ${message}`, []);
    await logger.flush();
    return 1;
  }
}

// Run and exit with appropriate code
main().then((code) => {
  process.exit(code);
});
