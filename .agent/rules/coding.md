---
trigger: always_on
---

# Instructions

- Use only scripts from `package.json` to run commands.
- Use `npm run build` to run tsc and test build.
- Use `npm test` to build and run tests, run all tests to verify correctness.
- Use `npm run format` to fix formatting and get linting errors.
- Use `npm run check-format` to check formatting without fixing.
- Use `npm run typecheck` for type checking without emitting.

## Rules for TypeScript

- Do not use `any` type.
- Do not use `as` keyword for type casting.
- Do not use `!` operator for type assertion.
- Do not use `// @ts-ignore` comments.
- Do not use `// @ts-nocheck` comments.
- Do not use `// @ts-expect-error` comments.
- Prefer `for..of` instead of `forEach`.
- Use consistent type imports (`import type {Foo}`).

## Rules for Injected Scripts

- Scripts in `src/injected/` are vanilla JavaScript (no TypeScript features).
- They run in the browser context, not Node.js — no `require`, `import`, or Node APIs.
- Always guard against re-injection with `window.__safariDevTools*Initialized` checks.
- Truncate serialized objects to prevent memory issues (max 1-2KB per entry).
- Use `var` instead of `let`/`const` for broadest browser compatibility.

## Architecture

- Tool handlers go in `src/tools/` (one file per category).
- Formatters go in `src/formatters/` (one per output type).
- New tools must be registered in `src/index.ts`.
- Tool names and schemas should mirror chrome-devtools-mcp where applicable.
- Tests go in `tests/` mirroring the `src/` directory structure.
