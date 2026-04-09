/**
 * Safari DevTools MCP Server.
 *
 * Provides browser debugging and automation tools for AI coding agents
 * via the Model Context Protocol, targeting Safari on macOS.
 */

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {SafariDriver} from './SafariDriver.js';
import {registerPrompts} from './prompts.js';
import {VERSION} from './version.js';
import type {ToolDef} from './tools/types.js';

// Tool modules — each exports a `tools` array
import {tools as consoleTools} from './tools/console.js';
import {tools as networkTools} from './tools/network.js';
import {tools as scriptTools} from './tools/script.js';
import {tools as screenshotTools} from './tools/screenshot.js';
import {tools as snapshotTools} from './tools/snapshot.js';
import {tools as pagesTools} from './tools/pages.js';
import {tools as pageContentTools} from './tools/page-content.js';
import {tools as scrollTools} from './tools/scroll.js';
import {tools as cssTools} from './tools/css.js';
import {tools as cookieTools} from './tools/cookies.js';
import {tools as storageTools} from './tools/storage.js';
import {tools as inputTools} from './tools/input.js';
import {tools as emulationTools} from './tools/emulation.js';

const allTools: ToolDef[] = [
  ...consoleTools,
  ...networkTools,
  ...scriptTools,
  ...screenshotTools,
  ...snapshotTools,
  ...pagesTools,
  ...pageContentTools,
  ...scrollTools,
  ...cssTools,
  ...cookieTools,
  ...storageTools,
  ...inputTools,
  ...emulationTools,
];

export interface ServerOptions {
  /** Run in slim mode for reduced token usage. */
  slim?: boolean;
}

export function createSafariMcpServer(options: ServerOptions = {}): {
  server: McpServer;
  driver: SafariDriver;
} {
  const {slim = false} = options;

  const server = new McpServer(
    {
      name: 'safari-devtools-mcp',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    },
  );

  const driver = new SafariDriver();

  // Register guided debugging prompts (skills)
  registerPrompts(server);

  for (const tool of allTools) {
    const description =
      slim && tool.slimDescription ? tool.slimDescription : tool.description;

    server.tool(tool.name, description, tool.schema, async params => {
      try {
        return await tool.handler(params, driver);
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  return {server, driver};
}
