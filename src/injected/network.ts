/**
 * Injectable script for capturing network requests.
 *
 * Hybrid approach:
 * 1. Performance API backfill — captures historical requests made before injection
 *    (timing, size, URL available; no headers/status)
 * 2. Fetch interception — captures ongoing fetch() requests with full details
 * 3. XMLHttpRequest interception — captures ongoing XHR requests with full details
 * 4. PerformanceObserver — catches resource loads the interceptors miss
 *
 * Historical entries are flagged so the AI knows they have limited detail.
 */

export const NETWORK_CAPTURE_SCRIPT = `
(function() {
  if (window.__safariDevToolsNetworkInitialized) return;
  window.__safariDevToolsNetworkInitialized = true;
  window.__safariDevToolsNetworkLogs = [];
  window.__safariDevToolsNetworkReqId = 0;
  window.__safariDevToolsInterceptedUrls = new Map(); // URL+startTime -> true

  // Helper to guess resource type from initiatorType or URL
  function guessResourceType(initiatorType, url) {
    if (initiatorType === 'xmlhttprequest') return 'xhr';
    if (initiatorType === 'fetch') return 'fetch';
    if (initiatorType === 'script') return 'script';
    if (initiatorType === 'link' || initiatorType === 'css') return 'stylesheet';
    if (initiatorType === 'img') return 'image';
    if (initiatorType === 'video' || initiatorType === 'audio') return 'media';

    // Guess from URL extension
    if (url) {
      var ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
      var typeMap = {
        js: 'script', mjs: 'script',
        css: 'stylesheet',
        png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image', ico: 'image',
        woff: 'font', woff2: 'font', ttf: 'font', otf: 'font', eot: 'font',
        mp4: 'media', webm: 'media', mp3: 'media', ogg: 'media',
        html: 'document', htm: 'document'
      };
      if (typeMap[ext]) return typeMap[ext];
    }
    return 'other';
  }

  // Step 1: Backfill historical requests from Performance API
  try {
    var entries = performance.getEntriesByType('resource');
    entries.forEach(function(entry) {
      window.__safariDevToolsNetworkLogs.push({
        reqid: window.__safariDevToolsNetworkReqId++,
        url: entry.name,
        method: 'GET',
        status: 0,
        statusText: '',
        resourceType: guessResourceType(entry.initiatorType, entry.name),
        startTime: entry.startTime,
        duration: entry.duration,
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        requestHeaders: {},
        responseHeaders: {},
        historical: true,
        mimeType: ''
      });
    });
  } catch(e) {}

  // Step 2: PerformanceObserver for new resource loads
  try {
    var observer = new PerformanceObserver(function(list) {
      list.getEntries().forEach(function(entry) {
        // Skip if this request was already captured by fetch/XHR interceptors
        // Check with a small tolerance window for startTime rounding
        var dominated = false;
        for (var t = Math.round(entry.startTime) - 1; t <= Math.round(entry.startTime) + 1; t++) {
          if (window.__safariDevToolsInterceptedUrls.has(entry.name + '|' + t)) {
            dominated = true;
            break;
          }
        }
        if (dominated) return;

        window.__safariDevToolsNetworkLogs.push({
            reqid: window.__safariDevToolsNetworkReqId++,
            url: entry.name,
            method: 'GET',
            status: 0,
            statusText: '',
            resourceType: guessResourceType(entry.initiatorType, entry.name),
            startTime: entry.startTime,
            duration: entry.duration,
            transferSize: entry.transferSize || 0,
            encodedBodySize: entry.encodedBodySize || 0,
            decodedBodySize: entry.decodedBodySize || 0,
            requestHeaders: {},
            responseHeaders: {},
            historical: false,
            mimeType: ''
          });
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  } catch(e) {}

  // Step 3: Intercept fetch()
  var originalFetch = window.fetch;
  window.fetch = function() {
    var args = arguments;
    var request;
    try {
      request = new Request(args[0], args[1]);
    } catch(e) {
      return originalFetch.apply(this, args);
    }

    var entry = {
      reqid: window.__safariDevToolsNetworkReqId++,
      url: request.url,
      method: request.method,
      status: 0,
      statusText: '',
      resourceType: 'fetch',
      startTime: performance.now(),
      duration: 0,
      transferSize: 0,
      encodedBodySize: 0,
      decodedBodySize: 0,
      requestHeaders: {},
      responseHeaders: {},
      historical: false,
      mimeType: ''
    };

    // Capture request headers
    try {
      request.headers.forEach(function(value, key) {
        entry.requestHeaders[key] = value;
      });
    } catch(e) {}

    // Capture request body
    try {
      if (args[1] && args[1].body) {
        if (typeof args[1].body === 'string') {
          entry.requestBody = args[1].body;
        } else {
          entry.requestBody = '[Binary or FormData body]';
        }
      }
    } catch(e) {}

    window.__safariDevToolsNetworkLogs.push(entry);
    window.__safariDevToolsInterceptedUrls.set(entry.url + '|' + Math.round(entry.startTime), true);

    return originalFetch.apply(this, args).then(function(response) {
      entry.status = response.status;
      entry.statusText = response.statusText;
      entry.duration = performance.now() - entry.startTime;
      entry.mimeType = response.headers.get('content-type') || '';

      // Capture response headers
      try {
        response.headers.forEach(function(value, key) {
          entry.responseHeaders[key] = value;
        });
      } catch(e) {}

      return response;
    }).catch(function(error) {
      entry.error = error.message || String(error);
      entry.duration = performance.now() - entry.startTime;
      throw error;
    });
  };

  // Step 4: Intercept XMLHttpRequest
  var originalXHROpen = XMLHttpRequest.prototype.open;
  var originalXHRSend = XMLHttpRequest.prototype.send;
  var originalXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__safariDevToolsMeta = {
      method: method,
      url: String(url),
      requestHeaders: {}
    };
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (this.__safariDevToolsMeta) {
      this.__safariDevToolsMeta.requestHeaders[name] = value;
    }
    return originalXHRSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    var xhr = this;
    var meta = xhr.__safariDevToolsMeta;

    if (meta) {
      var entry = {
        reqid: window.__safariDevToolsNetworkReqId++,
        url: meta.url,
        method: meta.method,
        status: 0,
        statusText: '',
        resourceType: 'xhr',
        startTime: performance.now(),
        duration: 0,
        transferSize: 0,
        encodedBodySize: 0,
        decodedBodySize: 0,
        requestHeaders: meta.requestHeaders,
        responseHeaders: {},
        historical: false,
        mimeType: ''
      };

      if (body) {
        try {
          entry.requestBody = typeof body === 'string' ? body : '[Binary body]';
        } catch(e) {}
      }

      window.__safariDevToolsNetworkLogs.push(entry);
      window.__safariDevToolsInterceptedUrls.set(entry.url + '|' + Math.round(entry.startTime), true);

      xhr.addEventListener('load', function() {
        entry.status = xhr.status;
        entry.statusText = xhr.statusText;
        entry.duration = performance.now() - entry.startTime;
        entry.mimeType = xhr.getResponseHeader('content-type') || '';

        // Parse response headers
        try {
          var headerStr = xhr.getAllResponseHeaders();
          if (headerStr) {
            headerStr.split('\\r\\n').forEach(function(line) {
              var parts = line.split(': ');
              if (parts.length >= 2) {
                entry.responseHeaders[parts[0]] = parts.slice(1).join(': ');
              }
            });
          }
        } catch(e) {}

        // Estimate body size
        try {
          var responseText = xhr.responseText;
          if (responseText) {
            entry.decodedBodySize = responseText.length;
            entry.encodedBodySize = responseText.length;
          }
        } catch(e) {}
      });

      xhr.addEventListener('error', function() {
        entry.error = 'Network error';
        entry.duration = performance.now() - entry.startTime;
      });

      xhr.addEventListener('timeout', function() {
        entry.error = 'Request timeout';
        entry.duration = performance.now() - entry.startTime;
      });
    }

    return originalXHRSend.apply(this, arguments);
  };
})();
`;
