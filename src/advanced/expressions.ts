/**
 * @file expressions.ts
 * @summary Expression Engine Module for the Invokers library.
 * @description
 * This module enables template interpolation through the `{{expression}}` syntax.
 * When enabled, commands and templates can use dynamic expressions to access
 * data context, element properties, and event information.
 * This is part of the Tier 3 advanced reactive engine.
 * 
 * @example
 * ```javascript
 * import { enableExpressionEngine } from 'invokers/advanced/expressions';
 * 
 * enableExpressionEngine();
 * ```
 * 
 * @example
 * ```html
 * <!-- After enabling expression engine -->
 * <input id="name" value="John">
 * <button command="--text:set:Hello {{this.elements.name.value}}!" 
 *         command-on="click" 
 *         commandfor="#greeting">
 *   Greet
 * </button>
 * <div id="greeting"></div>
 * ```
 */

import { InvokerManager } from '../core';
import { interpolateString } from './interpolation';
import { enableAllHelpers, enableStringHelpers, enableArrayHelpers, enableMathHelpers, enableDateHelpers, enableUtilityHelpers } from './expression/categories';

/**
 * Enables the expression engine ({{...}} interpolation) for the Invokers library.
 * This allows commands and templates to use dynamic expressions to access data.
 * 
 * Once enabled, you can use {{expression}} syntax in commands and templates:
 * - `{{this.value}}` - Access invoker element's value
 * - `{{event.type}}` - Access triggering event properties
 * - `{{data.username}}` - Access data context
 * - `{{this.elements.name.value}}` - Access form element values
 * 
 * @example
 * ```javascript
 * import { enableExpressionEngine } from 'invokers/advanced/expressions';
 * 
 * enableExpressionEngine();
 * 
 * // Now you can use expressions in commands
 * // <button command="--text:set:Current time: {{new Date().toLocaleTimeString()}}" 
 * //         commandfor="#clock">Update Clock</button>
 * ```
 */
export function enableExpressionEngine(): void {
  const invokerInstance = InvokerManager.getInstance();
  
  // Enable interpolation on the core instance
  if (typeof invokerInstance._enableInterpolation === 'function') {
    invokerInstance._enableInterpolation();
  } else {
    // Fallback: Set a flag that other parts of the system can check
    (invokerInstance as any)._interpolationEnabled = true;
  }
  
  // Make interpolation utility available globally for advanced users
  if (typeof window !== 'undefined' && (window as any).Invoker) {
    (window as any).Invoker.getInterpolationUtility = () => interpolateString;
    (window as any).Invoker.interpolateString = interpolateString;
  }
  
  // Register all built-in expression functions
  registerBuiltInFunctions();

  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    console.log("Invokers: Expression Engine ({{...}}) enabled.");
  }
}

/**
 * Registers all built-in expression functions using the modular helper system
 */
function registerBuiltInFunctions(): void {
  // Use the new modular helper system
  enableAllHelpers();
}

/**
 * Function metadata for type checking and documentation
 */
export interface ExpressionFunction {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required?: boolean;
    variadic?: boolean;
  }>;
  returnType: string;
  examples: string[];
  implementation: (...args: any[]) => any;
}

/**
 * Registry for custom expression functions
 */
class ExpressionFunctionRegistry {
  private functions = new Map<string, ExpressionFunction>();
  private functionCache = new Map<string, any>();

  /**
   * Registers a new expression function
   */
  register(func: ExpressionFunction): void {
    if (this.functions.has(func.name)) {
      console.warn(`Invokers: Expression function "${func.name}" is being overwritten`);
    }
    this.functions.set(func.name, func);
    // Clear cache when function is registered/updated
    this.functionCache.clear();
  }

