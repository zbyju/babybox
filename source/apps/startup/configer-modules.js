/*
 * Copies configer's runtime packages into apps/configer/dist/node_modules.
 * Node resolves that folder before source/node_modules.
 * The script stays in apps/configer/dist, so ../../../configs still reads
 * apps/configer/configs.
 * The copy runs after BUILD_CONFIGER succeeds, once per record time.
 * A later bun install can change source/node_modules. This copy stays.
 * @babybox/config-schema is copied as files. A link would follow the live
 * packages/config-schema/dist after a later schema build.
 */

const fs = require("fs");
const path = require("path");

function oneLine(text) {
  return String(text).replace(/[\r\n\t]+/g, " ").replace(/ +/g, " ").trim();
}

function writeOut(stdout, line) {
  stdout.write(line);
}

function existsAny(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (err) {
    return false;
  }
}

function readLast(sourceDir) {
  try {
    const record = JSON.parse(
      fs.readFileSync(path.join(sourceDir, "logs", "startup.last.json"), "utf8")
    );
    if (!record || typeof record.step !== "string") {
      return null;
    }
    return record;
  } catch (err) {
    return null;
  }
}

function provenAt(record) {
  if (!record || record.step !== "BUILD_CONFIGER" || record.ok !== true) {
    return "";
  }
  if (typeof record.at !== "string" || record.at === "") {
    return "";
  }
  return record.at;
}

function readStamp(isolated) {
  try {
    return fs.readFileSync(path.join(isolated, ".proven"), "utf8").trim();
  } catch (err) {
    return "";
  }
}

function snapshotNeeded(record, hasTree, stamp) {
  const at = provenAt(record);
  if (at === "") {
    return false;
  }
  if (!hasTree) {
    return true;
  }
  return stamp !== at;
}

function removeTree(target) {
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (err) {
    return;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fs.unlinkSync(target);
    return;
  }
  const names = fs.readdirSync(target);
  for (let i = 0; i < names.length; i += 1) {
    removeTree(path.join(target, names[i]));
  }
  fs.rmdirSync(target);
}

function copyTree(src, dest, seen) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    copyTree(fs.realpathSync(src), dest, seen);
    return;
  }
  if (stat.isDirectory()) {
    const real = fs.realpathSync(src);
    if (seen[real]) {
      return;
    }
    seen[real] = true;
    fs.mkdirSync(dest, { recursive: true });
    const names = fs.readdirSync(src);
    for (let i = 0; i < names.length; i += 1) {
      if (names[i] === "node_modules") {
        continue;
      }
      copyTree(path.join(src, names[i]), path.join(dest, names[i]), seen);
    }
    return;
  }
  if (!stat.isFile()) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function pushDir(dirs, dir) {
  if (dir && dirs.indexOf(dir) === -1) {
    dirs.push(dir);
  }
}

function findPackage(name, dirs) {
  for (let i = 0; i < dirs.length; i += 1) {
    const candidate = path.join(dirs[i], name);
    if (!fs.existsSync(candidate)) {
      continue;
    }
    let realPath;
    try {
      realPath = fs.realpathSync(candidate);
    } catch (err) {
      continue;
    }
    if (!fs.existsSync(path.join(realPath, "package.json"))) {
      continue;
    }
    return realPath;
  }
  return null;
}

function runtimeDeps(realPath) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(realPath, "package.json"), "utf8")
  );
  const required = pkg.dependencies || {};
  const optional = pkg.optionalDependencies || {};
  const seen = {};
  const deps = [];
  const requiredNames = Object.keys(required);
  for (let i = 0; i < requiredNames.length; i += 1) {
    const depName = requiredNames[i];
    seen[depName] = true;
    deps.push({
      name: depName,
      optional: Object.prototype.hasOwnProperty.call(optional, depName),
    });
  }
  const optionalNames = Object.keys(optional);
  for (let i = 0; i < optionalNames.length; i += 1) {
    const depName = optionalNames[i];
    if (seen[depName]) {
      continue;
    }
    deps.push({ name: depName, optional: true });
  }
  return deps;
}

