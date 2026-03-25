# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1](https://github.com/HayoDev/safari-devtools-mcp/compare/safari-devtools-mcp-v0.1.0...safari-devtools-mcp-v0.1.1) (2026-03-25)


### Features

* initial release of safari-devtools-mcp ([4bb9f4d](https://github.com/HayoDev/safari-devtools-mcp/commit/4bb9f4d1d1a0cee329802baf1053f5ba56d9af5b))


### CI/CD

* add release-please and CI workflows ([49aa7e8](https://github.com/HayoDev/safari-devtools-mcp/commit/49aa7e8b55e41d83ae2dbcf47288023d0bce4deb))

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
