/**
 * WebKit CSS compatibility checker.
 *
 * Scans stylesheets for known WebKit/Safari CSS issues:
 *  - Properties that need -webkit- prefix in Safari
 *  - Known WebKit rendering bugs with workarounds
 *  - Deprecated -webkit- properties that should be removed
 *  - Properties with different behavior in WebKit vs other engines
 */

import {z} from 'zod';
import {defineTool} from './types.js';

// Properties that still need -webkit- prefix in current Safari
const NEEDS_PREFIX: Record<string, string> = {
  'backdrop-filter':
    'Safari requires -webkit-backdrop-filter. Unprefixed is supported only in Safari 18+.',
  'text-decoration-skip-ink':
    'Safari <18 needs -webkit-text-decoration-skip-ink.',
  'line-clamp':
    'Use -webkit-line-clamp with display: -webkit-box and -webkit-box-orient: vertical.',
  'initial-letter': 'Safari requires -webkit-initial-letter.',
  'text-stroke': 'Non-standard. Use -webkit-text-stroke (Safari-only feature).',
  'background-clip: text':
    'Safari requires -webkit-background-clip: text for text clipping.',
  'touch-callout':
    'iOS-only. Use -webkit-touch-callout: none to disable long-press popups.',
  'overflow-scrolling':
    'Use -webkit-overflow-scrolling: touch for momentum scrolling on iOS <15.',
};

// Known WebKit CSS bugs and quirks
const KNOWN_QUIRKS: {pattern: string; message: string}[] = [
  {
    pattern: 'gap',
    message:
      'Flexbox "gap" is unsupported in Safari <14.1. Use margin-based spacing as fallback.',
  },
  {
    pattern: 'position:\\s*sticky',
    message:
      'position:sticky inside overflow:hidden parents is broken in Safari. The sticky element will not stick.',
  },
  {
    pattern: 'aspect-ratio',
    message:
      'aspect-ratio is unsupported in Safari <15. Use the padding-bottom hack as fallback.',
  },
  {
    pattern: ':has\\(',
    message:
      ':has() is supported in Safari 15.4+ but has performance edge cases with large DOM trees.',
  },
  {
    pattern: 'container-type|@container',
    message:
      'Container queries require Safari 16+. No support in older iOS versions still in use.',
  },
  {
    pattern: 'color-mix\\(',
    message: 'color-mix() requires Safari 16.2+.',
  },
  {
    pattern: '@layer',
    message: '@layer (cascade layers) requires Safari 15.4+.',
  },
  {
    pattern: 'subgrid',
    message: 'subgrid requires Safari 16+.',
  },
  {
    pattern: ':focus-visible',
    message:
      ':focus-visible requires Safari 15.4+. Older versions need :focus fallback.',
  },
  {
    pattern: 'overscroll-behavior',
    message: 'overscroll-behavior requires Safari 16+. No effect on older iOS.',
  },
  {
    pattern: 'dvh|svh|lvh',
    message:
      'Dynamic viewport units (dvh/svh/lvh) require Safari 15.4+. Use vh with JS fallback for older iOS.',
  },
  {
    pattern: 'content-visibility',
    message:
      'content-visibility requires Safari 18+. Not supported in most iOS versions in the wild.',
  },
];

// Deprecated -webkit- prefixes that can be removed
const DEPRECATED_PREFIXES = [
  {
    prefix: '-webkit-border-radius',
    standard: 'border-radius',
    message: 'Unprefixed since Safari 5. Remove -webkit- prefix.',
  },
  {
    prefix: '-webkit-box-shadow',
    standard: 'box-shadow',
    message: 'Unprefixed since Safari 5.1. Remove -webkit- prefix.',
  },
  {
    prefix: '-webkit-transform',
    standard: 'transform',
    message: 'Unprefixed since Safari 9. Remove -webkit- prefix.',
  },
  {
    prefix: '-webkit-transition',
    standard: 'transition',
    message: 'Unprefixed since Safari 9. Remove -webkit- prefix.',
  },
  {
    prefix: '-webkit-animation',
    standard: 'animation',
    message: 'Unprefixed since Safari 9. Remove -webkit- prefix.',
  },
  {
    prefix: '-webkit-flex',
    standard: 'flex',
    message:
      'Unprefixed since Safari 9. Remove -webkit-flex and -webkit-box-flex.',
  },
  {
    prefix: '-webkit-appearance',
    standard: 'appearance',
    message:
      'Unprefixed since Safari 15.4. Keep prefix only if supporting older iOS.',
  },
  {
    prefix: '-webkit-user-select',
    standard: 'user-select',
    message:
      'Unprefixed since Safari 16.4. Keep prefix only if supporting older iOS.',
  },
];

