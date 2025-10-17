/**
 * @file fetch.ts
 * @summary Fetch Command Pack for the Invokers library.
 * @description
 * This module provides HTTP fetch commands for making network requests
 * with loading states, error handling, and response processing.
 *
 * @example
 * ```javascript
 * import { registerFetchCommands } from 'invokers/commands/fetch';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerFetchCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';
import { interpolateString } from '../advanced/interpolation';

/**
 * Fetch commands for making HTTP requests with advanced response handling.
 */
const fetchCommands: Record<string, CommandCallback> = {

  // --- Fetch Commands ---

  /**
    * `--fetch:get`: Performs a GET request and handles the response.
    * Supports HTML/JSON/text responses, loading/error states, and configurable replace strategies.
    *
    * Replace Strategies (for HTML responses):
    * - `"innerHTML"` (default): Replace the target's inner content
    * - `"outerHTML"`: Replace the entire target element
    * - `"beforebegin"`: Insert before the target element
    * - `"afterbegin"`: Insert at the beginning of the target element
    * - `"beforeend"`: Insert at the end of the target element
    * - `"afterend"`: Insert after the target element
    *
    * Response Types:
    * - `"html"` (default): Parse as HTML and insert into DOM
    * - `"json"`: Parse as JSON and set as data-response attribute
    * - `"text"`: Set as textContent
    *
    * @example
    * ```html
    * <button type="button"
    *   command="--fetch:get"
    *   data-url="/api/content"
    *   commandfor="content-area"
    *   data-response-type="html"
    *   data-replace-strategy="innerHTML"
    *   data-loading-template="spinner-template"
    *   data-header-authorization="Bearer token123"
    *   data-credentials="include"
    *   data-after-error="--class:add:load-error"
    * >
    *   Load Content
    * </button>
    * ```
    */
   "--fetch:get": async ({ invoker, targetElement }: CommandContext) => {
     return executeFetch({ invoker, targetElement, method: 'GET', command: '--fetch:get' });
   },

  /**
   * `--fetch:put`: Performs a PUT request with optional body.
   * Typically used for full resource updates.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:put"
   *   data-url="/api/users/123"
   *   data-body='{"name":"Jane","email":"jane@example.com"}'
   *   data-header-content-type="application/json"
   *   commandfor="result"
   * >
   *   Update User
   * </button>
   * ```
   */
  "--fetch:put": async ({ invoker, targetElement }: CommandContext) => {
    return executeFetch({ invoker, targetElement, method: 'PUT', command: '--fetch:put' });
  },

  /**
   * `--fetch:patch`: Performs a PATCH request with optional body.
   * Typically used for partial resource updates.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:patch"
   *   data-url="/api/users/123"
   *   data-body='{"email":"newemail@example.com"}'
   *   data-header-content-type="application/json"
   *   commandfor="result"
   * >
   *   Update Email
   * </button>
   * ```
   */
  "--fetch:patch": async ({ invoker, targetElement }: CommandContext) => {
    return executeFetch({ invoker, targetElement, method: 'PATCH', command: '--fetch:patch' });
  },

  /**
   * `--fetch:post`: Performs a POST request with optional body.
   * Typically used for creating new resources.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:post"
   *   data-url="/api/users"
   *   data-body='{"name":"John","email":"john@example.com"}'
   *   data-header-content-type="application/json"
   *   commandfor="result"
   * >
   *   Create User
   * </button>
   * ```
   */
  "--fetch:post": async ({ invoker, targetElement }: CommandContext) => {
    return executeFetch({ invoker, targetElement, method: 'POST', command: '--fetch:post' });
  },

  /**
   * `--fetch:delete`: Performs a DELETE request.
   * Typically used for deleting resources.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:delete"
   *   data-url="/api/users/123"
   *   commandfor="result"
   * >
   *   Delete User
   * </button>
   * ```
   */
  "--fetch:delete": async ({ invoker, targetElement }: CommandContext) => {
    return executeFetch({ invoker, targetElement, method: 'DELETE', command: '--fetch:delete' });
  },

  /**
   * `--fetch:head`: Performs a HEAD request and stores headers.
   * Useful for checking resource existence and metadata without downloading content.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:head"
   *   data-url="/api/resource"
   *   commandfor="headers-display"
   * >
   *   Check Headers
   * </button>
   * ```
   */
  "--fetch:head": async ({ invoker, targetElement }: CommandContext) => {
    return executeFetch({ invoker, targetElement, method: 'HEAD', command: '--fetch:head' });
  },

  /**
   * `--fetch:options`: Performs an OPTIONS request and stores allowed methods/headers.
   * Useful for CORS preflight and API discovery.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:options"
   *   data-url="/api/resource"
   *   commandfor="options-display"
   * >
   *   Check Options
   * </button>
   * ```
   */
  "--fetch:options": async ({ invoker, targetElement }: CommandContext) => {
    return executeFetch({ invoker, targetElement, method: 'OPTIONS', command: '--fetch:options' });
  }
};

