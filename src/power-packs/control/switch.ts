/**
 * Switch/case rendering for Invokers Control module.
 * Provides data-switch/data-case attributes for switch-case conditional rendering.
 */

import { getStateStore } from '../state/store';

interface SwitchElement {
  element: HTMLElement;
  switchValue: string;
  caseValue: string;
}

class SwitchRenderer {
  private switches: SwitchElement[] = [];
  private unsubscribeFunctions: (() => void)[] = [];
  private observer: MutationObserver | null = null;

  /**
   * Enable switch/case rendering by scanning for data-switch and data-case attributes.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForSwitches();
    this.setupReactivity();
    this.setupMutationObserver();
  }

  /**
   * Scan the document for elements with data-switch and data-case attributes.
   */
  private scanForSwitches(): void {
    // Find all elements with data-case (they belong to switches)
    const caseElements = document.querySelectorAll('[data-case]');
    caseElements.forEach(element => {
      const caseValue = element.getAttribute('data-case');
      if (!caseValue) return;

      // Find the parent switch element
      const switchElement = this.findSwitchElement(element as HTMLElement);
      if (!switchElement) return;

      const switchValue = switchElement.getAttribute('data-switch');
      if (!switchValue) return;

      this.switches.push({
        element: element as HTMLElement,
        switchValue,
        caseValue
      });
    });
  }

  /**
   * Find the parent switch element for a case element.
   */
  private findSwitchElement(caseElement: HTMLElement): HTMLElement | null {
    // Look up the DOM tree for a parent with data-switch
    let current: HTMLElement | null = caseElement.parentElement;
    while (current) {
      if (current.hasAttribute('data-switch')) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Set up reactivity by subscribing to state changes.
   */
  private setupReactivity(): void {
    const store = getStateStore();

    // Group by switch value for efficient updates
    const switchGroups = new Map<string, SwitchElement[]>();

    this.switches.forEach(switchEl => {
      const key = switchEl.switchValue;
      if (!switchGroups.has(key)) {
        switchGroups.set(key, []);
      }
      switchGroups.get(key)!.push(switchEl);
    });

    // Subscribe to each unique switch value
    switchGroups.forEach((switchElements, switchValue) => {
      const dependencies = this.parseDependencies(switchValue);
      dependencies.forEach(dep => {
        const unsubscribe = store.subscribe(dep, () => {
          this.evaluateSwitch(switchElements, switchValue);
        });
        this.unsubscribeFunctions.push(unsubscribe);
      });
    });

    // Initial evaluation of all switches
    switchGroups.forEach((switchElements, switchValue) => {
      this.evaluateSwitch(switchElements, switchValue);
    });
  }

  /**
   * Evaluate a switch and update case visibility.
   */
  private evaluateSwitch(switchElements: SwitchElement[], switchValue: string): void {
    try {
      const currentValue = this.evaluateSwitchValue(switchValue);

      switchElements.forEach(switchEl => {
        const isMatch = switchEl.caseValue === currentValue.toString() ||
                       (switchEl.caseValue === 'default' && !switchElements.some(el =>
                         el.caseValue === currentValue.toString()));

        if (isMatch) {
          switchEl.element.style.display = '';
        } else {
          switchEl.element.style.display = 'none';
        }
      });
    } catch (error) {
      console.warn(`[InvokerControl] Failed to evaluate switch "${switchValue}":`, error);
    }
  }

  /**
   * Evaluate a switch value expression.
   */
  private evaluateSwitchValue(switchValue: string): any {
    const store = getStateStore();

    // Simple value evaluation
    try {
      // Replace state paths with actual values
      let processedValue = switchValue.replace(/state\.([a-zA-Z_$][a-zA-Z0-9_.$]*)/g, (_match, path) => {
        const value = store.get(path);
        return JSON.stringify(value);
      });

      // Use Function constructor for evaluation (restricted context)
      const result = new Function(`return ${processedValue};`)();
      return result;
    } catch (error) {
      console.warn(`[InvokerControl] Switch value evaluation error: ${switchValue}`, error);
      return null;
    }
  }

  /**
   * Parse dependencies from a switch value string.
   */
  private parseDependencies(switchValue: string): string[] {
    const dependencies: string[] = [];
    const stateRegex = /state\.([a-zA-Z_$][a-zA-Z0-9_.$]*)/g;
    let match;

    while ((match = stateRegex.exec(switchValue)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Set up mutation observer to watch for new switch/case elements.
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      mutations.forEach((mutation) => {
        // Check for added nodes with data-switch or data-case attributes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.hasAttribute('data-switch') || element.hasAttribute('data-case') || element.querySelector('[data-switch], [data-case]')) {
              shouldRescan = true;
            }
          }
        });
      });

      if (shouldRescan) {
        this.rescanSwitches();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Rescan for switches when DOM changes.
   */
  private rescanSwitches(): void {
    // Clean up existing subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    // Clear existing switches
    this.switches = [];

    // Rescan and setup reactivity
    this.scanForSwitches();
    this.setupReactivity();
  }

  /**
   * Clean up subscriptions and observer.
   */
  destroy(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.switches = [];
  }
}

// Global instance
let switchRendererInstance: SwitchRenderer | null = null;

export function enableSwitchRendering(): void {
  if (!switchRendererInstance) {
    switchRendererInstance = new SwitchRenderer();
  }
  switchRendererInstance.enable();
}

export function disableSwitchRendering(): void {
  if (switchRendererInstance) {
    switchRendererInstance.destroy();
    switchRendererInstance = null;
  }
}