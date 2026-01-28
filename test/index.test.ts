import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager, parseCommandString, createCommandString } from '../src/compatible';

// Mock DOM elements for testing
let mockButton: HTMLButtonElement;
let mockTarget: HTMLElement;

describe('Enhanced Attribute-Based Chaining', () => {
  let invokerManager: InvokerManager;

   beforeEach(() => {
     document.body.innerHTML = '';

     // Create mock DOM elements
     mockButton = document.createElement('button');
     mockButton.id = 'test-button';
     mockTarget = document.createElement('div');
     mockTarget.id = 'test-target';
     mockButton.setAttribute('commandfor', 'test-target');

     // Reset target content
     mockTarget.textContent = '';

     // Add elements to document first
     document.body.appendChild(mockButton);
     document.body.appendChild(mockTarget);

      // Get singleton InvokerManager instance
      invokerManager = InvokerManager.getInstance();
   });

  describe('Universal Chaining (data-and-then)', () => {
    it('should execute chained command after primary command', async () => {
      // Register test commands
      invokerManager.register('--test-primary', ({ targetElement }) => {
        targetElement.textContent = 'primary executed';
      });

      invokerManager.register('--test-chain', ({ targetElement }) => {
        targetElement.textContent += ' + chained executed';
      });

      // Set up chaining using old attribute method
      mockButton.setAttribute('command', '--test-primary');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-and-then', '--test-chain');

       // Execute command by directly calling the method
       await invokerManager.executeCommand('--test-primary', 'test-target', mockButton);

       // Verify both primary and chained commands executed
       expect(mockTarget.textContent).toBe('primary executed + chained executed');
    });
  });

  describe('Conditional Chaining', () => {
    it('should execute success commands on successful execution', async () => {
      // Register test commands
      invokerManager.register('--test-success', ({ targetElement }) => {
        targetElement.textContent = 'success';
      });

      invokerManager.register('--test-success-chain', ({ targetElement }) => {
        targetElement.textContent += ' + success chain';
      });

      // Set up conditional chaining using old attribute method
      mockButton.setAttribute('command', '--test-success');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-after-success', '--test-success-chain');

       // Execute command
       await invokerManager.executeCommand('--test-success', 'test-target', mockButton);

       // Verify success chain executed
       expect(mockTarget.textContent).toBe('success + success chain');
    });

    it('should handle comma-separated data-after-success with empty entries', async () => {
      invokerManager.register('--test-success', ({ targetElement }) => {
        targetElement.textContent = 'Start';
      });

      mockButton.setAttribute('command', '--test-success');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('data-after-success', ', --text:append: One, , --text:append: Two, ');

      await invokerManager.executeCommand('--test-success', 'test-target', mockButton);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTarget.textContent).toBe('Start One Two');
    });

    it('should execute error commands on failed execution', async () => {
      // Register test commands
      invokerManager.register('--test-error', () => {
        throw new Error('Test error');
      });

      invokerManager.register('--test-error-chain', ({ targetElement }) => {
        targetElement.textContent = 'error chain executed';
      });

      // Set up conditional chaining using old attribute method
      mockButton.setAttribute('command', '--test-error');
      mockButton.setAttribute('commandfor', 'test-target');
       mockButton.setAttribute('data-after-error', '--test-error-chain');

       // Execute command
      try {
        await invokerManager.executeCommand('--test-error', 'test-target', mockButton);
      } catch (error) {
        void error;
      }

       // Verify error chain executed
       expect(mockTarget.textContent).toBe('error chain executed');
    });

    it('should execute complete commands regardless of success/error', async () => {
      const invokerManager = InvokerManager.getInstance();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'complete-target';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      // Register test commands
      invokerManager.register('--test-complete', ({ targetElement }) => {
        targetElement.textContent = 'complete';
      });

      invokerManager.register('--test-complete-chain', ({ targetElement }) => {
        targetElement.textContent += ' + always executed';
      });

      // Set up complete chaining using old attribute method
      testButton.setAttribute('command', '--test-complete');
      testButton.setAttribute('commandfor', 'complete-target');
      testButton.setAttribute('data-after-complete', '--test-complete-chain');

      // Execute command
      await invokerManager.executeCommand('--test-complete', 'complete-target', testButton);

      // Verify complete chain executed
      expect(testTarget.textContent).toBe('complete + always executed');
     });
   });

   describe('Declarative <and-then> Elements', () => {
     it('should execute and-then element after primary command', async () => {
       const invokerManager = InvokerManager.getInstance();

       // Create mock DOM elements
       const testButton = document.createElement('button');
       const testTarget = document.createElement('div');
       testTarget.id = 'declarative-target-1';
       const andThenElement = document.createElement('and-then');
       andThenElement.setAttribute('command', '--test-chain');
       andThenElement.setAttribute('commandfor', 'declarative-target-1');

       // Add and-then element to button
       testButton.appendChild(andThenElement);

       // Add elements to document
       document.body.appendChild(testButton);
       document.body.appendChild(testTarget);

       // Register test commands
       invokerManager.register('--test-primary', ({ targetElement }) => {
         targetElement.textContent = 'primary';
       });

       invokerManager.register('--test-chain', ({ targetElement }) => {
         targetElement.textContent += ' + chained';
       });

       // Set up primary command
       testButton.setAttribute('command', '--test-primary');
       testButton.setAttribute('commandfor', 'declarative-target-1');

       // Execute command
       await invokerManager.executeCommand('--test-primary', 'declarative-target-1', testButton);

       // Verify both primary and chained commands executed
       expect(testTarget.textContent).toBe('primary + chained');
     });

     it('should prioritize commandfor on and-then over invoker commandfor', async () => {
       const invokerManager = InvokerManager.getInstance();

       const testButton = document.createElement('button');
       const primaryTarget = document.createElement('div');
       primaryTarget.id = 'primary-target';
       const secondaryTarget = document.createElement('div');
       secondaryTarget.id = 'secondary-target';
       const andThenElement = document.createElement('and-then');
       andThenElement.setAttribute('command', '--test-chain');
       andThenElement.setAttribute('commandfor', 'secondary-target');

       testButton.appendChild(andThenElement);
       testButton.setAttribute('command', '--test-primary');
       testButton.setAttribute('commandfor', 'primary-target');

       document.body.appendChild(testButton);
       document.body.appendChild(primaryTarget);
       document.body.appendChild(secondaryTarget);

       invokerManager.register('--test-primary', ({ targetElement }) => {
         targetElement.textContent = 'primary';
       });
       invokerManager.register('--test-chain', ({ targetElement }) => {
         targetElement.textContent = 'secondary';
       });

       await invokerManager.executeCommand('--test-primary', 'primary-target', testButton);

       expect(primaryTarget.textContent).toBe('primary');
       expect(secondaryTarget.textContent).toBe('secondary');
     });

     it('should prioritize data-then-target over invoker commandfor in attribute chaining', async () => {
       const invokerManager = InvokerManager.getInstance();

       const testButton = document.createElement('button');
       const primaryTarget = document.createElement('div');
       primaryTarget.id = 'primary-attr-target';
       const secondaryTarget = document.createElement('div');
       secondaryTarget.id = 'secondary-attr-target';

       document.body.appendChild(testButton);
       document.body.appendChild(primaryTarget);
       document.body.appendChild(secondaryTarget);

       invokerManager.register('--test-primary-attr', ({ targetElement }) => {
         targetElement.textContent = 'primary';
       });
       invokerManager.register('--test-chain-attr', ({ targetElement }) => {
         targetElement.textContent = 'secondary';
       });

       testButton.setAttribute('command', '--test-primary-attr');
       testButton.setAttribute('commandfor', 'primary-attr-target');
       testButton.setAttribute('data-and-then', '--test-chain-attr');
       testButton.setAttribute('data-then-target', 'secondary-attr-target');

       await invokerManager.executeCommand('--test-primary-attr', 'primary-attr-target', testButton);

       expect(primaryTarget.textContent).toBe('primary');
       expect(secondaryTarget.textContent).toBe('secondary');
     });

       it('should execute and-then element with conditional success', async () => {
         const invokerManager = InvokerManager.getInstance();

         // Create mock DOM elements
         const testButton = document.createElement('button');
         const testTarget = document.createElement('div');
         testTarget.id = 'conditional-success-target';
         const andThenElement = document.createElement('and-then');
         andThenElement.setAttribute('command', '--test-success-chain');
         andThenElement.setAttribute('commandfor', 'conditional-success-target');
         andThenElement.setAttribute('data-condition', 'success');

         // Add and-then element to button
         testButton.appendChild(andThenElement);

         // Add elements to document
         document.body.appendChild(testButton);
         document.body.appendChild(testTarget);

        // Register test commands
        invokerManager.register('--test-success', ({ targetElement }) => {
          targetElement.textContent = 'success';
        });

        invokerManager.register('--test-success-chain', ({ targetElement }) => {
          targetElement.textContent += ' + success chain';
        });

         // Set up primary command
         testButton.setAttribute('command', '--test-success');
         testButton.setAttribute('commandfor', 'conditional-success-target');

         // Execute command
         await invokerManager.executeCommand('--test-success', 'conditional-success-target', testButton);

         // Verify success chain executed
         expect(testTarget.textContent).toBe('success + success chain');
      });

       it('should execute and-then element with conditional error', async () => {
         const invokerManager = InvokerManager.getInstance();

         // Create mock DOM elements
         const testButton = document.createElement('button');
         const testTarget = document.createElement('div');
         testTarget.id = 'conditional-error-target';
         const andThenElement = document.createElement('and-then');
         andThenElement.setAttribute('command', '--test-error-chain');
         andThenElement.setAttribute('commandfor', 'conditional-error-target');
         andThenElement.setAttribute('data-condition', 'error');

         // Add and-then element to button
         testButton.appendChild(andThenElement);

         // Add elements to document
         document.body.appendChild(testButton);
         document.body.appendChild(testTarget);

        // Register test commands
        invokerManager.register('--test-error', () => {
          throw new Error('Test error');
        });

        invokerManager.register('--test-error-chain', ({ targetElement }) => {
          targetElement.textContent = 'error chain executed';
        });

         // Set up primary command
         testButton.setAttribute('command', '--test-error');
         testButton.setAttribute('commandfor', 'conditional-error-target');

         // Execute command
        try {
          await invokerManager.executeCommand('--test-error', 'conditional-error-target', testButton);
        } catch (error) {
          void error;
        }

         // Verify error chain executed
         expect(testTarget.textContent).toBe('error chain executed');
      });

       it('should handle nested and-then elements', async () => {
         const invokerManager = InvokerManager.getInstance();

         // Create mock DOM elements
         const testButton = document.createElement('button');
         const testTarget = document.createElement('div');
         testTarget.id = 'nested-target';

          // Create nested and-then elements
          const andThenElement1 = document.createElement('and-then');
          andThenElement1.setAttribute('command', '--test-chain-1');
          andThenElement1.setAttribute('commandfor', 'nested-target');

          const andThenElement2 = document.createElement('and-then');
          andThenElement2.setAttribute('command', '--test-chain-2');
          andThenElement2.setAttribute('commandfor', 'nested-target');

         // Nest the second and-then inside the first
         andThenElement1.appendChild(andThenElement2);
         testButton.appendChild(andThenElement1);

         // Add elements to document
         document.body.appendChild(testButton);
         document.body.appendChild(testTarget);

        // Register test commands
        invokerManager.register('--test-primary', ({ targetElement }) => {
          targetElement.textContent = 'primary';
        });

        invokerManager.register('--test-chain-1', ({ targetElement }) => {
          targetElement.textContent += ' + chain1';
        });

        invokerManager.register('--test-chain-2', ({ targetElement }) => {
          targetElement.textContent += ' + chain2';
        });

          // Set up primary command
          testButton.setAttribute('command', '--test-primary');
          testButton.setAttribute('commandfor', 'nested-target');

         // Execute command
         await invokerManager.executeCommand('--test-primary', 'nested-target', testButton);

          // Verify sequential execution
          expect(testTarget.textContent).toBe('primary + chain1 + chain2');
      });

     it('should handle once state for and-then elements', async () => {
       const invokerManager = InvokerManager.getInstance();

       // Create mock DOM elements
       const testButton = document.createElement('button');
       const testTarget = document.createElement('div');
       testTarget.id = 'declarative-target-1';
       const andThenElement = document.createElement('and-then');
       andThenElement.setAttribute('command', '--test-chain');
       andThenElement.setAttribute('commandfor', 'declarative-target-1');
       andThenElement.setAttribute('data-once', 'true');

       // Add and-then element to button
       testButton.appendChild(andThenElement);

       // Add elements to document
       document.body.appendChild(testButton);
       document.body.appendChild(testTarget);

       // Register test commands
       invokerManager.register('--test-primary', ({ targetElement }) => {
         targetElement.textContent = 'primary';
       });

       invokerManager.register('--test-chain', ({ targetElement }) => {
         targetElement.textContent += ' + chained';
       });

       // Set up primary command
       testButton.setAttribute('command', '--test-primary');
       testButton.setAttribute('commandfor', 'declarative-target-1');

       // Execute command first time
       await invokerManager.executeCommand('--test-primary', 'declarative-target-1', testButton);

       // Verify and-then element was removed
       expect(testButton.querySelector('and-then')).toBeNull();
     });
  });

  describe('Command Lifecycle States', () => {
    it('should handle "once" state correctly', async () => {
       const invokerManager = InvokerManager.getInstance();

       // Create mock DOM elements
       const testButton = document.createElement('button');
       const testTarget = document.createElement('div');
       testTarget.id = 'once-target';

       // Add elements to document first
       document.body.appendChild(testButton);
       document.body.appendChild(testTarget);

      let executionCount = 0;
      invokerManager.register('--test-once', ({ targetElement }) => {
        executionCount++;
        targetElement.textContent = `executed ${executionCount}`;
      });

         // Set up once command
         testButton.setAttribute('command', '--test-once');
         testButton.setAttribute('commandfor', 'once-target');
         testButton.setAttribute('data-state', 'once');

       // Execute command first time
       await invokerManager.executeCommand('--test-once', 'once-target', testButton);
      expect(executionCount).toBe(1);
      expect(testTarget.textContent).toBe('executed 1');

       // Execute command second time (should not execute due to once state)
       await invokerManager.executeCommand('--test-once', 'once-target', testButton);
      expect(executionCount).toBe(1); // Should still be 1
    });

    it('should handle "disabled" state correctly', async () => {
      const invokerManager = InvokerManager.getInstance();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'declarative-target-1';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);

      let executionCount = 0;
      invokerManager.register('--test-disabled', () => {
        executionCount++;
      });

        // Set up disabled command
        testButton.setAttribute('command', '--test-disabled');
        testButton.setAttribute('commandfor', 'declarative-target-1');
        testButton.setAttribute('data-state', 'disabled');

      // Execute command (should not execute due to disabled state)
      await invokerManager.executeCommand('--test-disabled', 'declarative-target-1', testButton);
      expect(executionCount).toBe(0);
    });
  });

  describe('Target Override', () => {
    it('should allow overriding target for chained commands', async () => {
      const invokerManager = InvokerManager.getInstance();

      // Create mock DOM elements
      const testButton = document.createElement('button');
      const testTarget = document.createElement('div');
      testTarget.id = 'declarative-target-1';
      const secondaryTarget = document.createElement('div');
      secondaryTarget.id = 'secondary-target';

      // Add elements to document first
      document.body.appendChild(testButton);
      document.body.appendChild(testTarget);
      document.body.appendChild(secondaryTarget);

      // Register test commands
      invokerManager.register('--test-primary', () => {
        testTarget.textContent = 'primary';
      });

      invokerManager.register('--test-chain', () => {
        const target = document.getElementById('secondary-target');
        if (target) target.textContent = 'chained';
      });

      // Set up target override
      testButton.setAttribute('command', '--test-primary');
      testButton.setAttribute('commandfor', 'declarative-target-1');
      testButton.setAttribute('data-and-then', '--test-chain');
      testButton.setAttribute('data-then-target', 'secondary-target');

      // Execute command
      await invokerManager.executeCommand('--test-primary', 'test-target', testButton);

      // Verify primary command affected original target
      expect(testTarget.textContent).toBe('primary');
      // Verify chained command affected overridden target
      expect(secondaryTarget.textContent).toBe('chained');
    });
   });
});

describe('Utility Functions', () => {
  describe('parseCommandString', () => {
    it('should parse command strings correctly', () => {
      expect(parseCommandString('--class:toggle:is-active')).toEqual(['--class', 'toggle', 'is-active']);
      expect(parseCommandString('--fetch:get\\:url')).toEqual(['--fetch', 'get:url']);
    });
  });

  describe('createCommandString', () => {
    it('should create command strings correctly', () => {
      expect(createCommandString('--class', 'toggle', 'is-active')).toBe('--class:toggle:is-active');
      expect(createCommandString('class', 'toggle', 'is-active')).toBe('--class:toggle:is-active');
    });
  });
});
