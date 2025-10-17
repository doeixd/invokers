/**
 * Async control constructs for Invokers Control module.
 * Provides data-parallel, data-race, and data-sequence attributes for async flow control.
 */

interface AsyncControlElement {
  element: HTMLElement;
  type: 'parallel' | 'race' | 'sequence';
  children: HTMLElement[];
  completionVariable?: string;
}

class AsyncControlRenderer {
  private asyncControls: AsyncControlElement[] = [];

  /**
   * Enable async control rendering by scanning for async control attributes.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForAsyncControls();
    this.setupAsyncHandling();
  }

  /**
   * Scan the document for elements with async control attributes.
   */
  private scanForAsyncControls(): void {
    // data-parallel - execute all children in parallel
    const parallelElements = document.querySelectorAll('[data-parallel]');
    parallelElements.forEach(element => {
      this.asyncControls.push({
        element: element as HTMLElement,
        type: 'parallel',
        children: Array.from(element.children) as HTMLElement[],
        completionVariable: element.getAttribute('data-result-var') || undefined
      });
    });

    // data-race - execute all children, complete when first finishes
    const raceElements = document.querySelectorAll('[data-race]');
    raceElements.forEach(element => {
      this.asyncControls.push({
        element: element as HTMLElement,
        type: 'race',
        children: Array.from(element.children) as HTMLElement[],
        completionVariable: element.getAttribute('data-result-var') || undefined
      });
    });

    // data-sequence - execute children in sequence
    const sequenceElements = document.querySelectorAll('[data-sequence]');
    sequenceElements.forEach(element => {
      this.asyncControls.push({
        element: element as HTMLElement,
        type: 'sequence',
        children: Array.from(element.children) as HTMLElement[],
        completionVariable: element.getAttribute('data-result-var') || undefined
      });
    });
  }

  /**
   * Set up async handling for control elements.
   */
  private setupAsyncHandling(): void {
    this.asyncControls.forEach(control => {
      this.setupControlElement(control);
    });
  }

  /**
   * Set up a single async control element.
   */
  private setupControlElement(control: AsyncControlElement): void {
    // Hide children initially
    control.children.forEach(child => {
      child.style.display = 'none';
    });

    // Set up the control element to trigger async execution
    control.element.addEventListener('click', () => {
      this.executeAsyncControl(control);
    });

    // Also support command attribute
    const command = control.element.getAttribute('command');
    if (command) {
      // The command execution will be handled by the main InvokerManager
      // This element serves as a trigger for the async control
    }
  }

  /**
   * Execute an async control block.
   */
  private async executeAsyncControl(control: AsyncControlElement): Promise<void> {
    try {
      let result: any;

      switch (control.type) {
        case 'parallel':
          result = await this.executeParallel(control);
          break;
        case 'race':
          result = await this.executeRace(control);
          break;
        case 'sequence':
          result = await this.executeSequence(control);
          break;
      }

      // Store result if completion variable is specified
      if (control.completionVariable) {
        // In a real implementation, this would integrate with the state store
        console.log(`Async control result stored in ${control.completionVariable}:`, result);
      }

      // Dispatch completion event
      control.element.dispatchEvent(new CustomEvent('async:complete', {
        detail: { result, type: control.type }
      }));

    } catch (error) {
      console.error(`[InvokerControl] Async control execution failed:`, error);

      // Dispatch error event
      control.element.dispatchEvent(new CustomEvent('async:error', {
        detail: { error, type: control.type }
      }));
    }
  }

  /**
   * Execute children in parallel.
   */
  private async executeParallel(control: AsyncControlElement): Promise<any[]> {
    const promises = control.children.map(child => this.executeChild(child));

    // Show all children
    control.children.forEach(child => {
      child.style.display = '';
    });

    // Wait for all to complete
    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Execute children in race condition (first to complete wins).
   */
  private async executeRace(control: AsyncControlElement): Promise<any> {
    const promises = control.children.map(child => this.executeChild(child));

    // Show all children
    control.children.forEach(child => {
      child.style.display = '';
    });

    // Wait for first to complete
    const result = await Promise.race(promises);

    // Hide remaining children (those that didn't win the race)
    // In practice, this would be more complex to handle cancellation
    setTimeout(() => {
      control.children.forEach(child => {
        if (child !== result.element) {
          child.style.display = 'none';
        }
      });
    }, 100);

    return result;
  }

  /**
   * Execute children in sequence.
   */
  private async executeSequence(control: AsyncControlElement): Promise<any[]> {
    const results: any[] = [];

    for (const child of control.children) {
      // Show current child
      child.style.display = '';

      // Execute child
      const result = await this.executeChild(child);
      results.push(result);

      // Small delay between executions for visual feedback
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Execute a single child element.
   */
  private async executeChild(child: HTMLElement): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set up completion tracking
      const handleComplete = (event: Event) => {
        cleanup();
        resolve({ element: child, event, result: (event as CustomEvent).detail });
      };

      const handleError = (event: Event) => {
        cleanup();
        reject({ element: child, event, error: (event as CustomEvent).detail });
      };

      const cleanup = () => {
        child.removeEventListener('async:complete', handleComplete);
        child.removeEventListener('async:error', handleError);
        child.removeEventListener('command', handleCommand);
      };

      const handleCommand = (event: Event) => {
        // For command execution, wait a bit then resolve
        // In practice, this would integrate with command completion tracking
        setTimeout(() => {
          cleanup();
          resolve({ element: child, event, command: (event as CustomEvent).detail });
        }, 100);
      };

      // Listen for completion events
      child.addEventListener('async:complete', handleComplete);
      child.addEventListener('async:error', handleError);
      child.addEventListener('command', handleCommand);

      // Trigger execution
      const command = child.getAttribute('command');
      if (command) {
        const commandEvent = new CustomEvent('command', { detail: { command } });
        child.dispatchEvent(commandEvent);
      } else {
        // If no command, execute immediately
        setTimeout(() => {
          cleanup();
          resolve({ element: child, executed: true });
        }, 0);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        cleanup();
        reject({ element: child, error: 'timeout' });
      }, 30000);
    });
  }

  /**
   * Clean up async controls.
   */
  destroy(): void {
    this.asyncControls = [];
  }
}

// Global instance
let asyncControlRendererInstance: AsyncControlRenderer | null = null;

export function enableAsyncControls(): void {
  if (!asyncControlRendererInstance) {
    asyncControlRendererInstance = new AsyncControlRenderer();
  }
  asyncControlRendererInstance.enable();
}

export function disableAsyncControls(): void {
  if (asyncControlRendererInstance) {
    asyncControlRendererInstance.destroy();
    asyncControlRendererInstance = null;
  }
}