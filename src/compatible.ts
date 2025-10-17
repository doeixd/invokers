/**
 * @file compatible.ts
 * @summary Compatibility layer for the Invokers library.
 * @description
 * This module provides backward compatibility with the pre-v1.5 monolithic
 * structure. It automatically imports and registers all command packs,
 * recreating the old "everything included" behavior for existing tests
 * and legacy applications.
 * 
 * @example
 * ```javascript
 * // Old way (still works)
 * import 'invokers/compatible';
 * // All commands are now available
 * 
 * // Or for tests
 * import { InvokerManager } from 'invokers/compatible';
 * // InvokerManager comes pre-loaded with all commands
 * ```
 */

// Import the core system
import { InvokerManager, HookPoint } from './core';

// Import all command packs
import { registerBaseCommands } from './commands/base';
import { registerFormCommands } from './commands/form';
import { registerDomCommands } from './commands/dom';
import { registerFetchCommands } from './commands/fetch';
import { registerWebSocketCommands } from './commands/websocket';
import { registerSSECommands } from './commands/sse';
import { registerNavigationCommands } from './commands/navigation';
import { registerMediaCommands } from './commands/media';
import { registerBrowserCommands } from './commands/browser';
import { registerDataCommands } from './commands/data';
import { registerDeviceCommands } from './commands/device';
import { registerAccessibilityCommands } from './commands/accessibility';
import { registerStorageCommands } from './commands/storage';

// Import advanced features
import { enableAdvancedEvents } from './advanced/index';

// Note: Interest invokers are loaded separately in demos that need them

// Re-export everything from the main index for full compatibility
export * from './index';
export { HookPoint } from './core';

// Ensure polyfill is applied to browsers
import { apply as applyPolyfill } from './polyfill';
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyPolyfill());
  } else {
    applyPolyfill();
  }
}

// Get the singleton instance
const invokerInstance = InvokerManager.getInstance();

// Auto-register all command packs to recreate monolithic behavior
const commandPacks = [
  { name: 'base', register: registerBaseCommands },
  { name: 'form', register: registerFormCommands },
  { name: 'dom', register: registerDomCommands },
  { name: 'fetch', register: registerFetchCommands },
  { name: 'websocket', register: registerWebSocketCommands },
  { name: 'sse', register: registerSSECommands },
  { name: 'navigation', register: registerNavigationCommands },
  { name: 'media', register: registerMediaCommands },
  { name: 'browser', register: registerBrowserCommands },
  { name: 'data', register: registerDataCommands },
  { name: 'device', register: registerDeviceCommands },
  { name: 'accessibility', register: registerAccessibilityCommands },
  { name: 'storage', register: registerStorageCommands }
];

let registeredCount = 0;
for (const pack of commandPacks) {
  try {
    pack.register(invokerInstance);
    registeredCount++;
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error(`Invokers: Failed to register ${pack.name} commands:`, error);
    }
  }
}



// Setup the global for CDN users and backward compatibility FIRST (same as index.ts but with all commands)
if (typeof window !== 'undefined') {
  (window as any).Invoker = {
    instance: invokerInstance,
    register: invokerInstance.register.bind(invokerInstance),
    executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
    reset: invokerInstance.reset.bind(invokerInstance),
    
    // Middleware and Plugin APIs
    registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
    unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),
    registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
    unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
    hasPlugin: invokerInstance.hasPlugin.bind(invokerInstance),
    HookPoint: HookPoint,
    
    // Add compatibility methods
    getRegisteredCommands: () => Array.from((invokerInstance as any).commands.keys()),
    getStats: () => invokerInstance.getStats(),
    debug: false
  };

  // Command event listener is already attached by InvokerManager constructor
}

// Enable all advanced features by default - AFTER window setup
try {
  enableAdvancedEvents();
} catch (error) {
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    console.warn('Invokers: Failed to enable advanced events:', error);
  }
}

// Interest invokers are loaded separately when needed

// Export the pre-loaded instance as default
export default invokerInstance;

// For tests and legacy code, export a pre-configured InvokerManager
export { InvokerManager };

if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
  const totalCommands = (invokerInstance as any).commands?.size || 0;
  console.log('Invokers: Compatibility layer loaded');
  console.log(`Command packs registered: ${registeredCount}/${commandPacks.length}`);
  console.log(`Total commands available: ${totalCommands}`);
  console.log('Advanced features: enabled');
}