/**
 * Core fetch execution logic shared by all HTTP verb commands.
 * Handles URL interpolation, request setup, response processing, and error handling.
 */
async function executeFetch({
  invoker,
  targetElement,
  method,
  command
}: {
  invoker: HTMLElement;
  targetElement: HTMLElement;
  method: string;
  command: string;
}): Promise<void> {
  try {
    // Validate invoker element
    if (!invoker || !invoker.isConnected) {
      throw createInvokerError(`${command} failed: Invoker element is not connected to DOM`, ErrorSeverity.ERROR, {
        command, element: invoker, recovery: 'Ensure the button is still in the document.'
      });
    }

    // Validate target element
    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError(`${command} failed: Target element is not connected to DOM`, ErrorSeverity.ERROR, {
        command, element: invoker, recovery: 'Ensure the target element exists and is in the document.'
      });
    }

    // Get and validate URL
    let url = invoker.dataset.url;
    if (!url) {
      throw createInvokerError(`${command} requires a data-url attribute`, ErrorSeverity.ERROR, {
        command, element: invoker, recovery: 'Add data-url="/your/endpoint" to the button.'
      });
    }

    // Validate URL format
    try {
      new URL(url, window.location.origin);
    } catch {
      throw createInvokerError(`${command} failed: Invalid URL format`, ErrorSeverity.ERROR, {
        command, element: invoker, context: { url }, recovery: 'Ensure the URL is properly formatted.'
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
    try {
      url = interpolateString(url, context);
    } catch (error) {
      throw createInvokerError(`${command} failed: URL interpolation error`, ErrorSeverity.ERROR, {
        command, element: invoker, cause: error as Error, recovery: 'Check URL template syntax.'
      });
    }

    // Dispatch fetch:before event for interceptors
    const fetchEvent = new CustomEvent('fetch:before', {
      detail: { url, method, invoker },
      cancelable: true
    });
    window.dispatchEvent(fetchEvent);
    if (fetchEvent.defaultPrevented) {
      setBusyState(invoker, false);
      return;
    }

    // Determine response target (can be different from command target)
    const responseSelector = invoker.dataset.responseTarget;
    let responseTarget: HTMLElement;
    if (responseSelector) {
      responseTarget = document.querySelector<HTMLElement>(responseSelector) || targetElement;
      if (!responseTarget.isConnected) {
        throw createInvokerError(`${command} failed: Response target element not found or not connected`, ErrorSeverity.ERROR, {
          command, element: invoker, context: { responseSelector }, recovery: 'Ensure the response target selector matches an existing element.'
        });
      }
    } else {
      responseTarget = targetElement;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    // Setup abort controller with timeout
    const controller = new AbortController();
    const timeout = parseInt(invoker.dataset.timeout || '30000', 10);
    if (isNaN(timeout) || timeout <= 0) {
      throw createInvokerError(`${command} failed: Invalid timeout value`, ErrorSeverity.ERROR, {
        command, element: invoker, recovery: 'Use a positive number for data-timeout (milliseconds).'
      });
    }
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Build request body for methods that support it
    let body: BodyInit | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = getRequestBody(invoker);
    }

    // Build headers
    const headers = buildHeaders(invoker, method);

    // Execute fetch
    const response = await fetch(url!, {
      method,
      headers,
      body,
      signal: controller.signal,
      credentials: (invoker.dataset.credentials as RequestCredentials) || 'same-origin',
      mode: (invoker.dataset.mode as RequestMode) || 'cors',
    });
    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      const error = createInvokerError(`HTTP Error: ${response.status} ${response.statusText}`, ErrorSeverity.ERROR, {
        command, element: invoker, context: { url, status: response.status }
      });

      // Show error state but don't throw (handle gracefully)
      if (invoker?.isConnected && responseTarget?.isConnected) {
        showFeedbackState(invoker, responseTarget, "data-error-template");
      }

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('fetch:error', {
        detail: { url, method, error, invoker }
      }));

      // Log error in debug mode
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.error(`${command} failed:`, error);
      }

      return; // Exit gracefully without throwing
    }

    // Handle response based on type
    const responseType = invoker.dataset.responseType || (method === 'HEAD' || method === 'OPTIONS' ? 'headers' : 'html');
    await handleResponse(response, responseType, responseTarget, invoker);

    // Dispatch success event
    window.dispatchEvent(new CustomEvent('fetch:success', {
      detail: { url, method, response, invoker }
    }));

  } catch (error) {
    // Ensure elements are still connected before showing error state
    if (invoker?.isConnected && targetElement?.isConnected) {
      const responseSelector = invoker.dataset.responseTarget;
      const responseTarget = responseSelector
        ? document.querySelector<HTMLElement>(responseSelector) || targetElement
        : targetElement;

      if (responseTarget?.isConnected) {
        showFeedbackState(invoker, responseTarget, "data-error-template");
      }
    }

    // Dispatch error event
    window.dispatchEvent(new CustomEvent('fetch:error', {
      detail: { url: invoker?.dataset?.url, method, error, invoker }
    }));

    // Log error in debug mode
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error(`${command} failed:`, error);
    }

    // Handle gracefully - do not re-throw to allow command chain to continue
  } finally {
    // Ensure invoker is still connected before clearing busy state
    if (invoker?.isConnected) {
      setBusyState(invoker, false);
    }
  }
}

