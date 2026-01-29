/**
 * Core expression engine without helpers
 * This provides the basic expression evaluation engine for minimal bundle size
 */
import { debugLog } from '../../utils';
import { InvokerManager } from '../../core';
import { interpolateString } from '../interpolation';
import { evaluateExpression } from './index';

/**
 * Enables the core expression engine ({{...}} interpolation) without any helper functions.
 * This provides the minimal expression functionality for the smallest bundle size.
 *
 * @example
 * ```javascript
 * import { enableCoreExpressionEngine } from 'invokers/advanced/expressions/core';
 *
 * enableCoreExpressionEngine();
 *
 * // Now you can use basic expressions:
 * // {{this.value}} - access element properties
 * // {{event.type}} - access event properties
 * // {{data.user.name}} - access data context
 * ```
 */
export function enableCoreExpressionEngine(): void {
  const invokerInstance = InvokerManager.getInstance();

  // Enable interpolation on the core instance
  if (typeof invokerInstance._enableInterpolation === 'function') {
    invokerInstance._enableInterpolation();
  } else {
    // Fallback: Set a flag that other parts of the system can check
    (invokerInstance as any)._interpolationEnabled = true;
  }

  // Make basic interpolation utility available globally
  if (typeof window !== 'undefined' && (window as any).Invoker) {
    (window as any).Invoker.getInterpolationUtility = () => interpolateString;
    (window as any).Invoker.interpolateString = interpolateString;
    (window as any).Invoker.evaluateExpression = evaluateExpression;
  }

  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog("Invokers: Core Expression Engine ({{...}}) enabled (no helpers).");
  }
}

/**
 * Re-export the core evaluation functions
 */
export { evaluateExpression, evaluateExpressionSafe } from './index';
