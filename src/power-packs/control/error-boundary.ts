/**
 * Error boundary constructs for Invokers Control module.
 * Provides data-try, data-catch, and data-finally attributes for error handling.
 */

import { getStateStore } from '../state/store';

interface ErrorBoundaryElement {
  element: HTMLElement;
  tryBlock: HTMLElement;
  catchBlock?: HTMLElement;
  finallyBlock?: HTMLElement;
  errorVariable?: string;
}

class ErrorBoundaryRenderer {
  private boundaries: ErrorBoundaryElement[] = [];

  /**
   * Enable error boundary rendering by scanning for error boundary attributes.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForErrorBoundaries();
    this.setupErrorHandling();
  }

  /**
   * Scan the document for elements with error boundary attributes.
   */
  private scanForErrorBoundaries(): void {
    const tryElements = document.querySelectorAll('[data-try]');
    tryElements.forEach(element => {
      const trySelector = element.getAttribute('data-try');
      if (!trySelector) return;

      const tryBlock = document.querySelector(trySelector) as HTMLElement;
      if (!tryBlock) {
        console.warn(`[InvokerControl] Try block selector "${trySelector}" not found`);
        return;
      }

      // Find associated catch and finally blocks
      const catchBlock = this.findCatchBlock(element as HTMLElement);
      const finallyBlock = this.findFinallyBlock(element as HTMLElement);

      this.boundaries.push({
        element: element as HTMLElement,
        tryBlock,
        catchBlock,
        finallyBlock,
        errorVariable: element.getAttribute('data-error-var') || 'error'
      });
    });
  }

  /**
   * Find the associated catch block for an error boundary.
   */
  private findCatchBlock(boundaryElement: HTMLElement): HTMLElement | undefined {
    // Look for immediate next sibling with data-catch
    let sibling = boundaryElement.nextElementSibling;
    if (sibling && sibling.hasAttribute('data-catch')) {
      return sibling as HTMLElement;
    }

    // Look for data-catch with matching data-try-id
    const tryId = boundaryElement.getAttribute('data-try-id');
    if (tryId) {
      const catchElement = document.querySelector(`[data-catch="${tryId}"]`);
      if (catchElement) {
        return catchElement as HTMLElement;
      }
    }

    return undefined;
  }

  /**
   * Find the associated finally block for an error boundary.
   */
  private findFinallyBlock(boundaryElement: HTMLElement): HTMLElement | undefined {
    // Look for data-finally with matching data-try-id
    const tryId = boundaryElement.getAttribute('data-try-id');
    if (tryId) {
      const finallyElement = document.querySelector(`[data-finally="${tryId}"]`);
      if (finallyElement) {
        return finallyElement as HTMLElement;
      }
    }

    return undefined;
  }

  /**
   * Set up error handling for try blocks.
   */
  private setupErrorHandling(): void {
    this.boundaries.forEach(boundary => {
      this.wrapTryBlock(boundary);
    });
  }

  /**
   * Wrap a try block with error handling.
   */
  private wrapTryBlock(boundary: ErrorBoundaryElement): void {
    const originalTryBlock = boundary.tryBlock;

    // Create a wrapper that catches errors during command execution
    const wrappedExecuteCommand = (originalExecute: Function) => {
      return async (...args: any[]) => {
        try {
          const result = await originalExecute.apply(this, args);

          // Execute finally block if it exists
          if (boundary.finallyBlock) {
            this.executeBlock(boundary.finallyBlock);
          }

          return result;
        } catch (error) {
          // Execute catch block if it exists
          if (boundary.catchBlock) {
            await this.executeCatchBlock(boundary, error);
          }

          // Execute finally block if it exists
          if (boundary.finallyBlock) {
            this.executeBlock(boundary.finallyBlock);
          }

          // Re-throw the error unless caught
          if (!boundary.catchBlock) {
            throw error;
          }
        }
      };
    };

    // Monkey patch the try block's command execution
    // This is a simplified approach - in practice, you'd need to integrate
    // with the InvokerManager's command execution pipeline
    const originalAddEventListener = originalTryBlock.addEventListener;
    originalTryBlock.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (type === 'command') {
        // Wrap command listeners with error handling
        const wrappedListener = wrappedExecuteCommand(listener as Function);
        return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Execute a catch block with error context.
   */
  private async executeCatchBlock(boundary: ErrorBoundaryElement, error: any): Promise<void> {
    if (!boundary.catchBlock) return;

    // Set error in state store if error variable is specified
    if (boundary.errorVariable) {
      const store = getStateStore();
      store.set(boundary.errorVariable, {
        message: error.message || String(error),
        stack: error.stack,
        name: error.name,
        originalError: error
      });
    }

    // Execute the catch block
    await this.executeBlock(boundary.catchBlock);
  }

  /**
   * Execute a block (catch or finally).
   */
  private async executeBlock(block: HTMLElement): Promise<void> {
    // Find all command-enabled elements within the block
    const commandElements = block.querySelectorAll('[command], [command-on]');

    // Execute commands in sequence
    for (const element of commandElements) {
      const command = element.getAttribute('command');
      const commandOn = element.getAttribute('command-on');

      if (command) {
        // Trigger command execution
        const event = new CustomEvent('command', { detail: { command } });
        element.dispatchEvent(event);
        // In a real implementation, you'd wait for command completion
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (commandOn) {
        // For command-on, you'd need to parse and trigger the appropriate event
        // This is simplified for the example
        console.log(`Executing command-on: ${commandOn}`);
      }
    }
  }

  /**
   * Clean up error boundaries.
   */
  destroy(): void {
    // Restore original event listeners if needed
    this.boundaries = [];
  }
}

// Global instance
let errorBoundaryRendererInstance: ErrorBoundaryRenderer | null = null;

export function enableErrorBoundaries(): void {
  if (!errorBoundaryRendererInstance) {
    errorBoundaryRendererInstance = new ErrorBoundaryRenderer();
  }
  errorBoundaryRendererInstance.enable();
}

export function disableErrorBoundaries(): void {
  if (errorBoundaryRendererInstance) {
    errorBoundaryRendererInstance.destroy();
    errorBoundaryRendererInstance = null;
  }
}