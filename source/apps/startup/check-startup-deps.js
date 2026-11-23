// This probe must run before the workspace dependencies are installed.
const fs = require("fs");
const path = require("path");

function packageVersion(name) {
  let dir = path.dirname(require.resolve(name));
  while (true) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf8")
      );
      if (pkg.name === name) return pkg.version;
    } catch (_) {
      // Keep looking for the package root.
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

try {
  const deps = require("./package.json").dependencies;
  for (const name of Object.keys(deps)) {
    if (packageVersion(name) !== deps[name]) process.exit(1);
  }
} catch (_) {
  process.exit(1);
}
