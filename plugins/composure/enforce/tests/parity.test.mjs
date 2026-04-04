#!/usr/bin/env node
/**
 * Parity test suite — validates the enforcement engine detects
 * expected violations in fixture files and passes clean files.
 *
 * Run: node tests/parity.test.mjs (from enforce/ directory)
 * Requires: pnpm build first (imports from dist/)
 *
 * No test framework dependency — uses assert + structured output.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCode } from "../dist/engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures");

let passed = 0;
let failed = 0;

function fixture(name) {
  return readFileSync(join(FIXTURES, name), "utf8");
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertViolation(filePath, content, expectedRule) {
  const result = validateCode(filePath, content);
  const found = result.violations.some((v) => v.rule === expectedRule);
  assert(
    found,
    `Expected '${expectedRule}' not found. Got: ${result.violations.map((v) => v.rule).join(", ") || "none"}`,
  );
}

function assertNoViolations(filePath, content) {
  const result = validateCode(filePath, content);
  assert(
    result.passed,
    `Expected no violations, got: ${result.violations.map((v) => `${v.rule}: ${v.message}`).join("; ")}`,
  );
}

// ── TypeScript Rules (13 rules) ─────────────────────────────

console.log("\n\x1b[1mTypeScript Rules\x1b[0m");

test("detects as-any", () => {
  assertViolation("/test.tsx", "const x = y as any;", "as-any");
});

test("detects double-cast", () => {
  assertViolation("/test.tsx", "const x = y as unknown as Foo;", "double-cast");
});

test("detects @ts-ignore in non-test file", () => {
  assertViolation("/src/app.tsx", "// @ts-ignore\nconst x = 1;", "ts-suppress");
});

test("detects non-null assertion", () => {
  assertViolation("/test.tsx", "const x = obj!.name;", "non-null-assertion");
});

test("detects underscore unused", () => {
  assertViolation("/test.tsx", "const _result = await fetch();", "underscore-unused");
});

test("detects any parameter", () => {
  assertViolation("/test.tsx", "function process(data: any) {}", "any-param");
});

test("detects return assertion", () => {
  assertViolation("/test.tsx", "return data as UserData;", "return-assertion");
});

test("detects hidden any in generic", () => {
  assertViolation("/test.tsx", "const map: Record<string, any> = {};", "hidden-any-generic");
});

test("detects lazy Function type", () => {
  assertViolation("/test.tsx", "const fn: Function = () => {};", "lazy-type");
});

test("detects any return type", () => {
  assertViolation("/test.tsx", "function getData(): any { return 1; }", "any-return");
});

test("detects eslint-disable for TS rules", () => {
  assertViolation("/test.tsx", "// eslint-disable @typescript-eslint/no-any", "eslint-ts-disable");
});

test("clean TypeScript passes", () => {
  assertNoViolations("/src/clean.tsx", fixture("clean.tsx"));
});

test("violations fixture catches multiple rules", () => {
  const content = fixture("violations.tsx");
  const result = validateCode("/src/violations.tsx", content);
  assert(result.violations.length >= 5, `Expected 5+ violations, got ${result.violations.length}`);
});

// ── Python Rules (7 rules) ──────────────────────────────────

console.log("\n\x1b[1mPython Rules\x1b[0m");

test("detects bare except", () => {
  assertViolation("/test.py", "try:\n  x = 1\nexcept:\n  pass", "bare-except");
});

test("detects broad except", () => {
  assertViolation("/test.py", "except Exception:\n  pass", "broad-except");
});

test("detects eval", () => {
  assertViolation("/test.py", 'eval("print(1)")', "eval");
});

test("detects os.system", () => {
  assertViolation("/test.py", 'os.system("ls")', "os-system");
});

test("detects type: ignore", () => {
  assertViolation("/test.py", "x: int = 'hello'  # type: ignore", "type-ignore");
});

test("detects Any type", () => {
  assertViolation("/test.py", "def fn(x: Any) -> None:", "any-type");
});

test("detects bare noqa", () => {
  assertViolation("/test.py", "x = 1  # noqa", "bare-noqa");
});

test("clean Python passes", () => {
  assertNoViolations("/src/clean.py", fixture("clean.py"));
});

// ── Go Rules (4 rules) ──────────────────────────────────────

console.log("\n\x1b[1mGo Rules\x1b[0m");

test("detects discarded error", () => {
  assertViolation("/main.go", "_ = err", "err-discard");
});

test("detects empty interface", () => {
  assertViolation("/main.go", "var x interface{}", "empty-interface");
});

test("detects bare nolint", () => {
  assertViolation("/main.go", "x := 1 //nolint", "bare-nolint");
});

test("detects panic in library", () => {
  assertViolation("/lib.go", 'package utils\n\nfunc Bad() { panic("fail") }', "panic");
});

test("allows panic in package main", () => {
  const result = validateCode("/main.go", 'package main\n\nfunc main() { panic("fatal") }');
  const hasPanic = result.violations.some((v) => v.rule === "panic");
  assert(!hasPanic, "panic should be allowed in package main");
});

// ── Edge Cases ──────────────────────────────────────────────

console.log("\n\x1b[1mEdge Cases\x1b[0m");

test("non-source file returns no violations", () => {
  const result = validateCode("/README.md", "const x = y as any;");
  assert(result.passed, "Non-source files should pass");
});

test("generated .d.ts file is skipped", () => {
  const result = validateCode("/src/generated.d.ts", "const x = y as any;");
  assert(result.passed, "Generated .d.ts files should be skipped");
});

test("test file allows @ts-expect-error", () => {
  const result = validateCode(
    "/src/__tests__/app.test.tsx",
    "// @ts-expect-error testing invalid input\nconst x = 1;",
  );
  const hasTsSuppress = result.violations.some((v) => v.rule === "ts-suppress");
  assert(!hasTsSuppress, "@ts-expect-error should be allowed in test files");
});

test("test file catches @ts-ignore", () => {
  assertViolation("/src/__tests__/app.test.tsx", "// @ts-ignore\nconst x = 1;", "ts-suppress");
});

test(".css file returns no violations", () => {
  const result = validateCode("/styles/global.css", "@tailwind base;");
  assert(result.passed, "CSS files should pass no-bandaids");
});

// ── Summary ─────────────────────────────────────────────────

console.log(`\n\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed > 0 ? 1 : 0);
