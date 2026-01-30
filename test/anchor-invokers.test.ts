import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { enableAnchorInvokers } from '../src/anchors';
import { registerFetchCommands } from '../src/commands/fetch';

describe('Anchor Invokers', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    invokerManager.ensureListenersAttached();
  });

  it('infers fetch command and url from href', async () => {
    invokerManager.register('--fetch:get', ({ targetElement, invoker }) => {
      targetElement.textContent = invoker.dataset.url ?? '';
    });

    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('commandfor', '#target');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.textContent).toBe('/posts?page=2');
    expect(event.defaultPrevented).toBe(true);
  });

  it('uses explicit command when provided', async () => {
    invokerManager.register('--anchor:test', ({ targetElement }) => {
      targetElement.textContent = 'custom command';
    });

    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/ignored');
    anchor.setAttribute('command', '--anchor:test');
    anchor.setAttribute('commandfor', '#target');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.textContent).toBe('custom command');
    expect(event.defaultPrevented).toBe(true);
  });

  it('skips modified clicks and external targets', async () => {
    invokerManager.register('--fetch:get', ({ targetElement }) => {
      targetElement.textContent = 'should not run';
    });

    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('commandfor', '#target');
    anchor.setAttribute('target', '_blank');
    document.body.appendChild(anchor);

    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    anchor.dispatchEvent(modified);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(modified.defaultPrevented).toBe(false);
    expect(target.textContent).toBe('');

    const normal = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(normal);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(normal.defaultPrevented).toBe(false);
    expect(target.textContent).toBe('');
  });

  it('supports data-select with fetch responses', async () => {
    (global.fetch as any) = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Map(),
      text: () => Promise.resolve('<table><tbody id="tbody"><tr><td>Row</td></tr></tbody></table>')
    });

    registerFetchCommands(invokerManager);
    enableAnchorInvokers();

    const target = document.createElement('tbody');
    target.id = 'tbody';
    target.innerHTML = '<tr><td>Old</td></tr>';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('commandfor', '#tbody');
    anchor.setAttribute('data-select', '#tbody');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.innerHTML).toBe('<tbody id="tbody"><tr><td>Row</td></tr></tbody>');
  });

  it('supports data-select-all with fetch responses', async () => {
    (global.fetch as any) = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Map(),
      text: () => Promise.resolve('<div class="row">A</div><div class="row">B</div>')
    });

    registerFetchCommands(invokerManager);
    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('commandfor', '#target');
    anchor.setAttribute('data-select-all', '.row');
    anchor.setAttribute('data-replace-strategy', 'outerHTML');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.getElementById('target')).toBeNull();
    expect(document.querySelectorAll('.row')).toHaveLength(2);
  });

  it('does not prevent default for hash-only hrefs', async () => {
    invokerManager.register('--fetch:get', ({ targetElement }) => {
      targetElement.textContent = 'should not run';
    });

    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '#section');
    anchor.setAttribute('commandfor', '#target');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(event.defaultPrevented).toBe(false);
    expect(target.textContent).toBe('');
  });

  it('does not prevent default when no targets resolve', async () => {
    invokerManager.register('--fetch:get', ({ targetElement }) => {
      targetElement.textContent = 'should not run';
    });

    enableAnchorInvokers();

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('commandfor', '#missing');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(event.defaultPrevented).toBe(false);
  });

  it('deduplicates adapter registration and listeners', async () => {
    invokerManager.register('--fetch:get', ({ targetElement }) => {
      const count = Number(targetElement.dataset.count || '0') + 1;
      targetElement.dataset.count = String(count);
      targetElement.textContent = String(count);
    });

    enableAnchorInvokers();
    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('commandfor', '#target');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.textContent).toBe('1');
  });

  it('prefers data-url over href when both are set', async () => {
    invokerManager.register('--fetch:get', ({ targetElement, invoker }) => {
      targetElement.textContent = invoker.dataset.url ?? '';
    });

    enableAnchorInvokers();

    const target = document.createElement('div');
    target.id = 'target';
    document.body.appendChild(target);

    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/posts?page=2');
    anchor.setAttribute('data-url', '/posts?page=3');
    anchor.setAttribute('commandfor', '#target');
    document.body.appendChild(anchor);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.textContent).toBe('/posts?page=3');
  });
});