function searchDirs(realPath, inherited) {
  const dirs = [];
  pushDir(dirs, path.join(realPath, "node_modules"));
  // Bun keeps a package's dependencies beside it in the store.
  pushDir(dirs, path.dirname(realPath));
  for (let i = 0; i < inherited.length; i += 1) {
    pushDir(dirs, inherited[i]);
  }
  return dirs;
}

function installOne(name, optional, dirs, destModules, stack) {
  const realPath = findPackage(name, dirs);
  if (realPath === null) {
    if (optional) {
      return { ok: true };
    }
    return { ok: false, missing: name };
  }
  if (stack.indexOf(realPath) !== -1) {
    return { ok: true };
  }
  const dest = path.join(destModules, name);
  if (!existsAny(dest)) {
    copyTree(realPath, dest, {});
  }
  const deps = runtimeDeps(realPath);
  const nested = path.join(dest, "node_modules");
  const nextStack = stack.concat([realPath]);
  const nextDirs = searchDirs(realPath, dirs);
  for (let i = 0; i < deps.length; i += 1) {
    const dep = deps[i];
    const result = installOne(dep.name, dep.optional, nextDirs, nested, nextStack);
    if (!result.ok) {
      return result;
    }
  }
  return { ok: true };
}

function rootDirs(sourceDir, configerDir) {
  const dirs = [];
  pushDir(dirs, path.join(configerDir, "node_modules"));
  pushDir(dirs, path.join(sourceDir, "node_modules"));
  return dirs;
}

function copyDeps(sourceDir, configerDir, staging) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(configerDir, "package.json"), "utf8")
  );
  const deps = pkg.dependencies || {};
  const names = Object.keys(deps);
  if (names.length === 0) {
    return { ok: false, missing: "dependencies" };
  }
  const dirs = rootDirs(sourceDir, configerDir);
  for (let i = 0; i < names.length; i += 1) {
    const result = installOne(names[i], false, dirs, staging, []);
    if (!result.ok) {
      return result;
    }
  }
  return { ok: true };
}

function commitTree(staging, dest) {
  const backup = `${dest}.bak`;
  removeTree(backup);
  const hadDest = existsAny(dest);
  if (hadDest) {
    fs.renameSync(dest, backup);
  }
  try {
    fs.renameSync(staging, dest);
  } catch (err) {
    if (hadDest && !existsAny(dest)) {
      try {
        fs.renameSync(backup, dest);
      } catch (restoreErr) {
        // The caller reports the original rename error.
      }
    }
    throw err;
  }
  removeTree(backup);
}

function snapshot(sourceDir, configerDir, at) {
  const dest = path.join(configerDir, "dist", "node_modules");
  const staging = path.join(configerDir, "dist", "node_modules.proving");
  removeTree(staging);
  fs.mkdirSync(staging, { recursive: true });
  try {
    const copied = copyDeps(sourceDir, configerDir, staging);
    if (!copied.ok) {
      removeTree(staging);
      return copied;
    }
    fs.writeFileSync(path.join(staging, ".proven"), `${at}\n`);
    commitTree(staging, dest);
    return { ok: true };
  } catch (err) {
    removeTree(staging);
    return { ok: false, error: err };
  }
}

function failureDetail(result) {
  if (result.missing) {
    return `${result.missing} chybí`;
  }
  if (result.error && result.error.message) {
    return oneLine(result.error.message);
  }
  return "chyba";
}

function prepareConfigerModules(options) {
  const sourceDir = options.sourceDir;
  const configerDir = options.configerDir;
  const record = readLast(sourceDir);
  const at = provenAt(record);
  const dest = path.join(configerDir, "dist", "node_modules");
  const hasTree = existsAny(dest);
  const stamp = hasTree ? readStamp(dest) : "";
  if (!snapshotNeeded(record, hasTree, stamp)) {
    return 0;
  }
  const result = snapshot(sourceDir, configerDir, at);
  if (result.ok) {
    return 0;
  }
  writeOut(
    options.stdout,
    `Balíčky pro configer nejde zkopírovat. ${failureDetail(result)}.\n`
  );
  return 1;
}

module.exports = {
  prepareConfigerModules,
  snapshotNeeded,
};
