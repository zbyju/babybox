/* global describe, it, expect */
const fs = require("fs");
const os = require("os");
const path = require("path");

const { readVersions } = require("../../../bootstrap");
const { pinnedPm2Version } = require("./pm2-version");
const installUbuntu = require("./ubuntu");
const installWindows = require("./windows");

const REAL_VERSIONS = path.resolve(__dirname, "../../../versions.env");
const PIN = readVersions(fs.readFileSync(REAL_VERSIONS, "utf8")).PM2_VERSION;

function withVersions(text, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "babybox-pm2-pin-"));
  const file = path.join(dir, "versions.env");
  fs.writeFileSync(file, text);
  try {
    fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("pinnedPm2Version", () => {
  it("reads the pin from versions.env", () => {
    expect(PIN).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pinnedPm2Version()).toBe(PIN);
  });

  it("refuses latest", () => {
    withVersions("PM2_VERSION=latest\n", (file) => {
      expect(() => pinnedPm2Version(file)).toThrow(
        "PM2_VERSION chybi ve versions.env"
      );
    });
  });

  it("refuses a file without the key", () => {
    withVersions("BUN_VERSION=1.4.2\n", (file) => {
      expect(() => pinnedPm2Version(file)).toThrow(
        "PM2_VERSION chybi ve versions.env"
      );
    });
  });
});

describe.each([
  ["Ubuntu", installUbuntu],
  ["Windows", installWindows],
])("%s install", (label, install) => {
  it("installs the pinned pm2", async () => {
    const commands = [];
    const exec = async (command) => {
      commands.push(command);
    };
    const logger = {
      error(tag, message, error) {
        throw error || new Error(`${tag}: ${message}`);
      },
    };
    expect(await install({ exec, logger })).toBe(true);
    expect(commands).toContain(`npm install -g pm2@${PIN}`);
    expect(commands).not.toContain("npm install -g pm2@latest");
  });
});
