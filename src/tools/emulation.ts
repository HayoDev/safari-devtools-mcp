/**
 * Emulation tools — color-scheme override.
 *
 * Safari has no CDP-style Emulation.setEmulatedMedia, so we emulate
 * `prefers-color-scheme` via three complementary techniques:
 *
 *  1. Sets `color-scheme: light|dark` on :root so UA-level primitives
 *     (form controls, scrollbars) respond.
 *  2. Rewrites `@media (prefers-color-scheme: ...)` rules in all
 *     accessible stylesheets so CSS-level dark/light branches activate.
 *  3. Patches `window.matchMedia` and dispatches synthetic `change`
 *     events so JS-driven theme switches also respond.
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
      'Overrides CSS @media rules, the color-scheme property, and ' +
      'JavaScript matchMedia() (including change events) so the page ' +
      'behaves as if the OS preference changed. Use "reset" to restore ' +
      'the system default.',
    slimDescription: 'Emulate light/dark mode.',
    schema: {
      colorScheme: COLOR_SCHEME_ENUM,
    },
    handler: async (params, driver) => {
      const {colorScheme} = params;

      if (colorScheme === 'reset') {
        await driver.runScript(`(() => {
          // 1. Remove injected style
          const el = document.getElementById('__safari_mcp_color_scheme__');
          if (el) el.remove();

          // 2. Restore original media rule texts
          const saved = window.__safariMcpSavedMedia;
          if (saved) {
            for (const entry of saved) {
              try { entry.rule.media.deleteMedium(entry.rule.media[0]); } catch {}
              try { entry.rule.media.appendMedium(entry.original); } catch {}
            }
            delete window.__safariMcpSavedMedia;
          }

          // 3. Restore original matchMedia and fire change events
          if (window.__safariMcpOriginalMatchMedia) {
            window.matchMedia = window.__safariMcpOriginalMatchMedia;
            delete window.__safariMcpOriginalMatchMedia;
          }
          delete window.__safariMcpEmulatedScheme;

          // Dispatch change events so listeners pick up the reset
          try {
            const mql = window.matchMedia('(prefers-color-scheme: dark)');
            mql.dispatchEvent(new MediaQueryListEvent('change', {
              matches: mql.matches, media: mql.media
            }));
          } catch {}
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

      await driver.runScript(`((scheme) => {
        const opposite = scheme === 'dark' ? 'light' : 'dark';

        // 1. Inject/update the override style element for UA controls
        let style = document.getElementById('__safari_mcp_color_scheme__');
        if (!style) {
          style = document.createElement('style');
          style.id = '__safari_mcp_color_scheme__';
          document.head.appendChild(style);
        }
        style.textContent = ':root { color-scheme: ' + scheme + ' !important; }';

        // 2. Rewrite @media (prefers-color-scheme) rules in all stylesheets
        //    Save originals for reset.
        if (!window.__safariMcpSavedMedia) window.__safariMcpSavedMedia = [];
        const saved = window.__safariMcpSavedMedia;

        // Restore any previously saved rules first (idempotent re-apply)
        for (const entry of saved) {
          try { entry.rule.media.deleteMedium(entry.rule.media[0]); } catch {}
          try { entry.rule.media.appendMedium(entry.original); } catch {}
        }
        saved.length = 0;

        function rewriteRules(rules) {
          if (!rules) return;
          for (const rule of rules) {
            if (rule.cssRules) rewriteRules(rule.cssRules);
            if (!(rule instanceof CSSMediaRule)) continue;
            const text = rule.conditionText || rule.media.mediaText || '';
            if (!text.includes('prefers-color-scheme')) continue;

            const original = text;
            // Force-enable the matching scheme, force-disable the opposite
            if (text.includes(scheme)) {
              saved.push({ rule, original });
              try { rule.media.deleteMedium(rule.media[0]); } catch {}
              try { rule.media.appendMedium('all'); } catch {}
            } else if (text.includes(opposite)) {
              saved.push({ rule, original });
              try { rule.media.deleteMedium(rule.media[0]); } catch {}
              try { rule.media.appendMedium('not all'); } catch {}
            }
          }
        }

        for (const sheet of document.styleSheets) {
          try { rewriteRules(sheet.cssRules); } catch {}
        }

        // 3. Patch matchMedia so new JS calls see the emulated value
        window.__safariMcpEmulatedScheme = scheme;
        if (!window.__safariMcpOriginalMatchMedia) {
          window.__safariMcpOriginalMatchMedia = window.matchMedia.bind(window);
        }
        const original = window.__safariMcpOriginalMatchMedia;
        window.matchMedia = function(query) {
          const mql = original(query);
          if (query === '(prefers-color-scheme: dark)' ||
              query === '(prefers-color-scheme: light)') {
            const target = query.includes('dark') ? 'dark' : 'light';
            return Object.defineProperty(
              Object.create(mql),
              'matches',
              { get: () => window.__safariMcpEmulatedScheme === target, configurable: true }
            );
          }
          return mql;
        };

        // 4. Dispatch change events so existing listeners react
        try {
          const darkMql = original('(prefers-color-scheme: dark)');
          darkMql.dispatchEvent(new MediaQueryListEvent('change', {
            matches: scheme === 'dark', media: '(prefers-color-scheme: dark)'
          }));
        } catch {}
        try {
          const lightMql = original('(prefers-color-scheme: light)');
          lightMql.dispatchEvent(new MediaQueryListEvent('change', {
            matches: scheme === 'light', media: '(prefers-color-scheme: light)'
          }));
        } catch {}
      })('${colorScheme}')`);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Color scheme set to "${colorScheme}". CSS @media rules, color-scheme property, and matchMedia() now reflect ${colorScheme} mode.`,
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
