/**
 * Injectable script for capturing browser console messages.
 *
 * This script wraps all console methods to capture log messages with
 * structured metadata (level, timestamp, stack traces for errors).
 * Messages are stored in window.__safariDevToolsConsoleLogs.
 */

export const CONSOLE_CAPTURE_SCRIPT = `
(function() {
  if (window.__safariDevToolsConsoleInitialized) return;
  window.__safariDevToolsConsoleInitialized = true;
  window.__safariDevToolsConsoleLogs = [];
  window.__safariDevToolsConsoleMsgId = 0;

  const originalConsole = {};
  const methods = [
    'log', 'debug', 'info', 'error', 'warn', 'trace',
    'assert', 'dir', 'table', 'clear', 'count', 'timeEnd'
  ];

  methods.forEach(function(method) {
    originalConsole[method] = console[method];

    console[method] = function() {
      var args = Array.from(arguments);
      var entry = {
        msgid: window.__safariDevToolsConsoleMsgId++,
        level: method,
        message: args.map(function(arg) {
          try {
            if (typeof arg === 'object') {
              var s = JSON.stringify(arg, null, 2);
              return s && s.length > 1000 ? s.substring(0, 1000) + '... [truncated]' : s;
            }
            var str = String(arg);
            return str.length > 1000 ? str.substring(0, 1000) + '... [truncated]' : str;
          } catch(e) {
            return String(arg).substring(0, 1000);
          }
        }).join(' '),
        timestamp: Date.now(),
        args: args.map(function(arg) {
          try {
            var s = typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            return s && s.length > 2000 ? s.substring(0, 2000) + '... [truncated]' : s;
          } catch(e) {
            return String(arg).substring(0, 2000);
          }
        })
      };

      // Capture stack trace for errors and traces
      if (method === 'error' || method === 'warn' || method === 'trace' || method === 'assert') {
        try {
          var err = new Error();
          // Remove the first two lines (Error + this wrapper)
          var stack = err.stack || '';
          var lines = stack.split('\\n');
          entry.stackTrace = lines.slice(2).join('\\n');
        } catch(e) {}
      }

      // Special handling for assert - only log if assertion fails
      if (method === 'assert') {
        if (args[0]) return originalConsole[method].apply(console, args);
        entry.message = 'Assertion failed: ' + args.slice(1).map(function(a) {
          try {
            var s = typeof a === 'object' ? JSON.stringify(a) : String(a);
            return s && s.length > 1000 ? s.substring(0, 1000) + '... [truncated]' : s;
          } catch(e) { return String(a).substring(0, 1000); }
        }).join(' ');
      }

      // Special handling for clear
      if (method === 'clear') {
        entry.message = 'Console was cleared';
      }

      window.__safariDevToolsConsoleLogs.push(entry);

      // Call original method
      if (originalConsole[method]) {
        originalConsole[method].apply(console, args);
      }
    };
  });

  // Capture uncaught errors
  window.addEventListener('error', function(event) {
    window.__safariDevToolsConsoleLogs.push({
      msgid: window.__safariDevToolsConsoleMsgId++,
      level: 'error',
      message: event.message || String(event),
      timestamp: Date.now(),
      source: event.filename ? event.filename + ':' + event.lineno + ':' + event.colno : undefined,
      stackTrace: event.error ? event.error.stack : undefined
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    var message = 'Unhandled Promise Rejection: ';
    try {
      var r = event.reason instanceof Error ? event.reason.message : JSON.stringify(event.reason);
      message += r && r.length > 1000 ? r.substring(0, 1000) + '... [truncated]' : r;
    } catch(e) {
      message += String(event.reason);
    }
    window.__safariDevToolsConsoleLogs.push({
      msgid: window.__safariDevToolsConsoleMsgId++,
      level: 'error',
      message: message,
      timestamp: Date.now(),
      stackTrace: event.reason instanceof Error ? event.reason.stack : undefined
    });
  });
})();
`;
