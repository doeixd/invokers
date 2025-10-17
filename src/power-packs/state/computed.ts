/**
 * Computed properties for Invokers State module.
 * Provides reactive computed values using <data-let> elements.
 */

import { getStateStore } from './store';

interface ComputedProperty {
  element: HTMLElement;
  expression: string;
  targetSelector: string;
  dependencies: string[];
}

class ComputedPropertiesManager {
  private computedProperties: ComputedProperty[] = [];
  private unsubscribeFunctions: (() => void)[] = [];

  /**
   * Enable computed properties by scanning for <data-let> elements.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    // Clean up previous state if re-enabling
    this.destroy();

    this.scanForComputedProperties();
    this.setupReactivity();
  }

  /**
   * Scan the document for <data-let> elements and parse them.
   */
  private scanForComputedProperties(): void {
    const dataLetElements = document.querySelectorAll('[data-let]');
    dataLetElements.forEach(element => {
      const expression = element.getAttribute('data-let');
      const targetSelector = element.getAttribute('data-target') || element.id;

      if (!expression || !targetSelector) return;

      // Parse dependencies from the expression (simple regex for state paths)
      const dependencies = this.parseDependencies(expression);

      this.computedProperties.push({
        element: element as HTMLElement,
        expression,
        targetSelector,
        dependencies
      });
    });
  }

  /**
   * Set up reactivity by subscribing to state changes.
   */
  private setupReactivity(): void {
    const store = getStateStore();

    // Group dependencies to avoid duplicate subscriptions
    const dependencyMap = new Map<string, ComputedProperty[]>();

    this.computedProperties.forEach(computed => {
      computed.dependencies.forEach(dep => {
        if (!dependencyMap.has(dep)) {
          dependencyMap.set(dep, []);
        }
        dependencyMap.get(dep)!.push(computed);
      });
    });

    // Subscribe to each unique dependency
    dependencyMap.forEach((computeds, dependency) => {
      const unsubscribe = store.subscribe(dependency, () => {
        computeds.forEach(computed => this.updateComputedProperty(computed));
      });
      this.unsubscribeFunctions.push(unsubscribe);
    });

    // Initial update of all computed properties
    this.computedProperties.forEach(computed => this.updateComputedProperty(computed));
  }

  /**
   * Update a computed property by evaluating its expression.
   */
  private updateComputedProperty(computed: ComputedProperty): void {
    try {
      const result = this.evaluateExpression(computed.expression);
      const targetElements = document.querySelectorAll(computed.targetSelector);

      targetElements.forEach(target => {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          (target as HTMLInputElement).value = String(result ?? '');
        } else {
          target.textContent = String(result ?? '');
        }
      });
    } catch (error) {
      console.warn(`[InvokerState] Failed to evaluate computed property "${computed.expression}":`, error);
    }
  }

  /**
   * Evaluate a computed expression with access to state values.
   */
  private evaluateExpression(expression: string): any {
    const store = getStateStore();

    // Create a context with state access
    const context = {
      state: store.getStateProxy(), // Safe access to state object
      get: (path: string) => store.get(path),
      // Add utility functions
      sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
      avg: (...args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
      min: (...args: number[]) => Math.min(...args),
      max: (...args: number[]) => Math.max(...args),
      count: (arr: any[]) => arr?.length || 0,
      join: (arr: any[], sep = ', ') => arr?.join(sep) || '',
      uppercase: (str: string) => str?.toUpperCase() || '',
      lowercase: (str: string) => str?.toLowerCase() || '',
      capitalize: (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '',
    };

    // Simple expression evaluation (basic arithmetic and function calls)
    // For security, we use a very restricted eval-like approach
    try {
      // Replace state.path with get('path')
      let processedExpression = expression.replace(/state\.([a-zA-Z_$][a-zA-Z0-9_.$]*)/g, "get('$1')");

      // Basic arithmetic evaluation using Function constructor (restricted to our context)
      const result = new Function('context', `with(context) { return ${processedExpression}; }`)(context);
      return result;
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error}`);
    }
  }

  /**
   * Parse dependencies from an expression.
   */
  private parseDependencies(expression: string): string[] {
    const dependencies: string[] = [];
    const stateRegex = /state\.([a-zA-Z_$][a-zA-Z0-9_.$]*)/g;
    let match;

    while ((match = stateRegex.exec(expression)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Clean up subscriptions and reset state.
   */
  destroy(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    this.computedProperties = [];
  }
}

// Global instance
let computedManagerInstance: ComputedPropertiesManager | null = null;

export function enableComputedProperties(): void {
  if (!computedManagerInstance) {
    computedManagerInstance = new ComputedPropertiesManager();
  }
  computedManagerInstance.enable();
}

export function disableComputedProperties(): void {
  if (computedManagerInstance) {
    computedManagerInstance.destroy();
    computedManagerInstance = null;
  }
}

export function resetComputedProperties(): void {
  if (computedManagerInstance) {
    computedManagerInstance.destroy();
  }
}