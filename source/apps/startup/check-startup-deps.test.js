const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

describe("startup dependency probe", () => {
  let root;
  let startup;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "startup-deps-"));
    startup = path.join(root, "apps", "startup");
    fs.mkdirSync(startup, { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, "check-startup-deps.js"),
      path.join(startup, "check-startup-deps.js")
    );
    fs.writeFileSync(
      path.join(startup, "package.json"),
      JSON.stringify({ dependencies: { alpha: "1.2.3", beta: "2.0.0" } })
    );
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  function install(base, name, version) {
    const dir = path.join(base, "node_modules", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name, version, main: "index.js" })
    );
    fs.writeFileSync(path.join(dir, "index.js"), "module.exports = {};\n");
  }

  function probe() {
    return spawnSync(process.execPath, [
      path.join(startup, "check-startup-deps.js"),
    ]).status;
  }

  it("accepts matching packages resolved from both the workspace and app", () => {
    install(root, "alpha", "1.2.3");
    install(startup, "beta", "2.0.0");
    expect(probe()).toBe(0);
  });

  it("rejects missing or outdated packages", () => {
    install(root, "alpha", "1.2.3");
    expect(probe()).toBe(1);
    install(startup, "beta", "1.0.0");
    expect(probe()).toBe(1);
  });
});
