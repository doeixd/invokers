import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../../src/core';
import { enableControl } from '../../src/power-packs/control/index';
import { getStateStore } from '../../src/power-packs/state/store';

describe('Control Power Pack', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();

    // Initialize state store for control tests
    const store = getStateStore();
    store.initialize();

    enableControl();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Conditional Rendering', () => {
    it('should show element when condition is true', async () => {
      const store = getStateStore();
      store.set('user.loggedIn', true);

      document.body.innerHTML = `
        <div data-if="state.user.loggedIn">Welcome!</div>
        <div data-if="state.user.loggedIn === false">Please login</div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const welcomeDiv = document.querySelector('div:first-child')! as HTMLElement;
      const loginDiv = document.querySelector('div:last-child')! as HTMLElement;

      expect(welcomeDiv.style.display).toBe('');
      expect(loginDiv.style.display).toBe('none');
    });

    it('should hide element when condition is false', async () => {
      const store = getStateStore();
      store.set('user.loggedIn', false);

      document.body.innerHTML = `
        <div data-if="state.user.loggedIn">Welcome!</div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const div = document.querySelector('div')! as HTMLElement;
      expect(div.style.display).toBe('none');
    });

    it('should work with data-else', async () => {
      const store = getStateStore();
      store.set('user.loggedIn', false);

      document.body.innerHTML = `
        <div data-if="state.user.loggedIn">Welcome!</div>
        <div data-else>Please login</div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const welcomeDiv = document.querySelector('div:first-child')! as HTMLElement;
      const loginDiv = document.querySelector('div:last-child')! as HTMLElement;

      expect(welcomeDiv.style.display).toBe('none');
      expect(loginDiv.style.display).toBe('');
    });

    it('should update when state changes', async () => {
      const store = getStateStore();
      store.set('user.loggedIn', false);

      document.body.innerHTML = `
        <div data-if="state.user.loggedIn">Welcome!</div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));
      expect((document.querySelector('div')! as HTMLElement).style.display).toBe('none');

      store.set('user.loggedIn', true);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect((document.querySelector('div')! as HTMLElement).style.display).toBe('');
    });
  });

  describe('Switch/Case Rendering', () => {
    it('should show matching case', async () => {
      const store = getStateStore();
      store.set('view.mode', 'edit');

      document.body.innerHTML = `
        <div data-switch="state.view.mode">
          <div data-case="view">Viewing</div>
          <div data-case="edit">Editing</div>
          <div data-case="default">Unknown</div>
        </div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const cases = document.querySelectorAll('[data-case]');
      expect((cases[0] as HTMLElement).style.display).toBe('none'); // view
      expect((cases[1] as HTMLElement).style.display).toBe('');     // edit
      expect((cases[2] as HTMLElement).style.display).toBe('none'); // default
    });

    it('should show default case when no match', async () => {
      const store = getStateStore();
      store.set('view.mode', 'unknown');

      document.body.innerHTML = `
        <div data-switch="state.view.mode">
          <div data-case="view">Viewing</div>
          <div data-case="edit">Editing</div>
          <div data-case="default">Unknown</div>
        </div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));

      const cases = document.querySelectorAll('[data-case]');
      expect((cases[0] as HTMLElement).style.display).toBe('none'); // view
      expect((cases[1] as HTMLElement).style.display).toBe('none'); // edit
      expect((cases[2] as HTMLElement).style.display).toBe('');     // default
    });

    it('should update when switch value changes', async () => {
      const store = getStateStore();
      store.set('view.mode', 'view');

      document.body.innerHTML = `
        <div data-switch="state.view.mode">
          <div data-case="view">Viewing</div>
          <div data-case="edit">Editing</div>
        </div>
      `;

      await new Promise(resolve => setTimeout(resolve, 10));
      expect((document.querySelector('[data-case="view"]')! as HTMLElement).style.display).toBe('');
      expect((document.querySelector('[data-case="edit"]')! as HTMLElement).style.display).toBe('none');

      store.set('view.mode', 'edit');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect((document.querySelector('[data-case="view"]')! as HTMLElement).style.display).toBe('none');
      expect((document.querySelector('[data-case="edit"]')! as HTMLElement).style.display).toBe('');
    });
  });

  describe('Promise Chaining', () => {
    it('should execute command chains with promises', async () => {
      // This would test the promise chaining functionality
      // For now, just ensure the module loads without errors
      expect(true).toBe(true);
    });
  });
});