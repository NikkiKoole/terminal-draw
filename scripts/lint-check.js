#!/usr/bin/env bun

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

// Simple linting rules
const rules = {
  // Basic syntax checks
  noConsoleLog: {
    pattern: /console\.log\(/g,
    message: "console.log found - use console.warn/error or remove",
    severity: "warning",
  },

  // Code style
  noVarKeyword: {
    pattern: /\bvar\s+/g,
    message: "Use 'const' or 'let' instead of 'var'",
    severity: "error",
  },

  preferStrictEquality: {
    pattern: /[^!=]==[^=]/g,
    message: "Use '===' instead of '=='",
    severity: "error",
  },

  // Common mistakes
  debuggerStatement: {
    pattern: /\bdebugger\b/g,
    message: "debugger statement found",
    severity: "error",
  },

  unusedFunction: {
    pattern: /function\s+\w+\s*\([^)]*\)\s*{\s*}/g,
    message: "Empty function found",
    severity: "warning",
  },
};

function findJSFiles(dir, files = []) {
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (!["node_modules", "dist", ".git", "coverage"].includes(item)) {
        findJSFiles(fullPath, files);
      }
    } else if (extname(item) === ".js") {
      files.push(fullPath);
    }
  }

  return files;
}

function lintFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const issues = [];

  // Check each rule
  for (const [ruleName, rule] of Object.entries(rules)) {
    let match;
    rule.pattern.lastIndex = 0; // Reset regex state

    while ((match = rule.pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split("\n").length;
      const lineContent = lines[lineNumber - 1]?.trim() || "";

      // Skip issues in test files for some rules
      if (filePath.includes("test") && ruleName === "noConsoleLog") {
        continue;
      }

      issues.push({
        file: filePath,
        line: lineNumber,
        rule: ruleName,
        message: rule.message,
        severity: rule.severity,
        lineContent,
      });
    }
  }

  return issues;
}

function formatIssues(issues) {
  if (issues.length === 0) {
    console.log("✅ No lint issues found");
    return;
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  console.log(
    `📋 Lint Results: ${errors.length} errors, ${warnings.length} warnings`,
  );
  console.log("");

  // Show first 5 issues to avoid overwhelming output
  const displayIssues = issues.slice(0, 5);

  for (const issue of displayIssues) {
    const icon = issue.severity === "error" ? "❌" : "⚠️";
    const relativePath = issue.file.replace(process.cwd() + "/", "");

    console.log(`${icon} ${relativePath}:${issue.line}`);
    console.log(`   ${issue.message}`);
    console.log(`   ${issue.lineContent}`);
    console.log("");
  }

  if (issues.length > 5) {
    console.log(`... and ${issues.length - 5} more issues`);
    console.log(`Run 'bun run lint' for full details`);
  }

  // Exit with error code if there are errors
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Main execution
const srcFiles = findJSFiles("src");
const testFiles = findJSFiles("tests");
const allFiles = [...srcFiles, ...testFiles];

console.log(`🔍 Linting ${allFiles.length} JavaScript files...`);

const allIssues = [];
for (const file of allFiles) {
  const issues = lintFile(file);
  allIssues.push(...issues);
}

formatIssues(allIssues);
