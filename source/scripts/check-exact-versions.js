"use strict";

const fs = require("fs");
const path = require("path");

const sourceRoot = path.resolve(__dirname, "..");
const sections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function collectPackageFiles(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectPackageFiles(full, out);
    } else if (entry.name === "package.json") {
      out.push(full);
    }
  }
  return out;
}

function checkFile(file, errors) {
  const rel = path.relative(sourceRoot, file).split(path.sep).join("/");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const deps = pkg[section];
    if (!deps || typeof deps !== "object") continue;
    const names = Object.keys(deps);
    for (let n = 0; n < names.length; n++) {
      const name = names[n];
      const value = deps[name];
      const where = rel + " " + section + "." + name;
      if (typeof value !== "string") {
        errors.push(where + " is not a string.");
        continue;
      }
      if (rel === "apps/backend/package.json" && value.indexOf("workspace:") === 0) {
        errors.push(where + ' is "' + value + '". The backend has no workspace specifier.');
        continue;
      }
      if (value === "workspace:*") continue;
      if (!exactVersion.test(value)) {
        errors.push(where + ' is "' + value + '". A registry specifier is one exact version.');
      }
    }
  }
}

function main() {
  const files = collectPackageFiles(sourceRoot, []);
  const errors = [];
  for (let i = 0; i < files.length; i++) {
    checkFile(files[i], errors);
  }
  if (errors.length > 0) {
    process.stderr.write(errors.join("\n") + "\n");
    process.exit(1);
  }
}

main();
