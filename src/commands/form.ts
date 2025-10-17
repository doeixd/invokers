// src/commands/form.ts
import type { InvokerManager, CommandContext } from '../core';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Form & Content Command Pack - Form interactions and content manipulation
 * 
 * This pack provides commands for manipulating user-facing content and form element state.
 * Perfect for interactive forms, text updates, and form validation workflows.
 * 
 * Commands included:
 * - --text:set/append/prepend/clear: Text content manipulation
 * - --value:set/clear: Form input value manipulation  
 * - --focus: Focus management
 * - --disabled:toggle/enable/disable: Form element disabled state
 * - --form:reset/submit: Form operations
 */

/**
 * Registers the form & content command pack with an InvokerManager instance.
 * 
 * @param manager The InvokerManager instance to register commands with
 * 
 * @example
 * ```typescript
 * import invokers from 'invokers';
 * import { registerFormCommands } from 'invokers/commands/form';
 * 
 * // Register the form commands
 * registerFormCommands(invokers);
 * ```
 * 
 * @example
 * ```html
 * <!-- Text content manipulation -->
 * <button command="--text:set:Hello World!" commandfor="output">Set Text</button>
 * <button command="--text:append: More text" commandfor="output">Append</button>
 * 
 * <!-- Form interactions -->
 * <button command="--focus" commandfor="name-input">Focus Name</button>
 * <button command="--disabled:toggle" commandfor="submit-btn">Toggle Submit</button>
 * <button command="--form:reset" commandfor="contact-form">Reset Form</button>
 * ```
 */
