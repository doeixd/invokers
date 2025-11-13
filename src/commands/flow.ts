/**
 * @file flow.ts
 * @summary Flow Control Command Pack for the Invokers library.
 * @description
 * This module provides commands for controlling application flow including
 * asynchronous operations, event dispatching, navigation, and data binding.
 * These commands enable complex interactions and dynamic workflows.
 * 
 * @example
 * ```javascript
 * import { registerFlowCommands } from 'invokers/commands/flow';
 * import { InvokerManager } from 'invokers';
 * 
 * const invokerManager = InvokerManager.getInstance();
 * registerFlowCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, validateElement, sanitizeHTML } from '../index';
import { interpolateString } from '../advanced/interpolation';
import { resolveTargets } from '../target-resolver';

/**
 * Flow control commands for managing application state and async operations.
 * Includes fetch operations, event dispatching, navigation, and data binding.
 */
const flowCommands: Record<string, CommandCallback> = {

  // --- Fetch Commands ---

  /**
    * `--fetch:get`: Performs a GET request and swaps the response HTML into the target.
    * Supports loading/error states via templates and configurable replace strategies.
    *
    * Replace Strategies:
    * - `"innerHTML"` (default): Replace the target's inner content
    * - `"outerHTML"`: Replace the entire target element
    * - `"beforebegin"`: Insert before the target element
    * - `"afterbegin"`: Insert at the beginning of the target element
    * - `"beforeend"`: Insert at the end of the target element
    * - `"afterend"`: Insert after the target element
    *
    * @example
    * ```html
    * <button type="button"
    *   command="--fetch:get"
    *   data-url="/api/content"
    *   commandfor="content-area"
    *   data-replace-strategy="innerHTML"
    *   data-loading-template="spinner-template"
    *   data-after-error="--class:add:load-error"
    * >
    *   Load Content
    * </button>
    * ```
    */
  "--fetch:get": async ({ invoker, targetElement }: CommandContext) => {
    let url = invoker.dataset.url;
    if (!url) {
      throw createInvokerError('Fetch GET command requires a data-url attribute', ErrorSeverity.ERROR, {
        command: '--fetch:get', element: invoker, recovery: 'Add data-url="/your/endpoint" to the button.'
      });
    }

    // Interpolate the URL
    const context = {
      this: {
        ...invoker,
        value: (invoker as any).value || '',
      },
      event: (invoker as any).triggeringEvent,
    };
    url = interpolateString(url, context);

    // Dispatch fetch:before event for interceptors
    const fetchEvent = new CustomEvent('fetch:before', { detail: { url, invoker }, cancelable: true });
    window.dispatchEvent(fetchEvent);
    if (fetchEvent.defaultPrevented) {
      // Fetch was intercepted, skip actual fetch
      setBusyState(invoker, false);
      return;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createInvokerError(`HTTP Error: ${response.status} ${response.statusText}`, ErrorSeverity.ERROR, {
          command: '--fetch:get', element: invoker, context: { url, status: response.status }
        });
      }

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => {
        const strategy = invoker.dataset.replaceStrategy || "innerHTML";
        if (strategy === "innerHTML")
          targetElement.replaceChildren(newContent);
        else if (strategy === "outerHTML")
          targetElement.replaceWith(newContent);
        else if (/(before|after)(begin|end)/.test(strategy)) {
          const fragment = new DOMParser().parseFromString(html, "text/html").body.children[0];
          targetElement.insertAdjacentElement(strategy as InsertPosition, fragment)
        }
        else throw createInvokerError(`Invalid replace strategy: ${strategy}`, ErrorSeverity.ERROR, {
          command: '--fetch:get', element: invoker,
          recovery: 'Use "innerHTML", "outerHTML", or "beforebegin"/"afterbegin"/"beforeend"/"afterend"'
        });
      };
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, targetElement, "data-error-template");
      // Re-throw the error (either the one we created or a new wrapped one)
      // to allow the core manager to handle it for conditional chaining.
      if (error instanceof Error && 'severity' in error) throw error;
      throw createInvokerError('Fetch GET failed', ErrorSeverity.ERROR, {
        command: '--fetch:get', element: invoker, cause: error as Error, context: { url },
        recovery: 'Check the URL, network connection, and server response.'
      });
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--fetch:send`: Submits the target `<form>` via a POST/PUT/DELETE request.
   * The response is swapped into the element from `data-response-target`, or the form itself.
   *
   * @example
   * ```html
   * <form id="my-form" action="/api/submit" method="post"></form>
   * <button type="button"
   *   command="--fetch:send"
   *   commandfor="my-form"
   *   data-response-target="#response-area"
   *   data-replace-strategy="#response-area"
   * >
   *   Submit via Fetch
   * </button>
   * ```
   */
  "--fetch:send": async ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Fetch send failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    const form = targetElement as HTMLFormElement;

    const responseSelector = invoker.dataset.responseTarget;
    const responseTarget = responseSelector ? document.querySelector<HTMLElement>(responseSelector) : form;
    if (!responseTarget) {
      throw createInvokerError(`Response target "${responseSelector}" not found`, ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker
      });
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        body: new FormData(form),
        headers: getHeadersFromAttributes(invoker),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => {
        const strategy = invoker.dataset.replaceStrategy || "innerHTML";
        if (strategy === "innerHTML")
          responseTarget.replaceChildren(newContent);
        else if (strategy === "outerHTML")
          responseTarget.replaceWith(newContent);
        else if (/(before|after)(begin|end)/.test(strategy)) {
          const fragment = new DOMParser().parseFromString(html, "text/html").body.children[0];
          responseTarget.insertAdjacentElement(strategy as InsertPosition, fragment)
        }
        else throw strategy;
      };

      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, responseTarget, "data-error-template");
      throw createInvokerError('Fetch send failed', ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker, cause: error as Error,
        recovery: 'Check the form action, network connection, and server response.'
      });
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--fetch:delete`: Sends a DELETE request via fetch.
   *
   * @example
   * ```html
   * <button type="button"
   *   id="delete-btn"
   *   command="--fetch:delete"
   *   commandfor="delete-btn"
   *   data-url="/api/delete"
   * >
   *   Submit via Fetch
   * </button>
   * ```
   */
  "--fetch:delete": async ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['button'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Fetch delete failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--fetch:delete', element: invoker, recovery: 'Ensure commandfor points to a <button> element.'
      });
    }
    const button = targetElement as HTMLButtonElement;

    const responseSelector = invoker.dataset.responseTarget;
    const responseTarget = responseSelector ? document.querySelector<HTMLElement>(responseSelector) : button;
    if (!responseTarget) {
      throw createInvokerError(`Response target "${responseSelector}" not found`, ErrorSeverity.ERROR, {
        command: '--fetch:delete', element: invoker
      });
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    const url = button.dataset.url;
    if (!url) {
      throw createInvokerError(`  "${responseSelector}" not found`, ErrorSeverity.ERROR, {
        command: '--fetch:delete', element: invoker
      });
    }
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: getHeadersFromAttributes(invoker),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => {
        const strategy = invoker.dataset.replaceStrategy || "innerHTML";
        if (strategy === "innerHTML")
          responseTarget.replaceChildren(newContent);
        else if (strategy === "outerHTML")
          responseTarget.replaceWith(newContent);
        else if (/(before|after)(begin|end)/.test(strategy)) {
          const fragment = new DOMParser().parseFromString(html, "text/html").body.children[0];
          responseTarget.insertAdjacentElement(strategy as InsertPosition, fragment)
        }
        else throw strategy;
      };

      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, responseTarget, "data-error-template");
      throw createInvokerError('Fetch delete failed', ErrorSeverity.ERROR, {
        command: '--fetch:delete', element: invoker, cause: error as Error,
        recovery: 'Check the button definition, network connection, and server response.'
      });
    } finally {
      setBusyState(invoker, false);
    }
  },

  // --- Command Control ---

  /**
   * `--command:trigger`: Triggers an event on another element.
   * @example `<button command="--command:trigger:click" commandfor="#save-btn" data-and-then="--command:trigger:click" data-then-target="#close-btn">Save and Close</button>`
   */
  "--command:trigger": ({ targetElement, params }: CommandContext) => {
    const eventType = params[0] || 'click';
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    targetElement.dispatchEvent(event);
  },

  /**
   * `--command:delay`: Waits for a specified number of milliseconds.
   * @example `<button command="--text:set:Saved!" commandfor="#status" data-and-then="--command:delay:2000" data-then-target="#status">Save</button>`
   */
  "--command:delay": ({ params }: CommandContext) => {
    const delay = parseInt(params[0], 10);
    if (isNaN(delay) || delay < 0) {
      throw createInvokerError('Delay command requires a valid positive number of milliseconds', ErrorSeverity.ERROR, {
        command: '--command:delay'
      });
    }
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  /**
   * `--on:interval`: Executes a command repeatedly at a given interval.
   * The interval is cleared when the element is removed from the DOM.
   * @example `<div command-on="load" command="--on:interval:10000" commandfor="#live-data" data-interval-command="--fetch:get" data-url="/api/latest-stats">Loading...</div>`
   */
  "--on:interval": ({ invoker, targetElement, params }: CommandContext) => {
    const intervalMs = parseInt(params[0], 10);
    if (isNaN(intervalMs) || intervalMs <= 0) {
      throw createInvokerError('Interval command requires a valid positive interval in milliseconds', ErrorSeverity.ERROR, {
        command: '--on:interval', element: invoker
      });
    }

    const intervalCommand = invoker.dataset.intervalCommand;
    if (!intervalCommand) {
      throw createInvokerError('Interval command requires data-interval-command attribute', ErrorSeverity.ERROR, {
        command: '--on:interval', element: invoker
      });
    }

    // Clear any existing interval
    const existingIntervalId = (invoker as any)._invokerIntervalId;
    if (existingIntervalId) {
      clearInterval(existingIntervalId);
    }

    // Set up new interval
    const intervalId = setInterval(() => {
      // Execute the interval command programmatically
      if (typeof window !== 'undefined' && (window as any).Invoker) {
        const targetId = targetElement.id || `__invoker-target-${Date.now()}`;
        if (!targetElement.id) targetElement.id = targetId;
        (window as any).Invoker.executeCommand(intervalCommand, targetId, invoker);
      }
    }, intervalMs);

    // Store the interval ID
    (invoker as any)._invokerIntervalId = intervalId;

    // Clear interval when element is removed
    const observer = new MutationObserver(() => {
      if (!document.contains(invoker)) {
        clearInterval(intervalId);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  // --- Data Binding ---

  /**
   * `--bind`: Creates a one-way data binding from the target element to another element.
   * @example `<input command-on="input" command="--bind:value" commandfor="#input" data-bind-to="#output" data-bind-as="text">`
   */
  "--bind": ({ invoker, targetElement, params }: CommandContext) => {
    const sourceProperty = params.join(':');
    if (!sourceProperty) {
      throw createInvokerError('Bind command requires a source property (e.g., value, text, data:name)', ErrorSeverity.ERROR, {
        command: '--bind', element: invoker
      });
    }

    // Get the source value (prefer invoker if it has the property, otherwise targetElement)
    let sourceValue: any;
    const sourceElement = (sourceProperty === 'value' && (invoker instanceof HTMLInputElement || invoker instanceof HTMLTextAreaElement || invoker instanceof HTMLSelectElement)) ? invoker : targetElement;

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
        command: '--bind', element: invoker
      });
    }

    // Find the destination (either data-bind-to or the targetElement)
    const destinationSelector = invoker.dataset.bindTo;
    const destinations = destinationSelector
      ? resolveTargets(destinationSelector, invoker) as HTMLElement[]
      : [targetElement];

    // Apply to destinations
    const destinationProperty = invoker.dataset.bindAs || 'text';

    destinations.forEach(dest => {
      if (destinationProperty === 'value' && (dest instanceof HTMLInputElement || dest instanceof HTMLTextAreaElement || dest instanceof HTMLSelectElement)) {
        (dest as HTMLInputElement).value = sourceValue || '';
      } else if (destinationProperty === 'text') {
        dest.textContent = sourceValue || '';
      } else if (destinationProperty === 'html') {
        dest.innerHTML = sanitizeHTML(sourceValue || '');
      } else if (destinationProperty.startsWith('attr:')) {
        const attrName = destinationProperty.substring(5);
        if (sourceValue === null || sourceValue === undefined) {
          dest.removeAttribute(attrName);
        } else {
          dest.setAttribute(attrName, sourceValue);
        }
      } else if (destinationProperty.startsWith('data:')) {
        const dataName = destinationProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        if (sourceValue === null || sourceValue === undefined) {
          delete dest.dataset[dataName];
        } else {
          dest.dataset[dataName] = sourceValue;
        }
      } else if (destinationProperty === 'class:add') {
        if (sourceValue) dest.classList.add(sourceValue);
      } else if (destinationProperty === 'class:remove') {
        if (sourceValue) dest.classList.remove(sourceValue);
      }
    });
  },

  // --- Navigation ---

  /**
   * `--navigate:to`: Navigates to a new URL using the History API.
   *
   * @example
   * ```html
   * <button type="button" command="--navigate:to:/about">Go to About Page</button>
   * ```
   */
  "--navigate:to": (context: CommandContext) => {
    const url = context.params.join(':'); // Rejoin params in case URL contains colons
    if (!url) {
      throw createInvokerError('Navigate command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--navigate:to', element: context.invoker, recovery: 'Use format: --navigate:to:/your/path'
      });
    }

    if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    } else if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  },

  // --- Event Emission ---

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
  "--emit": ({ params, targetElement }: CommandContext) => {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('--emit called with targetElement:', targetElement);
    }
    const [eventType, ...detailParts] = params;
    if (!eventType) {
      throw createInvokerError('Emit command requires an event type parameter', ErrorSeverity.ERROR, {
        command: '--emit', recovery: 'Use format: --emit:event-type or --emit:event-type:detail'
      });
    }

    let detail = detailParts.length > 0 ? detailParts.join(':') : undefined;
    // Decode HTML entities in the detail string
    if (typeof detail === 'string') {
      detail = detail.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'");
    }
    // Try to parse as JSON if it looks like JSON
    if (typeof detail === 'string' && (detail.startsWith('{') || detail.startsWith('['))) {
      try {
        detail = JSON.parse(detail);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }
    const event = new CustomEvent(eventType, {
      bubbles: true,
      composed: true,
      detail
    });

    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('--emit dispatching event:', eventType, 'detail:', detail, 'to target:', targetElement);
    }
    // Dispatch to target element for local events, allowing bubbling for data-on-event listeners
    targetElement.dispatchEvent(event);
  },

  // --- Pipeline Commands ---

  /**
   * `--and-then:reset`: Resets the state of all <and-then> elements that are children of the specified element.
   * If no element ID is provided, resets children of the invoker.
   * This allows <and-then> chains to be re-executed after they have been marked as completed.
   *
   * @example
   * ```html
   * <button command="--and-then:reset:start-button">Reset And-Then States</button>
   * ```
   */
  "--and-then:reset": ({ invoker, params }: CommandContext) => {
    const targetId = params[0] || invoker.id;
    const targetElement = targetId ? document.getElementById(targetId) : invoker;

    if (!targetElement) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn('And-Then reset: Target element not found:', targetId);
      }
      return;
    }

    const andThenElements = Array.from(targetElement.children).filter(
      child => child.tagName.toLowerCase() === 'and-then'
    ) as HTMLElement[];

    const resetStates = (element: HTMLElement) => {
      // Only reset if not currently active (to avoid interfering with running executions)
      if (element.dataset.state !== 'active') {
        delete element.dataset.state;
      }
      // Recursively reset nested <and-then> elements
      const nested = Array.from(element.children).filter(
        child => child.tagName.toLowerCase() === 'and-then'
      ) as HTMLElement[];
      nested.forEach(resetStates);
    };

    andThenElements.forEach(resetStates);
  },

  /**
   * `--pipeline:execute`: Executes a predefined pipeline of commands defined in a template.
   * The pipeline is defined using <pipeline-step> elements within a <template data-pipeline="true">.
   *
   * @example
   * ```html
   * <template id="my-pipeline" data-pipeline="true">
   *   <pipeline-step command="--text:set:Step 1" target="status" />
   *   <pipeline-step command="--text:set:Step 2" target="status" delay="500" />
   * </template>
   * <button command="--pipeline:execute:my-pipeline">Run Pipeline</button>
   * ```
   */
  "--pipeline:execute": async ({ invoker, params }: CommandContext) => {
    const pipelineName = params[0];
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Pipeline: Looking for template with ID:', pipelineName);
    }

    if (!pipelineName) {
      throw createInvokerError('Pipeline execute command requires a pipeline name parameter', ErrorSeverity.ERROR, {
        command: '--pipeline:execute', element: invoker
      });
    }

    const template = document.getElementById(pipelineName);
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Pipeline: Found template:', template, 'with dataset:', template?.dataset);
    }

    if (!(template instanceof HTMLTemplateElement) || template.dataset.pipeline !== 'true') {
      throw createInvokerError(`Pipeline template "${pipelineName}" not found or not marked as pipeline`, ErrorSeverity.ERROR, {
        command: '--pipeline:execute', element: invoker
      });
    }

    const pipelineSteps = Array.from(template.content.querySelectorAll('pipeline-step'));
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Pipeline: Found', pipelineSteps.length, 'pipeline steps:', pipelineSteps);
    }

    if (pipelineSteps.length === 0) {
      throw createInvokerError(`Pipeline "${pipelineName}" contains no steps`, ErrorSeverity.ERROR, {
        command: '--pipeline:execute', element: invoker
      });
    }

    // Execute steps sequentially
    let hasError = false;

    for (let stepIndex = 0; stepIndex < pipelineSteps.length; stepIndex++) {
      const step = pipelineSteps[stepIndex];
      const command = step.getAttribute('command');
      const target = step.getAttribute('target') || 'body';
      const condition = step.getAttribute('condition') || 'success';
      const delay = parseInt(step.getAttribute('delay') || '0');
      const once = step.hasAttribute('once');

      if (!command) {
        continue;
      }

      // Check condition
      if ((condition === 'success' && hasError) || (condition === 'error' && !hasError)) {
        continue;
      }

      // Apply delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Execute the command directly using InvokerManager
      try {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('Pipeline: Executing command:', command, 'on target:', target);
        }

        // Import InvokerManager and execute command directly
        const { InvokerManager } = await import('../core');
        const manager = InvokerManager.getInstance();

        // Handle comma-separated commands with escaped comma support
        const individualCommands = splitCommands(command);

        for (const individualCommand of individualCommands) {
          await manager.executeCommand(individualCommand, target, invoker);
        }

        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('Pipeline: Command executed successfully');
        }
      } catch (error) {
        hasError = true;
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.error('Pipeline step error:', error);
        }
        // Continue to next step to allow error handling steps
      }

      // Handle 'once' attribute - remove step after execution
      if (once && step.parentNode) {
        step.parentNode.removeChild(step);
      }
    }
  }
};

