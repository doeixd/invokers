import { InvokerManager } from '../../core';
import { registerStateCommands } from './commands';
import { initializeStateStore } from './store';
import { enableComputedProperties } from './computed';
import { enableDataBinding } from './binding';

/**
 * Enables the complete State module for Invokers.
 * This includes:
 * - Global state store with JSON script initialization
 * - State manipulation commands (--state:set, --state:array:push, etc.)
 * - Computed properties via <data-let> elements
 * - Two-way data binding with data-bind attribute
 */
export function enableState(): void {
  // Initialize the global state store
  initializeStateStore();

  // Register state manipulation commands
  const manager = InvokerManager.getInstance();
  registerStateCommands(manager);

  // Enable computed properties
  enableComputedProperties();

  // Enable two-way data binding
  enableDataBinding();
}

// Export sub-functions for advanced usage
export { enableComputedProperties } from './computed';
export { enableDataBinding } from './binding';
export { getStateStore, resetStateStore, initializeStateStore } from './store';