/**
 * @file events.ts
 * @summary Event Triggers Module for the Invokers library.
 * @description
 * This module enables advanced event triggers through the `command-on` attribute.
 * When enabled, elements can respond to any DOM event and execute commands declaratively.
 * This is part of the Tier 3 advanced reactive engine.
 * 
 * @example
 * ```javascript
 * import { enableEventTriggers } from 'invokers/advanced/events';
 * 
 * enableEventTriggers();
 * ```
 * 
 * @example
 * ```html
 * <!-- After enabling event triggers -->
 * <form command-on="submit.prevent" command="--fetch:send" commandfor="#results">
 *   <input name="query" placeholder="Search...">
 *   <button type="submit">Search</button>
 * </form>
 * ```
 */

import { debugLog, debugWarn, debugError } from '../utils';
import { EventTriggerManager } from './event-trigger-manager';

/**
 * Enables advanced event triggers (command-on attribute) for the Invokers library.
 * This allows elements to respond to any DOM event and execute commands declaratively.
 * 
 * Once enabled, you can use the `command-on` attribute to bind commands to events:
 * - `command-on="click"` - Execute on click
 * - `command-on="submit.prevent"` - Execute on form submit and prevent default
 * - `command-on="input:debounce:300"` - Execute on input with 300ms debounce
 * 
 * @example
 * ```javascript
 * import { enableEventTriggers } from 'invokers/advanced/events';
 * 
 * enableEventTriggers();
 * 
 * // Now you can use command-on in HTML
 * // <input command-on="input" command="--text:set:{{this.value}}" commandfor="#output">
 * ```
 */
export function enableEventTriggers(): void {
  const eventTriggerManager = EventTriggerManager.getInstance();
  
  if (!eventTriggerManager.initialized) {
    eventTriggerManager.initialize();
    
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog("Invokers: Event Triggers (command-on) enabled.");
    }
  } else {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog("Invokers: Event Triggers already enabled.");
    }
  }
}
