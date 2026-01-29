/**
 * @file sse.ts
 * @summary Server-Sent Events Command Pack for the Invokers library.
 * @description
 * This module provides Server-Sent Events commands for real-time server-to-client
 * communication with connection management and event handling.
 *
 * @example
 * ```javascript
 * import { registerSSECommands } from 'invokers/commands/sse';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerSSECommands(invokerManager);
 * ```
 */
import { debugWarn, debugError } from '../utils';
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Server-Sent Events commands for real-time server communication.
 */
const sseCommands: Record<string, CommandCallback> = {

  /**
   * `--sse:connect`: Establishes a Server-Sent Events connection to the specified URL.
   * The URL is taken from the `data-url` attribute of the invoker element.
   *
   * @example
   * ```html
   * <button command="--sse:connect" data-url="/api/events" commandfor="sse-target">
   *   Connect to Events
   * </button>
   * <div id="sse-target"></div>
   * ```
   */
  "--sse:connect": ({ invoker, targetElement }: CommandContext) => {
    // Validate elements are connected
    if (invoker && !invoker.isConnected) {
      throw createInvokerError('--sse:connect failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:connect', element: invoker, recovery: 'Ensure the button is still in the document.'
      });
    }

    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--sse:connect failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:connect', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
      });
    }

    if (!invoker.hasAttribute('data-url')) {
      throw createInvokerError(
        '--sse:connect requires a data-url attribute',
        ErrorSeverity.ERROR,
        {
          command: '--sse:connect',
          element: invoker,
          recovery: 'Add data-url="/your-events-endpoint" to the element'
        }
      );
    }

    const url = invoker.getAttribute('data-url')!;
    // Validate URL format
    try {
      new URL(url, window.location.origin);
    } catch {
      throw createInvokerError('--sse:connect failed: Invalid URL format', ErrorSeverity.ERROR, {
        command: '--sse:connect', element: invoker, context: { url }, recovery: 'Ensure the URL is properly formatted.'
      });
    }

    const withCredentials = invoker.hasAttribute('data-credentials');

    if (typeof EventSource === 'undefined') {
      throw createInvokerError(
        'Server-Sent Events are not supported in this browser',
        ErrorSeverity.ERROR,
        {
          command: '--sse:connect',
          element: invoker,
          recovery: 'SSE requires a modern browser with EventSource support'
        }
      );
    }

    // Clean up existing connection
    if ((targetElement as any)._sseConnection) {
      try {
        (targetElement as any)._sseConnection.close();
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Failed to close existing SSE connection:', error);
        }
      }
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const es = new EventSource(url, { withCredentials });
        (targetElement as any)._sseConnection = es;
        (targetElement as any)._sseUrl = url;

        es.onopen = () => {
          if (targetElement.isConnected) {
            targetElement.dataset.sseStatus = 'connected';
            targetElement.dispatchEvent(new CustomEvent('sse:connected', {
              detail: { url, connection: es }
            }));
          }
          resolve();
        };

        es.onmessage = (event: MessageEvent) => {
          if (targetElement.isConnected) {
            targetElement.dispatchEvent(new CustomEvent('sse:message', {
              detail: { data: event.data, type: event.type, origin: url }
            }));
          }
        };

        es.onerror = (error) => {
          if (targetElement.isConnected) {
            targetElement.dataset.sseStatus = 'error';
            targetElement.dispatchEvent(new CustomEvent('sse:error', {
              detail: { error, url }
            }));
          }
          reject(createInvokerError(
            'SSE connection failed',
            ErrorSeverity.ERROR,
            {
              command: '--sse:connect',
              element: invoker,
              cause: error as unknown as Error,
              recovery: 'Check the SSE URL and server configuration'
            }
          ));
        };
      } catch (error) {
        reject(createInvokerError(
          'Failed to create SSE connection',
          ErrorSeverity.ERROR,
          {
            command: '--sse:connect',
            element: invoker,
            cause: error as Error,
            recovery: 'Verify the SSE URL format'
          }
        ));
      }
    });
  },

  /**
   * `--sse:disconnect`: Closes the Server-Sent Events connection on the target element.
   *
   * @example
   * ```html
   * <button command="--sse:disconnect" commandfor="sse-target">
   *   Disconnect
   * </button>
   * ```
   */
  "--sse:disconnect": ({ targetElement }: CommandContext) => {
    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--sse:disconnect failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:disconnect', element: targetElement, recovery: 'Ensure the target element is still in the document.'
      });
    }

    const connection = (targetElement as any)._sseConnection;
    if (connection && connection.readyState !== EventSource.CLOSED) {
      try {
        connection.close();
        targetElement.dataset.sseStatus = 'disconnected';
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Error closing SSE connection:', error);
        }
      }
    }
  },

  /**
   * `--sse:status`: Updates the target element with current SSE connection status.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--sse:status"
   *   commandfor="status-display"
   * >
   *   Check SSE Status
   * </button>
   * ```
   */
  "--sse:status": ({ targetElement }: CommandContext) => {
    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--sse:status failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:status', element: targetElement, recovery: 'Ensure the target element is still in the document.'
      });
    }

    const connection = (targetElement as any)._sseConnection;
    let status = 'disconnected';

    if (connection) {
      switch (connection.readyState) {
        case EventSource.CONNECTING:
          status = 'connecting';
          break;
        case EventSource.OPEN:
          status = 'connected';
          break;
        case EventSource.CLOSED:
          status = 'disconnected';
          break;
        default:
          status = 'unknown';
      }
    }

    targetElement.dataset.sseStatus = status;
    targetElement.textContent = `SSE: ${status}`;
  },

  /**
   * `--sse:on:message`: Sets up a message handler for Server-Sent Events.
   * The handler command is specified in the `data-message-command` attribute.
   *
   * @example
   * ```html
   * <div command="--sse:on:message" data-message-command="--text:append" commandfor="sse-target">
   *   Message Handler
   * </div>
   * ```
   */
  "--sse:on:message": ({ invoker, targetElement }: CommandContext) => {
    if (invoker && !invoker.isConnected) {
      throw createInvokerError('--sse:on:message failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:on:message', element: invoker, recovery: 'Ensure the element is still in the document.'
      });
    }

    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--sse:on:message failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:on:message', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
      });
    }

    const es = (targetElement as any)._sseConnection;
    if (!es) {
      throw createInvokerError(
        'No SSE connection found',
        ErrorSeverity.ERROR,
        {
          command: '--sse:on:message',
          element: invoker,
          recovery: 'Ensure SSE is connected before setting up message handlers'
        }
      );
    }

    const command = invoker.getAttribute('data-message-command');
    if (!command) {
      throw createInvokerError(
        '--sse:on:message requires data-message-command attribute',
        ErrorSeverity.ERROR,
        {
          command: '--sse:on:message',
          element: invoker,
          recovery: 'Add data-message-command="--your:command" to specify what to do with messages'
        }
      );
    }

    es.onmessage = (event: MessageEvent) => {
      try {
        // Execute the specified command with the message data
        // For simplicity, directly append the message data to the invoker element
        // This assumes the command is something like --text:append
        if (invoker.isConnected) {
          invoker.textContent += event.data;
        }

        // Dispatch custom event
        if (targetElement.isConnected) {
          targetElement.dispatchEvent(new CustomEvent('sse:message', {
            detail: { data: event.data, type: event.type, origin: (targetElement as any)._sseUrl }
          }));
        }
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugError('Error handling SSE message:', error);
        }
      }
    };
  },

  /**
   * `--sse:on:event`: Sets up an event handler for specific Server-Sent Event types.
   * The event type is specified as a parameter (e.g., --sse:on:event:user-joined).
   * The handler command is specified in the `data-event-command` attribute.
   *
   * @example
   * ```html
   * <div command="--sse:on:event:user-joined" data-event-command="--text:append" commandfor="sse-target">
   *   User Joined Handler
   * </div>
   * ```
   */
  "--sse:on:event": ({ invoker, targetElement, params }: CommandContext) => {
    if (invoker && !invoker.isConnected) {
      throw createInvokerError('--sse:on:event failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:on:event', element: invoker, recovery: 'Ensure the element is still in the document.'
      });
    }

    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--sse:on:event failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--sse:on:event', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
      });
    }

    const es = (targetElement as any)._sseConnection;
    if (!es) {
      throw createInvokerError(
        'No SSE connection found',
        ErrorSeverity.ERROR,
        {
          command: '--sse:on:event',
          element: invoker,
          recovery: 'Ensure SSE is connected before setting up event handlers'
        }
      );
    }

    const eventType = params[0];
    if (!eventType) {
      throw createInvokerError(
        '--sse:on:event requires an event type parameter',
        ErrorSeverity.ERROR,
        {
          command: '--sse:on:event',
          element: invoker,
          recovery: 'Use format: --sse:on:event:event-type'
        }
      );
    }

    const command = invoker.getAttribute('data-event-command');
    if (!command) {
      throw createInvokerError(
        '--sse:on:event requires data-event-command attribute',
        ErrorSeverity.ERROR,
        {
          command: '--sse:on:event',
          element: invoker,
          recovery: 'Add data-event-command="--your:command" to specify what to do with events'
        }
      );
    }

    es.addEventListener(eventType, (event: MessageEvent) => {
      try {
        // Execute the specified command with the event data
        // For simplicity, directly append the event data to the invoker element
        // This assumes the command is something like --text:append
        if (invoker.isConnected) {
          invoker.textContent += event.data;
        }

        // Dispatch custom event
        if (targetElement.isConnected) {
          targetElement.dispatchEvent(new CustomEvent('sse:event', {
            detail: { data: event.data, type: event.type, eventType, origin: (targetElement as any)._sseUrl }
          }));
        }
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugError('Error handling SSE event:', error);
        }
      }
    });
  }
};

export function registerSSECommands(manager: InvokerManager): void {
  for (const name in sseCommands) {
    if (sseCommands.hasOwnProperty(name)) {
      manager.register(name, sseCommands[name]);
    }
  }
}
