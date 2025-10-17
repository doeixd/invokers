import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerDataCommands } from '../src/commands/data';
import { enableAdvancedEvents } from '../src/advanced';

describe('Data Commands', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    registerDataCommands(invokerManager);
    enableAdvancedEvents(); // Enable interpolation for tests
  });

  describe('--data:set command', () => {
    it('should set data attribute on target element', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker);
      expect(target.dataset.testKey).toBe('testValue');
    });

    it('should dispatch custom event when data is set', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      document.body.appendChild(invoker);

      const eventListener = vi.fn();
      target.addEventListener('data:testKey', eventListener);

      await invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker);

       expect(eventListener).toHaveBeenCalledWith(
         expect.objectContaining({
           type: 'data:testKey',
           detail: { value: 'testKey:testValue' }
         })
       );
    });

    it('should interpolate expressions in data values', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.baseId = 'item';
      invoker.dataset.index = '42';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:combinedId:{{ this.dataset.baseId + "-" + this.dataset.index }}', 'target', invoker);
      expect(target.dataset.combinedId).toBe('item-42');
    });

    it('should interpolate with parent element data', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const parent = document.createElement('div');
      parent.dataset.itemId = '123';
      document.body.appendChild(parent);

      const invoker = document.createElement('button');
      parent.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:currentId:{{ this.parentElement.dataset.itemId }}', 'target', invoker);
      expect(target.dataset.currentId).toBe('123');
    });

    it('should handle data binding with data-bind-to and data-bind-as', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'data:boundValue';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:boundData', 'target', invoker);

      expect(target.dataset.testKey).toBe('boundData');
      expect(bindTarget.dataset.boundValue).toBe('boundData');
    });

    it('should dispatch events on bound elements', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'data:boundValue';
      document.body.appendChild(invoker);

      const bindEventListener = vi.fn();
      bindTarget.addEventListener('data:testKey', bindEventListener);

      await invokerManager.executeCommand('--data:set:testKey:boundData', 'target', invoker);

      expect(bindEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:testKey',
          detail: { value: 'testKey:boundData' }
        })
      );
    });

    it('should interpolate bindTo and bindAs attributes', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target-456';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target-{{ this.dataset.targetId }}';
      invoker.dataset.bindAs = 'data:{{ this.dataset.propName }}';
      invoker.dataset.targetId = '456';
      invoker.dataset.propName = 'customProp';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:interpolatedData', 'target', invoker);

      expect(bindTarget.dataset.customProp).toBe('interpolatedData');
    });

    it('should handle different bindAs types', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('input');
      bindTarget.id = 'bind-input';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-input';
      invoker.dataset.bindAs = 'value';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:inputValue', 'target', invoker);

      expect(bindTarget.value).toBe('inputValue');
    });

    it('should handle attr: bindAs type', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'attr:data-custom';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:attrValue', 'target', invoker);

      expect(bindTarget.getAttribute('data-custom')).toBe('attrValue');
    });

    it('should handle text bindAs type', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'text';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:textContent', 'target', invoker);

      expect(bindTarget.textContent).toBe('textContent');
    });

    it('should work with complex selectors in bindTo', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const container = document.createElement('div');
      container.className = 'container';
      document.body.appendChild(container);

      const bindTarget = document.createElement('div');
      bindTarget.className = 'bind-target';
      container.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '.container .bind-target';
      invoker.dataset.bindAs = 'data:boundData';
      document.body.appendChild(invoker);

      await invokerManager.executeCommand('--data:set:testKey:complexBound', 'target', invoker);

      expect(bindTarget.dataset.boundData).toBe('complexBound');
    });

    it('should handle missing bind targets gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#non-existent-target';
      invoker.dataset.bindAs = 'data:boundData';
      document.body.appendChild(invoker);

      // Should not throw, just skip binding
      await expect(invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker)).resolves.not.toThrow();
      expect(target.dataset.testKey).toBe('testValue');
    });

    it('should handle invalid bindAs gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const bindTarget = document.createElement('div');
      bindTarget.id = 'bind-target';
      document.body.appendChild(bindTarget);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#bind-target';
      invoker.dataset.bindAs = 'invalid:type';
      document.body.appendChild(invoker);

      // Should not throw, just skip setting
      await expect(invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker)).resolves.not.toThrow();
      expect(target.dataset.testKey).toBe('testValue');
      // bindTarget should not have any changes since bindAs is invalid
    });
  });

  describe('Event dispatching', () => {
    it('should dispatch events with correct detail format', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      document.body.appendChild(invoker);

      const eventListener = vi.fn();
      target.addEventListener('data:userAction', eventListener);

      await invokerManager.executeCommand('--data:set:userAction:login', 'target', invoker);

       expect(eventListener).toHaveBeenCalledWith(
         expect.objectContaining({
           type: 'data:userAction',
           detail: { value: 'userAction:login' },
           bubbles: true
         })
       );
    });

    it('should dispatch events even when binding fails', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const invoker = document.createElement('button');
      invoker.dataset.bindTo = '#non-existent';
      invoker.dataset.bindAs = 'data:test';
      document.body.appendChild(invoker);

      const eventListener = vi.fn();
      target.addEventListener('data:testKey', eventListener);

      await invokerManager.executeCommand('--data:set:testKey:testValue', 'target', invoker);

      expect(eventListener).toHaveBeenCalled();
      expect(target.dataset.testKey).toBe('testValue');
    });
  });

  describe('New Array Commands', () => {
    describe('--data:generate:array command', () => {
      it('should generate an array with index pattern', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.count = '3';
        invoker.dataset.pattern = 'index';
        invoker.dataset.start = '5';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:generate:array:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArray);
        expect(result).toEqual([5, 6, 7]);
      });

      it('should generate an array with random pattern', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.count = '2';
        invoker.dataset.pattern = 'random';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:generate:array:randomArray', 'target', invoker);

        const result = JSON.parse(target.dataset.randomArray);
        expect(result).toHaveLength(2);
        expect(typeof result[0]).toBe('number');
        expect(typeof result[1]).toBe('number');
      });

      it('should generate an array with object pattern', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.count = '2';
        invoker.dataset.pattern = 'object';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:generate:array:objectArray', 'target', invoker);

        const result = JSON.parse(target.dataset.objectArray);
        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('index', 0);
        expect(result[1]).toHaveProperty('index', 1);
      });

      it('should throw error for missing count', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        document.body.appendChild(invoker);

        await expect(invokerManager.executeCommand('--data:generate:array:testArray', 'target', invoker))
          .rejects.toThrow();
      });
    });

    describe('--data:index:get command', () => {
      it('should get item at specific index', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify(['a', 'b', 'c']);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.index = '1';
        invoker.dataset.resultKey = 'testArrayItem';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:index:get:testArray', 'target', invoker);

        expect(target.dataset.testArrayItem).toBe('"b"');
      });

      it('should throw error for out of bounds index', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify(['a', 'b']);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.index = '5';
        document.body.appendChild(invoker);

        await expect(invokerManager.executeCommand('--data:index:get:testArray', 'target', invoker))
          .rejects.toThrow();
      });
    });

    describe('--data:index:set command', () => {
      it('should set item at specific index', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify(['a', 'b', 'c']);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.index = '1';
        invoker.dataset.value = '"updated"';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:index:set:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArray);
        expect(result).toEqual(['a', 'updated', 'c']);
      });

      it('should throw error for invalid JSON value', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify(['a', 'b']);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.index = '0';
        invoker.dataset.value = 'invalid json';
        document.body.appendChild(invoker);

        await expect(invokerManager.executeCommand('--data:index:set:testArray', 'target', invoker))
          .rejects.toThrow();
      });
    });

    describe('--data:swap command', () => {
      it('should swap two items by index', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify(['first', 'second', 'third']);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.indexA = '0';
        invoker.dataset.indexB = '2';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:swap:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArray);
        expect(result).toEqual(['third', 'second', 'first']);
      });

      it('should throw error for out of bounds indices', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify(['a', 'b']);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.indexA = '0';
        invoker.dataset.indexB = '5';
        document.body.appendChild(invoker);

        await expect(invokerManager.executeCommand('--data:swap:testArray', 'target', invoker))
          .rejects.toThrow();
      });
    });

    describe('--data:slice command', () => {
      it('should create a slice of the array', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify([0, 1, 2, 3, 4]);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.start = '1';
        invoker.dataset.end = '4';
        invoker.dataset.resultKey = 'testArraySlice';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:slice:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArraySlice);
        expect(result).toEqual([1, 2, 3]);
      });

      it('should handle slice without end parameter', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify([0, 1, 2, 3, 4]);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.start = '2';
        invoker.dataset.resultKey = 'testArraySlice';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:slice:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArraySlice);
        expect(result).toEqual([2, 3, 4]);
      });
    });

    describe('--data:find command', () => {
      it('should find first item matching criteria', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify([
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false },
          { id: 3, name: 'Charlie', active: true }
        ]);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.findBy = 'active';
        invoker.dataset.findValue = 'true';
        invoker.dataset.resultKey = 'testArrayFound';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:find:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArrayFound);
        expect(result).toEqual({ id: 1, name: 'Alice', active: true });
      });

      it('should clear result key when item not found', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify([
          { id: 1, active: false },
          { id: 2, active: false }
        ]);
        target.dataset.testArrayFound = 'old value';
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.findBy = 'active';
        invoker.dataset.findValue = 'true';
        invoker.dataset.resultKey = 'testArrayFound';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:find:testArray', 'target', invoker);

        expect(target.dataset.testArrayFound).toBeUndefined();
      });
    });

    describe('--data:reverse command', () => {
      it('should reverse the array order', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify([1, 2, 3, 4]);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:reverse:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArray);
        expect(result).toEqual([4, 3, 2, 1]);
      });
    });

    describe('--data:concat command', () => {
      it('should concatenate multiple arrays', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.array1 = JSON.stringify([1, 2]);
        target.dataset.array2 = JSON.stringify([3, 4]);
        target.dataset.array3 = JSON.stringify([5]);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.sourceArrays = 'array1,array2,array3';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:concat:combined', 'target', invoker);

        const result = JSON.parse(target.dataset.combined);
        expect(result).toEqual([1, 2, 3, 4, 5]);
      });

      it('should handle missing arrays gracefully', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.array1 = JSON.stringify([1, 2]);
        // array2 is missing
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        invoker.dataset.sourceArrays = 'array1,array2';
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:concat:combined', 'target', invoker);

        const result = JSON.parse(target.dataset.combined);
        expect(result).toEqual([1, 2]); // array2 is treated as empty array
      });
    });

    describe('--data:clear command', () => {
      it('should clear the array', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        target.dataset.testArray = JSON.stringify([1, 2, 3]);
        document.body.appendChild(target);

        const invoker = document.createElement('button');
        document.body.appendChild(invoker);

        await invokerManager.executeCommand('--data:clear:testArray', 'target', invoker);

        const result = JSON.parse(target.dataset.testArray);
        expect(result).toEqual([]);
      });
    });
  });
});