  /**
   * Gets a registered function by name
   */
  get(name: string): ExpressionFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Checks if a function is registered
   */
  has(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Gets all registered functions
   */
  getAll(): Map<string, ExpressionFunction> {
    return new Map(this.functions);
  }

  /**
   * Calls a registered function with arguments
   */
  call(name: string, ...args: any[]): any {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Invokers: Expression function "${name}" not found. Available functions: ${Array.from(this.functions.keys()).join(', ')}`);
    }

    // Validate arguments before caching
    const validation = this.validateCall(name, args);
    if (!validation.valid) {
      throw new Error(`Invokers: Expression function "${name}" validation failed: ${validation.errors.join(', ')}`);
    }

    // Create a more robust cache key that handles complex objects
    let cacheKey: string;
    try {
      cacheKey = `${name}:${this.createCacheKey(args)}`;
    } catch {
      // If serialization fails, don't cache
      cacheKey = '';
    }

    // Check cache if we have a valid key
    if (cacheKey && this.functionCache.has(cacheKey)) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log(`Invokers: Using cached result for ${name}`);
      }
      return this.functionCache.get(cacheKey);
    }

    try {
      const startTime = typeof window !== 'undefined' && (window as any).Invoker?.debug ? performance.now() : 0;

      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log(`Invokers: About to call ${name} with args:`, args);
      }
      const result = func.implementation(...args);
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log(`Invokers: Function ${name} returned:`, result);
        const endTime = performance.now();
        console.log(`Invokers: Function ${name} executed in ${(endTime - startTime).toFixed(2)}ms`);
      }

      // Cache pure function results (avoid caching functions that return different results)
      if (cacheKey && typeof result !== 'function' && !this.isRandomFunction(name) && this.isCacheableResult(result)) {
        this.functionCache.set(cacheKey, result);

        // Implement LRU-style cache eviction if cache gets too large
        if (this.functionCache.size > 1000) {
          this.evictOldCacheEntries();
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log(`Invokers: Function ${name} threw error:`, error);
      }
      throw new Error(`Invokers: Expression function "${name}" failed: ${errorMessage}. Function signature: ${this.getFunctionSignature(func)}`);
    }
  }

  /**
   * Checks if a function is considered "random" (should not be cached)
   */
  private isRandomFunction(name: string): boolean {
    const randomFunctions = ['random', 'randomInt', 'randomChoice', 'now', 'testNoCache'];
    return randomFunctions.includes(name);
  }

  /**
   * Creates a cache key from function arguments
   */
  private createCacheKey(args: any[]): string {
    return args.map(arg => {
      if (arg === null || arg === undefined) return 'null';
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return String(arg);
      }
      if (Array.isArray(arg)) {
        return `array:${arg.length}:${this.createCacheKey(arg)}`;
      }
      if (typeof arg === 'object') {
        // For objects, create a stable key from sorted properties
        const keys = Object.keys(arg).sort();
        const values = keys.map(key => `${key}:${this.createCacheKey([arg[key]])}`);
        return `object:${values.join('|')}`;
      }
      // For other types, don't cache
      throw new Error('Complex argument type');
    }).join(',');
  }

  /**
   * Checks if a result is cacheable
   */
  private isCacheableResult(result: any): boolean {
    // Don't cache undefined, functions, or complex objects that might change
    if (result === undefined || typeof result === 'function') return false;
    if (typeof result === 'object' && result !== null) {
      // Cache simple objects and arrays, but not DOM objects or complex structures
      if (Array.isArray(result)) {
        return result.length <= 100 && result.every(item => typeof item !== 'object' || item === null);
      }
      // For plain objects, check if they're simple
      if (result.constructor === Object) {
        const keys = Object.keys(result);
        return keys.length <= 20 && keys.every(key =>
          typeof result[key] !== 'object' || result[key] === null
        );
      }
      return false;
    }
    return true;
  }

  /**
   * Evicts old cache entries using LRU strategy
   */
  private evictOldCacheEntries(): void {
    // Simple LRU: remove oldest 20% of entries
    const entries = Array.from(this.functionCache.entries());
    const toRemove = Math.floor(entries.length * 0.2);

    for (let i = 0; i < toRemove; i++) {
      this.functionCache.delete(entries[i][0]);
    }

    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log(`Invokers: Evicted ${toRemove} old cache entries`);
    }
  }

  /**
   * Gets a human-readable function signature for error messages
   */
  private getFunctionSignature(func: ExpressionFunction): string {
    const params = func.parameters.map(p => `${p.name}${p.required === false ? '?' : ''}: ${p.type}`).join(', ');
    return `${func.name}(${params}) -> ${func.returnType}`;
  }

  /**
   * Validates function arguments against metadata
   */
  validateCall(name: string, args: any[]): { valid: boolean; errors: string[] } {
    const func = this.functions.get(name);
    if (!func) {
      return { valid: false, errors: [`Function "${name}" not found`] };
    }

    const errors: string[] = [];

    // Handle variadic functions (functions that accept variable number of arguments)
    const hasVariadicParam = func.parameters.some(p => (p as any).variadic);
    if (hasVariadicParam) {
      // For variadic functions, validate all provided arguments against the variadic parameter type
      const variadicParam = func.parameters.find(p => (p as any).variadic)!;
      args.forEach((arg, index) => {
        if (arg !== undefined && arg !== null) {
          const actualType = typeof arg;
          const expectedType = variadicParam.type.toLowerCase();

          if (expectedType === 'array' && !Array.isArray(arg)) {
            errors.push(`Parameter ${index + 1} should be an array, got ${actualType}`);
          } else if (expectedType !== 'any' && actualType !== expectedType) {
            errors.push(`Parameter ${index + 1} should be ${expectedType}, got ${actualType}`);
          }
        }
      });
    } else {
      // Standard parameter validation
      func.parameters.forEach((param, index) => {
        // Only validate that required parameters are actually provided
        // Check if the argument was passed (not if it's undefined, since undefined can be a valid value)
        // Allow null, undefined, and type coercion - implementations handle edge cases gracefully
        if (param.required && index >= args.length) {
          errors.push(`Parameter "${param.name}" is required`);
        }

        // Skip type checking - let implementations handle type coercion and edge cases
        // This allows functions like trim(123) to gracefully return '' instead of throwing
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clears the function result cache
   */
  clearCache(): void {
    this.functionCache.clear();
  }
}

// Global registry instance
const functionRegistry = new ExpressionFunctionRegistry();

/**
 * Registers a custom expression function that can be called in expressions
 *
 * @param func The function definition with metadata
 * @example
 * ```javascript
 * registerExpressionFunction({
 *   name: 'double',
 *   description: 'Doubles a number',
 *   parameters: [{ name: 'value', type: 'number', description: 'Number to double', required: true }],
 *   returnType: 'number',
 *   examples: ['double(5) // returns 10'],
 *   implementation: (value) => value * 2
 * });
 *
 * // Now you can use it in expressions:
 * // {{double(this.value)}}
 * ```
 */
export function registerExpressionFunction(func: ExpressionFunction): void {
  functionRegistry.register(func);
}

/**
 * Gets a registered expression function by name
 */
export function getExpressionFunction(name: string): ExpressionFunction | undefined {
  return functionRegistry.get(name);
}

/**
 * Checks if an expression function is registered
 */
export function hasExpressionFunction(name: string): boolean {
  return functionRegistry.has(name);
}

/**
 * Calls a registered expression function
 */
export function callExpressionFunction(name: string, ...args: any[]): any {
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    console.log('Invokers: callExpressionFunction called with:', name, args);
  }
  return functionRegistry.call(name, ...args);
}

/**
 * Validates function call arguments
 */
export function validateExpressionFunctionCall(name: string, args: any[]): { valid: boolean; errors: string[] } {
  return functionRegistry.validateCall(name, args);
}

/**
 * Gets all registered expression functions
 */
export function getAllExpressionFunctions(): Map<string, ExpressionFunction> {
  return functionRegistry.getAll();
}

/**
 * Clears the expression function result cache
 */
export function clearExpressionFunctionCache(): void {
  functionRegistry.clearCache();
}

// Export category-specific enablers for modular usage
export {
  enableStringHelpers,
  enableArrayHelpers,
  enableMathHelpers,
  enableDateHelpers,
  enableUtilityHelpers,
  enableAllHelpers
};
