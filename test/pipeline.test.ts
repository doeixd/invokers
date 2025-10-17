/**
 * @file pipeline.test.ts
 * @description Tests for pipeline functionality including enhanced chaining and <and-then> elements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Pipeline Test</title>
    </head>
    <body></body>
  </html>
`, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Setup global environment
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.HTMLTemplateElement = dom.window.HTMLTemplateElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Import after setting up globals
import '../src/index';
import { InvokerManager } from '../src/compatible';
import { registerBaseCommands } from '../src/commands/base';
import { registerFormCommands } from '../src/commands/form';
import { registerBaseCommands } from '../src/commands/base';
import { registerFormCommands } from '../src/commands/form';
import { registerNavigationCommands } from '../src/commands/navigation';

describe('Pipeline Functionality', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';

    // Get singleton InvokerManager instance
    invokerManager = InvokerManager.getInstance();

    // Ensure command event listeners are attached in test environment
    invokerManager.ensureListenersAttached();

    // Enable debug mode for troubleshooting
    // if (typeof window !== 'undefined') {
    //   (window as any).Invoker = { ...(window as any).Invoker, debug: true };
    // }

    // Use proper reset method instead of manually clearing commands
    // NOTE: Don't call reset() when using compatible module as it clears pre-registered commands
    // invokerManager.reset();

    // Commands are already registered in compatible module, no need to re-register
    // registerBaseCommands(invokerManager);
    // registerFormCommands(invokerManager);
    // registerFlowCommands(invokerManager);
  });

  describe('Enhanced Attribute-Based Chaining', () => {
    beforeEach(() => {
      // Register test commands
      invokerManager.register('--test:success', ({ targetElement }) => {
        targetElement.textContent = 'Success executed';
      });

      invokerManager.register('--test:error', ({ targetElement }) => {
        targetElement.textContent = 'Error executed';
        throw new Error('Simulated error');
      });

      invokerManager.register('--test:complete', ({ targetElement }) => {
        targetElement.classList.add('completed');
      });
    });

    it('should execute data-after-success commands on successful execution', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="success-chain"
                command="--test:success"
                commandfor="output"
                data-after-success="--class:add:success-class,--text:set:Success chain executed">
          Success Chain
        </button>
        <div id="output">Initial</div>
      `;

      const button = document.getElementById('success-chain') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLElement;

      button.click();

      // Wait for chaining to complete
      setTimeout(() => {
        expect(output.textContent).toBe('Success chain executed');
        expect(output.classList.contains('success-class')).toBe(true);
        done();
      }, 100);
    });

    it('should execute data-after-error commands on failed execution', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="error-chain"
                command="--test:error"
                commandfor="output"
                data-after-error="--class:add:error-class,--text:set:Error chain executed">
          Error Chain
        </button>
        <div id="output">Initial</div>
      `;

      const button = document.getElementById('error-chain') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLElement;

      button.click();

      // Wait for chaining to complete
      setTimeout(() => {
        expect(output.textContent).toBe('Error chain executed');
        expect(output.classList.contains('error-class')).toBe(true);
        done();
      }, 100);
    });

    it('should execute data-after-complete commands regardless of success/error', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="complete-chain"
                command="--test:error"
                commandfor="output"
                data-after-complete="--test:complete">
          Complete Chain
        </button>
        <div id="output">Initial</div>
      `;

      const button = document.getElementById('complete-chain') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLElement;

      button.click();

      // Wait for chaining to complete
      setTimeout(() => {
        expect(output.classList.contains('completed')).toBe(true);
        done();
      }, 100);
    });

    it('should handle data-then-target for chained commands', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="target-override"
                command="--test:success"
                commandfor="primary-output"
                data-after-success="--text:set:Chained to different target"
                data-then-target="secondary-output">
          Target Override
        </button>
        <div id="primary-output">Primary</div>
        <div id="secondary-output">Secondary</div>
      `;

      const button = document.getElementById('target-override') as HTMLButtonElement;
      const primary = document.getElementById('primary-output') as HTMLElement;
      const secondary = document.getElementById('secondary-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(primary.textContent).toBe('Success executed');
        expect(secondary.textContent).toBe('Chained to different target');
        done();
      }, 100);
    });
  });

  describe('Declarative <and-then> Elements', () => {
    beforeEach(() => {
      invokerManager.register('--step:execute', ({ targetElement, params }) => {
        const [stepNumber] = params;
        targetElement.textContent += ` Step ${stepNumber}`;
      });

      invokerManager.register('--step:success', ({ targetElement }) => {
        targetElement.classList.add('success-step');
      });

      invokerManager.register('--step:error', ({ targetElement }) => {
        throw new Error('Step failed');
      });
    });

    it('should execute nested and-then elements in sequence', (done) => {
      document.body.innerHTML = `
        <button type="button" id="nested-trigger" command="--step:execute:1" commandfor="sequence-output">
          Start Sequence
          <and-then command="--step:execute:2" commandfor="sequence-output">
            <and-then command="--step:execute:3" commandfor="sequence-output">
            </and-then>
          </and-then>
        </button>
        <div id="sequence-output">Start</div>
      `;

      const button = document.getElementById('nested-trigger') as HTMLButtonElement;
      const output = document.getElementById('sequence-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Start Step 1 Step 2 Step 3');
        done();
      }, 200);
    });

    it('should handle conditional execution based on success/error', (done) => {
      document.body.innerHTML = `
        <button type="button" id="conditional-trigger" command="--step:success" commandfor="conditional-output">
          Conditional Test
          <and-then command="--text:set:Success path" commandfor="conditional-output" data-condition="success">
          </and-then>
          <and-then command="--text:set:Error path" commandfor="conditional-output" data-condition="error">
          </and-then>
        </button>
        <div id="conditional-output">Initial</div>
      `;

      const button = document.getElementById('conditional-trigger') as HTMLButtonElement;
      const output = document.getElementById('conditional-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Success path');
        done();
      }, 100);
    });

    it('should remove and-then elements with data-once attribute', (done) => {
      document.body.innerHTML = `
        <button type="button" id="once-trigger" command="--step:execute:1" commandfor="once-output">
          Once Test
          <and-then command="--step:execute:2" commandfor="once-output" data-once="true">
          </and-then>
        </button>
        <div id="once-output">Start</div>
      `;

      const button = document.getElementById('once-trigger') as HTMLButtonElement;
      const output = document.getElementById('once-output') as HTMLElement;

      // First click
      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Start Step 1 Step 2');
        
        // Check that and-then element was removed
        const andThenElements = button.querySelectorAll('and-then');
        expect(andThenElements.length).toBe(0);

        // Reset output for second test
        output.textContent = 'Start';
        
        // Second click should not execute the and-then
        button.click();

        setTimeout(() => {
          expect(output.textContent).toBe('Start Step 1'); // Only step 1, no step 2
          done();
        }, 100);
      }, 100);
    });

    it('should handle delayed execution with data-delay', (done) => {
      document.body.innerHTML = `
        <button type="button" id="delay-trigger" command="--step:execute:1" commandfor="delay-output">
          Delayed Test
          <and-then command="--step:execute:2" commandfor="delay-output" data-delay="200">
          </and-then>
        </button>
        <div id="delay-output">Start</div>
      `;

      const button = document.getElementById('delay-trigger') as HTMLButtonElement;
      const output = document.getElementById('delay-output') as HTMLElement;

      const startTime = Date.now();
      button.click();

      // Check immediate state
      setTimeout(() => {
        expect(output.textContent).toBe('Start Step 1'); // Step 2 should not have executed yet
        
        // Check delayed execution
        setTimeout(() => {
          const elapsed = Date.now() - startTime;
          expect(output.textContent).toBe('Start Step 1 Step 2');
          expect(elapsed).toBeGreaterThanOrEqual(180); // Allow for timing variance
          done();
        }, 150); // Wait for delayed execution
      }, 50);
    });
  });

  describe('Template-Based Command Pipelines', () => {
    beforeEach(() => {
      invokerManager.register('--pipeline:step1', ({ targetElement }) => {
        targetElement.textContent = 'Step 1 complete';
      });

      invokerManager.register('--pipeline:step2', ({ targetElement }) => {
        targetElement.textContent += ' → Step 2 complete';
      });

      invokerManager.register('--pipeline:step3', ({ targetElement }) => {
        targetElement.textContent += ' → Step 3 complete';
      });

      invokerManager.register('--pipeline:error', ({ targetElement }) => {
        throw new Error('Pipeline step failed');
      });

      invokerManager.register('--pipeline:recovery', ({ targetElement }) => {
        targetElement.textContent = 'Error recovery executed';
      });
    });

    it('should execute pipeline steps in sequence', (done) => {
      document.body.innerHTML = `
        <button type="button" id="pipeline-trigger" command="--pipeline:execute:test-pipeline">
          Execute Pipeline
        </button>
        
        <template id="test-pipeline" data-pipeline="true">
          <pipeline-step command="--pipeline:step1" target="pipeline-output" />
          <pipeline-step command="--pipeline:step2" target="pipeline-output" condition="success" />
          <pipeline-step command="--pipeline:step3" target="pipeline-output" condition="success" />
        </template>
        
        <div id="pipeline-output">Initial</div>
      `;

      const button = document.getElementById('pipeline-trigger') as HTMLButtonElement;
      const output = document.getElementById('pipeline-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Step 1 complete → Step 2 complete → Step 3 complete');
        done();
      }, 200);
    });

    it('should handle error conditions in pipelines', (done) => {
      document.body.innerHTML = `
        <button type="button" id="error-pipeline-trigger" command="--pipeline:execute:error-pipeline">
          Execute Error Pipeline
        </button>
        
        <template id="error-pipeline" data-pipeline="true">
          <pipeline-step command="--pipeline:step1" target="error-output" />
          <pipeline-step command="--pipeline:error" target="error-output" condition="success" />
          <pipeline-step command="--pipeline:recovery" target="error-output" condition="error" />
        </template>
        
        <div id="error-output">Initial</div>
      `;

      const button = document.getElementById('error-pipeline-trigger') as HTMLButtonElement;
      const output = document.getElementById('error-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Error recovery executed');
        done();
      }, 200);
    });

    it('should handle delayed pipeline steps', (done) => {
      document.body.innerHTML = `
        <button type="button" id="delayed-pipeline-trigger" command="--pipeline:execute:delayed-pipeline">
          Execute Delayed Pipeline
        </button>
        
        <template id="delayed-pipeline" data-pipeline="true">
          <pipeline-step command="--pipeline:step1" target="delayed-output" />
          <pipeline-step command="--pipeline:step2" target="delayed-output" delay="150" />
        </template>
        
        <div id="delayed-output">Initial</div>
      `;

      const button = document.getElementById('delayed-pipeline-trigger') as HTMLButtonElement;
      const output = document.getElementById('delayed-output') as HTMLElement;

      const startTime = Date.now();
      button.click();

      // Check immediate state
      setTimeout(() => {
        expect(output.textContent).toBe('Step 1 complete');
        
        // Check delayed execution
        setTimeout(() => {
          const elapsed = Date.now() - startTime;
          expect(output.textContent).toBe('Step 1 complete → Step 2 complete');
          expect(elapsed).toBeGreaterThanOrEqual(130); // Allow for timing variance
          done();
        }, 100);
      }, 50);
    });

    it('should handle once-only pipeline steps', (done) => {
      document.body.innerHTML = `
        <button type="button" id="once-pipeline-trigger" command="--pipeline:execute:once-pipeline">
          Execute Once Pipeline
        </button>
        
        <template id="once-pipeline" data-pipeline="true">
          <pipeline-step command="--pipeline:step1" target="once-output" />
          <pipeline-step command="--pipeline:step2" target="once-output" once="true" />
        </template>
        
        <div id="once-output">Initial</div>
      `;

      const button = document.getElementById('once-pipeline-trigger') as HTMLButtonElement;
      const output = document.getElementById('once-output') as HTMLElement;
      const template = document.getElementById('once-pipeline') as HTMLTemplateElement;

      // First execution
      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Step 1 complete → Step 2 complete');
        
        // Check that once step was removed from template
        const remainingSteps = template.content.querySelectorAll('pipeline-step');
        expect(remainingSteps.length).toBe(1); // Only step 1 should remain
        
        // Reset output and run again
        output.textContent = 'Initial';
        button.click();

        setTimeout(() => {
          expect(output.textContent).toBe('Step 1 complete'); // Only step 1, step 2 was removed
          done();
        }, 100);
      }, 200);
    });

    it('should handle data attributes in pipeline steps', (done) => {
      invokerManager.register('--pipeline:data-test', ({ targetElement, invoker }) => {
        const value = invoker.dataset.testValue || 'no value';
        targetElement.textContent = `Data test: ${value}`;
      });

      document.body.innerHTML = `
        <button type="button" id="data-pipeline-trigger" command="--pipeline:execute:data-pipeline">
          Execute Data Pipeline
        </button>
        
        <template id="data-pipeline" data-pipeline="true">
          <pipeline-step command="--pipeline:data-test" target="data-output" data-test-value="from pipeline" />
        </template>
        
        <div id="data-output">Initial</div>
      `;

      const button = document.getElementById('data-pipeline-trigger') as HTMLButtonElement;
      const output = document.getElementById('data-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Data test: from pipeline');
        done();
      }, 100);
    });

    it('should handle invalid pipeline templates gracefully', () => {
      document.body.innerHTML = `
        <button type="button" id="invalid-pipeline-trigger" command="--pipeline:execute:nonexistent">
          Invalid Pipeline
        </button>
      `;

      const button = document.getElementById('invalid-pipeline-trigger') as HTMLButtonElement;

      // Should not throw
      expect(() => {
        button.click();
      }).not.toThrow();
    });

    it('should validate pipeline command parameters', () => {
      document.body.innerHTML = `
        <button type="button" id="invalid-action" command="--pipeline:invalid:test">
          Invalid Action
        </button>
        <button type="button" id="missing-id" command="--pipeline:execute">
          Missing ID
        </button>
      `;

      const invalidAction = document.getElementById('invalid-action') as HTMLButtonElement;
      const missingId = document.getElementById('missing-id') as HTMLButtonElement;

      // Both should not throw but should log warnings
      expect(() => {
        invalidAction.click();
        missingId.click();
      }).not.toThrow();
    });
  });

  describe('Universal data-and-then Chaining', () => {
    beforeEach(() => {
      invokerManager.register('--chain:first', ({ targetElement }) => {
        targetElement.textContent = 'First command executed';
      });

      invokerManager.register('--chain:second', ({ targetElement }) => {
        targetElement.textContent += ' → Second command executed';
      });

      invokerManager.register('--chain:async', async ({ targetElement }) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        targetElement.textContent = 'Async command completed';
      });
    });

    it('should chain synchronous commands with data-and-then', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="sync-chain-trigger"
                command="--chain:first"
                commandfor="chain-output"
                data-and-then="--chain:second">
          Sync Chain
        </button>
        <div id="chain-output">Initial</div>
      `;

      const button = document.getElementById('sync-chain-trigger') as HTMLButtonElement;
      const output = document.getElementById('chain-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('First command executed → Second command executed');
        done();
      }, 100);
    });

    it('should chain asynchronous commands with data-and-then', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="async-chain-trigger"
                command="--chain:async"
                commandfor="async-output"
                data-and-then="--chain:second">
          Async Chain
        </button>
        <div id="async-output">Initial</div>
      `;

      const button = document.getElementById('async-chain-trigger') as HTMLButtonElement;
      const output = document.getElementById('async-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('Async command completed → Second command executed');
        done();
      }, 200);
    });

    it('should support legacy data-then-command attribute', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="legacy-chain-trigger"
                command="--chain:first"
                commandfor="legacy-output"
                data-then-command="--chain:second">
          Legacy Chain
        </button>
        <div id="legacy-output">Initial</div>
      `;

      const button = document.getElementById('legacy-chain-trigger') as HTMLButtonElement;
      const output = document.getElementById('legacy-output') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('First command executed → Second command executed');
        done();
      }, 100);
    });
  });

  describe('Command Lifecycle States', () => {
    beforeEach(() => {
      invokerManager.register('--state:test', ({ targetElement, invoker }) => {
        const count = parseInt(targetElement.textContent || '0') + 1;
        targetElement.textContent = count.toString();
      });
    });

    it('should handle once state correctly', (done) => {
      document.body.innerHTML = `
        <button type="button"
                id="once-state-trigger"
                command="--state:test"
                commandfor="once-output"
                data-state="once">
          Once State
        </button>
        <div id="once-output">0</div>
      `;

      const button = document.getElementById('once-state-trigger') as HTMLButtonElement;
      const output = document.getElementById('once-output') as HTMLElement;

      // First click
      button.click();

      setTimeout(() => {
        expect(output.textContent).toBe('1');

        // Second click should not execute
        button.click();

        setTimeout(() => {
          expect(output.textContent).toBe('1'); // Should still be 1
          done();
        }, 50);
      }, 50);
    });

    it('should handle disabled state correctly', () => {
      document.body.innerHTML = `
        <button type="button"
                id="disabled-state-trigger"
                command="--state:test"
                commandfor="disabled-output"
                data-state="disabled">
          Disabled State
        </button>
        <div id="disabled-output">0</div>
      `;

      const button = document.getElementById('disabled-state-trigger') as HTMLButtonElement;
      const output = document.getElementById('disabled-output') as HTMLElement;

      button.click();
      expect(output.textContent).toBe('0'); // Should not change
    });

    it('should handle completed state correctly', () => {
      document.body.innerHTML = `
        <button type="button"
                id="completed-state-trigger"
                command="--state:test"
                commandfor="completed-output"
                data-state="completed">
          Completed State
        </button>
        <div id="completed-output">0</div>
      `;

      const button = document.getElementById('completed-state-trigger') as HTMLButtonElement;
      const output = document.getElementById('completed-output') as HTMLElement;

      button.click();
      expect(output.textContent).toBe('0'); // Should not change
    });
  });

  describe('Complex Workflow Integration', () => {
    it('should combine all pipeline features in complex workflow', (done) => {
      invokerManager.register('--workflow:validate', ({ targetElement }) => {
        targetElement.dataset.validated = 'true';
        return true; // Success
      });

      invokerManager.register('--workflow:submit', ({ targetElement }) => {
        if (targetElement.dataset.validated === 'true') {
          targetElement.textContent = 'Form submitted successfully';
        } else {
          throw new Error('Validation failed');
        }
      });

      invokerManager.register('--workflow:cleanup', ({ targetElement }) => {
        targetElement.classList.add('workflow-complete');
      });

      document.body.innerHTML = `
        <button type="button"
                id="complex-workflow-trigger"
                command="--workflow:validate"
                commandfor="workflow-form"
                data-after-success="--workflow:submit"
                data-after-error="--text:set:Validation failed"
                data-after-complete="--workflow:cleanup">
          Submit Form
          
          <and-then command="--class:add:processing" commandfor="workflow-form" data-condition="success">
            <and-then command="--text:append: (Processing complete)" commandfor="workflow-form" data-delay="100">
              <and-then command="--class:remove:processing" commandfor="workflow-form" data-once="true">
              </and-then>
            </and-then>
          </and-then>
        </button>
        
        <div id="workflow-form">Form ready</div>
      `;

      const button = document.getElementById('complex-workflow-trigger') as HTMLButtonElement;
      const form = document.getElementById('workflow-form') as HTMLElement;

      button.click();

      setTimeout(() => {
        expect(form.textContent).toBe('Form submitted successfully (Processing complete)');
        expect(form.classList.contains('workflow-complete')).toBe(true);
        expect(form.classList.contains('processing')).toBe(false);
        done();
      }, 300);
    });
  });

  describe('--pipeline:execute command', () => {
    it('should execute a pipeline defined in a template', async () => {
      // First check if the command is registered
      console.log('Registered commands:', (invokerManager as any).commands.keys());
      const hasPipelineCommand = (invokerManager as any).commands.has('--pipeline:execute');
      console.log('Has --pipeline:execute command:', hasPipelineCommand);
      
      document.body.innerHTML = `
        <template id="test-pipeline" data-pipeline="true">
          <pipeline-step command="--text:set:Step 1 executed" target="pipeline-output" />
          <pipeline-step command="--text:append: → Step 2 executed" target="pipeline-output" delay="100" />
        </template>

        <button id="pipeline-btn" command="--pipeline:execute:test-pipeline" commandfor="pipeline-output">
          Run Pipeline
        </button>

        <div id="pipeline-output">Initial</div>
      `;

      const button = document.getElementById('pipeline-btn') as HTMLButtonElement;
      const output = document.getElementById('pipeline-output') as HTMLElement;

      // Add a listener to see if any command event is fired
      output.addEventListener('command', (event) => {
        console.log('Command event received:', event);
        console.log('Command:', (event as any).command);
        console.log('Source:', (event as any).source);
      });

      button.click();

      // Wait for pipeline to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(output.textContent).toBe('Step 1 executed → Step 2 executed');
    });

    it('should throw error for missing pipeline template', async () => {
      const invoker = document.createElement('button');

      await expect(invokerManager.executeCommand('--pipeline:execute:missing-pipeline', '', invoker)).rejects.toThrow();
    });

    it('should throw error for template without data-pipeline', async () => {
      document.body.innerHTML = `
        <template id="invalid-pipeline">
          <pipeline-step command="--text:set:Test" target="output" />
        </template>
      `;

      const invoker = document.createElement('button');

      await expect(invokerManager.executeCommand('--pipeline:execute:invalid-pipeline', '', invoker)).rejects.toThrow();
    });

    it('should handle pipeline steps with success condition', async () => {
      document.body.innerHTML = `
        <template id="success-pipeline" data-pipeline="true">
          <pipeline-step command="--text:set:Success executed" target="pipeline-output" condition="success" />
          <pipeline-step command="--text:set:Error executed" target="pipeline-output" condition="error" />
        </template>

        <button id="pipeline-btn" command="--pipeline:execute:success-pipeline" commandfor="pipeline-output">
          Run Pipeline
        </button>

        <div id="pipeline-output">Initial</div>
      `;

      const button = document.getElementById('pipeline-btn') as HTMLButtonElement;
      const output = document.getElementById('pipeline-output') as HTMLElement;

      button.click();

      // Wait for pipeline to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(output.textContent).toBe('Success executed');
    });

    it('should handle pipeline steps with error condition when error occurs', async () => {
      // Mock a command that throws error
      invokerManager.register('--test:error', () => {
        throw new Error('Test error');
      });

      document.body.innerHTML = `
        <template id="error-pipeline" data-pipeline="true">
          <pipeline-step command="--test:error" target="pipeline-output" />
          <pipeline-step command="--text:set:Error handled" target="pipeline-output" condition="error" />
        </template>

        <button id="pipeline-btn" command="--pipeline:execute:error-pipeline" commandfor="pipeline-output">
          Run Pipeline
        </button>

        <div id="pipeline-output">Initial</div>
      `;

      const button = document.getElementById('pipeline-btn') as HTMLButtonElement;
      const output = document.getElementById('pipeline-output') as HTMLElement;

      button.click();

      // Wait for pipeline to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(output.textContent).toBe('Error handled');
    });

    it('should handle once attribute by removing step after execution', async () => {
      document.body.innerHTML = `
        <template id="once-pipeline" data-pipeline="true">
          <pipeline-step command="--text:set:Once executed" target="pipeline-output" once="true" />
          <pipeline-step command="--text:append: → Second run" target="pipeline-output" />
        </template>

        <button id="pipeline-btn" command="--pipeline:execute:once-pipeline" commandfor="pipeline-output">
          Run Pipeline
        </button>

        <div id="pipeline-output">Initial</div>
      `;

      const template = document.getElementById('once-pipeline') as HTMLTemplateElement;
      const button = document.getElementById('pipeline-btn') as HTMLButtonElement;
      const output = document.getElementById('pipeline-output') as HTMLElement;

       // First execution
       await invokerManager.executeCommand('--pipeline:execute:once-pipeline', 'pipeline-output', button);

       expect(output.textContent).toBe('Once executed → Second run');
       expect(template.content.querySelectorAll('pipeline-step').length).toBe(1); // One step removed

       // Reset output
       output.textContent = '';

       // Second execution - once step should be gone
       await invokerManager.executeCommand('--pipeline:execute:once-pipeline', 'pipeline-output', button);

       expect(output.textContent).toBe(' → Second run'); // Only the remaining step
    });

    it('should skip steps without command attribute', async () => {
      document.body.innerHTML = `
        <template id="skip-pipeline" data-pipeline="true">
          <pipeline-step target="pipeline-output" />
          <pipeline-step command="--text:set:Valid step" target="pipeline-output" />
        </template>

        <button id="pipeline-btn" command="--pipeline:execute:skip-pipeline" commandfor="pipeline-output">
          Run Pipeline
        </button>

        <div id="pipeline-output">Initial</div>
      `;

      const button = document.getElementById('pipeline-btn') as HTMLButtonElement;
      const output = document.getElementById('pipeline-output') as HTMLElement;

      button.click();

      // Wait for pipeline to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(output.textContent).toBe('Valid step');
    });

    it('should throw error for empty pipeline', async () => {
      document.body.innerHTML = `
        <template id="empty-pipeline" data-pipeline="true">
        </template>
      `;

      const invoker = document.createElement('button');

      await expect(invokerManager.executeCommand('--pipeline:execute:empty-pipeline', '', invoker)).rejects.toThrow();
    });
  });

  describe('Comma-separated commands', () => {
    it('should execute multiple comma-separated commands on regular elements', async () => {
      document.body.innerHTML = `
        <button id="multi-cmd-btn" command="--text:set:First, --text:append: Second" commandfor="multi-target">
          Multi Command
        </button>
        <div id="multi-target">Initial</div>
      `;

      const button = document.getElementById('multi-cmd-btn') as HTMLButtonElement;
      const target = document.getElementById('multi-target') as HTMLElement;

      button.click();

      // Wait for commands to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(target.textContent).toBe('First Second');
    });

    it('should execute multiple comma-separated commands in pipeline steps', async () => {
      document.body.innerHTML = `
        <template id="multi-step-pipeline" data-pipeline="true">
          <pipeline-step command="--text:set:Step 1, --text:append: executed" target="multi-pipeline-target" />
          <pipeline-step command="--text:append: → Step 2, --text:append: done" target="multi-pipeline-target" delay="50" />
        </template>

        <button id="multi-pipeline-btn" command="--pipeline:execute:multi-step-pipeline">
          Run Multi-Step Pipeline
        </button>

        <div id="multi-pipeline-target">Initial</div>
      `;

      const button = document.getElementById('multi-pipeline-btn') as HTMLButtonElement;
      const target = document.getElementById('multi-pipeline-target') as HTMLElement;

      button.click();

      // Wait for pipeline to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(target.textContent).toBe('Step 1 executed → Step 2 done');
    });

    it('should handle mixed valid and invalid comma-separated commands gracefully', async () => {
      document.body.innerHTML = `
        <button id="mixed-cmd-btn" command="--text:set:Valid, invalid-command, --text:append: Also Valid" commandfor="mixed-target">
          Mixed Commands
        </button>
        <div id="mixed-target">Initial</div>
      `;

      const button = document.getElementById('mixed-cmd-btn') as HTMLButtonElement;
      const target = document.getElementById('mixed-target') as HTMLElement;

      button.click();

      // Wait for commands to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should execute valid commands and skip invalid ones
      expect(target.textContent).toBe('Valid Also Valid');
    });

    it('should handle whitespace around comma-separated commands', async () => {
      document.body.innerHTML = `
        <button id="whitespace-btn" command="  --text:set:Clean  ,  --text:append: Text  " commandfor="whitespace-target">
          Whitespace Commands
        </button>
        <div id="whitespace-target">Initial</div>
      `;

      const button = document.getElementById('whitespace-btn') as HTMLButtonElement;
      const target = document.getElementById('whitespace-target') as HTMLElement;

      button.click();

      // Wait for commands to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(target.textContent).toBe('Clean Text');
    });

    it('should handle escaped commas in command parameters', async () => {
      document.body.innerHTML = `
        <button id="escaped-btn" command="--text:set:Hello\\, World!, --text:append: How are you?" commandfor="escaped-target">
          Escaped Comma Commands
        </button>
        <div id="escaped-target">Initial</div>
      `;

      const button = document.getElementById('escaped-btn') as HTMLButtonElement;
      const target = document.getElementById('escaped-target') as HTMLElement;

      button.click();

      // Wait for commands to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(target.textContent).toBe('Hello, World! How are you?');
    });
  });
});



