// src/commands/base.ts
import { debugLog, debugWarn, debugError } from '../utils';
import type { InvokerManager, CommandContext } from '../core';
import { createInvokerError, ErrorSeverity, isInterpolationEnabled } from '../index';
import { interpolateString } from '../advanced/interpolation';

/**
 * Base Command Pack - Essential UI state management commands
 * 
 * This pack provides the absolute essentials for declarative UI state management
 * without touching the DOM structure. Perfect for basic show/hide interactions,
 * CSS class management, and attribute manipulation.
 * 
 * Commands included:
 * - --toggle: Show/hide elements with ARIA updates
 * - --show: Show one element and hide its siblings
 * - --hide: Hide elements
 * - --class:add/remove/toggle:name: CSS class manipulation
 * - --attr:set/remove/toggle:name:value: Attribute manipulation
 */

/**
 * Registers the base command pack with an InvokerManager instance.
 * 
 * @param manager The InvokerManager instance to register commands with
 * 
 * @example
 * ```typescript
 * import invokers from 'invokers';
 * import { registerBaseCommands } from 'invokers/commands/base';
 * 
 * // Register the essential commands
 * registerBaseCommands(invokers);
 * ```
 * 
 * @example
 * ```html
 * <!-- Now you can use the base commands -->
 * <button type="button" command="--toggle" commandfor="menu" aria-expanded="false">
 *   Menu
 * </button>
 * <nav id="menu" hidden>...</nav>
 * 
 * <button type="button" command="--class:toggle:dark-mode" commandfor="body">
 *   Toggle Dark Mode
 * </button>
 * ```
 */
