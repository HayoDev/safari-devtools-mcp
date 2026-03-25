# Safari DevTools MCP

[![npm](https://img.shields.io/npm/v/safari-devtools-mcp.svg)](https://npmjs.org/package/safari-devtools-mcp)

`safari-devtools-mcp` lets your coding agent (such as Claude, Cursor, Copilot or Gemini) control and inspect a live Safari browser on macOS. It acts as a Model-Context-Protocol (MCP) server, giving your AI coding assistant access to Safari DevTools for debugging, automation, and testing.

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

Then point your MCP client to the built entry point:

```json
{
  "mcpServers": {
    "safari-devtools": {
      "command": "node",
      "args": [
        "/path/to/safari-devtools-mcp/build/src/bin/safari-devtools-mcp.js"
      ]
    }
  }
}
```

</details>

### Your first prompt

> Navigate to https://example.com, take a snapshot, and list any console errors.

## Tools (25)

### Debugging

| Tool                    | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `list_console_messages` | List console messages with filtering by level (log, warn, error)              |
| `get_console_message`   | Get a detailed message including stack trace and arguments                    |
| `list_network_requests` | Monitor network requests — Fetch, XHR, and resource loads                     |
| `get_network_request`   | Get full request/response details with headers and body                       |
| `evaluate_script`       | Execute JavaScript in the browser context and return results                  |
| `take_screenshot`       | Capture a PNG screenshot of the page or a specific element                    |
| `take_snapshot`         | Accessibility-tree snapshot of the DOM with stable UIDs for element targeting |

### Navigation

| Tool            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `list_pages`    | List all open Safari tabs across windows                   |
| `select_page`   | Switch to a specific tab                                   |
| `new_page`      | Open a new tab and navigate to a URL                       |
| `close_page`    | Close a tab                                                |
| `navigate_page` | Navigate to a URL, go back, forward, or reload             |
| `wait_for`      | Wait for specific text to appear on the page               |
| `resize_page`   | Resize the browser window                                  |
| `handle_dialog` | Accept or dismiss browser dialogs (alert, confirm, prompt) |

### Input automation

| Tool          | Description                                          |
| ------------- | ---------------------------------------------------- |
| `click`       | Click an element by UID from a snapshot              |
| `click_at`    | Click at specific x/y coordinates                    |
| `hover`       | Hover over an element                                |
| `fill`        | Type into an input field or select from a dropdown   |
| `fill_form`   | Fill multiple form fields at once                    |
| `type_text`   | Type text into the currently focused element         |
| `drag`        | Drag and drop between elements or coordinates        |
| `press_key`   | Press a key or combination (e.g., `Meta+A`, `Enter`) |
| `upload_file` | Upload a file through a file input                   |

## Architecture

```
MCP Client (Claude, Cursor, etc.)
    | stdio (MCP protocol)
    v
Safari DevTools MCP Server
    |
    v
+-------------------------------+
|  SafariDriver                 |
|  +-- Selenium WebDriver       | <-- Browser automation
|  +-- JS Injection             | <-- Console/Network capture
|  +-- AppleScript (osascript)  | <-- Native tab management
+-------------------------------+
    |
    v
Safari Browser
```

## Known limitations

- **Single session**: Safari only allows one WebDriver session at a time. Running multiple instances is not supported.
- **macOS only**: Safari and SafariDriver are Apple-exclusive — this server does not work on Linux or Windows.
- **No headless mode**: Safari does not support headless operation. A visible browser window is required.
- **Console pre-injection gap**: Console messages logged before the capture script is injected are not captured.
- **Network pre-injection gap**: Network requests made before injection are backfilled via the Performance API with limited detail (timing and size, but no headers or status codes).
- **PNG only**: Safari WebDriver only supports PNG screenshots — no JPEG or WebP. Full-page capture is not available.
- **AppleScript permissions**: Tab management features require macOS Accessibility permissions for `osascript`.

## License

[MIT](LICENSE)
