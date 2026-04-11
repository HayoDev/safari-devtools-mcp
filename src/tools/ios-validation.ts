/**
 * iOS Safari validation tools.
 *
 * Inspect viewport meta tags, safe-area insets, and PWA readiness —
 * the three things every iOS Safari developer has to fight with.
 */

import {defineTool} from './types.js';

// ---- Known iOS viewport issues ----

interface ViewportIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

function analyzeViewport(attrs: Record<string, string>): ViewportIssue[] {
  const issues: ViewportIssue[] = [];

  if (Object.keys(attrs).length === 0) {
    return [
      {
        severity: 'error',
        message:
          'No viewport meta tag found. iOS Safari will render at 980px width and scale down.',
      },
    ];
  }

  if (!attrs.width) {
    issues.push({
      severity: 'error',
      message:
        'Missing "width=device-width". Without this, Safari uses a default 980px layout width.',
    });
  } else if (attrs.width !== 'device-width') {
    issues.push({
      severity: 'warning',
      message: `width="${attrs.width}" — consider using "device-width" for responsive layouts.`,
    });
  }

  if (!attrs['initial-scale']) {
    issues.push({
      severity: 'warning',
      message:
        'Missing "initial-scale=1". Some iOS Safari versions may not zoom correctly without it.',
    });
  }

  if (attrs['user-scalable'] === 'no' || attrs['maximum-scale'] === '1') {
    issues.push({
      severity: 'error',
      message:
        'Zoom is disabled (user-scalable=no or maximum-scale=1). This is an accessibility violation (WCAG 1.4.4) and Safari 10+ ignores it anyway.',
    });
  }

  if (attrs['viewport-fit'] !== 'cover') {
    issues.push({
      severity: 'warning',
      message:
        'Missing "viewport-fit=cover". Required for safe-area-inset-* CSS env() values to work on notched devices (iPhone X+).',
    });
  }

  if (attrs['minimum-scale'] && parseFloat(attrs['minimum-scale']) < 1) {
    issues.push({
      severity: 'info',
      message: `minimum-scale=${attrs['minimum-scale']}. Values below 1 allow zoom-out on iOS, which can cause layout issues.`,
    });
  }

  return issues;
}

// ---- Tools ----

