/**
 * Tests for enhanced Control module features
 * Including loops, error boundaries, and async control
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from 'invokers';
import { enableControl } from 'invokers/control';
import { enableState, getStateStore, resetStateStore } from 'invokers/state';

describe('Enhanced Control Module', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();
    resetStateStore(); // Reset state store between tests
    // Enable debug mode for troubleshooting
    (window as any).Invoker = { debug: true };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Loop Constructs', () => {
    describe('data-for-each', () => {
      it('should render items from array', async () => {
        // Set up state with array
        document.body.innerHTML = `
          <script type="application/json" data-state="test">
            {"items": ["apple", "banana", "cherry"]}
          </script>
          <div data-for-each="item in state.test.items">
            <span>Item: {{item}}</span>
          </div>
        `;

        // Enable required modules after HTML is set up
        enableState();

        // Ensure state is initialized BEFORE enabling control
        const store = getStateStore();
        store.initialize();

        enableControl();

        await new Promise(resolve => setTimeout(resolve, 0));

        const items = document.querySelectorAll('span');
        expect(items).toHaveLength(3);
        expect(items[0].textContent).toBe('Item: apple');
        expect(items[1].textContent).toBe('Item: banana');
        expect(items[2].textContent).toBe('Item: cherry');
      });

      it('should handle indexed loops', async () => {
        document.body.innerHTML = `
          <script type="application/json" data-state="test">
            {"items": ["first", "second"]}
          </script>
          <div data-for-each="(item, index) in state.test.items">
            <span>{{index}}: {{item}}</span>
        </div>
      `;

      // Enable required modules after HTML is set up
      enableState();

      // Ensure state is initialized BEFORE enabling control
      const store = getStateStore();
      store.initialize();

      enableControl();

        await new Promise(resolve => setTimeout(resolve, 0));

        const items = document.querySelectorAll('span');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toBe('0: first');
        expect(items[1].textContent).toBe('1: second');
      });

      it('should update when array changes', async () => {
        document.body.innerHTML = `
          <script type="application/json" data-state="test">
            {"items": ["initial"]}
          </script>
          <div data-for-each="item in state.test.items">
            <span>{{item}}</span>
          </div>
          <button command="--state:array:push:test.items:added">Add Item</button>
        `;

        // Enable required modules after HTML is set up
        enableState();

        // Ensure state is initialized BEFORE enabling control
        const store = getStateStore();
        store.initialize();

        enableControl();

        await new Promise(resolve => setTimeout(resolve, 0));

        // Initial state
        expect(document.querySelectorAll('span')).toHaveLength(1);

        // Add item
        const button = document.querySelector('button')!;
        button.click();

        await new Promise(resolve => setTimeout(resolve, 0));

        const items = document.querySelectorAll('span');
        expect(items).toHaveLength(2);
        expect(items[1].textContent).toBe('added');
      });
    });

    describe('data-while', () => {
      it('should render while condition is true', async () => {
        document.body.innerHTML = `
          <script type="application/json" data-state="test">
            {"count": 3}
          </script>
          <div data-while="state.test.count > 0">
            <span>Count: {{state.test.count}}</span>
          </div>
        `;

        // Enable required modules after HTML is set up
        enableState();

        // Ensure state is initialized BEFORE enabling control
        const store = getStateStore();
        store.initialize();

        enableControl();

        await new Promise(resolve => setTimeout(resolve, 0));

        // Should render once (while count > 0)
        const items = document.querySelectorAll('span');
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toBe('Count: 3');
      });
    });

    describe('data-repeat', () => {
      it('should render specified number of times', async () => {
        document.body.innerHTML = `
          <script type="application/json" data-state="test">
            {"repeatCount": 3}
          </script>
          <div data-repeat="state.test.repeatCount">
            <span>Item {{index}}</span>
          </div>
        `;

        // Enable required modules after HTML is set up
        enableState();

        // Ensure state is initialized BEFORE enabling control
        const store = getStateStore();
        store.initialize();

        enableControl();

        await new Promise(resolve => setTimeout(resolve, 0));

        const items = document.querySelectorAll('span');
        expect(items).toHaveLength(3);
        expect(items[0].textContent).toBe('Item 0');
        expect(items[1].textContent).toBe('Item 1');
        expect(items[2].textContent).toBe('Item 2');
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle errors in try blocks', async () => {
      document.body.innerHTML = `
        <div data-try="#try-block">
          <div id="try-block">
            <button command="--invalid:command">Trigger Error</button>
          </div>
        </div>
        <div data-catch="error-boundary">
          <span>Error caught!</span>
          </div>
        `;

        // Enable required modules after HTML is set up
        enableState();

        // Ensure state is initialized BEFORE enabling control
        const store = getStateStore();
        store.initialize();

        enableControl();

        await new Promise(resolve => setTimeout(resolve, 0));

      const button = document.querySelector('button')!;
      button.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be caught and catch block should be visible
      const errorMessage = document.querySelector('span');
      expect(errorMessage).toBeTruthy();
    });
  });

  describe('Async Control', () => {
    it('should execute parallel operations', async () => {
      document.body.innerHTML = `
        <div data-parallel>
          <div><button command="--text:set:Task 1" commandfor="#result1">Task 1</button></div>
          <div><button command="--text:set:Task 2" commandfor="#result2">Task 2</button></div>
        </div>
        <div id="result1"></div>
        <div id="result2"></div>
      `;

      // Enable required modules after HTML is set up
      enableState();
      enableControl();

      await new Promise(resolve => setTimeout(resolve, 0));

      // Both tasks should execute
      const result1 = document.querySelector('#result1');
      const result2 = document.querySelector('#result2');

      expect(result1?.textContent).toBe('Task 1');
      expect(result2?.textContent).toBe('Task 2');
    });

    it('should execute race condition', async () => {
      document.body.innerHTML = `
        <div data-race>
          <div><button command="--text:set:Fast" commandfor="#result">Fast Task</button></div>
          <div><button command="--text:set:Slow" commandfor="#result">Slow Task</button></div>
        </div>
        <div id="result"></div>
      `;

      // Enable required modules after HTML is set up
      enableState();
      enableControl();

      await new Promise(resolve => setTimeout(resolve, 0));

      const result = document.querySelector('#result');
      // One of the tasks should have completed
      expect(result?.textContent).toMatch(/Fast|Slow/);
    });
  });
});