export function registerFormCommands(manager: InvokerManager): void {
  // --text: Text content manipulation
  manager.register("--text", ({ invoker, getTargets, params }) => {
    const [action, ...valueParts] = params;
    const value = valueParts.join(' '); // Rejoin with spaces for text content
    const targets = getTargets();

    if (!action) {
      throw createInvokerError(
        'Text command requires an action (set, append, prepend, or clear)',
        ErrorSeverity.ERROR,
        {
          command: '--text',
          element: invoker,
          context: { params },
          recovery: 'Use format: --text:set:Hello World or --text:append: more text'
        }
      );
    }

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --text command',
        ErrorSeverity.WARNING,
        {
          command: '--text',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid element id'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    const validActions = ['set', 'append', 'prepend', 'clear'];
    if (!validActions.includes(action)) {
      throw createInvokerError(
        `Invalid text action "${action}". Must be one of: ${validActions.join(', ')}`,
        ErrorSeverity.ERROR,
        {
          command: '--text',
          element: invoker,
          context: { action, validActions },
          recovery: 'Use a valid action like: --text:set:Hello or --text:append: World'
        }
      );
    }

    try {
      targets.forEach(target => {
        if (!target.isConnected) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: Skipping disconnected target element', target);
          }
          return;
        }

        switch (action) {
          case "set":
            target.textContent = value || "";
            break;
          case "append":
            target.textContent += value || "";
            break;
          case "prepend":
            target.textContent = (value || "") + target.textContent;
            break;
          case "clear":
            target.textContent = "";
            break;
        }
      });
    } catch (error) {
      throw createInvokerError(
        `Failed to update text content with action "${action}"`,
        ErrorSeverity.ERROR,
        {
          command: '--text',
          element: invoker,
          cause: error as Error,
          context: { action, value },
          recovery: 'Check that target elements support text content updates'
        }
      );
    }
  });

  // --value: Form input value manipulation
  manager.register("--value", ({ invoker, getTargets, params }) => {
    const [actionOrValue, ...rest] = params;
    const targets = getTargets();

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --value command',
        ErrorSeverity.WARNING,
        {
          command: '--value',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid form input element'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    try {
      targets.forEach(target => {
        if ('value' in target) {
          let valueToSet = '';
          if (actionOrValue === 'clear') {
            // --value:clear clears the value
            valueToSet = '';
          } else if (actionOrValue === 'set' && rest.length > 0) {
            // --value:set:newvalue sets to newvalue
            valueToSet = rest.join(':');
          } else {
            // --value:something sets to 'something'
            valueToSet = actionOrValue || '';
          }
          (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = valueToSet;
        } else {
          console.warn('Invokers: --value command target does not support value property', target);
        }
      });
    } catch (error) {
      throw createInvokerError(
        'Failed to set value on target elements',
        ErrorSeverity.ERROR,
        {
          command: '--value',
          element: invoker,
          cause: error as Error,
          recovery: 'Ensure target elements are form inputs that support the value property'
        }
      );
    }
  });

  // --focus: Focus management
  manager.register("--focus", ({ invoker, getTargets }) => {
    const targets = getTargets();

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --focus command',
        ErrorSeverity.WARNING,
        {
          command: '--focus',
          element: invoker,
          recovery: 'Ensure commandfor points to a focusable element'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    try {
      // Focus the first target element
      if (typeof targets[0].focus === 'function') {
        targets[0].focus();
      } else {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.warn('Invokers: Target element does not support focus', targets[0]);
        }
      }
    } catch (error) {
      throw createInvokerError(
        'Failed to focus target element',
        ErrorSeverity.ERROR,
        {
          command: '--focus',
          element: invoker,
          cause: error as Error,
          recovery: 'Ensure the target element is focusable and visible'
        }
      );
    }
  });

  // --disabled: Form element disabled state management
  manager.register("--disabled", ({ invoker, getTargets, params }) => {
    const [action] = params;
    const targets = getTargets();

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --disabled command',
        ErrorSeverity.WARNING,
        {
          command: '--disabled',
          element: invoker,
          recovery: 'Ensure commandfor points to an element that supports the disabled property'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    try {
      targets.forEach(target => {
        if ('disabled' in target) {
          const element = target as HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement;
          switch (action) {
            case 'toggle':
              element.disabled = !element.disabled;
              break;
            case 'true':
            case 'enable':
              element.disabled = false;
              break;
            case 'false':
            case 'disable':
              element.disabled = true;
              break;
            default:
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                console.warn(`Invokers: Unknown action "${action}" for --disabled command. Use "toggle", "true", "false", "enable", or "disable".`);
              }
          }
        } else {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: --disabled command target does not support disabled property', target);
          }
        }
      });
    } catch (error) {
      throw createInvokerError(
        'Failed to update disabled state on target elements',
        ErrorSeverity.ERROR,
        {
          command: '--disabled',
          element: invoker,
          cause: error as Error,
          recovery: 'Ensure target elements support the disabled property'
        }
      );
    }
  });

  // --form: Form operations (reset, submit)
  manager.register("--form", ({ invoker, getTargets, params }) => {
    const [action] = params;
    const targets = getTargets();

    if (!action) {
      throw createInvokerError(
        'Form command requires an action (reset or submit)',
        ErrorSeverity.ERROR,
        {
          command: '--form',
          element: invoker,
          context: { params },
          recovery: 'Use --form:reset or --form:submit'
        }
      );
    }

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --form command',
        ErrorSeverity.WARNING,
        {
          command: '--form',
          element: invoker,
          recovery: 'Ensure commandfor points to a form element'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    const validActions = ['reset', 'submit'];
    if (!validActions.includes(action)) {
      throw createInvokerError(
        `Invalid form action "${action}". Must be one of: ${validActions.join(', ')}`,
        ErrorSeverity.ERROR,
        {
          command: '--form',
          element: invoker,
          context: { action, validActions },
          recovery: 'Use --form:reset or --form:submit'
        }
      );
    }

    try {
      targets.forEach(target => {
        if (target instanceof HTMLFormElement) {
          switch (action) {
            case 'reset':
              target.reset();
              break;
            case 'submit':
              target.submit();
              break;
          }
        } else {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: --form command target is not a form element', target);
          }
        }
      });
    } catch (error) {
      throw createInvokerError(
        `Failed to ${action} form`,
        ErrorSeverity.ERROR,
        {
          command: '--form',
          element: invoker,
          cause: error as Error,
          recovery: 'Ensure target elements are valid form elements'
        }
      );
    }
  });

  // --input:step - Increment/decrement numeric input values
  manager.register("--input:step", ({ invoker, getTargets, params }) => {
    const [stepAmount = "1"] = params;
    const targets = getTargets();

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --input:step command',
        ErrorSeverity.WARNING,
        {
          command: '--input:step',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid input[type="number"] element'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    const stepValue = parseFloat(stepAmount);
    if (isNaN(stepValue)) {
      throw createInvokerError(
        'Input step requires a valid numeric parameter',
        ErrorSeverity.ERROR,
        {
          command: '--input:step',
          element: invoker,
          context: { provided: stepAmount },
          recovery: 'Use --input:step:1 or --input:step:-1'
        }
      );
    }

    try {
      targets.forEach(target => {
        if (!(target instanceof HTMLInputElement) || target.type !== "number") {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: --input:step target must be an input[type="number"] element', target);
          }
          return;
        }

        if (stepValue > 0) {
          target.stepUp(stepValue);
        } else if (stepValue < 0) {
          target.stepDown(Math.abs(stepValue));
        }
        
        // Dispatch input event for reactive updates
        target.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      });
    } catch (error) {
      throw createInvokerError(
        `Failed to step input value by ${stepValue}`,
        ErrorSeverity.ERROR,
        {
          command: '--input:step',
          element: invoker,
          cause: error as Error,
          recovery: 'Ensure target is a valid numeric input within its min/max bounds'
        }
      );
    }
  });

  // --text:copy - Copy text content from one element to another
  manager.register("--text:copy", ({ invoker, getTargets }) => {
    const sourceSelector = invoker.dataset.copyFrom;
    let sourceElement: HTMLElement | null = invoker;
    const targets = getTargets();

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --text:copy command',
        ErrorSeverity.WARNING,
        {
          command: '--text:copy',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid element'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(error.message);
      }
      return;
    }

    if (sourceSelector) {
      sourceElement = document.querySelector(sourceSelector);
      if (!sourceElement) {
        throw createInvokerError(
          `Source element with selector "${sourceSelector}" not found`,
          ErrorSeverity.ERROR,
          {
            command: '--text:copy',
            element: invoker,
            recovery: 'Ensure data-copy-from points to a valid element'
          }
        );
      }
    }

    try {
      const textToCopy = (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement)
        ? sourceElement.value
        : sourceElement.textContent || '';

      targets.forEach(target => {
        target.textContent = textToCopy;
      });
    } catch (error) {
      throw createInvokerError(
        'Failed to copy text content',
        ErrorSeverity.ERROR,
        {
          command: '--text:copy',
          element: invoker,
          cause: error as Error,
          recovery: 'Check that source and target elements are valid'
        }
      );
    }
  });

  // --text:clear: Clear text content
  manager.register("--text:clear", ({ targetElement }: CommandContext) => {
    targetElement.textContent = '';
  });

  // --value:clear: Clear input value (standalone command for backward compatibility)
  manager.register("--value:clear", ({ getTargets }: CommandContext) => {
    const targets = getTargets();
    targets.forEach(target => {
      if ('value' in target) {
        (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = '';
      } else {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.warn('Invokers: --value:clear command target does not support value property', target);
        }
      }
    });
  });
}
