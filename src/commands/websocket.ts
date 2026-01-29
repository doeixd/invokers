/**
 * @file websocket.ts
 * @summary WebSocket Command Pack for the Invokers library.
 * @description
 * This module provides WebSocket commands for real-time communication
 * with connection management, message sending, and event handling.
 *
 * @example
 * ```javascript
 * import { registerWebSocketCommands } from 'invokers/commands/websocket';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerWebSocketCommands(invokerManager);
 * ```
 */
import { debugWarn, debugError } from '../utils';
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * WebSocket commands for real-time communication.
 */
const websocketCommands: Record<string, CommandCallback> = {

  /**
   * `--websocket:connect`: Establishes a WebSocket connection to the specified URL.
   * The URL is taken from the `data-url` attribute of the invoker element.
   * Stores the connection on the target element for later use.
   *
   * @example
   * ```html
   * <button command="--websocket:connect" data-url="wss://echo.websocket.org" commandfor="ws-target">
   *   Connect
   * </button>
   * <div id="ws-target"></div>
   * ```
   */
  "--websocket:connect": ({ invoker, targetElement }: CommandContext) => {
    // Validate elements are connected
    if (invoker && !invoker.isConnected) {
      throw createInvokerError('--websocket:connect failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--websocket:connect', element: invoker, recovery: 'Ensure the button is still in the document.'
      });
    }

    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--websocket:connect failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--websocket:connect', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
      });
    }

    if (!invoker.hasAttribute('data-url')) {
      throw createInvokerError(
        '--websocket:connect requires a data-url attribute',
        ErrorSeverity.ERROR,
        {
          command: '--websocket:connect',
          element: invoker,
          recovery: 'Add data-url="wss://your-websocket-url" to the element'
        }
      );
    }

    const url = invoker.getAttribute('data-url')!;
    // Validate URL format
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'ws:' && parsedUrl.protocol !== 'wss:') {
        throw createInvokerError('--websocket:connect failed: Invalid protocol', ErrorSeverity.ERROR, {
          command: '--websocket:connect', element: invoker, context: { url }, recovery: 'Use ws:// or wss:// protocol.'
        });
      }
    } catch {
      throw createInvokerError('--websocket:connect failed: Invalid WebSocket URL format', ErrorSeverity.ERROR, {
        command: '--websocket:connect', element: invoker, context: { url }, recovery: 'Use ws:// or wss:// protocol.'
      });
    }

    const protocols = invoker.getAttribute('data-protocols')?.split(',') || [];

    if (typeof WebSocket === 'undefined') {
      throw createInvokerError(
        'WebSocket is not supported in this browser',
        ErrorSeverity.ERROR,
        {
          command: '--websocket:connect',
          element: invoker,
          recovery: 'WebSocket requires a modern browser with WebSocket support'
        }
      );
    }

    // Clean up existing connection
    if ((targetElement as any)._websocketConnection) {
      try {
        (targetElement as any)._websocketConnection.close();
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Failed to close existing WebSocket connection:', error);
        }
      }
    }

    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(url, protocols);
        (targetElement as any)._websocketConnection = ws;
        (targetElement as any)._websocketUrl = url;

        ws.onopen = () => {
          if (targetElement.isConnected) {
            targetElement.dataset.websocketStatus = 'connected';
            targetElement.dispatchEvent(new CustomEvent('websocket:connected', {
              detail: { url, connection: ws }
            }));
          }
          resolve();
        };

        ws.onmessage = (event: MessageEvent) => {
          if (targetElement.isConnected) {
            targetElement.dispatchEvent(new CustomEvent('websocket:message', {
              detail: { data: event.data, origin: url }
            }));
          }
        };

        ws.onclose = (event) => {
          if (targetElement.isConnected) {
            targetElement.dataset.websocketStatus = 'disconnected';
            targetElement.dispatchEvent(new CustomEvent('websocket:disconnected', {
              detail: { code: event.code, reason: event.reason, url }
            }));
          }
        };

        ws.onerror = (error) => {
          if (targetElement.isConnected) {
            targetElement.dataset.websocketStatus = 'error';
            targetElement.dispatchEvent(new CustomEvent('websocket:error', {
              detail: { error, url }
            }));
          }
          reject(createInvokerError(
            'WebSocket connection failed',
            ErrorSeverity.ERROR,
            {
              command: '--websocket:connect',
              element: invoker,
              cause: error as unknown as Error,
              recovery: 'Check the WebSocket URL and network connectivity'
            }
          ));
        };
      } catch (error) {
        reject(createInvokerError(
          'Failed to create WebSocket connection',
          ErrorSeverity.ERROR,
          {
            command: '--websocket:connect',
            element: invoker,
            cause: error as Error,
            recovery: 'Verify the WebSocket URL format and protocols'
          }
        ));
      }
    });
  },

  /**
   * `--websocket:disconnect`: Closes the WebSocket connection on the target element.
   *
   * @example
   * ```html
   * <button command="--websocket:disconnect" commandfor="ws-target">
   *   Disconnect
   * </button>
   * ```
   */
  "--websocket:disconnect": ({ targetElement }: CommandContext) => {
    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--websocket:disconnect failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--websocket:disconnect', element: targetElement, recovery: 'Ensure the target element is still in the document.'
      });
    }

    const ws = (targetElement as any)._websocketConnection;
    if (ws) {
      try {
        ws.close();
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Error closing WebSocket connection:', error);
        }
      }
      delete (targetElement as any)._websocketConnection;
      delete (targetElement as any)._websocketUrl;
      targetElement.dataset.websocketStatus = 'disconnected';
    }
  },

  /**
   * `--websocket:send`: Sends a message through the WebSocket connection.
   * The message is taken from the `data-message` attribute or the element's text content.
   *
   * @example
   * ```html
   * <button command="--websocket:send" data-message="Hello WebSocket!" commandfor="ws-target">
   *   Send Message
   * </button>
   * ```
   */
  "--websocket:send": ({ invoker, targetElement }: CommandContext) => {
    if (invoker && !invoker.isConnected) {
      throw createInvokerError('--websocket:send failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--websocket:send', element: invoker, recovery: 'Ensure the button is still in the document.'
      });
    }

    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--websocket:send failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--websocket:send', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
      });
    }

    const ws = (targetElement as any)._websocketConnection;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw createInvokerError(
        'WebSocket is not connected',
        ErrorSeverity.ERROR,
        {
          command: '--websocket:send',
          element: invoker,
          recovery: 'Ensure WebSocket is connected before sending messages'
        }
      );
    }

    let message = invoker.getAttribute('data-message') || invoker.textContent?.trim();
    if (!message) {
      throw createInvokerError(
        '--websocket:send requires a message',
        ErrorSeverity.ERROR,
        {
          command: '--websocket:send',
          element: invoker,
          recovery: 'Add data-message attribute or text content to the element'
        }
      );
    }

    // Stringify objects if needed
    if (typeof message === 'object') {
      try {
        message = JSON.stringify(message);
      } catch (error) {
        throw createInvokerError('--websocket:send failed: Invalid message object', ErrorSeverity.ERROR, {
          command: '--websocket:send', element: invoker, cause: error as Error, recovery: 'Ensure message data is JSON-serializable.'
        });
      }
    }

    try {
      ws.send(message);
    } catch (error) {
      throw createInvokerError('--websocket:send failed: Error sending message', ErrorSeverity.ERROR, {
        command: '--websocket:send', element: invoker, cause: error as Error, recovery: 'Check WebSocket connection and message format.'
      });
    }
  },

  /**
   * `--websocket:status`: Updates the target element to show the current WebSocket connection status.
   *
   * @example
   * ```html
   * <button command="--websocket:status" commandfor="ws-target">
   *   Check Status
   * </button>
   * ```
   */
  "--websocket:status": ({ targetElement }: CommandContext) => {
    if (!targetElement || !targetElement.isConnected) {
      throw createInvokerError('--websocket:status failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
        command: '--websocket:status', element: targetElement, recovery: 'Ensure the target element is still in the document.'
      });
    }

    const ws = (targetElement as any)._websocketConnection;
    let status = 'disconnected';

    if (ws) {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          status = 'connecting';
          break;
        case WebSocket.OPEN:
          status = 'connected';
          break;
        case WebSocket.CLOSING:
          status = 'closing';
          break;
        case WebSocket.CLOSED:
          status = 'disconnected';
          break;
        default:
          status = 'unknown';
      }
    }

    targetElement.dataset.websocketStatus = status;
    targetElement.textContent = `WebSocket: ${status}`;
  },

  /**
   * `--websocket:on:message`: Sets up a message handler for WebSocket messages.
   * The handler command is specified in the `data-message-command` attribute.
   *
   * @example
   * ```html
   * <div command="--websocket:on:message" data-message-command="--text:append" commandfor="ws-target">
   *   Message Handler
   * </div>
   * ```
   */
   "--websocket:on:message": ({ invoker, targetElement }: CommandContext) => {
     if (invoker && !invoker.isConnected) {
       throw createInvokerError('--websocket:on:message failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
         command: '--websocket:on:message', element: invoker, recovery: 'Ensure the element is still in the document.'
       });
     }

     if (!targetElement || !targetElement.isConnected) {
       throw createInvokerError('--websocket:on:message failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
         command: '--websocket:on:message', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
       });
     }

     const ws = (targetElement as any)._websocketConnection;
     if (!ws) {
       throw createInvokerError(
         'No WebSocket connection found',
         ErrorSeverity.ERROR,
         {
           command: '--websocket:on:message',
           element: invoker,
           recovery: 'Ensure WebSocket is connected before setting up message handlers'
         }
       );
     }

     const command = invoker.getAttribute('data-message-command');
     if (!command) {
       throw createInvokerError(
         '--websocket:on:message requires data-message-command attribute',
         ErrorSeverity.ERROR,
         {
           command: '--websocket:on:message',
           element: invoker,
           recovery: 'Add data-message-command="--your:command" to specify what to do with messages'
         }
       );
     }

     ws.onmessage = (event: MessageEvent) => {
       try {
         // Execute the specified command with the message data
         // For simplicity, directly append the message data to the invoker element
         // This assumes the command is something like --text:append
         if (invoker.isConnected) {
           invoker.textContent += event.data;
         }

         // Dispatch custom event
         if (targetElement.isConnected) {
           targetElement.dispatchEvent(new CustomEvent('websocket:message', {
             detail: { data: event.data, origin: (targetElement as any)._websocketUrl }
           }));
         }
       } catch (error) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugError('Error handling WebSocket message:', error);
         }
       }
      };
  }
};

export function registerWebSocketCommands(manager: InvokerManager): void {
  for (const name in websocketCommands) {
    if (websocketCommands.hasOwnProperty(name)) {
      manager.register(name, websocketCommands[name]);
    }
  }
}
