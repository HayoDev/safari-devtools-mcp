#!/usr/bin/env node

/**
 * Safari DevTools MCP Server — CLI entry point.
 *
 * Starts the MCP server with stdio transport for use with
 * Claude Desktop, Claude Code, or any MCP client.
 */

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createSafariMcpServer} from '../index.js';

async function main() {
  const {server, driver} = createSafariMcpServer();
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