export const tools = [
  defineTool({
    name: 'check_webkit_compatibility',
    description:
      'Scan all stylesheets on the current page for WebKit/Safari CSS ' +
      'compatibility issues. Reports: properties that need -webkit- prefix, ' +
      'known WebKit rendering bugs, deprecated prefixes to clean up, and ' +
      'modern CSS features with limited Safari support.',
    slimDescription: 'Scan CSS for Safari compatibility issues.',
    schema: {
      selector: z
        .string()
        .optional()
        .describe(
          'Optional CSS selector to scope the check to styles affecting a specific element.',
        ),
    },
    handler: async (_params, driver) => {
      // Collect all CSS text from stylesheets
      const cssText = await driver.runScript<string>(`(() => {
        const texts = [];
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              texts.push(rule.cssText);
            }
          } catch {}
        }
        // Also check inline styles in style attributes
        for (const el of document.querySelectorAll('[style]')) {
          texts.push(el.getAttribute('style') || '');
        }
        return texts.join('\\n');
      })()`);

      if (!cssText || cssText.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No accessible stylesheets found. Cross-origin stylesheets cannot be inspected.',
            },
          ],
        };
      }

      const findings: {
        category: string;
        severity: 'error' | 'warning' | 'info';
        message: string;
      }[] = [];

      // Check for properties needing -webkit- prefix
      for (const [prop, message] of Object.entries(NEEDS_PREFIX)) {
        const propPattern = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Check if unprefixed is used without -webkit- version
        if (
          new RegExp(`(?<!-webkit-)${propPattern}`, 'i').test(cssText) &&
          !new RegExp(`-webkit-${propPattern}`, 'i').test(cssText)
        ) {
          findings.push({
            category: 'Missing prefix',
            severity: 'warning',
            message: `${prop}: ${message}`,
          });
        }
      }

      // Check for known WebKit quirks
      for (const quirk of KNOWN_QUIRKS) {
        if (new RegExp(quirk.pattern, 'i').test(cssText)) {
          findings.push({
            category: 'Compatibility',
            severity: 'info',
            message: quirk.message,
          });
        }
      }

      // Check for deprecated -webkit- prefixes
      for (const dep of DEPRECATED_PREFIXES) {
        if (cssText.includes(dep.prefix)) {
          findings.push({
            category: 'Deprecated prefix',
            severity: 'info',
            message: `${dep.prefix} → ${dep.standard}: ${dep.message}`,
          });
        }
      }

      // Build output
      const lines: string[] = [];
      if (findings.length === 0) {
        lines.push(
          '✅ No WebKit CSS compatibility issues found in accessible stylesheets.',
        );
      } else {
        const warnings = findings.filter(f => f.severity === 'warning');
        const infos = findings.filter(f => f.severity === 'info');

        lines.push(
          `Found ${findings.length} issue(s) across accessible stylesheets:`,
        );
        lines.push('');

        if (warnings.length > 0) {
          lines.push(`⚠ Action needed (${warnings.length}):`);
          for (const f of warnings) {
            lines.push(`  [${f.category}] ${f.message}`);
          }
          lines.push('');
        }

        if (infos.length > 0) {
          lines.push(`ℹ Informational (${infos.length}):`);
          for (const f of infos) {
            lines.push(`  [${f.category}] ${f.message}`);
          }
        }
      }

      return {
        content: [{type: 'text' as const, text: lines.join('\n')}],
      };
    },
  }),
];
