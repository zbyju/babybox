import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../", import.meta.url));
const panel = createRequire(new URL("../apps/panel/package.json", import.meta.url));
const ts = panel("typescript");
const { parse } = panel("vue/compiler-sfc");

const dtoScope =
  /\/(?:api|boundar(?:y|ies)|schemas?|types|fetch|routes|middleware|services\/db)\/|\/(?:index|configReload|restart|runtimeVersions|instanceCheck|settings)\.ts$/;
const genericRecord = (text) => /^Record<string,unknown>$/.test(text.replace(/\s/g, ""));
const isSource = (name) => /\.(?:ts|mts|cts|vue)$/.test(name) && !/\.(?:test|spec|d)\./.test(name);
const objectGuards = new Set([
  "isObject",
  "isFields",
  "isPlainObject",
  "isRecord",
  "Array.isArray",
]);

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function member(node) {
  return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
}

function isJsonCall(node) {
  return (
    ts.isCallExpression(node) &&
    member(node.expression) &&
    (node.expression.getText() === "JSON.parse" ||
      node.expression.getText() === 'JSON["parse"]' ||
      node.expression.getText() === "JSON['parse']" ||
      (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "json") ||
      (ts.isElementAccessExpression(node.expression) &&
        ts.isStringLiteral(node.expression.argumentExpression) &&
        node.expression.argumentExpression.text === "json"))
  );
}

function inspectDto(fn, genericAliases, report) {
  if (!fn.body) return;
  const roots = new Set();
  for (const parameter of fn.parameters) {
    if (ts.isIdentifier(parameter.name) && parameter.type?.kind === ts.SyntaxKind.UnknownKeyword) {
      roots.add(parameter.name.text);
    }
  }

  if (fn.type && ts.isTypePredicateNode(fn.type) && roots.has(fn.type.parameterName.getText())) {
    const target = fn.type.type;
    if (
      target &&
      !genericAliases.has(target.getText()) &&
      !genericRecord(target.getText()) &&
      (ts.isTypeReferenceNode(target) ||
        ts.isTypeLiteralNode(target) ||
        ts.isArrayTypeNode(target) ||
        ts.isUnionTypeNode(target) ||
        ts.isIntersectionTypeNode(target))
    ) {
      report(fn.type, "Parse unknown DTOs with a Zod schema instead of a type predicate");
      return;
    }
  }

  const fields = new Set();
  const raw = (node) =>
    ts.isIdentifier(node)
      ? roots.has(node.text) || fields.has(node.text)
      : member(node) && raw(node.expression);
  const field = (node) =>
    (ts.isIdentifier(node) && fields.has(node.text)) || (member(node) && raw(node.expression));
  let hasObjectGuard = false;
  let hasPresence = false;
  let hasMemberCheck = false;
  let hasCapability = false;

  walk(fn.body, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (field(node.initializer)) fields.add(node.name.text);
      else if (
        raw(node.initializer) ||
        node.type?.kind === ts.SyntaxKind.UnknownKeyword ||
        isJsonCall(node.initializer) ||
        (ts.isAwaitExpression(node.initializer) && isJsonCall(node.initializer.expression))
      ) {
        roots.add(node.name.text);
      }
    }
    if (ts.isCallExpression(node) && objectGuards.has(node.expression.getText())) {
      const [arg] = node.arguments;
      if (arg && raw(arg)) {
        hasObjectGuard = true;
        if (field(arg) && node.expression.getText() === "Array.isArray") hasMemberCheck = true;
      }
    }
    if (!ts.isBinaryExpression(node)) return;
    if (node.operatorToken.kind === ts.SyntaxKind.InKeyword && raw(node.right)) {
      hasPresence = true;
    }
    const terms = [node.left, node.right];
    const checked = terms.find(ts.isTypeOfExpression);
    const testedType = terms.find(ts.isStringLiteral)?.text;
    if (!checked || !raw(checked.expression)) return;
    if (testedType === "object") hasObjectGuard = true;
    if (testedType === "function" && field(checked.expression)) hasCapability = true;
    if (testedType && testedType !== "function" && field(checked.expression)) hasMemberCheck = true;
  });

  if (
    (hasMemberCheck && (hasObjectGuard || hasPresence)) ||
    (hasObjectGuard && hasPresence && !hasCapability)
  ) {
    report(fn, "Parse DTO fields with a Zod schema instead of checking their shape by hand");
  }
}

