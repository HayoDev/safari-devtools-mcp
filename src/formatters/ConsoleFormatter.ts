/**
 * Formats console log entries for MCP response output.
 */

import type {ConsoleLogEntry} from '../types.js';

export function formatConsoleMessages(
  logs: ConsoleLogEntry[],
  total: number,
): string {
  if (logs.length === 0) {
    return 'No console messages captured.';
  }

  const lines: string[] = [];
  lines.push(`Console messages (${logs.length} of ${total} total):`);
  lines.push('');

  for (const log of logs) {
    const time = new Date(log.timestamp).toISOString().split('T')[1];
    const levelTag = `[${log.level.toUpperCase()}]`;
    lines.push(`  msgid=${log.msgid} ${time} ${levelTag} ${log.message}`);
    if (log.source) {
      lines.push(`    at ${log.source}`);
    }
  }

  return lines.join('\n');
}

export function formatConsoleMessage(log: ConsoleLogEntry): string {
  const lines: string[] = [];
  const time = new Date(log.timestamp).toISOString();

  lines.push(`Console Message (msgid=${log.msgid})`);
  lines.push(`  Level: ${log.level}`);
  lines.push(`  Time: ${time}`);
  lines.push(`  Message: ${log.message}`);

  if (log.source) {
    lines.push(`  Source: ${log.source}`);
  }

  if (log.args && log.args.length > 0) {
    lines.push('  Arguments:');
    for (let i = 0; i < log.args.length; i++) {
      lines.push(`    [${i}]: ${log.args[i]}`);
    }
  }

  if (log.stackTrace) {
    lines.push('  Stack Trace:');
    for (const line of log.stackTrace.split('\n')) {
      if (line.trim()) {
        lines.push(`    ${line.trim()}`);
      }
    }
  }

  return lines.join('\n');
}
