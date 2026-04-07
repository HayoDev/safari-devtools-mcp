# Accessibility Debugging with Safari DevTools MCP

Use this skill when auditing a page for accessibility issues in Safari.

## Quick audit workflow

1. Navigate to the target page:

   ```
   navigate_page url="https://example.com"
   ```

2. Take a verbose snapshot to see the full a11y tree:

   ```
   take_snapshot verbose=true
   ```

3. Review the snapshot for common issues:
   - Elements with `role="generic"` that should have semantic roles
   - Interactive elements (buttons, links) with empty names (`""`)
   - Images without descriptive names (missing alt text)
   - Form inputs without associated labels

4. For a more thorough automated audit, inject axe-core:

   ```
   evaluate_script function="async () => {
     const script = document.createElement('script');
     script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.0/axe.min.js';
     document.head.appendChild(script);
     await new Promise(r => script.onload = r);
     const results = await window.axe.run();
     return {
       violations: results.violations.map(v => ({
         id: v.id,
         impact: v.impact,
         description: v.description,
         nodes: v.nodes.length
       })),
       passes: results.passes.length,
       incomplete: results.incomplete.length
     };
   }"
   ```

5. Check specific element styles for contrast issues:
   ```
   get_computed_style uid="<element-uid>" properties=["color", "background-color", "font-size"]
   ```

## What to look for in the snapshot

- **Headings**: Should follow a logical hierarchy (h1 → h2 → h3).
  Check that roles include `heading` with proper nesting.
- **Links**: Every `link` role should have a descriptive name, not just
  "click here" or the raw URL.
- **Forms**: Every `textbox`, `combobox`, `checkbox` should have a name
  (label). Empty names mean missing labels.
- **Images**: `img` roles should have a meaningful name unless decorative.
- **Buttons**: `button` roles with empty names are keyboard-inaccessible.
- **Landmarks**: Look for `navigation`, `main`, `banner`, `contentinfo`
  roles. Pages without landmarks are harder to navigate with screen readers.

## Safari-specific a11y considerations

- Safari's VoiceOver is the primary screen reader on macOS. The a11y tree
  from `take_snapshot` closely mirrors what VoiceOver sees.
- Safari may map ARIA roles differently from Chrome in edge cases.
  Always test the snapshot output against expected roles.
- `role="generic"` is Safari's default for `<div>` and `<span>` — this
  is correct behavior, not an issue.
