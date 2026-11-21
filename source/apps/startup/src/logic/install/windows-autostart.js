const fs = require("fs");
const path = require("path");

function registerWindowsAutostart() {
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error("APPDATA is missing");
  }
  const startupFolder = path.join(
    appData,
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup"
  );
  const script = path.resolve(
    __dirname,
    "../../../scripts/windows/startup.bat"
  );
  const launcher = path.join(startupFolder, "babybox.cmd");
  fs.mkdirSync(startupFolder, { recursive: true });
  // Transfer control to the checkout script without CALL's second expansion.
  const escapedScript = script.replace(/%/g, "%%");
  fs.writeFileSync(
    launcher,
    '@echo off\r\nsetlocal DisableDelayedExpansion\r\n"' +
      escapedScript +
      '"\r\n'
  );
}

module.exports = registerWindowsAutostart;
