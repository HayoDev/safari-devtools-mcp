# Safari DevTools MCP — Getting Started

Use this skill when onboarding to the Safari DevTools MCP server or when
unsure which tools to use.

## Available tool categories

- **Snapshots**: `take_snapshot` gives you a DOM/a11y tree with element UIDs
  you can pass to other tools. Always take a fresh snapshot before interacting.
- **Navigation**: `navigate_page`, `new_page`, `list_pages`, `select_page`
  for page lifecycle control.
- **Input**: `click`, `fill`, `type_text`, `press_key`, `drag`, `hover`,
  `select_option`, `upload_file` for element interaction. Identify elements by
  their `uid` from the latest snapshot.
- **Debugging**: `list_console_messages`, `list_network_requests` for runtime
  diagnostics. Use `get_console_message` / `get_network_request` for details.
- **Screenshots**: `take_screenshot` for visual state. Prefer `take_snapshot`
  for programmatic inspection.
- **Page content**: `get_page_content` (title + text), `get_html_source`,
  `extract_links`, `extract_meta`.
- **CSS**: `get_computed_style` for styling information on any element.
- **Storage**: `get_cookies`, `set_cookie`, `delete_cookie`, `get_storage`,
  `set_storage`, `delete_storage` for cookie and Web Storage inspection.
- **Scroll**: `scroll`, `scroll_to_element` for viewport control.

## Recommended workflow

1. **Navigate** to the target URL with `navigate_page`.
2. **Snapshot** the page with `take_snapshot` to see the DOM tree.
3. **Interact** using UIDs from the snapshot: `click`, `fill`, etc.
4. **Re-snapshot** after interaction — the DOM may have changed.
5. **Debug** with `list_console_messages` and `list_network_requests`
   to check for errors or failed requests.

## Safari-specific notes

- Safari only supports **one WebDriver session** at a time.
- Tab management uses **AppleScript** — macOS accessibility permissions
  may be required.
- There is no headless mode. Safari will open visibly on screen.
- Screenshots are **PNG only**.
- Console and network capture start when the session is created — messages
  before that point are not captured (network has partial historical data
  via the Performance API).
