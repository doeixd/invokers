import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/index';
import { InvokerManager } from '../src/core';
import { registerAll } from '../src/invoker-commands';

describe('--on:interval', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    if (typeof window !== 'undefined') {
      window.Invoker = window.Invoker || {};
      window.Invoker.debug = false;
    }
    registerAll(['--on:interval']);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute interval command repeatedly', async () => {
    vi.useFakeTimers();

    const target = document.createElement('div');
    target.id = 'tick-target';
    document.body.appendChild(target);

    const invoker = document.createElement('button');
    invoker.dataset.intervalCommand = '--test:tick';
    document.body.appendChild(invoker);

    invokerManager.register('--test:tick', ({ targetElement }) => {
      targetElement.textContent = `${targetElement.textContent || ''}x`;
    });

    await invokerManager.executeCommand('--on:interval:10', 'tick-target', invoker);

    await vi.advanceTimersByTimeAsync(35);

    expect(target.textContent).toBe('xxx');
  });

  it('should stop interval when invoker is removed', async () => {
    vi.useFakeTimers();

    const target = document.createElement('div');
    target.id = 'tick-stop-target';
    document.body.appendChild(target);

    const invoker = document.createElement('button');
    invoker.dataset.intervalCommand = '--test:tick-stop';
    document.body.appendChild(invoker);

    invokerManager.register('--test:tick-stop', ({ targetElement }) => {
      targetElement.textContent = `${targetElement.textContent || ''}x`;
    });

    await invokerManager.executeCommand('--on:interval:10', 'tick-stop-target', invoker);

    await vi.advanceTimersByTimeAsync(20);
    expect(target.textContent).toBe('xx');

    invoker.remove();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(30);

    expect(target.textContent).toBe('xx');
  });

  it('should throw when data-interval-command is missing', async () => {
    const target = document.createElement('div');
    target.id = 'missing-interval-target';
    document.body.appendChild(target);

    const invoker = document.createElement('button');
    document.body.appendChild(invoker);

    await expect(
      invokerManager.executeCommand('--on:interval:10', 'missing-interval-target', invoker)
    ).rejects.toThrow('Interval command requires data-interval-command attribute');
  });

  it('should throw when interval is invalid', async () => {
    const target = document.createElement('div');
    target.id = 'invalid-interval-target';
    document.body.appendChild(target);

    const invoker = document.createElement('button');
    invoker.dataset.intervalCommand = '--test:tick-invalid';
    document.body.appendChild(invoker);

    await expect(
      invokerManager.executeCommand('--on:interval:0', 'invalid-interval-target', invoker)
    ).rejects.toThrow('Interval command requires a valid positive interval in milliseconds');

    await expect(
      invokerManager.executeCommand('--on:interval:not-a-number', 'invalid-interval-target', invoker)
    ).rejects.toThrow('Interval command requires a valid positive interval in milliseconds');
  });

  it('should clear existing intervals when re-executed', async () => {
    vi.useFakeTimers();

    const target = document.createElement('div');
    target.id = 'repeat-interval-target';
    document.body.appendChild(target);

    const invoker = document.createElement('button');
    invoker.dataset.intervalCommand = '--test:tick-repeat';
    document.body.appendChild(invoker);

    invokerManager.register('--test:tick-repeat', ({ targetElement }) => {
      targetElement.textContent = `${targetElement.textContent || ''}x`;
    });

    await invokerManager.executeCommand('--on:interval:10', 'repeat-interval-target', invoker);
    await invokerManager.executeCommand('--on:interval:10', 'repeat-interval-target', invoker);

    await vi.advanceTimersByTimeAsync(35);

    expect(target.textContent).toBe('xxx');
  });
});
