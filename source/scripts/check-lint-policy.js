const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const source = path.resolve(__dirname, "..");

function expectLintFailure(directory, name, content, rules, typeAware) {
  const fixture = fs.mkdtempSync(path.join(source, directory, "lint-check-"));
  const file = path.join(fixture, name);
  try {
    fs.writeFileSync(file, content);
    const flags = typeAware ? ["--type-aware"] : [];
    const result = spawnSync(
      process.execPath,
      ["--bun", "oxlint", "--deny-warnings", ...flags, file],
      { cwd: source, encoding: "utf8" },
    );
    if (result.error) throw result.error;

    const output = result.stdout + result.stderr;
    if (result.status !== 1 || rules.some((rule) => !output.includes(rule))) {
      throw new Error("Expected lint failures for " + directory + "/" + name + "\n" + output);
    }
    console.log(directory + "/" + name + " rejected by " + rules.join(", "));
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(fixture);
  }
}

expectLintFailure(
  "apps/panel/src",
  "boundary.ts",
  `const decoded = JSON.parse("{}");
export function check(value: "saved" | "failed") {
  switch (value) {
    case "saved":
      return decoded;
  }
}
`,
  ["no-unsafe-assignment", "switch-exhaustiveness-check"],
  true,
);
expectLintFailure(
  "apps/panel/src",
  "script.vue",
  '<script setup lang="ts">\nconst value: any = 1;\nconsole.log(value);\n</script>\n',
  ["no-explicit-any"],
  true,
);
for (const directory of ["apps/startup", "scripts"]) {
  expectLintFailure(directory, "script.js", "missingVariable();\n", ["no-undef"], false);
}
