# Performance Debugging with Safari DevTools MCP

Use this skill when investigating slow page loads, rendering issues,
or optimizing Core Web Vitals in Safari.

## Collect performance metrics

Use `evaluate_script` to capture key metrics from the browser:

### Navigation Timing (TTFB, DOM load, full page load)

```
evaluate_script function="() => {
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return { error: 'No navigation entry found' };
  return {
    url: nav.name,
    redirectTime: Math.round(nav.redirectEnd - nav.redirectStart),
    dnsLookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
    tcpConnect: Math.round(nav.connectEnd - nav.connectStart),
    ttfb: Math.round(nav.responseStart - nav.requestStart),
    responseTime: Math.round(nav.responseEnd - nav.responseStart),
    domInteractive: Math.round(nav.domInteractive),
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    fullLoad: Math.round(nav.loadEventEnd),
    transferSize: nav.transferSize,
    encodedBodySize: nav.encodedBodySize,
    decodedBodySize: nav.decodedBodySize
  };
}"
```

### Core Web Vitals (LCP, CLS, INP)

```
evaluate_script function="() => {
  const results = {};

  // LCP
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
  if (lcpEntries.length > 0) {
    const lcp = lcpEntries[lcpEntries.length - 1];
    results.lcp = {
      value: Math.round(lcp.startTime),
      element: lcp.element?.tagName,
      url: lcp.url || null,
      rating: lcp.startTime <= 2500 ? 'good' : lcp.startTime <= 4000 ? 'needs-improvement' : 'poor'
    };
  }

  // CLS
  let clsValue = 0;
  for (const entry of performance.getEntriesByType('layout-shift')) {
    if (!entry.hadRecentInput) clsValue += entry.value;
  }
  results.cls = {
    value: Math.round(clsValue * 1000) / 1000,
    rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor'
  };

  return results;
}"
```

### Resource waterfall (slowest resources)

```
evaluate_script function="() => {
  const entries = performance.getEntriesByType('resource');
  return entries
    .map(e => ({
      name: e.name.split('/').pop()?.substring(0, 60),
      type: e.initiatorType,
      duration: Math.round(e.duration),
      transferSize: e.transferSize,
      start: Math.round(e.startTime)
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 15);
}"
```

### Long tasks

```
evaluate_script function="() => {
  if (!window.__longTasks) {
    window.__longTasks = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        window.__longTasks.push({
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration)
        });
      }
    }).observe({ type: 'longtask', buffered: true });
    return { status: 'observer started — call again after interaction to see results' };
  }
  return window.__longTasks;
}"
```

## Interpreting results

### LCP (Largest Contentful Paint)

| Rating            | Threshold |
| ----------------- | --------- |
| Good              | ≤ 2.5s    |
| Needs improvement | ≤ 4.0s    |
| Poor              | > 4.0s    |

**Common causes of slow LCP:**

- Large unoptimized images (check with `list_network_requests resourceTypes=["image"]`)
- Render-blocking CSS/JS (check resource waterfall for early large scripts)
- Slow server response (check TTFB from Navigation Timing)

### CLS (Cumulative Layout Shift)

| Rating            | Threshold |
| ----------------- | --------- |
| Good              | ≤ 0.1     |
| Needs improvement | ≤ 0.25    |
| Poor              | > 0.25    |

**Common causes of CLS:**

- Images without `width`/`height` attributes
- Dynamically injected content above the fold
- Web fonts causing FOUT (Flash of Unstyled Text)

### Safari-specific performance considerations

- Safari uses WebKit's rendering engine which handles compositing
  differently from Blink — `will-change` and `transform: translateZ(0)`
  hacks may behave differently.
- Intelligent Tracking Prevention (ITP) can cause extra network latency
  for third-party resources.
- Safari's JS engine (JavaScriptCore) has different JIT behavior than V8.
  Microbenchmarks may not reflect real-world performance.

## Full debugging workflow

1. Navigate and measure baseline:

   ```
   navigate_page url="<target-url>"
   ```

   Then run the Navigation Timing and Core Web Vitals scripts above.

2. Check for render-blocking resources:

   ```
   list_network_requests resourceTypes=["script", "stylesheet"]
   ```

3. Check for console errors that might block rendering:

   ```
   list_console_messages types=["error"]
   ```

4. Take a screenshot to verify visual completeness:

   ```
   take_screenshot
   ```

5. If LCP is slow, identify the LCP element and check its source
   in the network log.