export const tools = [
  defineTool({
    name: 'inspect_viewport_meta',
    description:
      'Parse the viewport meta tag and validate it against iOS Safari ' +
      'best practices. Reports issues like missing width=device-width, ' +
      'disabled zoom (accessibility violation), missing viewport-fit=cover ' +
      'for safe areas, and other common misconfiguration.',
    slimDescription: 'Validate iOS viewport meta tag.',
    schema: {},
    handler: async (_params, driver) => {
      const result = await driver.runScript<{
        content: string | null;
        attrs: Record<string, string>;
      }>(`(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        if (!meta) return { content: null, attrs: {} };
        const content = meta.getAttribute('content') || '';
        const attrs = {};
        for (const part of content.split(',')) {
          const [key, val] = part.split('=').map(s => s.trim());
          if (key) attrs[key] = val || '';
        }
        return { content, attrs };
      })()`);

      const issues = analyzeViewport(result.attrs);

      const lines: string[] = [];
      if (result.content) {
        lines.push(`Viewport meta: ${result.content}`);
      } else {
        lines.push('⚠ No <meta name="viewport"> tag found.');
      }

      lines.push('');

      if (issues.length === 0) {
        lines.push(
          '✅ No issues found. Viewport is correctly configured for iOS Safari.',
        );
      } else {
        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');
        const infos = issues.filter(i => i.severity === 'info');

        if (errors.length > 0) {
          lines.push('Errors:');
          for (const i of errors) lines.push(`  ❌ ${i.message}`);
        }
        if (warnings.length > 0) {
          lines.push('Warnings:');
          for (const i of warnings) lines.push(`  ⚠ ${i.message}`);
        }
        if (infos.length > 0) {
          lines.push('Info:');
          for (const i of infos) lines.push(`  ℹ ${i.message}`);
        }
      }

      return {
        content: [{type: 'text' as const, text: lines.join('\n')}],
      };
    },
  }),

  defineTool({
    name: 'get_safe_area_insets',
    description:
      'Read the current CSS safe-area-inset values (top, right, bottom, left) ' +
      'as seen by the page. These are non-zero on notched iPhones when ' +
      'viewport-fit=cover is set. Also checks whether the page uses ' +
      'env(safe-area-inset-*) in its stylesheets.',
    slimDescription: 'Get iOS safe area inset values.',
    schema: {},
    handler: async (_params, driver) => {
      const result = await driver.runScript<{
        insets: {top: string; right: string; bottom: string; left: string};
        viewportFitCover: boolean;
        usedInCSS: boolean;
      }>(`(() => {
        // Read computed env() values via a probe element
        const probe = document.createElement('div');
        probe.style.cssText =
          'position:fixed;top:env(safe-area-inset-top,0px);' +
          'right:env(safe-area-inset-right,0px);' +
          'bottom:env(safe-area-inset-bottom,0px);' +
          'left:env(safe-area-inset-left,0px);' +
          'pointer-events:none;visibility:hidden;';
        document.body.appendChild(probe);
        const cs = getComputedStyle(probe);
        const insets = {
          top: cs.top, right: cs.right,
          bottom: cs.bottom, left: cs.left,
        };
        probe.remove();

        // Check viewport-fit=cover
        const meta = document.querySelector('meta[name="viewport"]');
        const viewportFitCover = meta
          ? (meta.getAttribute('content') || '').includes('viewport-fit=cover')
          : false;

        // Scan stylesheets for env(safe-area-inset usage
        let usedInCSS = false;
        try {
          for (const sheet of document.styleSheets) {
            try {
              const text = [...sheet.cssRules].map(r => r.cssText).join(' ');
              if (text.includes('safe-area-inset')) { usedInCSS = true; break; }
            } catch {}
          }
        } catch {}

        return { insets, viewportFitCover, usedInCSS };
      })()`);

      const lines: string[] = ['Safe area insets:'];
      lines.push(`  top: ${result.insets.top}`);
      lines.push(`  right: ${result.insets.right}`);
      lines.push(`  bottom: ${result.insets.bottom}`);
      lines.push(`  left: ${result.insets.left}`);
      lines.push('');

      if (!result.viewportFitCover) {
        lines.push(
          '⚠ viewport-fit=cover is NOT set. Safe area insets will always be 0 ' +
            'even on notched devices. Add viewport-fit=cover to your viewport meta tag.',
        );
      } else {
        lines.push('✅ viewport-fit=cover is set.');
      }

      lines.push(
        result.usedInCSS
          ? '✅ env(safe-area-inset-*) found in stylesheets.'
          : '⚠ env(safe-area-inset-*) not found in any stylesheet. Content may be obscured by the notch/home indicator.',
      );

      return {
        content: [{type: 'text' as const, text: lines.join('\n')}],
      };
    },
  }),

  defineTool({
    name: 'check_ios_web_app_readiness',
    description:
      'Audit the page for iOS Safari "Add to Home Screen" / PWA readiness. ' +
      'Checks apple-touch-icon, apple-mobile-web-app-capable, status bar style, ' +
      'theme-color, manifest link, and splash screen configuration.',
    slimDescription: 'Audit iOS PWA/home screen readiness.',
    schema: {},
    handler: async (_params, driver) => {
      const result = await driver.runScript<{
        capable: string | null;
        statusBarStyle: string | null;
        themeColor: string | null;
        manifestHref: string | null;
        touchIcons: {sizes: string; href: string}[];
        title: string;
        appleSplashScreens: number;
      }>(`(() => {
        const getMeta = (name) => {
          const el = document.querySelector('meta[name="' + name + '"]');
          return el ? el.getAttribute('content') : null;
        };
        const getLink = (rel) => {
          const el = document.querySelector('link[rel="' + rel + '"]');
          return el ? el.getAttribute('href') : null;
        };

        const touchIcons = [...document.querySelectorAll('link[rel="apple-touch-icon"]')].map(el => ({
          sizes: el.getAttribute('sizes') || 'unspecified',
          href: el.getAttribute('href') || '',
        }));

        const splashScreens = document.querySelectorAll('link[rel="apple-touch-startup-image"]').length;

        return {
          capable: getMeta('apple-mobile-web-app-capable'),
          statusBarStyle: getMeta('apple-mobile-web-app-status-bar-style'),
          themeColor: getMeta('theme-color'),
          manifestHref: getLink('manifest'),
          touchIcons,
          title: document.title,
          appleSplashScreens: splashScreens,
        };
      })()`);

      const checks: {pass: boolean; label: string; detail: string}[] = [];

      // apple-mobile-web-app-capable
      checks.push({
        pass: result.capable === 'yes',
        label: 'apple-mobile-web-app-capable',
        detail:
          result.capable === 'yes'
            ? 'Set to "yes" — app will run in standalone mode.'
            : 'Not set or not "yes". The app will open in Safari, not standalone.',
      });

      // apple-touch-icon
      const has180 = result.touchIcons.some(i => i.sizes === '180x180');
      checks.push({
        pass: result.touchIcons.length > 0,
        label: 'apple-touch-icon',
        detail:
          result.touchIcons.length > 0
            ? `${result.touchIcons.length} icon(s): ${result.touchIcons.map(i => i.sizes).join(', ')}` +
              (has180 ? '' : '. ⚠ Missing 180x180 (recommended for iPhone).')
            : 'No apple-touch-icon found. iOS will use a screenshot as the icon.',
      });

      // theme-color
      checks.push({
        pass: result.themeColor !== null,
        label: 'theme-color',
        detail:
          result.themeColor !== null
            ? `Set to "${result.themeColor}".`
            : 'Not set. Safari 15+ uses theme-color for the tab bar tint.',
      });

      // status bar style
      checks.push({
        pass: result.statusBarStyle !== null,
        label: 'apple-mobile-web-app-status-bar-style',
        detail:
          result.statusBarStyle !== null
            ? `Set to "${result.statusBarStyle}".`
            : 'Not set. Defaults to "default" (black text on white). Consider "black-translucent" for full-screen feel.',
      });

      // manifest
      checks.push({
        pass: result.manifestHref !== null,
        label: 'Web App Manifest',
        detail:
          result.manifestHref !== null
            ? `Found: ${result.manifestHref}`
            : 'No <link rel="manifest"> found. Required for PWA install prompts.',
      });

      // splash screens
      checks.push({
        pass: result.appleSplashScreens > 0,
        label: 'apple-touch-startup-image',
        detail:
          result.appleSplashScreens > 0
            ? `${result.appleSplashScreens} splash screen(s) defined.`
            : 'No splash screens. Users will see a white screen while the app loads.',
      });

      const passed = checks.filter(c => c.pass).length;
      const lines: string[] = [
        `iOS Web App Readiness: ${passed}/${checks.length} checks passed`,
        '',
      ];
      for (const c of checks) {
        lines.push(`${c.pass ? '✅' : '❌'} ${c.label}`);
        lines.push(`   ${c.detail}`);
      }

      return {
        content: [{type: 'text' as const, text: lines.join('\n')}],
      };
    },
  }),
];
