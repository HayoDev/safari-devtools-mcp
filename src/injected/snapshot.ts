/**
 * Injectable script for taking DOM snapshots with UIDs.
 *
 * Walks the DOM tree and builds an accessibility-like representation.
 * Each element gets a stable data-safari-uid attribute for targeting
 * by other tools (click, fill, screenshot, etc).
 */

export const SNAPSHOT_SCRIPT = `
function __safariDevToolsTakeSnapshot(verbose) {
  var uidCounter = 0;

  function getRole(el) {
    // Explicit ARIA role
    var role = el.getAttribute && el.getAttribute('role');
    if (role) return role;

    // Implicit role mapping
    var tag = el.tagName.toLowerCase();
    var roleMap = {
      'a': 'link',
      'button': 'button',
      'input': getInputRole(el),
      'select': 'combobox',
      'textarea': 'textbox',
      'img': 'img',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary',
      'form': 'form',
      'table': 'table',
      'thead': 'rowgroup',
      'tbody': 'rowgroup',
      'tr': 'row',
      'th': 'columnheader',
      'td': 'cell',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem',
      'dialog': 'dialog',
      'details': 'group',
      'summary': 'button',
      'progress': 'progressbar',
      'meter': 'meter',
      'option': 'option',
      'section': 'region',
      'article': 'article',
      'video': 'video',
      'audio': 'audio',
      'iframe': 'document',
      'label': 'label',
      'fieldset': 'group',
      'legend': 'legend'
    };
    return roleMap[tag] || 'generic';
  }

  function getInputRole(el) {
    var type = (el.getAttribute('type') || 'text').toLowerCase();
    var map = {
      'text': 'textbox',
      'email': 'textbox',
      'password': 'textbox',
      'search': 'searchbox',
      'tel': 'textbox',
      'url': 'textbox',
      'number': 'spinbutton',
      'range': 'slider',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'submit': 'button',
      'button': 'button',
      'reset': 'button',
      'file': 'button',
      'image': 'button',
      'hidden': 'none'
    };
    return map[type] || 'textbox';
  }

  function getName(el) {
    // aria-label
    var label = el.getAttribute && el.getAttribute('aria-label');
    if (label) return label;

    // aria-labelledby
    var labelledBy = el.getAttribute && el.getAttribute('aria-labelledby');
    if (labelledBy) {
      var labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent.trim();
    }

    // <label> for inputs
    if (el.id) {
      var labelFor = document.querySelector('label[for="' + el.id + '"]');
      if (labelFor) return labelFor.textContent.trim();
    }

    // alt text for images
    if (el.tagName === 'IMG') return el.getAttribute('alt') || '';

    // placeholder for inputs
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      return el.getAttribute('placeholder') || '';
    }

    // title attribute
    var title = el.getAttribute && el.getAttribute('title');
    if (title) return title;

    // Direct text content (only for leaf-ish elements)
    var childElements = el.children ? el.children.length : 0;
    if (childElements === 0 && el.textContent) {
      var text = el.textContent.trim();
      if (text.length <= 100) return text;
      return text.substring(0, 97) + '...';
    }

    return '';
  }

  function getValue(el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      return el.value || '';
    }
    if (el.getAttribute && el.getAttribute('aria-valuenow')) {
      return el.getAttribute('aria-valuenow');
    }
    return undefined;
  }

  function isVisible(el) {
    if (!el.getBoundingClientRect) return true;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
    return true;
  }

  function shouldSkip(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'br' || tag === 'wbr') return true;
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
    return false;
  }

  function walkNode(el, depth) {
    if (!el || !el.tagName) return null;
    if (shouldSkip(el)) return null;
    if (!isVisible(el)) return null;

    var uid = 'e' + (uidCounter++);
    el.setAttribute('data-safari-uid', uid);

    var role = getRole(el);
    var name = getName(el);
    var value = getValue(el);

    var node = {
      uid: uid,
      role: role,
      name: name
    };

    if (value !== undefined && value !== '') node.value = value;

    if (verbose) {
      node.tagName = el.tagName.toLowerCase();
      var attrs = {};
      if (el.id) attrs.id = el.id;
      if (el.className && typeof el.className === 'string') attrs.class = el.className;
      if (el.getAttribute('href')) attrs.href = el.getAttribute('href');
      if (el.getAttribute('src')) attrs.src = el.getAttribute('src');
      if (el.getAttribute('type')) attrs.type = el.getAttribute('type');
      if (el.getAttribute('name')) attrs.name = el.getAttribute('name');
      if (el.getAttribute('disabled') !== null) attrs.disabled = 'true';
      if (el.getAttribute('checked') !== null) attrs.checked = 'true';
      if (el.getAttribute('aria-expanded')) attrs['aria-expanded'] = el.getAttribute('aria-expanded');
      if (el.getAttribute('aria-selected')) attrs['aria-selected'] = el.getAttribute('aria-selected');
      if (el.getAttribute('aria-pressed')) attrs['aria-pressed'] = el.getAttribute('aria-pressed');
      if (Object.keys(attrs).length > 0) node.attributes = attrs;
    }

    // Walk children
    var children = [];
    for (var i = 0; i < el.children.length; i++) {
      var childNode = walkNode(el.children[i], depth + 1);
      if (childNode) children.push(childNode);
    }
    node.children = children;

    // Skip generic nodes with no name, no value, and exactly one child (flatten)
    if (role === 'generic' && !name && !value && children.length === 1 && !verbose) {
      return children[0];
    }

    return node;
  }

  return walkNode(document.body || document.documentElement, 0) || {
    uid: 'root',
    role: 'document',
    name: document.title || '',
    children: []
  };
}
`;
