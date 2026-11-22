import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { inspectFile } from "./lint-boundaries.js";

const source = fileURLToPath(new URL("../", import.meta.url));
const fixture = (name) =>
  readFileSync(join(source, "scripts", "lint-fixtures", name + ".txt"), "utf8");
const temp = mkdtempSync(join(tmpdir(), "babybox-lint-"));

function bun(script, args) {
  const result = spawnSync(process.execPath, ["--bun", join(source, script), ...args], {
    cwd: temp,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

function oxlint(file, config) {
  return bun("node_modules/oxlint/bin/oxlint", [
    "--config",
    join(source, config),
    "--type-aware",
    "--deny-warnings",
    file,
  ]);
}

function vueCheck(file) {
  writeFileSync(
    join(temp, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { strict: true, skipLibCheck: true, types: [] },
      files: [file],
    }),
  );
  return bun("apps/panel/node_modules/vue-tsc/bin/vue-tsc.js", ["--noEmit", "-p", "tsconfig.json"]);
}

try {
  assert.deepEqual(inspectFile("dto-good.ts", fixture("dto-good.ts")), []);
  const dto = inspectFile("dto-bad.ts", fixture("dto-bad.ts"));
  assert.deepEqual(
    dto.map(({ message }) => message),
    [
      "Parse unknown DTOs with a Zod schema instead of a type predicate",
      "Parse DTO fields with a Zod schema instead of checking their shape by hand",
      "Parse DTO fields with a Zod schema instead of checking their shape by hand",
    ],
  );

  writeFileSync(join(temp, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));
  writeFileSync(join(temp, "unsafe.ts"), fixture("unsafe.ts"));
  const typescript = oxlint("unsafe.ts", ".oxlintrc.typescript.json");
  assert.equal(typescript.status, 1, typescript.output);
  assert.match(typescript.output, /no-unsafe-assignment/);
  assert.match(typescript.output, /switch-exhaustiveness-check/);

  const unsafeVue = fixture("unsafe.vue");
  writeFileSync(join(temp, "unsafe.vue"), unsafeVue);
  const nativeVue = oxlint("unsafe.vue", "apps/panel/.oxlintrc.json");
  assert.ok(nativeVue.status === 0 || nativeVue.status === 1, nativeVue.output);
  console.log(
    "Oxlint Vue SFC unsafe assignment reported:",
    /no-unsafe-assignment/.test(nativeVue.output),
  );
  console.log(
    "Oxlint Vue SFC exhaustiveness reported:",
    /switch-exhaustiveness-check/.test(nativeVue.output),
  );
  assert.deepEqual(
    inspectFile("unsafe.vue", unsafeVue).map(({ message }) => message),
    ["Decode JSON in a type-checked TypeScript API boundary before using it in Vue"],
  );
  const vue = vueCheck("unsafe.vue");
  assert.equal(vue.status, 2, vue.output);
  assert.match(vue.output, /TS2322: Type .* is not assignable to type 'never'/);
  const withoutNever = unsafeVue.replace(
    "const exhaustive: never = state;",
    "const exhaustive = state;",
  );
  assert.ok(
    inspectFile("unsafe.vue", withoutNever).some(({ message }) =>
      message.includes("explicit never"),
    ),
  );

  const safeVue = fixture("safe.vue");
  writeFileSync(join(temp, "safe.vue"), safeVue);
  assert.deepEqual(inspectFile("safe.vue", safeVue), []);
  const safe = vueCheck("safe.vue");
  assert.equal(safe.status, 0, safe.output);
  console.log("TypeScript, Vue and DTO lint fixtures passed.");
} finally {
  // Every path here was created by this process in its unique test directory.
  for (const file of ["tsconfig.json", "unsafe.ts", "unsafe.vue", "safe.vue"]) {
    rmSync(join(temp, file), { force: true });
  }
  rmdirSync(temp);
}