function checkScript(fileName, code, offset, original, checkDto, checkVue) {
  const script = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true);
  const diagnostics = [];
  const genericAliases = new Set();
  for (const statement of script.statements) {
    if (ts.isTypeAliasDeclaration(statement) && genericRecord(statement.type.getText())) {
      genericAliases.add(statement.name.text);
    }
  }
  function report(node, message) {
    const line = original.slice(0, offset + node.getStart()).split("\n").length;
    diagnostics.push({ line, message });
  }
  walk(script, (node) => {
    if (checkDto && ts.isFunctionLike(node)) inspectDto(node, genericAliases, report);
    if (!checkVue) return;
    if (isJsonCall(node)) {
      report(node, "Decode JSON in a type-checked TypeScript API boundary before using it in Vue");
    }
    if (ts.isSwitchStatement(node)) {
      const discriminants = [node.expression.getText()];
      if (ts.isPropertyAccessExpression(node.expression)) {
        discriminants.push(node.expression.expression.getText());
      }
      const surrounding = ts.isBlock(node.parent) ? node.parent.statements : [];
      const afterSwitch = surrounding[surrounding.indexOf(node) + 1];
      const fallback = node.caseBlock.clauses.find(ts.isDefaultClause);
      let hasNever = false;
      for (const check of [fallback, afterSwitch]) {
        if (!check) continue;
        walk(check, (statement) => {
          if (
            ts.isVariableDeclaration(statement) &&
            statement.type?.kind === ts.SyntaxKind.NeverKeyword &&
            discriminants.includes(statement.initializer?.getText())
          )
            hasNever = true;
          if (
            ts.isSatisfiesExpression(statement) &&
            statement.type.kind === ts.SyntaxKind.NeverKeyword &&
            discriminants.includes(statement.expression.getText())
          )
            hasNever = true;
        });
      }
      if (!hasNever) report(node, "Check Vue switches with an explicit never assignment");
    }
  });
  return diagnostics;
}

export function inspectFile(fileName, contents, checkDto = true) {
  if (!fileName.endsWith(".vue")) {
    return checkScript(fileName, contents, 0, contents, checkDto, false);
  }
  const { descriptor, errors } = parse(contents, { filename: fileName });
  const diagnostics = errors.map((error) => ({
    line: 1,
    message: typeof error === "string" ? error : error.message,
  }));
  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (!block) continue;
    if (block.src) {
      diagnostics.push({ line: block.loc.start.line, message: "Use a local Vue script block" });
      continue;
    }
    diagnostics.push(
      ...checkScript(
        fileName + ".ts",
        block.content,
        block.loc.start.offset,
        contents,
        checkDto,
        true,
      ),
    );
  }
  return diagnostics;
}

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fileName = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") {
      yield* files(fileName);
    } else if (entry.isFile() && isSource(entry.name)) {
      yield fileName;
    }
  }
}

function main() {
  const roots = process.argv.slice(2);
  const directories = roots.length
    ? roots
    : ["apps/backend/src", "apps/configer/src", "apps/panel/src"];
  for (const dir of directories) {
    for (const fileName of files(join(source, dir))) {
      const name = relative(source, fileName).split(sep).join("/");
      const checkDto = dtoScope.test("/" + name);
      if (!checkDto && !name.endsWith(".vue")) continue;
      for (const { line, message } of inspectFile(
        fileName,
        readFileSync(fileName, "utf8"),
        checkDto,
      )) {
        console.error(`${name}:${line}: ${message}`);
        process.exitCode = 1;
      }
    }
  }
}

if (import.meta.main) main();