/**
 * Builds request headers from data-header-* attributes and defaults.
 */
function buildHeaders(invoker: HTMLElement, _method: string): HeadersInit {
  try {
    if (!invoker || !invoker.isConnected) return {};

    const headers: HeadersInit = {};

    // Add default Accept header based on response type
    const responseType = invoker.dataset.responseType || 'html';
    if (responseType === 'json') {
      headers['Accept'] = 'application/json';
    } else if (responseType === 'html') {
      headers['Accept'] = 'text/html';
    }

    // Merge with custom headers from data-header-* attributes
    const customHeaders = getHeadersFromAttributes(invoker);
    Object.assign(headers, customHeaders);

    return headers;
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error('Failed to build headers:', error);
    }
    return {};
  }
}

/**
 * Gets request body from data-body or data-body-from attributes.
 */
function getRequestBody(invoker: HTMLElement): BodyInit | undefined {
  try {
    // Check for inline body (data-body attribute)
    const inlineBody = invoker.dataset.body;
    if (inlineBody) {
      // Basic validation for JSON
      if (inlineBody.trim().startsWith('{') || inlineBody.trim().startsWith('[')) {
        try {
          JSON.parse(inlineBody);
        } catch (error) {
          throw createInvokerError('Invalid JSON in data-body attribute', ErrorSeverity.ERROR, {
            element: invoker, cause: error as Error, recovery: 'Ensure the JSON is properly formatted.'
          });
        }
      }
      return inlineBody;
    }

    // Check for body source (data-body-from attribute)
    const bodyFromSelector = invoker.dataset.bodyFrom;
    if (bodyFromSelector) {
      const sourceElement = document.querySelector(bodyFromSelector);
      if (!sourceElement) {
        throw createInvokerError(`Body source element "${bodyFromSelector}" not found`, ErrorSeverity.ERROR, {
          element: invoker, recovery: 'Ensure the selector matches an existing element.'
        });
      }

      if (!sourceElement.isConnected) {
        throw createInvokerError(`Body source element "${bodyFromSelector}" is not connected to DOM`, ErrorSeverity.ERROR, {
          element: invoker, recovery: 'Ensure the source element is still in the document.'
        });
      }

      // If it's a form, return FormData
      if (sourceElement instanceof HTMLFormElement) {
        return new FormData(sourceElement);
      }

      // If it's an input/textarea, return its value
      if (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement) {
        return sourceElement.value;
      }

      // Otherwise return textContent
      return sourceElement.textContent || '';
    }

    return undefined;
  } catch (error) {
    throw createInvokerError('Failed to build request body', ErrorSeverity.ERROR, {
      element: invoker, cause: error as Error, recovery: 'Check data-body or data-body-from attributes.'
    });
  }
}

