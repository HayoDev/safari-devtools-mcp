# Safari DevTools MCP

[![npm](https://img.shields.io/npm/v/safari-devtools-mcp.svg)](https://npmjs.org/package/safari-devtools-mcp)

`safari-devtools-mcp` lets your coding agent (such as Claude, Cursor, Copilot or Gemini) control and inspect a live Safari browser on macOS. It acts as a Model-Context-Protocol (MCP) server, giving your AI coding assistant access to Safari DevTools for debugging, automation, and testing.

Tool names and schemas mirror [chrome-devtools-mcp](https://github.com/anthropics/chrome-devtools-mcp) for cross-browser compatibility.

## [Changelog](./CHANGELOG.md) | [Contributing](./CONTRIBUTING.md)

## Key features

- **Browser debugging**: Capture console logs, inspect network requests, and evaluate JavaScript — with stack traces and full request/response details.
- **Reliable automation**: Click, type, fill forms, drag and drop, and press keyboard shortcuts using accessibility-tree snapshots with stable UIDs.
- **Native macOS integration**: Tab management via AppleScript for listing, switching, and controlling Safari tabs across windows.

## Requirements

- **macOS** (Safari and SafariDriver are Apple-exclusive)
- **Node.js 18+** (22+ recommended)
- **Safari** with remote automation enabled

### Safari setup

1. Open Safari > Settings > Advanced > check **"Show features for web developers"**
2. Develop menu > check **"Allow Remote Automation"**
3. Authorize SafariDriver:
   ```bash
   sudo safaridriver --enable
   ```

## Getting started

Standard MCP config:

```json
{
  "mcpServers": {
    "safari-devtools": {
      "command": "npx",
      "args": ["safari-devtools-mcp"]
    }
  }
}
```

<details>
<summary>Claude Code</summary>

```bash
claude mcp add safari-devtools -- npx safari-devtools-mcp
```

Or add to your project's `.mcp.json` using the standard config above.

</details>

<details>
<summary>Claude Desktop</summary>

Add the standard config to `~/Library/Application Support/Claude/claude_desktop_config.json`.

</details>

<details>
<summary>Cursor</summary>

Add the standard config to your Cursor MCP settings.

</details>

<details>
<summary>VS Code</summary>

Add the standard config to `.vscode/mcp.json`.

</details>

<details>
<summary>From source</summary>

```bash
git clone https://github.com/HayoDev/safari-devtools-mcp.git
cd safari-devtools-mcp
npm install && npm run build
```

Then point your MCP client to `node build/src/bin/safari-devtools-mcp.js`.

</details>

### Your first prompt

> Navigate to https://example.com, take a snapshot, and list any console errors.

## Tools (25)

- **Debugging** (7): `list_console_messages`, `get_console_message`, `list_network_requests`, `get_network_request`, `evaluate_script`, `take_screenshot`, `take_snapshot`
- **Navigation** (8): `list_pages`, `select_page`, `new_page`, `close_page`, `navigate_page`, `wait_for`, `resize_page`, `handle_dialog`
- **Input automation** (10): `click`, `click_at`, `hover`, `fill`, `fill_form`, `type_text`, `drag`, `press_key`, `upload_file`

## Known limitations

- **Single session**: Safari only allows one WebDriver session at a time.
- **macOS only**: Safari and SafariDriver are Apple-exclusive.
- **No headless mode**: Safari does not support headless operation.
- **Pre-injection gaps**: Console messages and network requests made before script injection have limited detail.
- **PNG only**: Safari WebDriver does not support JPEG/WebP screenshots or full-page capture.

## Compatibility with chrome-devtools-mcp

Tool names and parameter schemas intentionally match chrome-devtools-mcp. The same `take_screenshot`, `evaluate_script`, `list_console_messages`, `click`, `fill`, etc. calls work across both servers — switch between Chrome and Safari without changing your prompts.

Features that rely on Chrome DevTools Protocol (CDP) are not available: Lighthouse audits, memory snapshots, performance traces, network throttling, device/geolocation emulation, screencast, and `initScript`.

## License

[MIT](LICENSE)
