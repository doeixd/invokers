/**
 * Conditional rendering for Invokers Control module.
 * Provides data-if/data-else attributes for conditional element visibility.
 */

import { debugLog, debugWarn, debugError } from '../../utils';
import { getStateStore } from '../state/store';

interface ConditionalElement {
  element: HTMLElement;
  condition: string;
  elseElement?: HTMLElement;
}

class ConditionalRenderer {
  private conditionals: ConditionalElement[] = [];
  private unsubscribeFunctions: (() => void)[] = [];
  private observer: MutationObserver | null = null;

  /**
   * Enable conditional rendering by scanning for data-if attributes.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForConditionals();
    this.setupReactivity();
    this.setupMutationObserver();
  }

  /**
   * Scan the document for elements with data-if attributes.
   */
  private scanForConditionals(): void {
    const ifElements = document.querySelectorAll('[data-if]');
    ifElements.forEach(element => {
      const condition = element.getAttribute('data-if');
      if (!condition) return;

      // Find associated else element
      const elseElement = this.findElseElement(element as HTMLElement);

      this.conditionals.push({
        element: element as HTMLElement,
        condition,
        elseElement
      });
    });
  }

  /**
   * Find the associated else element for a conditional.
   */
  private findElseElement(ifElement: HTMLElement): HTMLElement | undefined {
    // Look for immediate next sibling with data-else
    let sibling = ifElement.nextElementSibling;
    if (sibling && sibling.hasAttribute('data-else')) {
      return sibling as HTMLElement;
    }

    // Look for data-else with matching data-if-id
    const ifId = ifElement.getAttribute('data-if-id');
    if (ifId) {
      const elseElement = document.querySelector(`[data-else="${ifId}"]`);
      if (elseElement) {
        return elseElement as HTMLElement;
      }
    }

    return undefined;
  }

  /**
   * Set up reactivity by subscribing to state changes.
   */
  private setupReactivity(): void {
    const store = getStateStore();

    // Group dependencies to avoid duplicate subscriptions
    const dependencyMap = new Map<string, ConditionalElement[]>();

    this.conditionals.forEach(conditional => {
      const dependencies = this.parseDependencies(conditional.condition);
      dependencies.forEach(dep => {
        if (!dependencyMap.has(dep)) {
          dependencyMap.set(dep, []);
        }
        dependencyMap.get(dep)!.push(conditional);
      });
    });

    // Subscribe to each unique dependency
    dependencyMap.forEach((conditionals, dependency) => {
      const unsubscribe = store.subscribe(dependency, () => {
        conditionals.forEach(conditional => this.evaluateConditional(conditional));
      });
      this.unsubscribeFunctions.push(unsubscribe);
    });

    // Initial evaluation of all conditionals
    this.conditionals.forEach(conditional => this.evaluateConditional(conditional));
  }

  /**
   * Evaluate a conditional and update element visibility.
   */
  private evaluateConditional(conditional: ConditionalElement): void {
    try {
      const result = this.evaluateCondition(conditional.condition);

      if (result) {
        conditional.element.style.display = '';
        if (conditional.elseElement) {
          conditional.elseElement.style.display = 'none';
        }
      } else {
        conditional.element.style.display = 'none';
        if (conditional.elseElement) {
          conditional.elseElement.style.display = '';
        }
      }
    } catch (error) {
      debugWarn(`[InvokerControl] Failed to evaluate conditional "${conditional.condition}":`, error);
    }
  }

  /**
   * Evaluate a conditional expression.
   */
  private evaluateCondition(condition: string): boolean {
    const store = getStateStore();

    // Simple condition evaluation
    try {
      // Replace state paths with actual values
      let processedCondition = condition.replace(/state\.([a-zA-Z_$][a-zA-Z0-9_.$]*)/g, (_match, path) => {
        const value = store.get(path);
        return JSON.stringify(value);
      });

      // Use Function constructor for evaluation (restricted context)
      const result = new Function(`return ${processedCondition};`)();
      return Boolean(result);
    } catch (error) {
      debugWarn(`[InvokerControl] Condition evaluation error: ${condition}`, error);
      return false;
    }
  }

  /**
   * Parse dependencies from a condition string.
   */
  private parseDependencies(condition: string): string[] {
    const dependencies: string[] = [];
    const stateRegex = /state\.([a-zA-Z_$][a-zA-Z0-9_.$]*)/g;
    let match;

    while ((match = stateRegex.exec(condition)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Set up mutation observer to watch for new conditional elements.
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;

      mutations.forEach((mutation) => {
        // Check for added nodes with data-if attributes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.hasAttribute('data-if') || element.querySelector('[data-if]')) {
              shouldRescan = true;
            }
          }
        });
      });

      if (shouldRescan) {
        this.rescanConditionals();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Rescan for conditionals when DOM changes.
   */
  private rescanConditionals(): void {
    // Clean up existing subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    // Clear existing conditionals
    this.conditionals = [];

    // Rescan and setup reactivity
    this.scanForConditionals();
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

    this.conditionals = [];
  }
}

// Global instance
let conditionalRendererInstance: ConditionalRenderer | null = null;

export function enableConditionalRendering(): void {
  if (!conditionalRendererInstance) {
    conditionalRendererInstance = new ConditionalRenderer();
  }
  conditionalRendererInstance.enable();
}

export function disableConditionalRendering(): void {
  if (conditionalRendererInstance) {
    conditionalRendererInstance.destroy();
    conditionalRendererInstance = null;
  }
}
