// src/interpolation.ts

import { evaluateExpressionWithHelpers } from './expression';
import { generateUid, debugLog, debugWarn, debugError } from '../utils';

// Global data context storage
const dataContexts: Record<string, Record<string, any>> = {};
const contextListeners: Record<string, Set<() => void>> = {};

/**
 * Safely accesses nested properties of an object using a dot-notation string.
 * @param obj The object to access
 * @param path The dot-notation path (e.g., "event.detail.message")
 * @returns The value at the path, or undefined if not found
 */
export function getDeepValue(obj: any, path: string): any {
  if (typeof obj !== 'object' || obj === null || !path) return undefined;

  return path.split('.').reduce((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    return acc[part];
  }, obj);
}

/**
 * Interpolates a string with placeholders like {{expression}}
 * @param template The template string containing {{...}} placeholders
 * @param context The context object containing values for interpolation
 * @returns The interpolated string with placeholders replaced
 */
export function interpolateString(template: string, context: Record<string, any>): string {
  if (typeof template !== 'string') {
    return '';
  }

  // Limit template size to prevent DoS
  if (template.length > 10000) {
    debugWarn('Invokers: Template too large, truncating');
    template = template.substring(0, 10000);
  }

  let result = template;
  let replacements = 0;

   result = result.replace(/\{\{(.*?)\}\}/g, (_, expression) => {
     replacements++;
     if (replacements > 50) {
       debugWarn('Invokers: Too many interpolations in template, stopping');
       return '';
     }

     try {
       // Special handling for __uid placeholder
       if (expression.trim() === '__uid') {
         return generateUid();
       }

       const trimmedExpression = expression.trim();

       // Check if expression references a data context (e.g., "userProfile.name")
       if (trimmedExpression.includes('.')) {
         const contextKey = trimmedExpression.split('.')[0];

         // First check if the context key exists directly in the passed context
         if (context[contextKey] !== undefined) {
           const value = evaluateExpressionWithHelpers(trimmedExpression, context);
           return value !== undefined && value !== null ? String(value) : '';
         }

         // Then check if there's a globally stored data context
         const dataContext = getDataContext(contextKey);
         if (dataContext) {
           // Use data context for evaluation
           const fullContext = { ...context, [contextKey]: dataContext };
           const value = evaluateExpressionWithHelpers(trimmedExpression, fullContext);
           return value !== undefined && value !== null ? String(value) : '';
         }
       }

       const value = evaluateExpressionWithHelpers(trimmedExpression, context);
       return value !== undefined && value !== null ? String(value) : '';
     } catch (error) {
       debugWarn(`Invokers: Expression evaluation failed in interpolation: ${expression}`, error);
       return '';
     }
   });

  return result;
}

/**
 * Sets a named data context with the provided data
 * @param contextKey The key to identify the context
 * @param data The data object to store
 */
export function setDataContext(contextKey: string, data: Record<string, any>): void {
  dataContexts[contextKey] = { ...data };
  notifyContextListeners(contextKey);
}

/**
 * Gets a named data context
 * @param contextKey The key of the context to retrieve
 * @returns The data context or undefined if not found
 */
export function getDataContext(contextKey: string): Record<string, any> | undefined {
  return dataContexts[contextKey];
}

/**
 * Updates a specific property in a named data context
 * @param contextKey The key of the context to update
 * @param propertyPath The dot-notation path to the property
 * @param value The new value
 */
export function updateDataContext(contextKey: string, propertyPath: string, value: any): void {
  if (!dataContexts[contextKey]) {
    dataContexts[contextKey] = {};
  }

  const keys = propertyPath.split('.');
  let current = dataContexts[contextKey];

  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof current[keys[i]] !== 'object' || current[keys[i]] === null) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
  notifyContextListeners(contextKey);
}

/**
 * Gets all data contexts for template rendering
 * @returns All stored data contexts
 */
export function getAllDataContexts(): Record<string, Record<string, any>> {
  return { ...dataContexts };
}

/**
 * Adds a listener for changes to a specific data context
 * @param contextKey The context key to listen to
 * @param listener The callback function to call when context changes
 */
export function addContextListener(contextKey: string, listener: () => void): void {
  if (!contextListeners[contextKey]) {
    contextListeners[contextKey] = new Set();
  }
  contextListeners[contextKey].add(listener);
}

/**
 * Removes a listener for a specific data context
 * @param contextKey The context key
 * @param listener The listener to remove
 */
export function removeContextListener(contextKey: string, listener: () => void): void {
  if (contextListeners[contextKey]) {
    contextListeners[contextKey].delete(listener);
  }
}

/**
 * Notifies all listeners of a context change
 * @param contextKey The context key that changed
 */
function notifyContextListeners(contextKey: string): void {
  if (contextListeners[contextKey]) {
    contextListeners[contextKey].forEach(listener => {
      try {
        listener();
      } catch (error) {
        debugError('Invokers: Error in context listener:', error);
      }
    });
  }
}
