# Safari DevTools MCP

A Model Context Protocol (MCP) server that provides Safari browser debugging and automation tools for AI coding agents on macOS. Tool names and schemas mirror [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) for cross-browser compatibility.

## Key Features

- **Console debugging** — capture logs, errors, warnings with stack traces
- **Network monitoring** — inspect requests/responses with hybrid capture (Performance API + Fetch/XHR interception)
- **JavaScript evaluation** — run scripts in the browser context
- **DOM snapshots** — accessibility-tree snapshots with UIDs for element targeting
- **Screenshots** — capture page or element screenshots
- **Tab management** — native macOS tab management via AppleScript
- **Input automation** — click, type, fill forms, drag and drop, keyboard shortcuts
- **Cross-browser compatible** — matching tool names with chrome-devtools-mcp

## Requirements

- **macOS** (Safari and SafariDriver are Apple-exclusive)
- **Node.js 18+** (22+ recommended, see `.nvmrc`)
- **Safari** with Developer menu enabled

### Safari Setup

1. Open Safari → Settings → Advanced → check **"Show features for web developers"**
2. In the Develop menu → check **"Allow Remote Automation"**
3. Authorize SafariDriver:
   ```bash
   sudo safaridriver --enable
   ```

## Getting Started

### Install from npm

```bash
npx safari-devtools-mcp
```

### Install from source

```bash
git clone https://github.com/HayoDev/safari-devtools-mcp.git
cd safari-devtools-mcp
npm install
npm run build
```

### MCP Client Configuration

<details>
<summary>Claude Code</summary>

Run this command:

```bash
claude mcp add safari-devtools -- npx safari-devtools-mcp
```

Or add to your project's `.mcp.json`:

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

</details>

<details>
<summary>Claude Desktop</summary>

Add to your `claude_desktop_config.json`:

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

Config file location:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

</details>

<details>
<summary>Cursor</summary>

Add to your Cursor MCP settings:

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

</details>

<details>
<summary>VS Code</summary>

Add to your VS Code settings (`.vscode/mcp.json`):

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

</details>

<details>
<summary>From source (any client)</summary>

If you cloned the repo, point to the built entry point:

```json
{
  "mcpServers": {
    "safari-devtools": {
      "command": "node",
      "args": ["/path/to/safari-devtools-mcp/build/bin/safari-devtools-mcp.js"]
    }
  }
}
```

</details>

### Your First Prompt

> Navigate to https://example.com, take a snapshot, and list any console errors.

## Tools

### Debugging (Core)

| Tool                    | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `list_console_messages` | List console messages with filtering by level     |
| `get_console_message`   | Get detailed message with stack trace             |
| `list_network_requests` | Monitor network requests (Fetch, XHR, resources)  |
| `get_network_request`   | Get full request/response with headers            |
| `evaluate_script`       | Execute JavaScript in the browser context         |
| `take_screenshot`       | Capture page or element screenshots (PNG)         |
| `take_snapshot`         | DOM tree snapshot with UIDs for element targeting |

### Navigation

| Tool            | Description                               |
| --------------- | ----------------------------------------- |
| `list_pages`    | List open Safari tabs (via AppleScript)   |
| `select_page`   | Switch to a specific tab                  |
| `new_page`      | Open a new tab with URL                   |
| `close_page`    | Close a tab                               |
| `navigate_page` | Navigate to URL, back, forward, or reload |
| `wait_for`      | Wait for text to appear on page           |
| `resize_page`   | Resize the browser window                 |
| `handle_dialog` | Accept or dismiss browser dialogs         |

### Input Automation

| Tool          | Description                                 |
| ------------- | ------------------------------------------- |
| `click`       | Click elements by UID from snapshot         |
| `click_at`    | Click at coordinates                        |
| `hover`       | Hover over elements                         |
| `fill`        | Type into inputs or select from dropdowns   |
| `fill_form`   | Fill multiple form fields at once           |
| `type_text`   | Type text into focused input                |
| `drag`        | Drag and drop elements                      |
| `press_key`   | Press keys or combinations (e.g., `Meta+A`) |
| `upload_file` | Upload files through file inputs            |

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

### Network Monitoring Strategy

Network request capture uses a 4-layer hybrid approach to minimize the pre-injection gap:

1. **Performance API backfill** — `performance.getEntriesByType('resource')` captures historical requests made before script injection (timing and size data, but no headers/status)
2. **Fetch interception** — Wraps `window.fetch()` for ongoing requests with full details
3. **XHR interception** — Wraps `XMLHttpRequest` for the same
4. **PerformanceObserver** — Catches resource loads that interceptors miss

Historical entries are flagged so the AI knows they have limited detail compared to intercepted requests.

### Tab Management

Uses AppleScript (`osascript`) for native macOS tab management — listing all Safari tabs across windows, switching tabs, opening/closing tabs. Falls back to WebDriver-only mode if AppleScript access is denied.

## Compatibility with chrome-devtools-mcp

Tool names and parameter schemas intentionally mirror chrome-devtools-mcp. The same `take_screenshot`, `evaluate_script`, `list_console_messages`, `click`, `fill`, etc. calls work across both servers, making it easy to switch between Chrome and Safari.

## Features NOT Available (vs Chrome DevTools MCP)

The following chrome-devtools-mcp features **cannot** be ported to Safari due to platform differences:

| Feature                         | Reason                                                 |
| ------------------------------- | ------------------------------------------------------ |
| **Lighthouse audits**           | Chrome-specific tool, not available for Safari         |
| **Memory heap snapshots**       | Requires Chrome DevTools Protocol (CDP)                |
| **Full performance traces**     | Chrome's Tracing API is CDP-specific                   |
| **Chrome extension management** | Safari extensions use a completely different system    |
| **Screencast/video recording**  | Requires CDP screencast API                            |
| **Network throttling**          | CDP-specific network emulation                         |
| **Geolocation emulation**       | CDP-specific emulation                                 |
| **Device emulation**            | CDP-specific (Safari has no equivalent via WebDriver)  |
| **Screenshot formats**          | Safari WebDriver only supports PNG (no JPEG/WebP)      |
| **Full-page screenshots**       | Safari WebDriver does not support full-page capture    |
| **initScript**                  | Requires CDP's `Page.addScriptToEvaluateOnNewDocument` |
| **Isolated browser contexts**   | Safari WebDriver only supports a single session        |

## Known Limitations

- **Single session**: Safari only allows one WebDriver session at a time
- **Network pre-injection gap**: Requests before script injection are captured via Performance API with limited detail (no headers, no status code)
- **Console pre-injection gap**: Console messages logged before script injection are not captured
- **AppleScript permissions**: Tab management requires macOS Accessibility permissions
- **No headless mode**: Safari does not support headless operation
- **macOS only**: Safari and SafariDriver are Apple-exclusive

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](LICENSE)
