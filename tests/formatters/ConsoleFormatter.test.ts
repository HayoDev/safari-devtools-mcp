import {describe, it} from 'node:test';
import assert from 'node:assert';
import {
  formatConsoleMessages,
  formatConsoleMessage,
} from '../../src/formatters/ConsoleFormatter.js';
import type {ConsoleLogEntry} from '../../src/types.js';

describe('ConsoleFormatter', () => {
  describe('formatConsoleMessages', () => {
    it('returns empty message when no logs', () => {
      const result = formatConsoleMessages([], 0);
      assert.strictEqual(result, 'No console messages captured.');
    });

    it('formats a list of console messages', () => {
      const logs: ConsoleLogEntry[] = [
        {
          msgid: 0,
          level: 'info',
          message: 'Hello world',
          timestamp: 1700000000000,
        },
        {
          msgid: 1,
          level: 'error',
          message: 'Something broke',
          timestamp: 1700000001000,
          source: 'app.js:42:10',
        },
      ];
      const result = formatConsoleMessages(logs, 5);
      assert.ok(result.includes('Console messages (2 of 5 total):'));
      assert.ok(result.includes('[INFO]'));
      assert.ok(result.includes('Hello world'));
      assert.ok(result.includes('[ERROR]'));
      assert.ok(result.includes('Something broke'));
      assert.ok(result.includes('at app.js:42:10'));
    });
  });

  describe('formatConsoleMessage', () => {
    it('formats a single message with all fields', () => {
      const log: ConsoleLogEntry = {
        msgid: 3,
        level: 'error',
        message: 'TypeError: undefined is not a function',
        timestamp: 1700000000000,
        source: 'main.js:10:5',
        args: ['TypeError: undefined is not a function'],
        stackTrace: 'at doThing (main.js:10:5)\nat init (main.js:1:1)',
      };
      const result = formatConsoleMessage(log);
      assert.ok(result.includes('Console Message (msgid=3)'));
      assert.ok(result.includes('Level: error'));
      assert.ok(result.includes('Source: main.js:10:5'));
      assert.ok(result.includes('Stack Trace:'));
      assert.ok(result.includes('at doThing'));
      assert.ok(result.includes('Arguments:'));
    });

    it('formats a simple message without optional fields', () => {
      const log: ConsoleLogEntry = {
        msgid: 0,
        level: 'log',
        message: 'simple message',
        timestamp: 1700000000000,
      };
      const result = formatConsoleMessage(log);
      assert.ok(result.includes('Level: log'));
      assert.ok(result.includes('simple message'));
      assert.ok(!result.includes('Stack Trace:'));
      assert.ok(!result.includes('Source:'));
    });
  });
});