/**
 * Handles the fetch response based on the specified response type.
 */
async function handleResponse(
  response: Response,
  responseType: string,
  targetElement: HTMLElement,
  invoker: HTMLElement
): Promise<void> {
  try {
    // Validate elements are still connected
    if (!targetElement.isConnected || !invoker.isConnected) {
      throw createInvokerError('Response handling failed: Elements not connected to DOM', ErrorSeverity.ERROR, {
        element: invoker, recovery: 'Ensure target elements are still in the document.'
      });
    }

    const strategy = invoker.dataset.replaceStrategy || "innerHTML";

    if (responseType === 'headers' || responseType === 'HEAD' || responseType === 'OPTIONS') {
      // Store response headers as JSON in data attribute
      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      targetElement.dataset.responseHeaders = JSON.stringify(headersObj);
      targetElement.dataset.responseStatus = response.status.toString();
      return;
    }

    if (responseType === 'json') {
      let json: any;
      try {
        json = await response.json();
      } catch (error) {
        throw createInvokerError('Failed to parse JSON response', ErrorSeverity.ERROR, {
          element: invoker, cause: error as Error, recovery: 'Ensure the response is valid JSON.'
        });
      }
      targetElement.dataset.response = JSON.stringify(json);

      // Also set as textContent if strategy allows
      if (strategy === 'text' || strategy === 'innerHTML') {
        targetElement.textContent = JSON.stringify(json, null, 2);
      }
      return;
    }

    if (responseType === 'text') {
      let text: string;
      try {
        text = await response.text();
      } catch (error) {
        throw createInvokerError('Failed to read text response', ErrorSeverity.ERROR, {
          element: invoker, cause: error as Error, recovery: 'Check response content type.'
        });
      }
      const updateDOM = () => {
        if (targetElement.isConnected) {
          targetElement.textContent = text;
        }
      };
      await (document.startViewTransition
        ? document.startViewTransition(updateDOM).finished
        : Promise.resolve(updateDOM()));
      return;
    }

    // Default: HTML response
    if (responseType === 'html' || !responseType) {
      let html: string;
      try {
        html = await response.text();
      } catch (error) {
        throw createInvokerError('Failed to read HTML response', ErrorSeverity.ERROR, {
          element: invoker, cause: error as Error, recovery: 'Check response content type.'
        });
      }

      const updateDOM = () => {
        if (!targetElement.isConnected) return;

        try {
          if (strategy === "innerHTML") {
            const newContent = parseHTML(html);
            targetElement.replaceChildren(newContent);
          } else if (strategy === "outerHTML") {
            const newContent = parseHTML(html);
            targetElement.replaceWith(newContent);
          } else if (/(before|after)(begin|end)/.test(strategy)) {
            const fragment = new DOMParser().parseFromString(html, "text/html").body.children[0];
            if (fragment) {
              targetElement.insertAdjacentElement(strategy as InsertPosition, fragment);
            }
          } else if (strategy === "text") {
            targetElement.textContent = html;
          } else {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              console.error(`Invalid replace strategy: ${strategy}. Use "innerHTML", "outerHTML", "text", or "beforebegin"/"afterbegin"/"beforeend"/"afterend"`);
            }
            return; // Don't update DOM for invalid strategy
          }
        } catch (error) {
          throw createInvokerError('Failed to update DOM with response', ErrorSeverity.ERROR, {
            element: invoker, cause: error as Error, recovery: 'Check HTML content and replace strategy.'
          });
        }
      };

      await (document.startViewTransition
        ? document.startViewTransition(updateDOM).finished
        : Promise.resolve(updateDOM()));
      return;
    }

    throw createInvokerError(`Invalid response type: ${responseType}`, ErrorSeverity.ERROR, {
      element: invoker,
      recovery: 'Use "html", "json", "text", or "headers"'
    });
  } catch (error) {
    throw createInvokerError('Response handling failed', ErrorSeverity.ERROR, {
      element: invoker, cause: error as Error, recovery: 'Check response type and target element.'
    });
  }
}

