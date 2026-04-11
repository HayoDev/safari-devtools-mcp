# Safari DevTools MCP

[![npm version](https://img.shields.io/npm/v/safari-devtools-mcp.svg)](https://npmjs.org/package/safari-devtools-mcp)
[![npm downloads](https://img.shields.io/npm/dm/safari-devtools-mcp.svg)](https://npmjs.org/package/safari-devtools-mcp)
[![license](https://img.shields.io/npm/l/safari-devtools-mcp.svg)](https://github.com/HayoDev/safari-devtools-mcp/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/safari-devtools-mcp.svg)](https://npmjs.org/package/safari-devtools-mcp)

`safari-devtools-mcp` lets your coding agent (such as Claude, Cursor, Copilot or Gemini) control and inspect a live Safari browser on macOS. It acts as a Model-Context-Protocol (MCP) server, giving your AI coding assistant access to Safari DevTools for debugging, automation, and testing.

Chrome developers get powerful AI debugging through [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) by Google. Safari developers should have something equivalent — this project brings that same experience to Safari, with matching tool names and parameter schemas so you can swap between browsers with minimal friction.

## [Changelog](./CHANGELOG.md) | [Contributing](./CONTRIBUTING.md)

> **Note:** This server exposes browser content (page data, console logs, network traffic) to MCP clients. Avoid browsing sensitive websites or entering credentials while a session is active.

## Why safari-devtools-mcp?

This project uses **WebDriver** for capabilities that scripting alone cannot provide:

- **Network request/response body capture** — intercepts fetch and XHR calls with full headers, payloads, and timing
- **DOM snapshots via accessibility tree** — stable element UIDs that survive page re-renders, not brittle CSS selectors
- **CSS computed style inspection** — read any computed property from any element
- **Cookie and storage management** — read, write, and delete cookies, localStorage, and sessionStorage
- **Element-level screenshots** — capture individual elements, not just the full viewport
- **Session auto-recovery** — detects dead SafariDriver sessions and reconnects transparently

## Key features

- **Browser debugging**: Capture console logs, inspect network requests, and evaluate JavaScript — with stack traces and full request/response details.
- **Reliable automation**: Click, type, fill forms, drag and drop, and press keyboard shortcuts using accessibility-tree snapshots with stable UIDs.
- **Native macOS integration**: Tab management via AppleScript for listing, switching, and controlling Safari tabs across windows

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
      "args": ["-y", "safari-devtools-mcp@latest"]
    }
  }
}
```

<details>
<summary>Claude Code</summary>

```bash
claude mcp add safari-devtools -- npx -y safari-devtools-mcp@latest
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
<summary>Copilot CLI</summary>

```bash
copilot mcp add safari-devtools -- npx -y safari-devtools-mcp@latest
```

</details>

<details>
<summary>Gemini CLI</summary>

```bash
gemini mcp add safari-devtools -- npx -y safari-devtools-mcp@latest
```

Or add the standard config to your `~/.gemini/settings.json`.

</details>

<details>
<summary>Gemini Code Assist</summary>

Add the standard config to your `.gemini/settings.json` in the project root.

</details>

<details>
<summary>JetBrains AI Assistant & Junie</summary>

Add the standard config to your `.junie/mcp.json` in the project root.

</details>

<details>
<summary>Raycast</summary>

Open "Install MCP Server" in Raycast and fill in:

- **Command**: `npx`
- **Arguments**: `-y safari-devtools-mcp@latest`

Or copy the standard config JSON above before opening the command — Raycast will auto-fill the form.

</details>

<details>
<summary>Visual Studio</summary>

Add the standard config to your `.vs/mcp.json` in the solution root.

</details>

<details>
<summary>Warp</summary>

Add the standard config to your Warp MCP settings file at `~/.warp/mcp.json`.

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

### Slim mode

Use `--slim` to reduce token usage with shorter tool descriptions. Useful when working with context-limited models or long conversations:

```json
{
  "mcpServers": {
    "safari-devtools": {
      "command": "npx",
      "args": ["-y", "safari-devtools-mcp@latest", "--slim"]
    }
  }
}
```

## Prompts (skills)

The server exposes guided debugging workflows as MCP prompts. Clients that support prompts (e.g. Claude Desktop, Claude Code) can invoke them by name:

| Prompt                      | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| `safari-devtools`           | Getting started — tool overview, recommended workflow, and Safari-specific notes |
| `a11y-debugging`            | Accessibility audit — a11y tree inspection, axe-core injection, WCAG checks      |
| `safari-specific-debugging` | Debug WebKit quirks — CSS prefixes, JS feature gaps, ITP/CORS issues             |
| `performance-debugging`     | Performance analysis — Navigation Timing, Core Web Vitals, resource waterfall    |

## Tools (45)

### Debugging

| Tool                    | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `list_console_messages` | List console messages with filtering by level (log, warn, error)              |
| `get_console_message`   | Get a detailed message including stack trace and arguments                    |
| `clear_console`         | Clear all captured console messages                                           |
| `list_network_requests` | Monitor network requests — Fetch, XHR, and resource loads                     |
| `get_network_request`   | Get full request/response details with headers and body                       |
| `clear_network`         | Clear all captured network requests                                           |
| `evaluate_script`       | Execute JavaScript in the browser context and return results                  |
| `take_screenshot`       | Capture a PNG screenshot of the page or a specific element                    |
| `take_snapshot`         | Accessibility-tree snapshot of the DOM with stable UIDs for element targeting |

### Page content

| Tool               | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `get_page_content` | Get the page title, URL, and visible text content           |
| `get_html_source`  | Get the full HTML source of the page                        |
| `extract_links`    | Extract all links with their text, href, and rel attributes |
| `extract_meta`     | Extract meta tags (og:, twitter:, description, etc.)        |

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

### Scroll

| Tool                | Description                                        |
| ------------------- | -------------------------------------------------- |
| `scroll`            | Scroll the page in any direction by a given amount |
| `scroll_to_element` | Scroll an element into view by its UID             |

### CSS inspection

| Tool                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| `get_computed_style` | Get computed CSS styles for any element by UID |

### Cookies & storage

| Tool             | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `get_cookies`    | Get browser cookies, optionally filtered by name or domain         |
| `set_cookie`     | Set a cookie with name, value, and optional attributes             |
| `delete_cookie`  | Delete a cookie by name, or delete all cookies                     |
| `get_storage`    | Read from localStorage or sessionStorage                           |
| `set_storage`    | Write a key-value pair to localStorage or sessionStorage           |
| `delete_storage` | Delete a key or clear all entries from localStorage/sessionStorage |

### Input automation

| Tool            | Description                                          |
| --------------- | ---------------------------------------------------- |
| `click`         | Click an element by UID from a snapshot              |
| `click_at`      | Click at specific x/y coordinates                    |
| `right_click`   | Right-click (context menu) on an element             |
| `select_option` | Select an option from a dropdown by value or label   |
| `hover`         | Hover over an element                                |
| `fill`          | Type into an input field or select from a dropdown   |
| `fill_form`     | Fill multiple form fields at once                    |
| `type_text`     | Type text into the currently focused element         |
| `drag`          | Drag and drop between elements or coordinates        |
| `press_key`     | Press a key or combination (e.g., `Meta+A`, `Enter`) |
| `upload_file`   | Upload a file through a file input                   |

### iOS Safari validation

| Tool                          | Description                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `inspect_viewport_meta`       | Parse the viewport meta tag and validate against iOS best practices (width, zoom, viewport-fit)                |
| `get_safe_area_insets`        | Read CSS safe-area-inset values and check whether the page handles notched devices correctly                   |
| `check_ios_web_app_readiness` | Audit the page for Add to Home Screen / PWA readiness (apple-touch-icon, manifest, splash screens, status bar) |

### WebKit CSS compatibility

| Tool                         | Description                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `check_webkit_compatibility` | Scan stylesheets for Safari CSS issues — missing -webkit- prefixes, known WebKit quirks, and deprecated syntax |

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

## Credits

- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) by Google/ChromeDevTools — the inspiration and interface standard this project mirrors. Tool names and schemas are intentionally compatible so you can switch between Chrome and Safari seamlessly.
- [safari-mcp-server](https://github.com/lxman/safari-mcp-server) — prior art for Safari MCP integration that we studied during development.

## License

[MIT](LICENSE)
