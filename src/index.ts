/**
 * Safari DevTools MCP Server.
 *
 * Provides browser debugging and automation tools for AI coding agents
 * via the Model Context Protocol, targeting Safari on macOS.
 */

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {ZodTypeAny} from 'zod';
import {SafariDriver} from './SafariDriver.js';

// Tool handlers
import {
  listConsoleMessages,
  listConsoleMessagesSchema,
  getConsoleMessage,
  getConsoleMessageSchema,
} from './tools/console.js';
import {
  listNetworkRequests,
  listNetworkRequestsSchema,
  getNetworkRequest,
  getNetworkRequestSchema,
} from './tools/network.js';
import {evaluateScript, evaluateScriptSchema} from './tools/script.js';
import {takeScreenshot, takeScreenshotSchema} from './tools/screenshot.js';
import {
  takeSnapshot,
  takeSnapshotSchema,
  waitFor,
  waitForSchema,
} from './tools/snapshot.js';
import {
  listPages,
  listPagesSchema,
  selectPage,
  selectPageSchema,
  closePage,
  closePageSchema,
  newPage,
  newPageSchema,
  navigatePage,
  navigatePageSchema,
  resizePage,
  resizePageSchema,
  handleDialog,
  handleDialogSchema,
} from './tools/pages.js';
import {
  click,
  clickSchema,
  clickAt,
  clickAtSchema,
  hover,
  hoverSchema,
  fill,
  fillSchema,
  fillForm,
  fillFormSchema,
  typeText,
  typeTextSchema,
  drag,
  dragSchema,
  pressKey,
  pressKeySchema,
  uploadFile,
  uploadFileSchema,
} from './tools/input.js';

export function createSafariMcpServer(): {
  server: McpServer;
  driver: SafariDriver;
} {
  const server = new McpServer(
    {
      name: 'safari-devtools-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const driver = new SafariDriver();

  // Helper to register a tool
  function registerTool(
    name: string,
    description: string,
    schema: Record<string, ZodTypeAny>,
    handler: (
      params: Record<string, unknown>,
      driver: SafariDriver,
    ) => Promise<{
      content: (
        | {type: 'text'; text: string}
        | {type: 'image'; data: string; mimeType: string}
      )[];
      isError?: boolean;
    }>,
  ) {
    server.tool(name, description, schema, async params => {
      try {
        return await handler(params, driver);
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

  // =====================
  // DEBUGGING TOOLS (highest priority)
  // =====================

  registerTool(
    'list_console_messages',
    'List all console messages for the currently selected page since the last navigation.',
    listConsoleMessagesSchema,
    listConsoleMessages,
  );

  registerTool(
    'get_console_message',
    'Gets a console message by its ID. You can get all messages by calling list_console_messages.',
    getConsoleMessageSchema,
    getConsoleMessage,
  );

  registerTool(
    'list_network_requests',
    'List all network requests for the currently selected page since the last navigation. Includes historical requests made before monitoring started (with limited detail).',
    listNetworkRequestsSchema,
    listNetworkRequests,
  );

  registerTool(
    'get_network_request',
    'Gets a network request by its reqid from the listed requests.',
    getNetworkRequestSchema,
    getNetworkRequest,
  );

  registerTool(
    'evaluate_script',
    'Evaluate a JavaScript function inside the currently selected page. Returns the response as JSON, so returned values have to be JSON-serializable.',
    evaluateScriptSchema,
    evaluateScript,
  );

  registerTool(
    'take_screenshot',
    'Take a screenshot of the page or element.',
    takeScreenshotSchema,
    takeScreenshot,
  );

  registerTool(
    'take_snapshot',
    'Take a text snapshot of the currently selected page based on the DOM/a11y tree. The snapshot lists page elements along with a unique identifier (uid). Always use the latest snapshot. Prefer taking a snapshot over taking a screenshot.',
    takeSnapshotSchema,
    takeSnapshot,
  );

  // =====================
  // NAVIGATION TOOLS
  // =====================

  registerTool(
    'list_pages',
    'Get a list of pages (tabs) open in Safari.',
    listPagesSchema,
    listPages,
  );

  registerTool(
    'select_page',
    'Select a page as context for future tool calls.',
    selectPageSchema,
    selectPage,
  );

  registerTool(
    'close_page',
    'Closes a page by its ID. The last open page cannot be closed.',
    closePageSchema,
    closePage,
  );

  registerTool(
    'new_page',
    'Open a new tab and load a URL.',
    newPageSchema,
    newPage,
  );

  registerTool(
    'navigate_page',
    'Go to a URL, or back, forward, or reload.',
    navigatePageSchema,
    navigatePage,
  );

  registerTool(
    'wait_for',
    'Wait for the specified text to appear on the selected page.',
    waitForSchema,
    waitFor,
  );

  registerTool(
    'resize_page',
    "Resizes the selected page's window so that the page has specified dimensions.",
    resizePageSchema,
    resizePage,
  );

  registerTool(
    'handle_dialog',
    'If a browser dialog was opened, use this command to handle it.',
    handleDialogSchema,
    handleDialog,
  );

  // =====================
  // INPUT TOOLS
  // =====================

  registerTool('click', 'Clicks on the provided element.', clickSchema, click);

  registerTool(
    'click_at',
    'Clicks at the provided coordinates.',
    clickAtSchema,
    clickAt,
  );

  registerTool('hover', 'Hover over the provided element.', hoverSchema, hover);

  registerTool(
    'fill',
    'Type text into an input, text area or select an option from a <select> element.',
    fillSchema,
    fill,
  );

  registerTool(
    'fill_form',
    'Fill out multiple form elements at once.',
    fillFormSchema,
    fillForm,
  );

  registerTool(
    'type_text',
    'Type text using keyboard into a previously focused input.',
    typeTextSchema,
    typeText,
  );

  registerTool(
    'drag',
    'Drag an element onto another element.',
    dragSchema,
    drag,
  );

  registerTool(
    'press_key',
    'Press a key or key combination. Use this when other input methods like fill() cannot be used.',
    pressKeySchema,
    pressKey,
  );

  registerTool(
    'upload_file',
    'Upload a file through a provided file input element.',
    uploadFileSchema,
    uploadFile,
  );

  return {server, driver};
}
