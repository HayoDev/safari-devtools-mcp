/**
 * WebKit CSS compatibility checker.
 *
 * Runs inside a live Safari WebDriver session. Extracts CSS from the page
 * using structured DOM APIs (rule.style iteration — no regex, no false
 * positives on custom properties), then runs CSS.supports() in the actual
 * browser to report what is genuinely broken right now.
 */

import {defineTool} from './types.js';

/**
 * Behavioral quirks that CSS.supports() cannot detect — the property IS
 * "supported", it just renders incorrectly. Keep this list small, precise,
 * and each entry must be a confirmed Safari rendering bug.
 */
const BEHAVIORAL_QUIRKS: {
  property: string;
  matchValue?: string;
  message: string;
}[] = [
  {
    property: 'position',
    matchValue: 'sticky',
    message:
      'position:sticky silently fails inside an overflow:hidden or overflow:auto ' +
      'ancestor in Safari. Use overflow:clip on the ancestor instead.',
  },
];

export const tools = [
  defineTool({
    name: 'check_webkit_compatibility',
    description:
      'Check CSS on the current page against the live Safari session. ' +
      'Extracts every CSS property via structured DOM APIs, runs CSS.supports() ' +
      'in the actual browser, and reports what is broken right now — unsupported ' +
      'properties, missing -webkit- prefixes, and known Safari rendering quirks.',
    slimDescription: 'Check CSS against live Safari via CSS.supports().',
    schema: {},

    handler: async (_params, driver) => {
      // -----------------------------------------------------------------
      // Step 1: Extract structured CSS from the page + run CSS.supports()
      // in one round-trip. Uses rule.style iteration for canonical property
      // names — custom properties (--*) are excluded automatically.
      // -----------------------------------------------------------------
      const results = await driver.runScript<{
        totalProperties: number;
        unsupported: {property: string; value: string}[];
        needsPrefix: {property: string; value: string}[];
        computedProperties: Record<string, string>;
      }>(`(() => {
        // Collect unique property:value pairs from all accessible stylesheets
        const seen = new Map();

        function collectFromStyle(style) {
          for (const prop of style) {
            if (prop.startsWith('--')) continue;
            if (seen.has(prop)) continue;
            seen.set(prop, style.getPropertyValue(prop).trim());
          }
        }

        function processRules(rules) {
          for (const rule of rules) {
            // Skip @font-face — its descriptors (src, font-display, unicode-range)
            // are not CSS properties and CSS.supports() always returns false for them
            if (rule.constructor?.name === 'CSSFontFaceRule') continue;
            if (rule.style) collectFromStyle(rule.style);
            if (rule.cssRules) {
              try { processRules(rule.cssRules); } catch {}
            }
          }
        }

        for (const sheet of document.styleSheets) {
          try { processRules(sheet.cssRules); } catch {}
        }

        // Inline styles
        for (const el of document.querySelectorAll('[style]')) {
          collectFromStyle(el.style);
        }

        const totalProperties = seen.size;
        const unsupported = [];
        const needsPrefix = [];

        for (const [prop, value] of seen) {
          let supported = false;
          try { supported = CSS.supports(prop, value); } catch {}

          if (!supported) {
            // Try again with a generic value — the extracted value might be
            // a computed/resolved form CSS.supports doesn't accept
            try { supported = CSS.supports(prop, 'initial'); } catch {}
          }

          if (supported) continue;

          // Not supported unprefixed — check if -webkit- variant works
          const webkitProp = '-webkit-' + prop;
          let webkitSupported = false;
          try { webkitSupported = CSS.supports(webkitProp, value); } catch {}
          if (!webkitSupported) {
            try { webkitSupported = CSS.supports(webkitProp, 'initial'); } catch {}
          }

          if (webkitSupported) {
            needsPrefix.push({ property: prop, value });
          } else {
            unsupported.push({ property: prop, value });
          }
        }

        // Collect a subset of computed properties for behavioral quirk checks
        const body = document.body;
        const computedProperties = {};
        if (body) {
          const quirkProps = ${JSON.stringify(BEHAVIORAL_QUIRKS.map(q => q.property))};
          for (const prop of quirkProps) {
            if (seen.has(prop)) {
              computedProperties[prop] = seen.get(prop);
            }
          }
        }

        return { totalProperties, unsupported, needsPrefix, computedProperties };
      })()`);

      // -----------------------------------------------------------------
      // Step 2: Check behavioral quirks
      // -----------------------------------------------------------------
      const quirks: string[] = [];
      for (const quirk of BEHAVIORAL_QUIRKS) {
        const value = results.computedProperties[quirk.property];
        if (value === undefined) continue;
        if (quirk.matchValue && !value.includes(quirk.matchValue)) continue;
        quirks.push(quirk.message);
      }

      // -----------------------------------------------------------------
      // Step 3: Format output
      // -----------------------------------------------------------------
      const total =
        results.unsupported.length + results.needsPrefix.length + quirks.length;
      const lines: string[] = [];

      if (total === 0) {
        lines.push(
          `✅ No issues found. ${results.totalProperties} CSS properties checked via CSS.supports() in this Safari session.`,
        );
      } else {
        lines.push(
          `Found ${total} issue(s) — ${results.totalProperties} properties checked via CSS.supports() in this Safari session.`,
        );
        lines.push('');

        if (results.unsupported.length > 0) {
          lines.push(
            `❌ Unsupported in this Safari (${results.unsupported.length}):`,
          );
          for (const {property, value} of results.unsupported) {
            const preview =
              value.length > 60 ? value.slice(0, 57) + '...' : value;
            lines.push(`  ${property}: ${preview}`);
          }
          lines.push('');
        }

        if (results.needsPrefix.length > 0) {
          lines.push(
            `⚠ Needs -webkit- prefix (${results.needsPrefix.length}):`,
          );
          for (const {property} of results.needsPrefix) {
            lines.push(`  ${property} → use -webkit-${property} alongside it`);
          }
          lines.push('');
        }

        if (quirks.length > 0) {
          lines.push(`ℹ Known Safari rendering quirks (${quirks.length}):`);
          for (const msg of quirks) {
            lines.push(`  ${msg}`);
          }
        }
      }

      return {content: [{type: 'text' as const, text: lines.join('\n')}]};
    },
  }),
];
