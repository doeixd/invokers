/**
 * Two-way data binding for Invokers State module.
 * Provides reactive binding between form elements and state using data-bind attribute.
 */

import { getStateStore } from './store';

interface DataBinding {
  element: HTMLElement;
  statePath: string;
  eventType: string;
  property: string;
  unsubscribe?: () => void;
  listener?: (event: Event) => void;
}

class DataBindingManager {
  private bindings: DataBinding[] = [];

  /**
   * Enable two-way data binding by scanning for data-bind attributes.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    // Clean up previous bindings if re-enabling
    this.destroy();

    this.scanForBindings();
    this.setupBindings();
  }

  /**
   * Scan the document for elements with data-bind attributes.
   */
  private scanForBindings(): void {
    const boundElements = document.querySelectorAll('[data-bind]');
    boundElements.forEach(element => {
      const statePath = element.getAttribute('data-bind');
      if (!statePath) return;

      // Determine the appropriate event type and property based on element type
      const { eventType, property } = this.getBindingConfig(element as HTMLElement);

      this.bindings.push({
        element: element as HTMLElement,
        statePath,
        eventType,
        property
      });
    });
  }

  /**
   * Set up the bindings with event listeners and state subscriptions.
   */
  private setupBindings(): void {
    const store = getStateStore();

    this.bindings.forEach(binding => {
      // Subscribe to state changes to update the element
      const unsubscribe = store.subscribe(binding.statePath, (value) => {
        this.updateElement(binding.element, binding.property, value);
      });
      binding.unsubscribe = unsubscribe;

      // Set up event listener to update state when element changes
      const listener = () => {
        const value = this.getElementValue(binding.element, binding.property);
        store.set(binding.statePath, value);
      };
      binding.listener = listener;
      binding.element.addEventListener(binding.eventType, listener);

      // Initial sync: prioritize element value, then state value
      const elementValue = this.getElementValue(binding.element, binding.property);
      const currentStateValue = store.get(binding.statePath);

      if (elementValue !== null && elementValue !== undefined && elementValue !== '') {
        // If element has a value, sync it to state
        store.set(binding.statePath, elementValue);
      } else if (currentStateValue !== undefined) {
        // Otherwise, sync state to element
        this.updateElement(binding.element, binding.property, currentStateValue);
      }
    });
  }

  /**
   * Get the appropriate binding configuration for an element type.
   */
  private getBindingConfig(element: HTMLElement): { eventType: string; property: string } {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'input':
        const inputType = (element as HTMLInputElement).type;
        switch (inputType) {
          case 'checkbox':
            return { eventType: 'change', property: 'checked' };
          case 'radio':
            return { eventType: 'change', property: 'checked' };
          default:
            return { eventType: 'input', property: 'value' };
        }

      case 'textarea':
        return { eventType: 'input', property: 'value' };

      case 'select':
        return { eventType: 'change', property: 'value' };

      default:
        // For custom elements or other elements, try to bind to textContent
        return { eventType: 'input', property: 'textContent' };
    }
  }

  /**
   * Update an element with a new value.
   */
  private updateElement(element: HTMLElement, property: string, value: any): void {
    try {
      if (property === 'checked') {
        (element as HTMLInputElement).checked = Boolean(value);
      } else if (property === 'value') {
        (element as HTMLInputElement).value = String(value ?? '');
      } else if (property === 'textContent') {
        element.textContent = String(value ?? '');
      }
    } catch (error) {
      console.warn(`[InvokerState] Failed to update element with binding:`, error);
    }
  }

  /**
   * Get the current value from an element.
   */
  private getElementValue(element: HTMLElement, property: string): any {
    try {
      if (property === 'checked') {
        return (element as HTMLInputElement).checked;
      } else if (property === 'value') {
        return (element as HTMLInputElement).value;
      } else if (property === 'textContent') {
        return element.textContent;
      }
      return null;
    } catch (error) {
      console.warn(`[InvokerState] Failed to get value from element:`, error);
      return null;
    }
  }

  /**
   * Clean up all bindings and event listeners.
   */
  destroy(): void {
    this.bindings.forEach(binding => {
      if (binding.unsubscribe) {
        binding.unsubscribe();
      }
      if (binding.listener) {
        binding.element.removeEventListener(binding.eventType, binding.listener);
      }
    });
    this.bindings = [];
  }
}

// Global instance
let bindingManagerInstance: DataBindingManager | null = null;

export function enableDataBinding(): void {
  if (!bindingManagerInstance) {
    bindingManagerInstance = new DataBindingManager();
  }
  bindingManagerInstance.enable();
}

export function disableDataBinding(): void {
  if (bindingManagerInstance) {
    bindingManagerInstance.destroy();
    bindingManagerInstance = null;
  }
}

export function resetDataBinding(): void {
  if (bindingManagerInstance) {
    bindingManagerInstance.destroy();
  }
}