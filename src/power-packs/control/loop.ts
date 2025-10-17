/**
 * Loop constructs for Invokers Control module.
 * Provides data-for-each, data-while, and data-repeat attributes for iterative rendering.
 */

import { getStateStore } from '../state/store';
import { enableExpressionEngine } from '../../advanced/expressions';
import { evaluateExpressionWithHelpers } from '../../advanced/expression';

interface LoopElement {
  element: HTMLElement;
  type: 'for-each' | 'while' | 'repeat';
  expression: string;
  itemVariable?: string;
  indexVariable?: string;
  template: string;
  renderedElements: HTMLElement[];
}

class LoopRenderer {
  private loops: LoopElement[] = [];
  private unsubscribeFunctions: (() => void)[] = [];

  /**
   * Enable loop rendering by scanning for loop attributes.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    // Ensure expression engine is enabled for loop expressions
    enableExpressionEngine();

    this.scanForLoops();
    this.setupReactivity();
  }

  /**
   * Scan the document for elements with loop attributes.
   */
  private scanForLoops(): void {
    // data-for-each="item in items" or data-for-each="(item, index) in items"
    const forEachElements = document.querySelectorAll('[data-for-each]');
    forEachElements.forEach(element => {
      const expression = element.getAttribute('data-for-each');
      if (!expression) return;

      this.loops.push({
        element: element as HTMLElement,
        type: 'for-each',
        expression,
        template: element.innerHTML,
        renderedElements: []
      });
    });

    // data-while="condition"
    const whileElements = document.querySelectorAll('[data-while]');
    whileElements.forEach(element => {
      const expression = element.getAttribute('data-while');
      if (!expression) return;

      this.loops.push({
        element: element as HTMLElement,
        type: 'while',
        expression,
        template: element.innerHTML,
        renderedElements: []
      });
    });

    // data-repeat="count"
    const repeatElements = document.querySelectorAll('[data-repeat]');
    repeatElements.forEach(element => {
      const expression = element.getAttribute('data-repeat');
      if (!expression) return;

      this.loops.push({
        element: element as HTMLElement,
        type: 'repeat',
        expression,
        template: element.innerHTML,
        renderedElements: []
      });
    });
  }

  /**
   * Set up reactivity by subscribing to state changes.
   */
  private setupReactivity(): void {
    const store = getStateStore();

    // Group dependencies to avoid duplicate subscriptions
    const dependencyMap = new Map<string, LoopElement[]>();

    this.loops.forEach(loop => {
      const dependencies = this.parseDependencies(loop.expression);
      dependencies.forEach(dep => {
        if (!dependencyMap.has(dep)) {
          dependencyMap.set(dep, []);
        }
        dependencyMap.get(dep)!.push(loop);
      });
    });

    // Subscribe to each unique dependency
    dependencyMap.forEach((loops, dependency) => {
      const unsubscribe = store.subscribe(dependency, () => {
        loops.forEach(loop => this.evaluateLoop(loop));
      });
      this.unsubscribeFunctions.push(unsubscribe);
    });

    // Initial evaluation of all loops
    this.loops.forEach(loop => this.evaluateLoop(loop));
  }

  /**
   * Evaluate a loop and render/update elements.
   */
  private evaluateLoop(loop: LoopElement): void {
    try {
      // Clear previously rendered elements
      loop.renderedElements.forEach(el => el.remove());
      loop.renderedElements = [];

      switch (loop.type) {
        case 'for-each':
          this.renderForEachLoop(loop);
          break;
        case 'while':
          this.renderWhileLoop(loop);
          break;
        case 'repeat':
          this.renderRepeatLoop(loop);
          break;
      }
    } catch (error) {
      console.warn(`[InvokerControl] Failed to evaluate loop "${loop.expression}":`, error);
    }
  }

  /**
   * Render a for-each loop.
   */
  private renderForEachLoop(loop: LoopElement): void {
    // Parse variable names: "item in items" or "(item, index) in items"
    const varMatch = loop.expression.match(/^(\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)|\s*([^,\s]+?))\s+in\s+(.+)$/);
    if (!varMatch) {
      console.warn(`[InvokerControl] Invalid for-each expression: ${loop.expression}`);
      return;
    }

    const itemVar = varMatch[2] || varMatch[4];
    const indexVar = varMatch[3];
    const arrayExpression = varMatch[5];

    const items = this.evaluateExpression(arrayExpression);

      console.log(`[InvokerControl] Evaluating "${arrayExpression}" ->`, items, 'isArray:', Array.isArray(items));