function setBusyState(element: HTMLElement, busy: boolean): void {
  try {
    if (!element || !element.isConnected) return;

    element.toggleAttribute('aria-busy', busy);
    element.classList.toggle('invoker-busy', busy);
    if ('disabled' in element) {
      (element as HTMLButtonElement).disabled = busy;
    }
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error('Failed to set busy state:', error);
    }
  }
}

function showFeedbackState(invoker: HTMLElement, target: HTMLElement, templateAttr: string): void {
  try {
    if (!invoker?.isConnected || !target?.isConnected) return;

    const templateId = invoker.dataset[templateAttr.replace('data-', '').replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase())];
    if (!templateId) return;

    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement) || !template.isConnected) return;

    const content = template.content.cloneNode(true) as DocumentFragment;
    const updateDOM = () => {
      if (target.isConnected) {
        target.replaceChildren(content);
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(updateDOM);
    } else {
      updateDOM();
    }
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error('Failed to show feedback state:', error);
    }
  }
}

function getHeadersFromAttributes(element: HTMLElement): HeadersInit {
  try {
    if (!element || !element.isConnected) return {};

    const headers: HeadersInit = {};

    // Look for data-header-* attributes
    for (const [key, value] of Object.entries(element.dataset)) {
      if (key.startsWith('header') && key !== 'header' && value) {
        try {
          // Remove 'header' prefix and convert camelCase to kebab-case
          const headerKey = key.substring(6); // Remove 'header' prefix
          const headerName = headerKey.charAt(0).toLowerCase() + headerKey.slice(1).replace(/([A-Z])/g, (_: string, letter: string) => `-${letter.toLowerCase()}`);
          headers[headerName] = value;
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn(`Failed to process header attribute ${key}:`, error);
          }
        }
      }
    }

    return headers;
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error('Failed to get headers from attributes:', error);
    }
    return {};
  }
}

function parseHTML(html: string): DocumentFragment {
  try {
    if (typeof html !== 'string') {
      throw createInvokerError('HTML must be a string', ErrorSeverity.ERROR, {
        recovery: 'Provide a string value for HTML content'
      });
    }

    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error('Failed to parse HTML:', error);
    }
    // Return empty fragment on error
    const emptyTemplate = document.createElement('template');
    return emptyTemplate.content;
  }
}

export function registerFetchCommands(manager: InvokerManager): void {
  for (const name in fetchCommands) {
    if (fetchCommands.hasOwnProperty(name)) {
      manager.register(name, fetchCommands[name]);
    }
  }
}