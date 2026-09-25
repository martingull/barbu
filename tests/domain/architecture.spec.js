import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { parse } from "svelte/compiler";

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
          : layer === "components" && spec === "svelte";
        if (!permitted) violations.push(`${file} imports ${spec}`);
      }
    }
  }
  expect(violations).toEqual([]);
});
