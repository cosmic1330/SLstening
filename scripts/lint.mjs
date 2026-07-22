import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const sourceExtensions = new Set([".ts", ".tsx"]);
const violations = [];

const rules = [
  {
    name: "merge conflict marker",
    pattern: /^(<<<<<<<|=======|>>>>>>>)(?: .*)?$/m,
  },
  {
    name: "debugger statement",
    pattern: /\bdebugger\s*;/,
  },
  {
    name: "focused test",
    pattern: /\b(?:describe|it|test)\.only\s*\(/,
  },
  {
    name: "unchecked TypeScript suppression",
    pattern: /@ts-ignore\b/,
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (
      entry.isFile() &&
      sourceExtensions.has(path.extname(entry.name)) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const file of await walk(sourceRoot)) {
  const source = await readFile(file, "utf8");

  for (const rule of rules) {
    const match = rule.pattern.exec(source);
    if (!match) continue;

    const line = source.slice(0, match.index).split(/\r?\n/).length;
    violations.push(
      path.relative(process.cwd(), file) + ":" + line + ": " + rule.name,
    );
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Source hygiene checks passed.");
}