// --- Private Helper Functions ---

function setBusyState(element: HTMLElement, busy: boolean): void {
  element.toggleAttribute('aria-busy', busy);
  element.classList.toggle('invoker-busy', busy);
  if ('disabled' in element) {
    (element as HTMLButtonElement).disabled = busy;
  }
}

function showFeedbackState(invoker: HTMLElement, target: HTMLElement, templateAttr: string): void {
  const templateId = invoker.dataset[templateAttr.replace('data-', '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())];
  if (!templateId) return;

  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) return;

  const content = template.content.cloneNode(true) as DocumentFragment;
  const updateDOM = () => target.replaceChildren(content);
  if (document.startViewTransition) {
    document.startViewTransition(updateDOM);
  } else {
    updateDOM();
  }
}

function getHeadersFromAttributes(element: HTMLElement): HeadersInit {
  const headers: HeadersInit = {};

  // Look for data-header-* attributes
  for (const [key, value] of Object.entries(element.dataset)) {
    if (key.startsWith('header') && key !== 'header' && value) {
      const headerName = key.substring(6).replace(/([A-Z])/g, '-$1').toLowerCase();
      headers[headerName] = value;
    }
  }

  return headers;
}

function parseHTML(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Registers all flow control and asynchronous operation commands with the InvokerManager.
 * This includes fetch operations, event dispatching, navigation, and data binding.
 * 
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerFlowCommands } from 'invokers/commands/flow';
 * import invokerManager from 'invokers';
 * 
 * registerFlowCommands(invokerManager);
 * ```
 */
// Helper function to split commands on commas, respecting escaped commas
function splitCommands(commandString: string): string[] {
  const commands: string[] = [];
  let currentCommand = '';
  let i = 0;

  while (i < commandString.length) {
    const char = commandString[i];

    if (char === '\\' && i + 1 < commandString.length && commandString[i + 1] === ',') {
      // Escaped comma - include the comma in the current command
      currentCommand += ',';
      i += 2; // Skip the backslash and comma
    } else if (char === ',') {
      // Unescaped comma - split here
      if (currentCommand.trim().length > 0) {
        commands.push(currentCommand.trim());
      }
      currentCommand = '';
      i++;
    } else {
      currentCommand += char;
      i++;
    }
  }

  // Add the last command if any
  if (currentCommand.trim().length > 0) {
    commands.push(currentCommand.trim());
  }

  return commands;
}

export function registerFlowCommands(manager: InvokerManager): void {
  for (const name in flowCommands) {
    if (flowCommands.hasOwnProperty(name)) {
      manager.register(name, flowCommands[name]);
    }
  }
}
