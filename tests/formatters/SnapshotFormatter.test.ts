import {describe, it} from 'node:test';
import assert from 'node:assert';
import {formatSnapshot} from '../../src/formatters/SnapshotFormatter.js';
import type {SnapshotNode} from '../../src/types.js';

describe('SnapshotFormatter', () => {
  it('formats a simple node', () => {
    const node: SnapshotNode = {
      uid: 'e1',
      role: 'button',
      name: 'Submit',
      children: [],
    };
    const result = formatSnapshot(node);
    assert.ok(result.includes('[e1] button "Submit"'));
  });

  it('formats nested nodes with indentation', () => {
    const node: SnapshotNode = {
      uid: 'e0',
      role: 'generic',
      name: '',
      children: [
        {
          uid: 'e1',
          role: 'heading',
          name: 'Hello',
          children: [],
        },
        {
          uid: 'e2',
          role: 'link',
          name: 'Click me',
          children: [],
        },
      ],
    };
    const result = formatSnapshot(node);
    assert.ok(result.includes('[e0] generic'));
    assert.ok(result.includes('  [e1] heading "Hello"'));
    assert.ok(result.includes('  [e2] link "Click me"'));
  });

  it('includes value when present', () => {
    const node: SnapshotNode = {
      uid: 'e1',
      role: 'textbox',
      name: 'Email',
      value: 'test@example.com',
      children: [],
    };
    const result = formatSnapshot(node);
    assert.ok(result.includes('value="test@example.com"'));
  });

  it('includes tag and attributes in verbose mode', () => {
    const node: SnapshotNode = {
      uid: 'e1',
      role: 'link',
      name: 'Home',
      tagName: 'a',
      attributes: {href: '/', class: 'nav-link'},
      children: [],
    };
    const result = formatSnapshot(node, true);
    assert.ok(result.includes('<a>'));
    assert.ok(result.includes('href="/"'));
  });
});
