#!/usr/bin/env node

/**
 * Safari DevTools MCP Server — CLI entry point.
 *
 * Starts the MCP server with stdio transport for use with
 * Claude Desktop, Claude Code, or any MCP client.
 *
 * Usage:
 *   safari-devtools-mcp [--slim]
 *
 * Options:
 *   --slim  Run in slim mode with shorter tool descriptions and
 *           condensed responses for reduced token usage.
 */

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createSafariMcpServer} from '../index.js';
import type {ServerOptions} from '../index.js';

function parseArgs(argv: string[]): ServerOptions {
  return {
    slim: argv.includes('--slim'),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const {server, driver} = createSafariMcpServer(options);
  const transport = new StdioServerTransport();

  // Graceful shutdown
  const cleanup = async () => {
    console.error('Shutting down Safari DevTools MCP Server...');
    await driver.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle uncaught errors
  process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
  });

  process.on('unhandledRejection', reason => {
    console.error('Unhandled rejection:', reason);
  });

  await server.connect(transport);
  console.error('Safari DevTools MCP Server running on stdio');
  if (options.slim) {
    console.error('  Mode: slim (reduced token usage)');
  }
  console.error('');
  console.error('Prerequisites:');
  console.error(
    '  1. Enable Developer menu: Safari → Settings → Advanced → "Show features for web developers"',
  );
  console.error(
    '  2. Enable Remote Automation: Develop → Allow Remote Automation',
  );
  console.error('  3. Authorize SafariDriver: sudo safaridriver --enable');
  console.error('');
  console.error('Note: Safari only supports one WebDriver session at a time.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
