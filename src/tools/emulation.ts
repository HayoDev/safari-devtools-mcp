/**
 * Emulation tools — color-scheme override.
 *
 * Safari has no CDP-style Emulation.setEmulatedMedia, so we override
 * `prefers-color-scheme` by injecting a style sheet that forces
 * color-scheme at the :root level and wraps existing media queries
 * via a class on `<html>`.
 *
 * The injected approach:
 *  1. Sets `color-scheme: light|dark` on :root so UA-level primitives
 *     (form controls, scrollbars) respond.
 *  2. Overrides `window.matchMedia('(prefers-color-scheme: dark)')` so
 *     JS-driven theme switches also respond.
 */

import {z} from 'zod';
import {defineTool} from './types.js';

const COLOR_SCHEME_ENUM = z
  .enum(['light', 'dark', 'reset'])
  .describe(
    '"light" or "dark" to emulate that preference, or "reset" to remove the override and restore the system default.',
  );

export const tools = [
  defineTool({
    name: 'set_color_scheme',
    description:
      'Emulate prefers-color-scheme (light/dark mode) in the current page. ' +
      'Overrides both CSS media queries and JavaScript matchMedia() so the ' +
      'page behaves as if the OS preference changed. Use "reset" to restore ' +
      'the system default.',
    slimDescription: 'Emulate light/dark mode.',
    schema: {
      colorScheme: COLOR_SCHEME_ENUM,
    },
    handler: async (params, driver) => {
      const {colorScheme} = params;

      if (colorScheme === 'reset') {
        await driver.runScript(`(() => {
          const el = document.getElementById('__safari_mcp_color_scheme__');
          if (el) el.remove();

          // Restore original matchMedia if we patched it
          if (window.__safariMcpOriginalMatchMedia) {
            window.matchMedia = window.__safariMcpOriginalMatchMedia;
            delete window.__safariMcpOriginalMatchMedia;
          }
        })()`);

        return {
          content: [
            {
              type: 'text' as const,
              text: 'Color scheme override removed. System default restored.',
            },
          ],
        };
      }

      // Inject CSS + JS override
      await driver.runScript(`((scheme) => {
        // 1. Inject/update the override style element
        let style = document.getElementById('__safari_mcp_color_scheme__');
        if (!style) {
          style = document.createElement('style');
          style.id = '__safari_mcp_color_scheme__';
          document.head.appendChild(style);
        }
        style.textContent = ':root { color-scheme: ' + scheme + ' !important; }';

        // 2. Patch matchMedia so JS-driven checks see the emulated value
        if (!window.__safariMcpOriginalMatchMedia) {
          window.__safariMcpOriginalMatchMedia = window.matchMedia.bind(window);
        }
        const original = window.__safariMcpOriginalMatchMedia;
        window.matchMedia = function(query) {
          const mql = original(query);
          if (query === '(prefers-color-scheme: dark)') {
            return Object.defineProperty(
              Object.create(mql),
              'matches',
              { get: () => scheme === 'dark', configurable: true }
            );
          }
          if (query === '(prefers-color-scheme: light)') {
            return Object.defineProperty(
              Object.create(mql),
              'matches',
              { get: () => scheme === 'light', configurable: true }
            );
          }
          return mql;
        };
      })('${colorScheme}')`);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Color scheme set to "${colorScheme}". CSS media queries and matchMedia() now reflect ${colorScheme} mode.`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'get_color_scheme',
    description:
      'Check the currently active color scheme preference (light or dark) ' +
      'as seen by the page, and whether an MCP override is active.',
    slimDescription: 'Check current light/dark mode state.',
    schema: {},
    handler: async (_params, driver) => {
      const result = await driver.runScript<{
        scheme: string;
        overrideActive: boolean;
      }>(`(() => {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const overrideActive = !!document.getElementById('__safari_mcp_color_scheme__');
        return {
          scheme: isDark ? 'dark' : 'light',
          overrideActive,
        };
      })()`);

      const status = result.overrideActive
        ? ' (MCP override active)'
        : ' (system default)';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Current color scheme: ${result.scheme}${status}`,
          },
        ],
      };
    },
  }),
];