export function registerBaseCommands(manager: InvokerManager): void {
  // --toggle: Show/hide elements with ARIA updates
  manager.register("--toggle", async ({ getTargets, updateAriaState, invoker }) => {
    const targets = getTargets();
    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --toggle command',
        ErrorSeverity.WARNING,
        {
          command: '--toggle',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid element id, or use aria-controls for multiple targets'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(error.message);
      }
      return;
    }

    try {
      const updateDOM = () => {
        targets.forEach(target => {
          if (!target.isConnected) {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugWarn('Invokers: Skipping disconnected target element', target);
            }
            return;
          }
          target.toggleAttribute("hidden");
        });
        updateAriaState(targets);
      };

      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      throw createInvokerError(
        'Failed to toggle element visibility',
        ErrorSeverity.ERROR,
        {
          command: '--toggle',
          element: invoker,
          cause: error as Error,
          recovery: 'Check that target elements are valid DOM elements'
        }
      );
    }
  });

  // --show: Show one element and hide its siblings
  manager.register("--show", async ({ getTargets, updateAriaState, manageGroupState, invoker }) => {
    const targets = getTargets();
    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --show command',
        ErrorSeverity.WARNING,
        {
          command: '--show',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid element id'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(error.message);
      }
      return;
    }

    if (!targets[0].parentElement) {
      const error = createInvokerError(
        'Target element has no parent for --show command (cannot hide siblings)',
        ErrorSeverity.WARNING,
        {
          command: '--show',
          element: targets[0],
          recovery: 'Use --toggle instead, or ensure the target element has siblings to manage'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(error.message);
      }
      return;
    }

    try {
      const allSiblings = Array.from(targets[0].parentElement.children);
      const updateDOM = () => {
        manageGroupState();
        allSiblings.forEach(child => {
          if (child instanceof HTMLElement) {
            child.setAttribute("hidden", "");
          }
        });
        targets.forEach(target => target.removeAttribute("hidden"));
        updateAriaState(targets);
      };
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      throw createInvokerError(
        'Failed to show element and hide siblings',
        ErrorSeverity.ERROR,
        {
          command: '--show',
          element: invoker,
          cause: error as Error,
          recovery: 'Check that target elements and their siblings are valid DOM elements'
        }
      );
    }
  });

  // --hide: Hide elements
  manager.register("--hide", ({ getTargets, updateAriaState }) => {
    const targets = getTargets();
    if (targets.length === 0) return;
    targets.forEach(target => target.setAttribute("hidden", ""));
    updateAriaState(targets);
  });

  // --class: CSS class manipulation
  manager.register("--class", ({ invoker, getTargets, params }) => {
    const [action, ...rest] = params;
    const targets = getTargets();
    if (!action || targets.length === 0) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: `--class` command requires an action (e.g., "--class:toggle:my-class").', invoker);
      }
      return;
    }
    targets.forEach(target => {
      if (action === "ternary") {
        const [classIfTrue, classIfFalse, condition] = rest;
        if (!classIfTrue || !classIfFalse || !condition) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn('Invokers: `--class:ternary` requires class-if-true, class-if-false, and condition.', invoker);
          }
          return;
        }
        let useTrue = false;
        if (condition === "has-content") {
          useTrue = !!(target.textContent && target.textContent.trim());
        } else if (condition === "has-no-content") {
          useTrue = !(target.textContent && target.textContent.trim());
        }
        if (useTrue) {
          target.classList.add(classIfTrue);
          target.classList.remove(classIfFalse);
        } else {
          target.classList.remove(classIfTrue);
          target.classList.add(classIfFalse);
        }
      } else if (action === "toggle" && rest[1]) {
        const [className, condition] = rest;
        if (condition === "has-content") {
          const hasContent = target.textContent && target.textContent.trim() !== '';
          if (hasContent) {
            target.classList.add(className);
          } else {
            target.classList.remove(className);
          }
        } else if (condition === "has-no-content") {
          const hasContent = target.textContent && target.textContent.trim() !== '';
          if (!hasContent) {
            target.classList.add(className);
          } else {
            target.classList.remove(className);
          }
        } else {
          target.classList.toggle(className);
        }
      } else {
         const className = rest[0];
         if (!className && action !== "clear") {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('Invokers: `--class` command requires a class name.', invoker);
           }
           return;
         }
         switch (action) {
           case "add": target.classList.add(className); break;
           case "remove": target.classList.remove(className); break;
           case "toggle": target.classList.toggle(className); break;
           case "clear": target.className = ""; break;
            default: if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugWarn(`Invokers: Unknown action "${action}" for '--class' command.`, invoker);
            }
         }
       }
    });
  });

  // --attr: Attribute manipulation
  manager.register("--attr", ({ invoker, getTargets, params }) => {
    const [action, attrName, attrValue] = params;
    const targets = getTargets();

    if (!action) {
      throw createInvokerError(
        'Attribute command requires an action (set, remove, or toggle)',
        ErrorSeverity.ERROR,
        {
          command: '--attr',
          element: invoker,
          context: { params },
          recovery: 'Use format: --attr:set:disabled:true or --attr:remove:disabled'
        }
      );
    }

    if (!attrName) {
      throw createInvokerError(
        'Attribute command requires an attribute name',
        ErrorSeverity.ERROR,
        {
          command: '--attr',
          element: invoker,
          context: { action, params },
          recovery: 'Specify the attribute name: --attr:set:data-value:123'
        }
      );
    }

    if (targets.length === 0) {
      const error = createInvokerError(
        'No target elements found for --attr command',
        ErrorSeverity.WARNING,
        {
          command: '--attr',
          element: invoker,
          recovery: 'Ensure commandfor points to a valid element id'
        }
      );
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(error.message);
      }
      return;
    }

    const validActions = ['set', 'remove', 'toggle'];
    if (!validActions.includes(action)) {
      throw createInvokerError(
        `Invalid attribute action "${action}". Must be one of: ${validActions.join(', ')}`,
        ErrorSeverity.ERROR,
        {
          command: '--attr',
          element: invoker,
          context: { action, validActions },
          recovery: 'Use a valid action like: --attr:set:disabled:true or --attr:toggle:hidden'
        }
      );
    }

     // Validate attribute name
     if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(attrName)) {
       throw createInvokerError(
         `Invalid attribute name "${attrName}". Attribute names must start with a letter and contain only letters, numbers, and hyphens`,
         ErrorSeverity.ERROR,
         {
           command: '--attr',
           element: invoker,
           context: { attrName },
           recovery: 'Use a valid HTML attribute name like "disabled" or "data-value"'
         }
       );
     }

        try {
          targets.forEach(target => {

          // Interpolate attrValue if interpolation is enabled and contains {{...}}
          let finalAttrValue = attrValue || "";
          if (isInterpolationEnabled() && finalAttrValue && finalAttrValue.includes('{{')) {
            const context = {
              this: {
                ...invoker,
                dataset: { ...invoker.dataset },
                value: (invoker as any).value || '',
              },
              data: document.body.dataset,
              event: (invoker as any).triggeringEvent,
              target: target
            };
            finalAttrValue = interpolateString(finalAttrValue, context);
          }

          switch (action) {
            case "set":
              target.setAttribute(attrName, finalAttrValue);
              break;
               case "remove":
                 if (attrName === 'hidden') {
                  (target as HTMLElement).hidden = false;
                  target.removeAttribute('hidden'); // Ensure attribute is removed in all environments
                } else {
                  target.removeAttribute(attrName);
                }
                break;
            case "toggle":
              if (target.hasAttribute(attrName)) {
                target.removeAttribute(attrName);
              } else {
                target.setAttribute(attrName, finalAttrValue);
              }
              break;
          }
       });
    } catch (error) {
      throw createInvokerError(
        `Failed to update attribute "${attrName}" with action "${action}"`,
        ErrorSeverity.ERROR,
        {
          command: '--attr',
          element: invoker,
          cause: error as Error,
          context: { action, attrName, attrValue },
          recovery: 'Check that the attribute operation is valid for the target elements'
        }
      );
    }
  });

  // --class:clear: Clear all CSS classes
  manager.register("--class:clear", ({ targetElement }: CommandContext) => {
    targetElement.className = '';
  });

  // --class:ternary: Ternary class application
  manager.register("--class:ternary", ({ invoker, targetElement, params }: CommandContext) => {
    const [classIfTrue, classIfFalse, condition] = params;
    if (!classIfTrue || !classIfFalse || !condition) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: `--class:ternary` requires class-if-true, class-if-false, and condition.', invoker);
      }
      return;
    }
    let useTrue = false;
    if (condition === "has-content") {
      useTrue = !!(targetElement.textContent && targetElement.textContent.trim());
    } else if (condition === "has-no-content") {
      useTrue = !(targetElement.textContent && targetElement.textContent.trim());
    }
    if (useTrue) {
      targetElement.classList.add(classIfTrue);
      targetElement.classList.remove(classIfFalse);
    } else {
      targetElement.classList.remove(classIfTrue);
      targetElement.classList.add(classIfFalse);
    }
  });
}
