// src/advanced-events.ts

import { InvokerManager } from '../core';
import { EventTriggerManager } from './event-trigger-manager';
import { interpolateString } from './interpolation';
import { generateUid, debugLog, debugWarn, debugError } from '../utils';

/**
 * Enables advanced event triggering (e.g., `command-on`, `data-on-event`)
 * and dynamic data interpolation (e.g., `{{this.value}}`) in Invokers.
 *
 * Call this function once in your application if you want to use these features.
 * If not called, the code for these features will be tree-shaken out of your bundle.
 */
export function enableAdvancedEvents(): void {
  const invokerInstance = InvokerManager.getInstance();

  // 1. Enable interpolation in the core InvokerManager
  invokerInstance._enableInterpolation();

  // 2. Register the interpolation utility on a global accessor (used by InvokerManager)
  if (typeof window !== 'undefined' && window.Invoker) {
    ((window as any).Invoker as any).getInterpolationUtility = () => interpolateString;
    // Expose utilities for template processing
    (window as any).Invoker.interpolateString = interpolateString;
    (window as any).Invoker.generateUid = generateUid;
  }



  // 4. Initialize the EventTriggerManager
  EventTriggerManager.getInstance().initialize();

  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
  debugLog("Invokers: Advanced event features (command-on, data-on-event, interpolation, templating) enabled.");
}
}

/**
 * Rescans the document for elements with command-on attributes and attaches event listeners.
 * Useful for dynamic content added after initial page load.
 */
export function rescanCommandOnElements(): void {
  EventTriggerManager.getInstance().rescanCommandOnElements();
}
