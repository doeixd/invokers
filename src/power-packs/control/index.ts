import { enableConditionalRendering } from './conditional';
import { enableSwitchRendering } from './switch';
import { enablePromiseChaining } from './chain';
import { enableLoopRendering } from './loop';
import { enableErrorBoundaries } from './error-boundary';
import { enableAsyncControls } from './async';

/**
 * Enables the complete Control module for Invokers.
 * This includes:
 * - Conditional rendering with data-if/data-else attributes
 * - Switch/case rendering with data-switch/data-case attributes
 * - Loop constructs with data-for-each, data-while, data-repeat attributes
 * - Error boundaries with data-try, data-catch, data-finally attributes
 * - Async control with data-parallel, data-race, data-sequence attributes
 * - Promise-based chaining infrastructure for async command sequences
 */
export function enableControl(): void {
  enableConditionalRendering();
  enableSwitchRendering();
  enableLoopRendering();
  enableErrorBoundaries();
  enableAsyncControls();
  enablePromiseChaining();
}
