# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-03-25

### Added

- Initial release with 25 tools across debugging, navigation, and input automation
- **Debugging tools**: console messages, network requests, JS evaluation, screenshots, DOM snapshots
- **Navigation tools**: page management, tab switching (via AppleScript), URL navigation, wait conditions
- **Input tools**: click, hover, fill, type, drag, press key, upload file
- Hybrid network monitoring: Performance API backfill + Fetch/XHR interception + PerformanceObserver
- Console capture with stack traces, uncaught errors, and unhandled promise rejections
- AppleScript-based tab management as macOS-native differentiator
- Tool names and schemas mirror chrome-devtools-mcp for cross-browser compatibility
- ESLint + Prettier configuration
- MCP registry configuration (server.json)

### Known Limitations

- Safari only allows one WebDriver session at a time
- No headless mode support
- Network requests before script injection have limited detail (no headers/status)
- Console messages before script injection are not captured
- Screenshots are PNG only (no JPEG/WebP)
- No full-page screenshot support
