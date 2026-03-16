import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const SOURCE_ROOT = path.join(PROJECT_ROOT, "src");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
const KEBAB_CASE_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(ts|tsx)$/;

const ROOT_ALLOWED_FILES = new Set([
  "src/app.tsx",
  "src/main.ts",
  "src/dashboard-api.ts",
  "src/dashboard-auth.ts",
  "src/dashboard-routes.ts",
  "src/dashboard-theme.ts",
  "src/dashboard-types.ts"
]);

const PAGE_TSX_SUFFIXES = [
  "-page",
  "-page-container",
  "-detail-page",
  "-detail-page-container",
  "-modal",
  "-panel",
  "-section",
  "-shell",
  "-toolbar",
  "-drawer"
];

const PAGE_TS_SUFFIXES = [
  "-location",
  "-utils",
  "-mapper",
  "-state",
  "-schema",
  "-model",
  "-persistence",
  "-visibility"
];

const PAGE_TS_EXACT_NAMES = new Set(["validation.ts"]);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function listFilesRecursively(directoryPath) {
  const files = [];
  const queue = [directoryPath];

  while (queue.length > 0) {
    const currentDirectory = queue.shift();
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const resolved = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        queue.push(resolved);
      } else if (entry.isFile()) {
        files.push(resolved);
      }
    }
  }

  return files;
}

function isLintTarget(relativePath) {
  const extension = path.extname(relativePath);
  if (!SOURCE_EXTENSIONS.has(extension)) {
    return false;
  }
  if (TEST_FILE_PATTERN.test(relativePath)) {
    return false;
  }
  if (relativePath.startsWith("src/e2e/")) {
    return false;
  }
  return true;
}

function hasAnySuffix(baseName, suffixes) {
  return suffixes.some((suffix) => baseName.endsWith(suffix));
}

function lintRelativeFilePath(relativePath) {
  const normalizedPath = toPosixPath(relativePath);
  const fileName = path.posix.basename(normalizedPath);
  const extension = path.posix.extname(fileName);
  const baseName = fileName.slice(0, -extension.length);

  if (!KEBAB_CASE_FILE_PATTERN.test(fileName)) {
    return "File names must use kebab-case.";
  }

  if (normalizedPath.startsWith("src/pages/")) {
    if (extension === ".tsx") {
      if (hasAnySuffix(baseName, PAGE_TSX_SUFFIXES)) {
        return null;
      }
      return `pages TSX files must use one of: ${PAGE_TSX_SUFFIXES.join(", ")}.`;
    }

    if (extension === ".ts") {
      if (baseName.startsWith("use-")) {
        return null;
      }
      if (PAGE_TS_EXACT_NAMES.has(fileName)) {
        return null;
      }
      if (hasAnySuffix(baseName, PAGE_TS_SUFFIXES)) {
        return null;
      }
      return `pages TS files must use one of: ${PAGE_TS_SUFFIXES.join(", ")} or use-* pattern.`;
    }
  }

  if (normalizedPath.startsWith("src/components/ui/")) {
    return extension === ".tsx" ? null : "components/ui files must be TSX.";
  }

  if (normalizedPath.startsWith("src/components/")) {
    return extension === ".tsx" ? null : "components files must be TSX.";
  }

  if (normalizedPath.startsWith("src/lib/")) {
    if (extension !== ".ts") {
      return "lib files must be TS.";
    }
    if (baseName.startsWith("use-") || baseName === "utils") {
      return null;
    }
    return "lib files must use use-* or utils.";
  }

  if (normalizedPath.startsWith("src/dashboard-api/")) {
    if (extension !== ".ts") {
      return "dashboard-api files must be TS.";
    }
    if (baseName === "http" || baseName === "parsers") {
      return null;
    }
    if (
      baseName.includes("-api") ||
      baseName.endsWith("-parsers") ||
      baseName.endsWith("-shared") ||
      baseName.endsWith("-upload")
    ) {
      return null;
    }
    return "dashboard-api files must use -api / -parsers / -shared / -upload.";
  }

  if (ROOT_ALLOWED_FILES.has(normalizedPath)) {
    return null;
  }

  if (normalizedPath.startsWith("src/")) {
    return "Unclassified path. Move it under pages, components, lib, or dashboard-api.";
  }

  return null;
}

function runCli() {
  const allFiles = listFilesRecursively(SOURCE_ROOT);
  const relativePaths = allFiles
    .map((absolutePath) => toPosixPath(path.relative(PROJECT_ROOT, absolutePath)))
    .filter(isLintTarget)
    .sort();

  const errors = [];
  for (const relativePath of relativePaths) {
    const lintMessage = lintRelativeFilePath(relativePath);
    if (lintMessage) {
      errors.push(`${relativePath}: ${lintMessage}`);
    }
  }

  if (errors.length === 0) {
    console.log(`OK: checked ${relativePaths.length} files.`);
    return 0;
  }

  console.error("File suffix lint failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error(`\n${errors.length} violation(s) found.`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli();
}

