#!/usr/bin/env node
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const rawArgs = process.argv.slice(2);
const args = new Map();
for (let i = 0; i < rawArgs.length; i++) {
  const token = rawArgs[i];
  if (!token.startsWith("--")) continue;

  const eqIndex = token.indexOf("=");
  if (eqIndex > -1) {
    args.set(token.slice(2, eqIndex), token.slice(eqIndex + 1));
  } else {
    const next = rawArgs[i + 1];
    if (!next || next.startsWith("--")) {
      args.set(token.slice(2), "true");
    } else {
      args.set(token.slice(2), next);
      i++;
    }
  }
}

const scope = (args.get("scope") || "src").toLowerCase();
const allowArg = args.get("allow") || "Potree,viewer";
const allowNames = allowArg
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const tmpDir = path.join(repoRoot, "tmp", "missing-imports-check");
const tsconfigPath = path.join(tmpDir, "tsconfig.json");
const globalsPath = path.join(tmpDir, "allowed-globals.d.ts");
const reportMdPath = path.join(repoRoot, "tmp", "check-imports-report.md");
const reportJsonPath = path.join(repoRoot, "tmp", "check-imports-report.json");

const includeByScope = {
  src: ["../../src/**/*.js", "./allowed-globals.d.ts"],
  all: [
    "../../src/**/*.js",
    "../../example/**/*.js",
    "../../examples/**/*.js",
    "../../*.js",
    "../../*.mjs",
    "./allowed-globals.d.ts"
  ]
};

if (!includeByScope[scope]) {
  console.error(`Unknown scope: ${scope}. Use --scope src or --scope all.`);
  process.exit(2);
}

const excluded = [
  "../../node_modules",
  "../../build",
  "../../dist",
  "../../libs",
  "../../pointclouds",
  "../../docs",
  // This file is HTML content with a .js suffix.
  "../../examples/extra_attributes_module.js"
];

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const globalsDeclaration = allowNames
  .map((name) => `declare const ${name}: any;`)
  .join("\n");
writeFileSync(globalsPath, `${globalsDeclaration}\n`, "utf8");

const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "Bundler",
    allowJs: true,
    checkJs: true,
    noEmit: true,
    strict: false,
    skipLibCheck: true,
    moduleDetection: "force",
    lib: ["ES2022", "DOM"],
    types: []
  },
  include: includeByScope[scope],
  exclude: excluded
};

writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");

const tscEntrypoint = path.join(repoRoot, "node_modules", "typescript", "bin", "tsc");

const run = spawnSync(process.execPath, [tscEntrypoint, "-p", tsconfigPath, "--pretty", "false"], {
  cwd: repoRoot,
  encoding: "utf8"
});

if (run.error) {
  console.error(`Failed to run TypeScript compiler at ${tscEntrypoint}`);
  console.error(run.error.message);
  process.exit(2);
}

const output = `${run.stdout || ""}\n${run.stderr || ""}`;
const lines = output.split(/\r?\n/).filter(Boolean);

const unresolvedRegex = /(.*)\((\d+),(\d+)\): error TS(2304|2552|2580): (.*)$/;
const unresolved = [];

for (const line of lines) {
  const match = line.match(unresolvedRegex);
  if (!match) continue;

  unresolved.push({
    file: match[1].replaceAll("\\", "/"),
    line: Number(match[2]),
    column: Number(match[3]),
    code: `TS${match[4]}`,
    message: match[5]
  });
}

function buildReportData(status, extra = {}) {
  const byFile = new Map();
  for (const issue of unresolved) {
    const current = byFile.get(issue.file) || [];
    current.push(issue);
    byFile.set(issue.file, current);
  }

  const sortedFiles = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
  const files = sortedFiles.map(([file, issues]) => ({ file, count: issues.length, issues }));

  return {
    status,
    timestamp: new Date().toISOString(),
    scope,
    allowedGlobals: allowNames,
    unresolvedCount: unresolved.length,
    fileCount: files.length,
    files,
    ...extra
  };
}

function writeReports(reportData) {
  const mdLines = [];
  mdLines.push("# Missing Imports/Globals Check Report");
  mdLines.push("");
  mdLines.push(`- Status: ${reportData.status}`);
  mdLines.push(`- Timestamp: ${reportData.timestamp}`);
  mdLines.push(`- Scope: ${reportData.scope}`);
  mdLines.push(`- Allowed globals: ${reportData.allowedGlobals.join(", ") || "(none)"}`);
  mdLines.push(`- Unresolved identifiers: ${reportData.unresolvedCount}`);
  mdLines.push(`- Files affected: ${reportData.fileCount}`);

  if (reportData.note) {
    mdLines.push(`- Note: ${reportData.note}`);
  }

  mdLines.push("");

  if (reportData.files.length > 0) {
    mdLines.push("## Files");
    mdLines.push("");

    for (const fileEntry of reportData.files) {
      mdLines.push(`### ${fileEntry.file} (${fileEntry.count})`);
      mdLines.push("");
      for (const issue of fileEntry.issues) {
        mdLines.push(`- ${issue.line}:${issue.column} ${issue.code} ${issue.message}`);
      }
      mdLines.push("");
    }
  }

  if (reportData.rawOutput && reportData.rawOutput.trim().length > 0) {
    mdLines.push("## Raw TypeScript Output");
    mdLines.push("");
    mdLines.push("```text");
    mdLines.push(reportData.rawOutput.trim());
    mdLines.push("```");
    mdLines.push("");
  }

  writeFileSync(reportMdPath, `${mdLines.join("\n")}\n`, "utf8");
  writeFileSync(reportJsonPath, `${JSON.stringify(reportData, null, 2)}\n`, "utf8");
}

if (unresolved.length === 0) {
  if (run.status !== 0) {
    const reportData = buildReportData("error", {
      note: "TypeScript exited with errors, but none matched unresolved identifier diagnostics.",
      rawOutput: output
    });
    writeReports(reportData);

    console.error("TypeScript reported errors, but none matched unresolved-identifier codes TS2304/TS2552/TS2580.");
    if (output.trim().length > 0) {
      console.error(output.trim());
    }
    console.error(`Report written to ${reportMdPath}`);
    console.error(`Report written to ${reportJsonPath}`);
    process.exit(1);
  }

  const reportData = buildReportData("ok");
  writeReports(reportData);

  console.log(`OK: no missing globals/import identifiers found (scope=${scope}).`);
  console.log(`Report written to ${reportMdPath}`);
  console.log(`Report written to ${reportJsonPath}`);
  process.exit(0);
}

const reportData = buildReportData("failed");
writeReports(reportData);
const sortedFiles = reportData.files.map((entry) => [entry.file, entry.issues]);

console.error(`Found ${unresolved.length} unresolved identifier issues in ${sortedFiles.length} files (scope=${scope}).`);
for (const [file, issues] of sortedFiles) {
  const preview = issues
    .slice(0, 6)
    .map((i) => `${i.line}:${i.column} ${i.message}`)
    .join(" | ");
  console.error(`- ${file} (${issues.length}) -> ${preview}`);
}

console.error("\nTip: adjust allowed globals with --allow=Potree,viewer,AnotherGlobal");
console.error(`Report written to ${reportMdPath}`);
console.error(`Report written to ${reportJsonPath}`);
process.exit(1);
