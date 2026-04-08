# Safari-Specific Debugging

Use this skill when something works in other browsers but breaks in Safari,
or when debugging WebKit-specific behavior.

## Common Safari issues and how to debug them

### CSS issues

Safari lags behind on some CSS features and requires `-webkit-` prefixes
for others. Debug with:

```
get_computed_style uid="<element-uid>" properties=["display", "gap", "aspect-ratio", "container-type", "backdrop-filter"]
```

**Known Safari CSS quirks:**

- `gap` in flexbox: Supported since Safari 14.1, but older versions fail silently.
- `aspect-ratio`: Works, but may not apply in some flex/grid contexts.
- `-webkit-backdrop-filter`: Still requires prefix in some versions.
- `100vh` on iOS Safari includes the address bar — use `100dvh` instead.
- `position: sticky` inside `overflow: auto` containers often breaks.
- `:has()` selector: Safari was first to ship it, but edge cases may differ.

### JavaScript issues

Run diagnostics with `evaluate_script`:

```
evaluate_script function="() => {
  return {
    userAgent: navigator.userAgent,
    webkitVersion: navigator.userAgent.match(/AppleWebKit\/(\d+)/)?.[1],
    features: {
      structuredClone: typeof structuredClone !== 'undefined',
      requestIdleCallback: typeof requestIdleCallback !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      webComponents: typeof customElements !== 'undefined',
      resizeObserver: typeof ResizeObserver !== 'undefined',
      intersectionObserver: typeof IntersectionObserver !== 'undefined'
    }
  };
}"
```

**Known Safari JS quirks:**

- `requestIdleCallback`: Not available — use `setTimeout` fallback.
- `OffscreenCanvas`: Partial support — `2d` context only, no WebGL.
- Date parsing: `new Date('2024-01-15')` works, but
  `new Date('01-15-2024')` may fail. Always use ISO 8601.
- `fetch` with `keepalive`: Stricter size limits than Chrome.
- Web Locks API: Not supported in older Safari versions.
- `<input type="date">`: Renders differently. Check with `take_snapshot`.

### Network / CORS issues

Check failing requests:

```
list_network_requests resourceTypes=["fetch", "xhr"]
```

Then get details for any request with a 0 or 4xx/5xx status:

```
get_network_request reqid=<id>
```

**Known Safari network quirks:**

- Third-party cookies blocked by default (ITP). Check with `get_cookies`.
- CORS preflight caching is stricter — `Access-Control-Max-Age` may be
  ignored for non-standard headers.
- Service Worker cache can be more aggressive. Test with `evaluate_script`
  to check registration: `() => navigator.serviceWorker.getRegistration()`.

### Form / input issues

Safari renders `<select>`, `<input type="date">`, `<input type="time">`
with native OS controls that differ from Chrome. Use `take_snapshot` to
see what the a11y tree reports, then `take_screenshot` for visual comparison.

## Debugging workflow for cross-browser issues

1. Reproduce the issue:

   ```
   navigate_page url="<problem-url>"
   ```

2. Check console for errors:

   ```
   list_console_messages types=["error", "warn"]
   ```

3. Check network for failures:

   ```
   list_network_requests
   ```

4. Take a snapshot and screenshot for comparison:

   ```
   take_snapshot
   take_screenshot
   ```

5. Test specific feature support:

   ```
   evaluate_script function="() => { /* feature detection code */ }"
   ```

6. Check CSS rendering:
   ```
   get_computed_style uid="<element-uid>"
   ```
