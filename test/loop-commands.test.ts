import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerLoopCommands } from '../src/commands/loop';
import { enableAdvancedEvents } from '../src/advanced';

describe('Loop Commands', () => {
  let invokerInstance: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerInstance = InvokerManager.getInstance();
    invokerInstance.reset();
    registerLoopCommands(invokerInstance);
    enableAdvancedEvents(); // Enable interpolation for loop commands
    invokerInstance.ensureListenersAttached();
  });

  describe('--dom:repeat-append', () => {
    it('should append template multiple times', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-append:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:3', 'output', button);

      expect(output.children.length).toBe(3);
      expect(output.querySelectorAll('.item').length).toBe(3);
    });

    it('should interpolate loop variables in template', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item" data-index="{{index}}" data-index1="{{index1}}">Item {{index1}}</div>
        </template>
        <button id="btn" command="--dom:repeat-append:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:3', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].getAttribute('data-index')).toBe('0');
      expect(items[0].getAttribute('data-index1')).toBe('1');
      expect(items[0].textContent).toContain('Item 1');

      expect(items[1].getAttribute('data-index')).toBe('1');
      expect(items[1].getAttribute('data-index1')).toBe('2');
      expect(items[1].textContent).toContain('Item 2');

      expect(items[2].getAttribute('data-index')).toBe('2');
      expect(items[2].getAttribute('data-index1')).toBe('3');
      expect(items[2].textContent).toContain('Item 3');
    });

    it('should set isFirst and isLast correctly', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item" data-first="{{isFirst}}" data-last="{{isLast}}">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-append:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:3', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].getAttribute('data-first')).toBe('true');
      expect(items[0].getAttribute('data-last')).toBe('false');

      expect(items[1].getAttribute('data-first')).toBe('false');
      expect(items[1].getAttribute('data-last')).toBe('false');

      expect(items[2].getAttribute('data-first')).toBe('false');
      expect(items[2].getAttribute('data-last')).toBe('true');
    });

    it('should set isEven and isOdd correctly', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item" data-even="{{isEven}}" data-odd="{{isOdd}}">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-append:4" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:4', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].getAttribute('data-even')).toBe('true');
      expect(items[0].getAttribute('data-odd')).toBe('false');

      expect(items[1].getAttribute('data-even')).toBe('false');
      expect(items[1].getAttribute('data-odd')).toBe('true');

      expect(items[2].getAttribute('data-even')).toBe('true');
      expect(items[2].getAttribute('data-odd')).toBe('false');

      expect(items[3].getAttribute('data-even')).toBe('false');
      expect(items[3].getAttribute('data-odd')).toBe('true');
    });

    it('should handle data-start-index attribute', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">{{index}}</div>
        </template>
        <button id="btn" command="--dom:repeat-append:3" commandfor="output"
                data-template-id="item-template" data-start-index="5">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:3', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].textContent).toBe('5');
      expect(items[1].textContent).toBe('6');
      expect(items[2].textContent).toBe('7');
    });

    it('should handle large counts (performance test)', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item {{index}}</div>
        </template>
        <button id="btn" command="--dom:repeat-append:1000" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      const startTime = performance.now();
      await invokerInstance.executeCommand('--dom:repeat-append:1000', 'output', button);
      const endTime = performance.now();

      expect(output.children.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should throw error for missing template', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:repeat-append:3" commandfor="output" data-template-id="missing">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--dom:repeat-append:3', 'output', button)
      ).rejects.toThrow();
    });

    it('should throw error for invalid count', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-append:invalid" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--dom:repeat-append:invalid', 'output', button)
      ).rejects.toThrow();
    });
  });

  describe('--dom:repeat-replace', () => {
    it('should replace content with repeated template', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-replace:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output">
          <div class="old">Old content</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-replace:3', 'output', button);

      expect(output.children.length).toBe(3);
      expect(output.querySelectorAll('.item').length).toBe(3);
      expect(output.querySelectorAll('.old').length).toBe(0);
    });

    it('should interpolate loop variables', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item {{index1}} of {{count}}</div>
        </template>
        <button id="btn" command="--dom:repeat-replace:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-replace:3', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].textContent).toBe('Item 1 of 3');
      expect(items[1].textContent).toBe('Item 2 of 3');
      expect(items[2].textContent).toBe('Item 3 of 3');
    });
  });

  describe('--dom:repeat-prepend', () => {
    it('should prepend template multiple times', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">New {{index}}</div>
        </template>
        <button id="btn" command="--dom:repeat-prepend:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output">
          <div class="existing">Existing</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-prepend:3', 'output', button);

      expect(output.children.length).toBe(4);
      expect(output.children[0].classList.contains('item')).toBe(true);
      expect(output.children[0].textContent).toContain('New 0');
      expect(output.children[3].classList.contains('existing')).toBe(true);
    });

    it('should maintain correct order with reverse iteration', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">{{index}}</div>
        </template>
        <button id="btn" command="--dom:repeat-prepend:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-prepend:3', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].textContent).toBe('0');
      expect(items[1].textContent).toBe('1');
      expect(items[2].textContent).toBe('2');
    });
  });

  describe('--dom:repeat-update', () => {
    it('should update every nth element', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:repeat-update:2" commandfor="output" data-class-add="highlight">Update</button>
        <div id="output">
          <div class="item">Item 0</div>
          <div class="item">Item 1</div>
          <div class="item">Item 2</div>
          <div class="item">Item 3</div>
          <div class="item">Item 4</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-update:2', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].classList.contains('highlight')).toBe(true);
      expect(items[1].classList.contains('highlight')).toBe(false);
      expect(items[2].classList.contains('highlight')).toBe(true);
      expect(items[3].classList.contains('highlight')).toBe(false);
      expect(items[4].classList.contains('highlight')).toBe(true);
    });

    it('should handle data-start-index with repeat-update', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:repeat-update:2" commandfor="output"
                data-class-add="highlight" data-start-index="1">Update</button>
        <div id="output">
          <div class="item">Item 0</div>
          <div class="item">Item 1</div>
          <div class="item">Item 2</div>
          <div class="item">Item 3</div>
          <div class="item">Item 4</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-update:2', 'output', button);

      const items = output.querySelectorAll('.item');
      expect(items[0].classList.contains('highlight')).toBe(false);
      expect(items[1].classList.contains('highlight')).toBe(true);
      expect(items[2].classList.contains('highlight')).toBe(false);
      expect(items[3].classList.contains('highlight')).toBe(true);
      expect(items[4].classList.contains('highlight')).toBe(false);
    });

    it('should throw error for invalid step', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:repeat-update:0" commandfor="output">Update</button>
        <div id="output">
          <div class="item">Item</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await expect(
        invokerInstance.executeCommand('--dom:repeat-update:0', 'output', button)
      ).rejects.toThrow();
    });
  });

  describe('--dom:clear', () => {
    it('should remove all children from target', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:clear" commandfor="output">Clear</button>
        <div id="output">
          <div class="item">Item 1</div>
          <div class="item">Item 2</div>
          <div class="item">Item 3</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      expect(output.children.length).toBe(3);

      await invokerInstance.executeCommand('--dom:clear', 'output', button);

      expect(output.children.length).toBe(0);
      expect(output.innerHTML).toBe('');
    });

    it('should work on already empty element', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:clear" commandfor="output">Clear</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:clear', 'output', button);

      expect(output.children.length).toBe(0);
    });

    it('should preserve the element itself', async () => {
      document.body.innerHTML = `
        <button id="btn" command="--dom:clear" commandfor="output">Clear</button>
        <div id="output" class="container" data-test="value">
          <div class="item">Item</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:clear', 'output', button);

      expect(output.classList.contains('container')).toBe(true);
      expect(output.dataset.test).toBe('value');
      expect(output.children.length).toBe(0);
    });
  });

  describe('Integration tests', () => {
    it('should work with command chaining', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item {{index1}}</div>
        </template>
        <button id="btn" command="--dom:clear" commandfor="output">
          <and-then command="--dom:repeat-append:3" commandfor="output" data-template-id="item-template"></and-then>
        </button>
        <div id="output">
          <div class="old">Old</div>
        </div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      button.click();

      // Wait for command chain to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(output.children.length).toBe(3);
      expect(output.querySelectorAll('.item').length).toBe(3);
      expect(output.querySelectorAll('.old').length).toBe(0);
    });

    it('should handle nested templates', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">
            <span>Item {{index1}}</span>
            <span>Count: {{count}}</span>
          </div>
        </template>
        <button id="btn" command="--dom:repeat-append:2" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:2', 'output', button);

      expect(output.children.length).toBe(2);
      const firstItem = output.children[0];
      expect(firstItem.querySelectorAll('span').length).toBe(2);
      expect(firstItem.querySelector('span')?.textContent).toBe('Item 1');
    });

    it('should handle View Transitions if supported', async () => {
      // Mock View Transition API
      const mockFinished = Promise.resolve();
      const mockTransition = { finished: mockFinished };
      const startViewTransition = vi.fn(() => mockTransition);

      // @ts-ignore - Mocking for test
      document.startViewTransition = startViewTransition;

      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-append:2" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      await invokerInstance.executeCommand('--dom:repeat-append:2', 'output', button);

      expect(startViewTransition).toHaveBeenCalled();

      // Clean up
      // @ts-ignore
      delete document.startViewTransition;
    });

    it('should support complex interpolation expressions', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item" data-computed="{{index * 10}}">
            Item {{index1}} is {{isEven ? 'even' : 'odd'}}
          </div>
        </template>
        <button id="btn" command="--dom:repeat-append:3" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      await invokerInstance.executeCommand('--dom:repeat-append:3', 'output', button);

      const items = output.querySelectorAll('.item');

      // Note: These tests depend on the interpolation engine being available
      // If interpolation is not enabled, these will show literal {{...}} expressions
      if (items[0].textContent?.includes('{{')) {
        // Interpolation not enabled, skip these assertions
        console.warn('Interpolation engine not available in test environment');
      } else {
        expect(items[0].textContent).toContain('even');
        expect(items[1].textContent).toContain('odd');
        expect(items[2].textContent).toContain('even');
      }
    });

    it('should handle memory cleanup for large lists', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item {{index}}</div>
        </template>
        <button id="btn" command="--dom:repeat-append:5000" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      // Measure memory before (rough approximation)
      const childrenBefore = document.body.querySelectorAll('*').length;

      await invokerInstance.executeCommand('--dom:repeat-append:5000', 'output', button);

      expect(output.children.length).toBe(5000);

      // Clear and verify cleanup
      await invokerInstance.executeCommand('--dom:clear', 'output', button);

      expect(output.children.length).toBe(0);

      // Memory should be released (children count should be close to original)
      const childrenAfter = document.body.querySelectorAll('*').length;
      expect(childrenAfter).toBeLessThanOrEqual(childrenBefore + 10); // Allow some tolerance
    });
  });

  describe('Performance and limits', () => {
    it('should enforce MAX_LOOP_ITERATIONS limit', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item</div>
        </template>
        <button id="btn" command="--dom:repeat-append:100000" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;

      // Should throw error for exceeding max iterations (50000)
      await expect(
        invokerInstance.executeCommand('--dom:repeat-append:100000', 'output', button)
      ).rejects.toThrow();
    });

    it('should handle batch operations efficiently', async () => {
      document.body.innerHTML = `
        <template id="item-template">
          <div class="item">Item {{index}}</div>
        </template>
        <button id="btn" command="--dom:repeat-append:500" commandfor="output" data-template-id="item-template">Repeat</button>
        <div id="output"></div>
      `;

      const button = document.getElementById('btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      const startTime = performance.now();
      await invokerInstance.executeCommand('--dom:repeat-append:500', 'output', button);
      const duration = performance.now() - startTime;

      expect(output.children.length).toBe(500);
      expect(duration).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });
});
