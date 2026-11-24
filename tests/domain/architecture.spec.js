import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { parse } from "svelte/compiler";
import { registry } from "../../src/games/gameRegistry";
import "../../src/games";

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? sources(join(dir, entry.name)) : /\.(ts|svelte)$/.test(entry.name) ? [join(dir, entry.name)] : []);
}

test("source root contains startup files, not loose game implementations", () => {
  const root = readdirSync("src", { withFileTypes: true }).filter(entry => entry.isFile() && /\.(ts|svelte|css)$/.test(entry.name));
  expect(root.map(entry => entry.name).sort()).toEqual(["App.svelte", "app.d.ts", "main.ts"]);
});

test("domain, storage and shared UI retain one-way dependency boundaries", () => {
  const boundaries = {
    domain: ["src/domain/", "content/"],
    persistence: ["src/domain/", "src/persistence/"],
    components: ["src/components/", "src/domain/", "src/games/", "src/lessons/", "src/presentation/"],
    presentation: ["src/presentation/", "src/domain/"]
  };
  const violations = [];
  for (const [layer, allowed] of Object.entries(boundaries)) {
    for (const file of sources(`src/${layer}`)) {
      const text = readFileSync(file, "utf8");
      const component = file.endsWith(".svelte") ? parse(text) : null;
      const script = component ? [component.instance, component.module].filter(Boolean)
        .map(node => text.slice(node.content.start, node.content.end)).join("\n") : text;
      for (const dependency of ts.preProcessFile(script, true, true).importedFiles) {
        const spec = dependency.fileName;
        const target = relative(process.cwd(), resolve(dirname(file), spec));
        const permitted = spec.startsWith(".")
          ? allowed.some(prefix => target.startsWith(prefix) && (prefix !== "content/" || target.endsWith(".json")))
            // The learning guide reuses the launcher logo, not native shell code.
            || layer === "presentation" && target === "src-tauri/icons/128x128@2x.png"
          : layer === "components" && (spec === "svelte" || /^@lucide\/svelte\/icons\/[a-z0-9-]+$/.test(spec))
            || layer === "domain" && spec === "javascript-lp-solver" && file.endsWith("rummyMelds.ts")
            || layer === "domain" && spec === "@johnmorrisdotca/toranpu/cribbage" && file.endsWith("/cribbage.ts");
        if (!permitted) violations.push(`${file} imports ${spec}`);
      }
    }
  }
  expect(violations).toEqual([]);
});

test("shared table and learning templates do not select behavior by game id or import game definitions", () => {
  const gameIds = new Set(registry.getAll().map(definition => definition.table.id));
  const violations = [];
  for (const file of ["src/components/GameTableShell.svelte", "src/components/LearnPanel.svelte", "src/features/GameLearning.svelte"]) {
    const text = readFileSync(file, "utf8");
    const component = parse(text);
    // Inspect branching expressions, not prose or the shared "barbu" coach id.
    function visit(node) {
      if (!node || typeof node !== "object") return;
      const operands = node.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(node.operator)
        ? [node.left, node.right] : node.type === "SwitchCase" ? [node.test] : [];
      for (const operand of operands) {
        if (operand?.type === "Literal" && gameIds.has(operand.value)) violations.push(`${file} branches on game id ${operand.value}`);
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    }
    visit(component);
    const script = [component.instance, component.module].filter(Boolean).map(node => text.slice(node.content.start, node.content.end)).join("\n");
    for (const { fileName: spec } of ts.preProcessFile(script, true, true).importedFiles) {
      if (!spec.startsWith(".")) continue;
      const target = relative(process.cwd(), resolve(dirname(file), spec));
      if (target.startsWith("src/games/") && !["src/games/tableFactory", "src/games/gameRegistry"].includes(target)) {
        violations.push(`${file} imports game-specific metadata ${spec}`);
      }
    }
  }
  expect(violations).toEqual([]);
});