    if (!Array.isArray(items)) {
      console.warn(`[InvokerControl] for-each expression "${arrayExpression}" did not return an array, got:`, items);
      throw new Error(`for-each expression "${arrayExpression}" did not return an array, got: ${items}`);
    }

    // Clear the loop element's content
    loop.element.innerHTML = '';

    items.forEach((item, index) => {
      const element = this.createLoopElement(loop, {
        [itemVar]: item,
        ...(indexVar && { [indexVar]: index })
      });
      loop.renderedElements.push(element);
      loop.element.appendChild(element);
    });
  }

  /**
   * Render a while loop.
   */
  private renderWhileLoop(loop: LoopElement): void {
    // Clear the loop element's content
    loop.element.innerHTML = '';

    let iterations = 0;
    const maxIterations = 1000; // Prevent infinite loops

    while (iterations < maxIterations) {
      const condition = this.evaluateExpression(loop.expression);
      if (!condition) break;

      const element = this.createLoopElement(loop, { iteration: iterations });
      loop.renderedElements.push(element);
      loop.element.appendChild(element);
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn(`[InvokerControl] while loop "${loop.expression}" exceeded maximum iterations (${maxIterations})`);
    }
  }

  /**
   * Render a repeat loop.
   */
  private renderRepeatLoop(loop: LoopElement): void {
    const count = this.evaluateExpression(loop.expression);

    if (typeof count !== 'number' || count < 0) {
      console.warn(`[InvokerControl] repeat expression "${loop.expression}" did not return a valid number`);
      return;
    }

    const maxRepeats = 1000; // Prevent excessive rendering
    const actualCount = Math.min(count, maxRepeats);

    // Clear the loop element's content
    loop.element.innerHTML = '';

    for (let i = 0; i < actualCount; i++) {
      const element = this.createLoopElement(loop, { index: i });
      loop.renderedElements.push(element);
      loop.element.appendChild(element);
    }

    if (count > maxRepeats) {
      console.warn(`[InvokerControl] repeat count "${count}" exceeded maximum (${maxRepeats}), limited to ${maxRepeats}`);
    }
  }

  /**
   * Create a rendered element for a loop iteration.
   */
  private createLoopElement(loop: LoopElement, context: Record<string, any>): HTMLElement {
    const element = document.createElement('div');
    element.innerHTML = loop.template;

    // Process interpolation in the template
    this.processTemplateInterpolation(element, context);

    // Return the first child if template was wrapped
    return element.children[0] as HTMLElement || element;
  }

  /**
   * Process template interpolation with loop context.
   */
  private processTemplateInterpolation(element: HTMLElement, context: Record<string, any>): void {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent || '';

        // Replace {{expression}} with evaluated expressions
        text = text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
          try {
            const result = evaluateExpressionWithHelpers(expression.trim(), context);
            return result !== undefined && result !== null ? String(result) : '';
          } catch (error) {
            console.warn(`[InvokerControl] Template interpolation error: ${expression}`, error);
            return '';
          }
        });

        node.textContent = text;
      }
    }
  }

  /**
   * Evaluate an expression using the state store and expression engine.
   */
  private evaluateExpression(expression: string): any {
    console.error(`[InvokerControl] evaluateExpression called with: "${expression}"`);
    const store = getStateStore();
    const state = store.getState();
    console.error(`[InvokerControl] Current state:`, state);

    try {
      // Create context with state access - state is the root object containing all stores
      const context = {
        state: state, // Get the entire state object
        // Add other global context as needed
      };

      console.error(`[InvokerControl] Evaluating expression "${expression}" with context:`, context);
      const result = evaluateExpressionWithHelpers(expression, context);
      console.error(`[InvokerControl] Expression "${expression}" result:`, result);
      return result;
    } catch (error) {
      console.warn(`[InvokerControl] Expression evaluation error: ${expression}`, error);
      throw error;
    }
  }

  /**
   * Parse dependencies from an expression string.
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
   * Clean up subscriptions and rendered elements.
   */
  destroy(): void {
    this.loops.forEach(loop => {
      loop.renderedElements.forEach(el => el.remove());
    });

    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    this.loops = [];
  }
}

// Global instance
let loopRendererInstance: LoopRenderer | null = null;

export function enableLoopRendering(): void {
  if (!loopRendererInstance) {
    loopRendererInstance = new LoopRenderer();
  }
  loopRendererInstance.enable();
}

export function disableLoopRendering(): void {
  if (loopRendererInstance) {
    loopRendererInstance.destroy();
    loopRendererInstance = null;
  }
}