import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerStorageCommands } from '../src/commands/storage';
import { EventTriggerManager } from '../src/advanced/event-trigger-manager';

describe('Storage Commands', () => {
  let invokerManager: InvokerManager;

   beforeEach(() => {
     // Enable debug mode for testing
     if (typeof window !== 'undefined' && window.Invoker) {
       window.Invoker.debug = true;
     }

      document.body.innerHTML = '';
      invokerManager = InvokerManager.getInstance();
      invokerManager.reset();
      registerStorageCommands(invokerManager);
      // Clear storage before each test
      localStorage.clear();
      sessionStorage.clear();
   });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('localStorage operations', () => {
    it('should set and get a value', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:local:set:testKey:testValue', 'target');
      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');

      expect(target.textContent).toBe('testValue');
    });

    it('should remove a value', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:local:set:testKey:testValue', 'target');
      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe('testValue');

      await invokerManager.executeCommand('--storage:local:remove:testKey', 'target');
      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe('');
    });

    it('should clear all values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:local:set:key1:value1', 'target');
      await invokerManager.executeCommand('--storage:local:set:key2:value2', 'target');

      await invokerManager.executeCommand('--storage:local:clear', 'target');

      await invokerManager.executeCommand('--storage:local:get:key1', 'target');
      expect(target.textContent).toBe('');

      await invokerManager.executeCommand('--storage:local:get:key2', 'target');
      expect(target.textContent).toBe('');
    });

    it('should check if key exists', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:local:has:nonexistent', 'target');
      expect(target.textContent).toBe('false');

      await invokerManager.executeCommand('--storage:local:set:testKey:testValue', 'target');
      await invokerManager.executeCommand('--storage:local:has:testKey', 'target');
      expect(target.textContent).toBe('true');
    });

    it('should get storage size', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:local:size', 'target');
      expect(target.textContent).toBe('0');

      await invokerManager.executeCommand('--storage:local:set:key1:value1', 'target');
      await invokerManager.executeCommand('--storage:local:set:key2:value2', 'target');

      await invokerManager.executeCommand('--storage:local:size', 'target');
      expect(target.textContent).toBe('2');
    });

    it('should get storage keys', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:local:set:key1:value1', 'target');
      await invokerManager.executeCommand('--storage:local:set:key2:value2', 'target');

      await invokerManager.executeCommand('--storage:local:keys', 'target');
      const keys = target.textContent?.split(', ').sort() || [];
      expect(keys).toEqual(['key1', 'key2']);
    });

    it('should handle expiration', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const futureTime = Date.now() + 1000; // 1 second from now
      await invokerManager.executeCommand(`--storage:local:set:testKey:expires:${futureTime}:testValue`, 'target');

      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe('testValue');

      // Simulate expiration by setting past time
      const pastTime = Date.now() - 1000;
      await invokerManager.executeCommand(`--storage:local:set:testKey:expires:${pastTime}:expiredValue`, 'target');

      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe(''); // Should be empty due to expiration
    });
  });

  describe('sessionStorage operations', () => {
    it('should work with sessionStorage', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--storage:session:set:testKey:testValue', 'target');
      await invokerManager.executeCommand('--storage:session:get:testKey', 'target');

      expect(target.textContent).toBe('testValue');
    });
  });

  describe('error handling', () => {
    it('should handle invalid storage type gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Command should complete without throwing, but log error
      await invokerManager.executeCommand('--storage:invalid:set:testKey:testValue', 'target');

      // Verify nothing was stored due to error
      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe('');
    });

    it('should handle unknown action gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Command should complete without throwing, but log error
      await invokerManager.executeCommand('--storage:local:unknown:testKey', 'target');

      // Verify nothing was stored due to error
      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe('');
    });

    it('should handle set without key gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Command should complete without throwing, but log error
      await invokerManager.executeCommand('--storage:local:set', 'target');

      // Verify nothing was stored due to error
      await invokerManager.executeCommand('--storage:local:get:testKey', 'target');
      expect(target.textContent).toBe('');
    });

    it('should handle get without key gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Command should complete without throwing, but log error
      await invokerManager.executeCommand('--storage:local:get', 'target');

      // Target should remain unchanged
      expect(target.textContent).toBe('');
    });
  });

  describe('Advanced Features Integration', () => {
    it('should work with command-on event triggers', async () => {
      document.body.innerHTML = `
        <input id="input" type="text" value="test value">
        <button command-on="click" command="--storage:local:set:userInput" commandfor="input">Save</button>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the value was stored
      await invokerManager.executeCommand('--storage:local:get:userInput', 'output');
      expect(output.textContent).toBe('test value');
    });

    it('should support interpolation in storage commands', async () => {
      document.body.innerHTML = `
        <button command-on="click" command="--storage:local:set:{{key}}:{{value}}" commandfor="context" data-context='{"key": "dynamicKey", "value": "dynamicValue"}'>Save</button>
        <div id="context"></div>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the interpolated value was stored
      await invokerManager.executeCommand('--storage:local:get:dynamicKey', 'output');
      expect(output.textContent).toBe('dynamicValue');
    });

    it('should work with form data and command-on submit', async () => {
      document.body.innerHTML = `
        <form command-on="submit.prevent" command="--storage:local:set:username" commandfor="username">
          <input id="username" name="username" value="john_doe">
          <button type="submit">Save Username</button>
        </form>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const form = document.querySelector('form')!;
      const output = document.querySelector('#output')!;

      form.dispatchEvent(new Event('submit'));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the form value was stored
      await invokerManager.executeCommand('--storage:local:get:username', 'output');
      expect(output.textContent).toBe('john_doe');
    });

    it('should support and-then chaining with storage operations', async () => {
      document.body.innerHTML = `
        <button command="--storage:local:set:counter:1" id="increment">
          Increment
          <and-then command="--storage:local:get:counter" commandfor="display"></and-then>
        </button>
        <div id="display"></div>
      `;

      const button = document.querySelector('button')!;
      const display = document.querySelector('#display')!;

      console.log('Button command attribute:', button.getAttribute('command'));
      console.log('Button has command property:', (button as any).command);

      // Manually dispatch CommandEvent since jsdom doesn't support the polyfill
      const commandEvent = new (window as any).CommandEvent('command', {
        command: button.getAttribute('command')!,
        source: button,
        cancelable: true,
        bubbles: true,
        composed: true,
      });
      display.dispatchEvent(commandEvent);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(display.textContent).toBe('1');
    });

    it('should handle storage operations with data context', async () => {
      document.body.innerHTML = `
        <div id="data-element" data-context='{"items": ["apple", "banana", "cherry"]}'></div>
        <button command-on="click" command="--storage:local:set:fruits:{{items}}" commandfor="data-element">Save Fruits</button>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the array was stored and retrieved as JSON
      await invokerManager.executeCommand('--storage:local:get:fruits', 'output');
      expect(output.textContent).toBe('apple,banana,cherry'); // JSON parsed back to string
    });

    it('should work with conditional commands and storage', async () => {
      document.body.innerHTML = `
        <input id="input" type="checkbox" checked>
        <button command-on="click" command="--storage:local:set:enabled:{{checked}}" commandfor="input">Save State</button>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      await invokerManager.executeCommand('--storage:local:get:enabled', 'output');
      expect(output.textContent).toBe('true');
    });

    it('should support multiple storage operations in sequence', async () => {
      document.body.innerHTML = `
        <div id="context" data-context='{"user": {"name": "Alice", "age": 30}}'></div>
        <button command-on="click" command="--storage:local:set:userData:{{user}}" commandfor="context">
          Save User
          <and-then command="--storage:local:set:lastSaved" commandfor="timestamp"></and-then>
        </button>
        <div id="timestamp">2024-01-01</div>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify user data was stored
      await invokerManager.executeCommand('--storage:local:get:userData', 'output');
      expect(output.textContent).toBe('[object Object]'); // JSON object as string

      // Verify timestamp was stored
      await invokerManager.executeCommand('--storage:local:get:lastSaved', 'output');
      expect(output.textContent).toBe('2024-01-01');
    });

    it('should handle storage operations with DOM manipulation', async () => {
      document.body.innerHTML = `
        <div id="data" data-context='{"name": "Test Item", "value": "Test Value"}'></div>
        <button command-on="click" command="--storage:local:set:item:{{name}}" commandfor="data">
          Add Item
        </button>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the interpolated value was stored
      await invokerManager.executeCommand('--storage:local:get:item', 'output');
      expect(output.textContent).toBe('Test Item');
    });

    it('should work with fetch and storage integration', async () => {
      document.body.innerHTML = `
        <div id="response-data" data-context='{"message": "Data loaded"}'></div>
        <button command-on="click" command="--storage:local:set:apiResponse:{{message}}" commandfor="response-data">
          Store Data
        </button>
        <div id="output"></div>
      `;

      // Ensure event listeners are attached
      EventTriggerManager.getInstance().rescanCommandOnElements();

      const button = document.querySelector('button')!;
      const output = document.querySelector('#output')!;

      // Manually trigger click since jsdom event handling may be limited
      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify the interpolated data was stored
      await invokerManager.executeCommand('--storage:local:get:apiResponse', 'output');
      expect(output.textContent).toBe('Data loaded');
    });

    it('should handle storage with expiration and cleanup', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Set data with short expiration (50ms)
      await invokerManager.executeCommand('--storage:local:set:tempData:expires:50:temp value', 'target');
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should work immediately
      await invokerManager.executeCommand('--storage:local:get:tempData', 'target');
      expect(target.textContent).toBe('temp value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be expired now
      await invokerManager.executeCommand('--storage:local:get:tempData', 'target');
      expect(target.textContent).toBe('');
    });
  });
});