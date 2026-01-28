import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/compatible';

describe('Core Commands', () => {
  let invokerManager: InvokerManager;

    beforeEach(() => {
      // Enable debug mode for testing
      if (typeof window !== 'undefined' && window.Invoker) {
        window.Invoker.debug = true;
      }

      document.body.innerHTML = '';
      invokerManager = InvokerManager.getInstance();
      // Note: Don't reset() when using compatible import - it clears pre-registered commands
    });

  describe('Text Commands', () => {
    it('should set text content', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--text:set:Hello World', 'target');
      expect(target.textContent).toBe('Hello World');
    });

    it('should append text content', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      target.textContent = 'Hello';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--text:append: World', 'target');
      expect(target.textContent).toBe('Hello World');
    });

    it('should prepend text content', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      target.textContent = 'World';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--text:prepend:Hello ', 'target');
      expect(target.textContent).toBe('Hello World');
    });

    it('should clear text content', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      target.textContent = 'Hello World';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--text:clear', 'target');
      expect(target.textContent).toBe('');
    });
  });

  describe('Attribute Commands', () => {
    it('should set attributes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--attr:set:data-value:123', 'target');
      expect(target.getAttribute('data-value')).toBe('123');
    });

    it('should remove attributes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      target.setAttribute('data-value', '123');
      document.body.appendChild(target);

      await invokerManager.executeCommand('--attr:remove:data-value', 'target');
      expect(target.hasAttribute('data-value')).toBe(false);
    });

    it('should toggle attributes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Toggle on
      await invokerManager.executeCommand('--attr:toggle:hidden:true', 'target');
      expect(target.hasAttribute('hidden')).toBe(true);
      expect(target.getAttribute('hidden')).toBe('true');

      // Toggle off
      await invokerManager.executeCommand('--attr:toggle:hidden:true', 'target');
      expect(target.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('Class Commands', () => {
    it('should add classes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--class:add:active', 'target');
      expect(target.classList.contains('active')).toBe(true);
    });

    it('should remove classes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      target.className = 'active';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--class:remove:active', 'target');
      expect(target.classList.contains('active')).toBe(false);
    });

    it('should toggle classes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Toggle on
      await invokerManager.executeCommand('--class:toggle:active', 'target');
      expect(target.classList.contains('active')).toBe(true);

      // Toggle off
      await invokerManager.executeCommand('--class:toggle:active', 'target');
      expect(target.classList.contains('active')).toBe(false);
    });
  });

  describe('Visibility Commands', () => {
    it('should show elements', async () => {
      const container = document.createElement('div');
      const target1 = document.createElement('div');
      target1.id = 'target1';
      target1.setAttribute('hidden', '');
      const target2 = document.createElement('div');
      target2.id = 'target2';
      
      container.appendChild(target1);
      container.appendChild(target2);
      document.body.appendChild(container);

      await invokerManager.executeCommand('--show', 'target1');
      expect(target1.hasAttribute('hidden')).toBe(false);
      expect(target2.hasAttribute('hidden')).toBe(true);
    });

    it('should hide elements', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--hide', 'target');
      expect(target.hasAttribute('hidden')).toBe(true);
    });

    it('should toggle visibility', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Toggle hidden
      await invokerManager.executeCommand('--toggle', 'target');
      expect(target.hasAttribute('hidden')).toBe(true);

      // Toggle visible
      await invokerManager.executeCommand('--toggle', 'target');
      expect(target.hasAttribute('hidden')).toBe(false);
    });

    it('should not double-trigger toggle on a single click', async () => {
      document.body.innerHTML = `
        <button type="button" command="--toggle" commandfor="panel" aria-expanded="true">Toggle panel</button>
        <div id="panel"></div>
      `;

      const toggleButton = document.querySelector('button') as HTMLButtonElement;
      const panel = document.getElementById('panel') as HTMLElement;

      invokerManager.ensureListenersAttached();

      toggleButton.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(panel.hasAttribute('hidden')).toBe(true);
    });
  });
});
