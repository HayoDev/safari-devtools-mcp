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

// ---- Device Emulation ----

interface DevicePreset {
  width: number;
  height: number;
  devicePixelRatio: number;
  userAgent: string;
  mobile: boolean;
}

const SAFARI_VERSION = '605.1.15';
const WEBKIT_VERSION = '605.1.15';
const OS_VERSION_IOS = '18_0';
const OS_VERSION_IPAD = '18_0';

const DEVICE_PRESETS: Record<string, DevicePreset> = {
  'iPhone SE': {
    width: 375,
    height: 667,
    devicePixelRatio: 2,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${OS_VERSION_IOS} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPhone 14': {
    width: 390,
    height: 844,
    devicePixelRatio: 3,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${OS_VERSION_IOS} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPhone 15 Pro': {
    width: 393,
    height: 852,
    devicePixelRatio: 3,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${OS_VERSION_IOS} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPhone 16 Pro Max': {
    width: 440,
    height: 956,
    devicePixelRatio: 3,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${OS_VERSION_IOS} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPad Mini': {
    width: 744,
    height: 1133,
    devicePixelRatio: 2,
    userAgent: `Mozilla/5.0 (iPad; CPU OS ${OS_VERSION_IPAD} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPad Air': {
    width: 820,
    height: 1180,
    devicePixelRatio: 2,
    userAgent: `Mozilla/5.0 (iPad; CPU OS ${OS_VERSION_IPAD} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPad Pro 11': {
    width: 834,
    height: 1194,
    devicePixelRatio: 2,
    userAgent: `Mozilla/5.0 (iPad; CPU OS ${OS_VERSION_IPAD} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
  'iPad Pro 13': {
    width: 1024,
    height: 1366,
    devicePixelRatio: 2,
    userAgent: `Mozilla/5.0 (iPad; CPU OS ${OS_VERSION_IPAD} like Mac OS X) AppleWebKit/${WEBKIT_VERSION} (KHTML, like Gecko) Version/18.0 Mobile/${SAFARI_VERSION} Safari/${SAFARI_VERSION}`,
    mobile: true,
  },
};

const PRESET_NAMES: [string, ...string[]] = Object.keys(DEVICE_PRESETS) as [
  string,
  ...string[],
];

export const deviceTools = [
  defineTool({
    name: 'set_device_emulation',
    description:
      'Emulate an Apple device by resizing the viewport and overriding ' +
      'device pixel ratio and touch support at the JS level. The user agent ' +
      'is overridden via navigator.userAgent (JS-level only — HTTP request ' +
      'headers are not affected). Choose a preset ' +
      `(${PRESET_NAMES.join(', ')}) or provide custom values. ` +
      'Use reset_device_emulation to restore defaults.',
    slimDescription: 'Emulate iPhone/iPad viewport and UA.',
    schema: {
      device: z
        .enum(PRESET_NAMES)
        .optional()
        .describe(
          'Apple device preset name. Overrides width/height/dpr/userAgent if provided.',
        ),
      width: z
        .number()
        .min(200)
        .max(3840)
        .optional()
        .describe('Viewport width in CSS pixels.'),
      height: z
        .number()
        .min(200)
        .max(2160)
        .optional()
        .describe('Viewport height in CSS pixels.'),
      devicePixelRatio: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe('Device pixel ratio (e.g. 2 for Retina).'),
      userAgent: z
        .string()
        .optional()
        .describe(
          'Custom user agent string (JS-level override only; HTTP headers unchanged).',
        ),
    },
    handler: async (params, driver) => {
      const preset = params.device ? DEVICE_PRESETS[params.device] : undefined;
      const width = params.width ?? preset?.width;
      const height = params.height ?? preset?.height;
      const dpr = params.devicePixelRatio ?? preset?.devicePixelRatio;
      const ua = params.userAgent ?? preset?.userAgent;
      const mobile = preset?.mobile ?? false;

      if (!width || !height) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Provide a device preset or both width and height.',
            },
          ],
          isError: true,
        };
      }

      // Save original window size before resizing
      const originalSize = await driver.runScript<{w: number; h: number}>(
        `({w: window.outerWidth, h: window.outerHeight})`,
      );

      // Resize the browser window
      await driver.resizePage(width, height);

      // Inject JS overrides for DPR, UA, and touch
      const overrides: string[] = [];
      if (dpr) overrides.push(`dpr: ${dpr}`);
      if (ua) overrides.push(`ua: ${JSON.stringify(ua)}`);
      overrides.push(`mobile: ${mobile}`);
      overrides.push(`origW: ${originalSize.w}`);
      overrides.push(`origH: ${originalSize.h}`);

      await driver.runScript(`((opts) => {
        // Save originals for reset (only on first call)
        if (!window.__safariMcpDeviceOriginals) {
          window.__safariMcpDeviceOriginals = {
            windowWidth: opts.origW,
            windowHeight: opts.origH,
            hadOntouchstart: 'ontouchstart' in window,
          };
        }

        if (opts.dpr) {
          Object.defineProperty(window, 'devicePixelRatio', {
            get: () => opts.dpr, configurable: true
          });
        }

        if (opts.ua) {
          Object.defineProperty(navigator, 'userAgent', {
            get: () => opts.ua, configurable: true
          });
        }

        if (opts.mobile) {
          Object.defineProperty(navigator, 'maxTouchPoints', {
            get: () => 5, configurable: true
          });
          if (!window.__safariMcpDeviceOriginals.hadOntouchstart) {
            window.ontouchstart = null;
          }
        }
      })({${overrides.join(', ')}})`);

      const label = params.device ?? `${width}×${height}`;
      const details = [
        `viewport: ${width}×${height}`,
        dpr ? `dpr: ${dpr}` : null,
        ua ? 'user agent: overridden (JS-level)' : null,
        mobile ? 'touch: enabled' : null,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Device emulation set to ${label} (${details}).`,
          },
        ],
      };
    },
  }),

  defineTool({
    name: 'reset_device_emulation',
    description:
      'Remove all device emulation overrides and restore the original ' +
      'viewport size, JS-level user agent, device pixel ratio, and touch settings.',
    slimDescription: 'Reset device emulation.',
    schema: {},
    handler: async (_params, driver) => {
      const result = await driver.runScript<{
        restored: boolean;
        windowWidth: number;
        windowHeight: number;
      }>(`(() => {
        const orig = window.__safariMcpDeviceOriginals;
        if (!orig) return { restored: false, windowWidth: 0, windowHeight: 0 };

        // Delete own property overrides to expose prototype originals
        const dprDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
        if (dprDesc && dprDesc.configurable) delete window.devicePixelRatio;

        const uaDesc = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
        if (uaDesc && uaDesc.configurable) delete navigator.userAgent;

        const touchDesc = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints');
        if (touchDesc && touchDesc.configurable) delete navigator.maxTouchPoints;

        // Only remove ontouchstart if we added it
        if (!orig.hadOntouchstart && 'ontouchstart' in window) {
          delete window.ontouchstart;
        }

        const ww = orig.windowWidth;
        const wh = orig.windowHeight;
        delete window.__safariMcpDeviceOriginals;

        return { restored: true, windowWidth: ww, windowHeight: wh };
      })()`);

      if (!result.restored) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No device emulation was active.',
            },
          ],
        };
      }

      // Restore original window size
      if (result.windowWidth && result.windowHeight) {
        await driver.resizePage(result.windowWidth, result.windowHeight);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: 'Device emulation reset. Viewport, DPR, UA, and touch settings restored.',
          },
        ],
      };
    },
  }),
];
