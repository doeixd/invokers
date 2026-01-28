/**
 * Category-specific expression helper enablers
 * These allow enabling only specific categories of helper functions
 */

import { debugLog, debugWarn, debugError } from '../../utils';
import { registerExpressionFunction } from '../expressions';
import { stringHelpers } from './helpers/string';
import { arrayHelpers } from './helpers/array';
import { mathHelpers } from './helpers/math';
import { dateHelpers } from './helpers/date';
import { utilityHelpers } from './helpers/utility';

/**
 * Enables string helper functions for expressions
 * Includes: concat, uppercase, lowercase, trim, replace, substring, etc.
 */
export function enableStringHelpers(): void {
  registerHelperFunctions(stringHelpers);
  logEnablement('String helpers');
}

/**
 * Enables array helper functions for expressions
 * Includes: randomChoice, arrayGenerate, arrayMap, arrayFilter, etc.
 */
export function enableArrayHelpers(): void {
  registerHelperFunctions(arrayHelpers);
  logEnablement('Array helpers');
}

/**
 * Enables math helper functions for expressions
 * Includes: random, randomInt, floor, ceil, round, min, max, etc.
 */
export function enableMathHelpers(): void {
  registerHelperFunctions(mathHelpers);
  logEnablement('Math helpers');
}

/**
 * Enables date helper functions for expressions
 * Includes: now, formatDate, timeAgo
 */
export function enableDateHelpers(): void {
  registerHelperFunctions(dateHelpers);
  logEnablement('Date helpers');
}

/**
 * Enables utility helper functions for expressions
 * Includes: formatNumber, formatCurrency, isEmpty, typeof, etc.
 */
export function enableUtilityHelpers(): void {
  registerHelperFunctions(utilityHelpers);
  logEnablement('Utility helpers');
}

/**
 * Enables all helper function categories
 * This is equivalent to the full enableExpressionEngine()
 */
export function enableAllHelpers(): void {
  enableStringHelpers();
  enableArrayHelpers();
  enableMathHelpers();
  enableDateHelpers();
  enableUtilityHelpers();
  logEnablement('All helpers');
}

/**
 * Helper function to register a category of helper functions
 */
function registerHelperFunctions(helpers: Record<string, any>): void {
  for (const [name, implementation] of Object.entries(helpers)) {
    // Create a function definition for each helper
    registerExpressionFunction({
      name,
      description: `${name} helper function`,
      parameters: [], // We'll let the implementation handle parameter validation
      returnType: 'any',
      examples: [`${name}()`],
      implementation
    });
  }
}

/**
 * Helper function to log enablement in debug mode
 */
function logEnablement(category: string): void {
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog(`Invokers: ${category} enabled for expressions.`);
  }
}
