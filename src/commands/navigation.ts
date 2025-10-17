/**
 * @file navigation.ts
 * @summary Navigation and Flow Control Command Pack for the Invokers library.
 * @description
 * This module provides navigation, event dispatching, and flow control commands
 * for managing application state and user interactions.
 *
 * @example
 * ```javascript
 * import { registerNavigationCommands } from 'invokers/commands/navigation';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerNavigationCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import { parseCommaSeparatedCommands } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, sanitizeHTML } from '../index';
import { resolveTargets } from '../target-resolver';

/**
 * Navigation and flow control commands for managing application state.
 */
const navigationCommands: Record<string, CommandCallback> = {

  /**
   * `--navigate:to`: Navigates to a new URL using the History API.
   *
   * @example
   * ```html
   * <button type="button" command="--navigate:to:/about">Go to About Page</button>
   * ```
   */
  "--navigate:to": (context: CommandContext) => {
    try {
      if (!context.invoker || !context.invoker.isConnected) {
        throw createInvokerError('--navigate:to failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--navigate:to', element: context.invoker, recovery: 'Ensure the button is still in the document.'
        });
      }

      const url = context.params.join(':'); // Rejoin params in case URL contains colons
      if (!url) {
        throw createInvokerError('Navigate command requires a URL parameter', ErrorSeverity.ERROR, {
          command: '--navigate:to', element: context.invoker, recovery: 'Use format: --navigate:to:/your/path'
        });
      }

      // Validate URL format
      try {
        new URL(url, window.location.origin);
      } catch {
        throw createInvokerError('--navigate:to failed: Invalid URL format', ErrorSeverity.ERROR, {
          command: '--navigate:to', element: context.invoker, context: { url }, recovery: 'Ensure the URL is properly formatted.'
        });
      }

      try {
        if (window.history?.pushState) {
          window.history.pushState({}, "", url);
          window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
        } else {
          window.location.href = url;
        }
      } catch (error) {
        throw createInvokerError('--navigate:to failed: Navigation error', ErrorSeverity.ERROR, {
          command: '--navigate:to', element: context.invoker, cause: error as Error, recovery: 'Check URL validity and browser support.'
        });
      }
    } catch (error) {
      throw createInvokerError('--navigate:to failed', ErrorSeverity.ERROR, {
        command: '--navigate:to', element: context.invoker, cause: error as Error, recovery: 'Check element connectivity and URL format.'
      });
    }
  },

  /**
   * `--command:trigger`: Triggers an event on another element.
   * @example `<button command="--command:trigger:click" commandfor="#save-btn" data-and-then="--command:trigger:click" data-then-target="#close-btn">Save and Close</button>`
   */
  "--command:trigger": ({ targetElement, params, invoker }: CommandContext) => {
    try {
      if (!invoker || !invoker.isConnected) {
        throw createInvokerError('--command:trigger failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--command:trigger', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--command:trigger failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--command:trigger', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const eventType = params[0] || 'click';
      if (!eventType) {
        throw createInvokerError('--command:trigger failed: Invalid event type', ErrorSeverity.ERROR, {
          command: '--command:trigger', element: invoker, recovery: 'Specify a valid event type (e.g., click, input, change).'
        });
      }

      try {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        targetElement.dispatchEvent(event);
      } catch (error) {
        throw createInvokerError('--command:trigger failed: Error dispatching event', ErrorSeverity.ERROR, {
          command: '--command:trigger', element: invoker, cause: error as Error, recovery: 'Check event type validity.'
        });
      }
    } catch (error) {
      throw createInvokerError('--command:trigger failed', ErrorSeverity.ERROR, {
        command: '--command:trigger', element: invoker, cause: error as Error, recovery: 'Check element connectivity and event type.'
      });
    }
  },

  /**
   * `--command:delay`: Waits for a specified number of milliseconds.
   * @example `<button command="--text:set:Saved!" commandfor="#status" data-and-then="--command:delay:2000" data-then-target="#status">Save</button>`
   */
  "--command:delay": ({ params, invoker }: CommandContext) => {
    try {
      if (!invoker || !invoker.isConnected) {
        throw createInvokerError('--command:delay failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--command:delay', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      const delay = parseInt(params[0], 10);
      if (isNaN(delay) || delay < 0) {
        throw createInvokerError('Delay command requires a valid positive number of milliseconds', ErrorSeverity.ERROR, {
          command: '--command:delay', element: invoker, recovery: 'Use a positive integer (e.g., --command:delay:1000 for 1 second).'
        });
      }

      // Reasonable upper limit to prevent abuse
      if (delay > 300000) { // 5 minutes
        throw createInvokerError('--command:delay failed: Delay too long', ErrorSeverity.ERROR, {
          command: '--command:delay', element: invoker, recovery: 'Use delays shorter than 5 minutes.'
        });
      }

      return new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      throw createInvokerError('--command:delay failed', ErrorSeverity.ERROR, {
        command: '--command:delay', element: invoker, cause: error as Error, recovery: 'Check delay parameter format.'
      });
    }
  },

  /**
   * `--emit`: Dispatches custom events for advanced interactions.
   * The first parameter is the event type, remaining parameters form the event detail.
   *
   * @example
   * ```html
   * <button type="button" command="--emit:user-action:save-form">
   *   Emit Save Event
   * </button>
   * ```
   */
  "--emit": ({ params, targetElement, invoker }: CommandContext) => {
    try {
      if (!invoker || !invoker.isConnected) {
        throw createInvokerError('--emit failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--emit', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      const [eventType, ...detailParts] = params;
      if (!eventType) {
        throw createInvokerError('Emit command requires an event type parameter', ErrorSeverity.ERROR, {
          command: '--emit', element: invoker, recovery: 'Use format: --emit:event-type or --emit:event-type:detail'
        });
      }

      let detail = detailParts.length > 0 ? detailParts.join(':') : undefined;
      // Try to parse as JSON if it looks like JSON
      if (typeof detail === 'string' && (detail.startsWith('{') || detail.startsWith('['))) {
        try {
          detail = JSON.parse(detail);
        } catch (e) {
          // Keep as string if JSON parsing fails
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Failed to parse event detail as JSON, using as string:', detail);
          }
        }
      }

      try {
        const event = new CustomEvent(eventType, {
          detail,
          bubbles: true,
          cancelable: true
        });

        // Dispatch on target element, or document.body if no target
        const dispatchTarget = (targetElement && targetElement.isConnected) ? targetElement : document.body;
        dispatchTarget.dispatchEvent(event);
      } catch (error) {
        throw createInvokerError('--emit failed: Error dispatching event', ErrorSeverity.ERROR, {
          command: '--emit', element: invoker, cause: error as Error, recovery: 'Check event type and detail format.'
        });
      }
    } catch (error) {
      throw createInvokerError('--emit failed', ErrorSeverity.ERROR, {
        command: '--emit', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameters.'
      });
    }
  },

  /**
   * `--bind`: Creates a one-way data binding from the target element to another element.
   * @example `<input command-on="input" command="--bind:value" commandfor="#input" data-bind-to="#output" data-bind-as="text">`
   */
  "--bind": ({ invoker, targetElement, params }: CommandContext) => {
    try {
      // Note: We don't check if invoker is connected because --bind can be used in <and-then>
      // chains where the invoker may have been removed from the DOM

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--bind failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--bind', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const sourceProperty = params.join(':');
      if (!sourceProperty) {
        throw createInvokerError('Bind command requires a source property (e.g., value, text, data:name)', ErrorSeverity.ERROR, {
          command: '--bind', element: invoker, recovery: 'Use format: --bind:value or --bind:text or --bind:data:name'
        });
      }

      // Get the source value (prefer invoker if it has the property and is connected, otherwise targetElement)
      let sourceValue: any;
      const sourceElement = (invoker && invoker.isConnected && sourceProperty === 'value' && (invoker instanceof HTMLInputElement || invoker instanceof HTMLTextAreaElement || invoker instanceof HTMLSelectElement)) ? invoker : targetElement;

      if (!sourceElement || !sourceElement.isConnected) {
        throw createInvokerError('--bind failed: Source element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--bind', element: invoker, recovery: 'Ensure the source element is still in the document.'
        });
      }

      try {
        if (sourceProperty === 'value' && (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement || sourceElement instanceof HTMLSelectElement)) {
          sourceValue = sourceElement.value;
        } else if (sourceProperty === 'text') {
          sourceValue = sourceElement.textContent;
        } else if (sourceProperty === 'html') {
          sourceValue = sourceElement.innerHTML;
        } else if (sourceProperty.startsWith('attr:')) {
          const attrName = sourceProperty.substring(5);
          sourceValue = sourceElement.getAttribute(attrName);
        } else if (sourceProperty.startsWith('data:')) {
          const dataName = sourceProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          sourceValue = sourceElement.dataset[dataName];
        } else {
          throw createInvokerError(`Invalid source property for --bind: "${sourceProperty}"`, ErrorSeverity.ERROR, {
            command: '--bind', element: invoker, recovery: 'Use value, text, html, attr:name, or data:name'
          });
        }
      } catch (error) {
        throw createInvokerError('--bind failed: Error reading source value', ErrorSeverity.ERROR, {
          command: '--bind', element: invoker, cause: error as Error, recovery: 'Check source property format.'
        });
      }

      // Find the destination (either data-bind-to or the targetElement)
      const destinationSelector = invoker?.dataset.bindTo;
      let destinations: HTMLElement[];
      try {
        destinations = destinationSelector
          ? resolveTargets(destinationSelector, invoker || targetElement) as HTMLElement[]
          : [targetElement];
      } catch (error) {
        throw createInvokerError('--bind failed: Error resolving destination targets', ErrorSeverity.ERROR, {
          command: '--bind', element: invoker, cause: error as Error, recovery: 'Check data-bind-to selector.'
        });
      }

      // Apply to destinations
      const destinationProperty = invoker?.dataset.bindAs || 'text';

      destinations.forEach(dest => {
        if (!dest || !dest.isConnected) return;

        try {
          if (destinationProperty === 'value' && (dest instanceof HTMLInputElement || dest instanceof HTMLTextAreaElement || dest instanceof HTMLSelectElement)) {
            (dest as HTMLInputElement).value = sourceValue || '';
          } else if (destinationProperty === 'text') {
            dest.textContent = sourceValue || '';
          } else if (destinationProperty === 'html') {
            dest.innerHTML = sanitizeHTML(sourceValue || '');
          } else if (destinationProperty.startsWith('attr:')) {
            const attrName = destinationProperty.substring(5);
            if (sourceValue == null) {
              dest.removeAttribute(attrName);
            } else {
              dest.setAttribute(attrName, sourceValue);
            }
          } else if (destinationProperty.startsWith('data:')) {
            const dataName = destinationProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            if (sourceValue == null) {
              delete dest.dataset[dataName];
            } else {
              dest.dataset[dataName] = sourceValue;
            }
          } else if (destinationProperty.startsWith('class:')) {
            const className = destinationProperty.substring(6);
            if (className === 'add') {
              dest.classList.add(sourceValue);
            } else if (className === 'remove') {
              dest.classList.remove(sourceValue);
            } else if (className === 'toggle') {
              dest.classList.toggle(sourceValue);
            }
          } else {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              console.warn(`Invalid destination property for --bind: "${destinationProperty}"`);
            }
          }
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.error('Error applying binding to destination:', error);
          }
        }
      });
    } catch (error) {
      throw createInvokerError('--bind failed', ErrorSeverity.ERROR, {
        command: '--bind', element: invoker, cause: error as Error, recovery: 'Check source/target elements and property formats.'
      });
    }
  },

  /**
   * `--pipeline:execute`: Executes a pipeline defined in a template element.
   *
   * @example
   * ```html
   * <template id="my-pipeline" data-pipeline="true">
   *   <pipeline-step command="--text:set:Step 1" target="output" />
   *   <pipeline-step command="--text:append: Step 2" target="output" delay="100" />
   * </template>
   * <button command="--pipeline:execute:my-pipeline">Run Pipeline</button>
   * ```
   */
   "--pipeline:execute": async ({ invoker, targetElement, params, executeAfter }: CommandContext) => {
    try {
      if (!invoker || !invoker.isConnected) {
        throw createInvokerError('--pipeline:execute failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--pipeline:execute failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const pipelineId = params[0];
      if (!pipelineId) {
        throw createInvokerError('Pipeline execute command requires a pipeline ID parameter', ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Use format: --pipeline:execute:pipeline-id'
        });
      }

      const template = document.getElementById(pipelineId) as HTMLTemplateElement;
      if (!template) {
        throw createInvokerError(`Pipeline template "${pipelineId}" not found`, ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Ensure the template element exists with the specified ID.'
        });
      }

      if (!template.isConnected) {
        throw createInvokerError(`Pipeline template "${pipelineId}" not connected to DOM`, ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Ensure the template is still in the document.'
        });
      }

      if (!(template instanceof HTMLTemplateElement)) {
        throw createInvokerError(`Element "${pipelineId}" is not a template element`, ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Use a <template> element for pipelines.'
        });
      }

      if (!template.hasAttribute('data-pipeline')) {
        throw createInvokerError(`Template "${pipelineId}" not marked as pipeline`, ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Add data-pipeline="true" to the template.'
        });
      }

      const steps = Array.from(template.content.querySelectorAll('pipeline-step'));
      if (steps.length === 0) {
        throw createInvokerError(`Pipeline "${pipelineId}" contains no steps`, ErrorSeverity.ERROR, {
          command: '--pipeline:execute', element: invoker, recovery: 'Add <pipeline-step> elements with command attributes.'
        });
      }

      // Execute steps sequentially with delays and conditions
      let hasError = false; // Track if any step failed
      const stepsToRemove: Element[] = []; // Collect steps to remove after execution

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const command = step.getAttribute('command');
        if (!command) {
          continue; // Skip steps without commands
        }

        const condition = step.getAttribute('condition');
        const stepTarget = step.getAttribute('target') || targetElement.id;
        const delay = parseInt(step.getAttribute('delay') || '0', 10);

        if (isNaN(delay) || delay < 0) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn(`Invalid delay in pipeline step ${i}: ${step.getAttribute('delay')}`);
          }
          continue;
        }

        // Check condition - only execute if condition matches current state
        if (condition) {
          if (condition === 'success' && hasError) continue;
          if (condition === 'error' && !hasError) continue;
        }

        // Execute step with delay
        try {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Parse comma-separated commands in pipeline steps
          const commands = parseCommaSeparatedCommands(command);
          for (const cmd of commands) {
            if (cmd.trim()) {
              await executeAfter(cmd.trim(), stepTarget);
            }
          }

          // Mark step for removal if once attribute is present
          if (step.hasAttribute('once') && step.getAttribute('once') !== 'false') {
            stepsToRemove.push(step);
          }
        } catch (error) {
          hasError = true;
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.error(`Pipeline step ${i} failed:`, error);
          }
          // Continue execution for conditional steps
        }
      }

      // Remove once steps after all execution is complete
      stepsToRemove.forEach(step => {
        if (step.parentNode) {
          step.parentNode.removeChild(step);
        }
      });


    } catch (error) {
      throw createInvokerError('--pipeline:execute failed', ErrorSeverity.ERROR, {
        command: '--pipeline:execute', element: invoker, cause: error as Error, recovery: 'Check pipeline template and step definitions.'
      });
    }
  }
};

export function registerNavigationCommands(manager: InvokerManager): void {
  for (const name in navigationCommands) {
    if (navigationCommands.hasOwnProperty(name)) {
      manager.register(name, navigationCommands[name]);
    }
  }
}