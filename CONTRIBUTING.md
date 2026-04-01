# Contributing to Safari DevTools MCP

Thank you for your interest in contributing! This project aims to bring Chrome DevTools MCP-level debugging capabilities to Safari for AI coding agents.

## Getting Started

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run: `npm start`

## Prerequisites

- macOS (Safari and SafariDriver are Apple-exclusive)
- Node.js 22+ (see `.nvmrc`)
- Safari with Developer menu enabled
- SafariDriver authorized: `sudo safaridriver --enable`

## Development Workflow

```bash
# Build the project
npm run build

# Run type checking
npm run typecheck

# Lint and format
npm run format

# Check formatting without fixing
npm run check-format

# Run tests
npm test

# Run tests without rebuild
npm run test:no-build
```

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new tool` — A new feature
- `fix: handle edge case` — A bug fix
- `docs: update README` — Documentation only
- `refactor: simplify driver` — Code restructuring
- `test: add console tests` — Adding tests
- `chore: update deps` — Maintenance

## Adding a New Tool

1. Create or update the tool handler in `src/tools/`
2. Register it in `src/index.ts`
3. Add tests in `tests/tools/`
4. Update the README tool list
5. If the tool mirrors a chrome-devtools-mcp tool, match the name and parameter schema

## Architecture

```
src/
  bin/                  CLI entry point
  tools/                Tool handlers (one file per category)
  formatters/           Response formatting
  injected/             Scripts injected into Safari pages
  SafariDriver.ts       Core WebDriver + AppleScript manager
  index.ts              MCP server factory and tool registration
  types.ts              Shared type definitions
```

## Code Style

- TypeScript strict mode
- Oxlint + Oxfmt enforced (run `npm run format`)
- Prefer `const` over `let`
- Use consistent type imports (`import type {Foo}`)
- Keep injected scripts (in `src/injected/`) as vanilla JS for browser compatibility

## Reporting Issues

- Check existing issues before opening a new one
- Include macOS version, Safari version, and Node.js version
- For bugs, include steps to reproduce and error output

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
