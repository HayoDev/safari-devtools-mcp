/**
 * Formats network log entries for MCP response output.
 */

import type {NetworkLogEntry} from '../types.js';

export function formatNetworkRequests(
  logs: NetworkLogEntry[],
  total: number,
): string {
  if (logs.length === 0) {
    return 'No network requests captured.';
  }

  const lines: string[] = [];
  lines.push(`Network requests (${logs.length} of ${total} total):`);
  lines.push('');

  for (const log of logs) {
    const status = log.status || '---';
    const duration = log.duration ? `${Math.round(log.duration)}ms` : '?';
    const size = formatBytes(log.transferSize || log.decodedBodySize);
    const historical = log.historical ? ' [historical]' : '';

    lines.push(
      `  reqid=${log.reqid} ${log.method} ${status} ${truncateUrl(log.url)} ${duration} ${size}${historical}`,
    );
  }

  return lines.join('\n');
}

export function formatNetworkRequest(log: NetworkLogEntry): string {
  const lines: string[] = [];

  lines.push(`Network Request (reqid=${log.reqid})`);
  lines.push(`  URL: ${log.url}`);
  lines.push(`  Method: ${log.method}`);
  lines.push(`  Status: ${log.status} ${log.statusText}`);
  lines.push(`  Resource Type: ${log.resourceType}`);
  lines.push(`  Duration: ${Math.round(log.duration)}ms`);
  lines.push(`  MIME Type: ${log.mimeType || 'unknown'}`);

  if (log.historical) {
    lines.push(
      '  Note: Historical entry (captured from Performance API before injection). Headers and status may be unavailable.',
    );
  }

  lines.push(`  Transfer Size: ${formatBytes(log.transferSize)}`);
  lines.push(`  Encoded Body Size: ${formatBytes(log.encodedBodySize)}`);
  lines.push(`  Decoded Body Size: ${formatBytes(log.decodedBodySize)}`);

  if (log.requestHeaders && Object.keys(log.requestHeaders).length > 0) {
    lines.push('  Request Headers:');
    for (const [key, value] of Object.entries(log.requestHeaders)) {
      lines.push(`    ${key}: ${value}`);
    }
  }

  if (log.responseHeaders && Object.keys(log.responseHeaders).length > 0) {
    lines.push('  Response Headers:');
    for (const [key, value] of Object.entries(log.responseHeaders)) {
      lines.push(`    ${key}: ${value}`);
    }
  }

  if (log.requestBody) {
    lines.push('  Request Body:');
    lines.push(`    ${log.requestBody}`);
  }

  if (log.error) {
    lines.push(`  Error: ${log.error}`);
  }

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateUrl(url: string, maxLen = 80): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + '...';
}
