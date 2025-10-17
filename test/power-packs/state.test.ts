import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../../src/core';
import { enableState, enableComputedProperties, enableDataBinding } from '../../src/power-packs/state/index';
import { getStateStore, resetStateStore } from '../../src/power-packs/state/store';

describe('State Power Pack', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();
    resetStateStore();
    enableState();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('State Store', () => {
    it('should initialize from JSON script', () => {
      document.body.innerHTML = `
        <script type="application/json" data-state="user">
          {"name": "John", "age": 30}
        </script>
      `;

      // Re-initialize to pick up the script
      const store = getStateStore();
      store.initialize();

      expect(store.get('user.name')).toBe('John');
      expect(store.get('user.age')).toBe(30);
    });

    it('should set and get values', () => {
      const store = getStateStore();
      store.set('test.value', 'hello');

      expect(store.get('test.value')).toBe('hello');
    });

    it('should notify subscribers on changes', async () => {
      const store = getStateStore();
      let notifiedValue: any = null;

      const unsubscribe = store.subscribe('test.value', (value) => {
        notifiedValue = value;
      });

      store.set('test.value', 'updated');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(notifiedValue).toBe('updated');
      unsubscribe();
    });
  });

  describe('State Commands', () => {
    it('should set state value with --state:set', async () => {
      document.body.innerHTML = `
        <button command="--state:set:user.name:Jane" commandfor="test">Set Name</button>
      `;

      const button = document.querySelector('button')!;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      const store = getStateStore();
      expect(store.get('user.name')).toBe('Jane');
    });

    it('should get state value with --state:get', async () => {
      const store = getStateStore();
      store.set('test.value', 'world');

      document.body.innerHTML = `
        <button command="--state:get:test.value" commandfor="#output">Get Value</button>
        <div id="output"></div>
      `;

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('world');
    });

    it('should push to state array with --state:array:push', async () => {
      const store = getStateStore();
      store.set('items', ['first']);

      document.body.innerHTML = `
        <button command="--state:array:push:items:second" commandfor="test">Push Item</button>
      `;

      const button = document.querySelector('button')!;
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.get('items')).toEqual(['first', 'second']);
    });
  });

  describe('Computed Properties', () => {
    it('should update computed property when dependency changes', async () => {
      document.body.innerHTML = `
        <data-let data-let="state.user.firstName + ' ' + state.user.lastName" data-target="#fullname"></data-let>
        <div id="fullname"></div>
      `;

      // Re-enable computed properties to pick up the new data-let element
      enableComputedProperties();

      const store = getStateStore();
      store.set('user.firstName', 'John');
      store.set('user.lastName', 'Doe');

      // Trigger reactivity
      await new Promise(resolve => setTimeout(resolve, 10));

      const output = document.querySelector('#fullname')!;
      expect(output.textContent).toBe('John Doe');
    });
  });

  describe('Data Binding', () => {
    it('should bind input to state', async () => {
      document.body.innerHTML = `
        <input data-bind="user.name" value="initial">
      `;

      // Re-enable data binding to pick up the new input element
      enableDataBinding();

      const store = getStateStore();
      const input = document.querySelector('input')!;

      // Initial value should be synced
      expect(store.get('user.name')).toBe('initial');

      // Change input and check state updates
      input.value = 'updated';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.get('user.name')).toBe('updated');
    });

    it('should update input when state changes', async () => {
      document.body.innerHTML = `
        <input data-bind="test.value">
      `;

      // Re-enable data binding to pick up the new input element
      enableDataBinding();

      const store = getStateStore();
      const input = document.querySelector('input')!;

      store.set('test.value', 'from state');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(input.value).toBe('from state');
    });
  });
});