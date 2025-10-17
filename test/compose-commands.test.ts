import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerBaseCommands } from '../src/commands/base';

describe('Compose Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();

    // Register base commands for testing
    registerBaseCommands(manager);

    // Ensure listeners are attached for test environment
    manager.ensureListenersAttached();
  });

  describe('composeCommands()', () => {
    it('should create a composite command that executes multiple commands in sequence', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--composite-test" commandfor="target">Test</button>
        <div id="target">Content</div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLSpanElement;

      // Create a composite command that toggles and adds a class
      const compositeName = manager.composeCommands(
        ['--toggle', '--class:add:test-class'],
        { name: '--composite-test' }
      );

      expect(compositeName).toBe('--composite-test');

      // Execute the composite command by clicking the button
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that both commands executed
      expect(target.classList.contains('test-class')).toBe(true);
      expect(target.hasAttribute('hidden')).toBe(true); // toggle should hide it
    });

    it('should generate a default name when none provided', () => {
      const compositeName = manager.composeCommands(['--toggle', '--class:add:test']);
      expect(compositeName).toMatch(/^--composite-\d+$/);
    });

    it('should continue executing commands even if one fails when stopOnError is false', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--composite-test" commandfor="target">Test</button>
        <div id="target">Content</div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLSpanElement;

      // Register a failing command for testing
      manager.register('--failing-command', () => {
        throw new Error('Test error');
      });

      // Create a composite with a failing command in the middle
      const compositeName = manager.composeCommands(
        ['--class:add:first', '--failing-command', '--class:add:second'],
        { name: '--composite-test', stopOnError: false }
      );

      // Execute the composite command
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that commands before and after the error still executed
      expect(target.classList.contains('first')).toBe(true);
      expect(target.classList.contains('second')).toBe(true);
    });

    it('should stop executing commands when one fails and stopOnError is true', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--composite-test" commandfor="target">Test</button>
        <div id="target">Content</div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLSpanElement;

      // Register a failing command for testing
      manager.register('--failing-command', () => {
        throw new Error('Test error');
      });

      // Create a composite with a failing command in the middle
      const compositeName = manager.composeCommands(
        ['--class:add:first', '--failing-command', '--class:add:second'],
        { name: '--composite-test', stopOnError: true }
      );

      // Execute the composite command - should not execute the third command
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that only the first command executed (second failed, third didn't run)
      expect(target.classList.contains('first')).toBe(true);
      expect(target.classList.contains('second')).toBe(false);
    });

    it('should return empty string when given invalid input', () => {
      // Empty array
      expect(manager.composeCommands([])).toBe('');

      // Non-array input
      expect(manager.composeCommands(null as any)).toBe('');
    });

    it('should allow composing with commands that will be registered later', () => {
      const result = manager.composeCommands(['--nonexistent-command']);
      expect(result).toMatch(/^--composite-\d+$/);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle async commands properly', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--composite-test" commandfor="target">Test</button>
        <div id="target">Content</div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const target = document.getElementById('target') as HTMLSpanElement;

      // Register an async command for testing
      manager.register('--async-test', async (context) => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        context.targetElement?.classList.add('async-done');
      });

      const compositeName = manager.composeCommands(
        ['--toggle', '--async-test'],
        { name: '--composite-test' }
      );

      await manager.executeCommand(compositeName, 'target', button);

      expect(target.hasAttribute('hidden')).toBe(true);
      expect(target.classList.contains('async-done')).toBe(true);
    });
  });
});