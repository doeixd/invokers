// src/index.ts
import { debugLog, debugWarn, debugError } from './utils';
import './polyfill'; // Apply the command polyfill immediately
import { InvokerManager } from './core';
import {
  ErrorSeverity,
  createInvokerError,
  logInvokerError,
  parseCommandString,
  parseCommaSeparatedCommands,
  type CommandContext,
  type CommandCallback
} from './core';

// Global type declarations
declare global {
  interface Window {
    Invoker?: any;
  }
}

export function validateElement(
  element: HTMLElement | null,
  requirements: {
    id?: boolean;
    tagName?: string[];
    attributes?: string[];
    requiredAttributes?: string[]; // More explicit name
  }
): string[] {
  const errors: string[] = [];

  if (!element) {
    errors.push('Element not found');
    return errors;
  }

  // Check if element is still connected to DOM
  if (!element.isConnected) {
    errors.push('Element is not connected to the DOM');
  }

  if (requirements.id && !element.id?.trim()) {
    errors.push('Element missing required id attribute');
  }

  if (requirements.tagName && requirements.tagName.length > 0) {
    const tagName = element.tagName.toLowerCase();
    if (!requirements.tagName.some(tag => tag.toLowerCase() === tagName)) {
      errors.push(`Element must be one of: ${requirements.tagName.join(', ')}, got: ${tagName}`);
    }
  }

  // Check both attributes and requiredAttributes for backward compatibility
  const attrsToCheck = requirements.attributes || requirements.requiredAttributes || [];
  for (const attr of attrsToCheck) {
    if (!element.hasAttribute(attr)) {
      errors.push(`Element missing required attribute: ${attr}`);
    }
  }

  return errors;
}

export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    // In server environments, return the original string
    // (server-side sanitization should be handled by dedicated libraries)
    return html;
  }

  // Create a temporary element to parse and sanitize HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove dangerous elements
  const dangerousElements = temp.querySelectorAll(
    'script, object, embed, iframe, frame, meta, link[rel="import"], form[action], input[type="file"]'
  );
  dangerousElements.forEach(el => el.remove());

  // Remove dangerous attributes from all elements
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove event handler attributes and dangerous protocols
    Array.from(el.attributes).forEach(attr => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.toLowerCase();

      if (attrName.startsWith('on') ||
          attrValue.includes('javascript:') ||
          attrValue.includes('vbscript:') ||
          attrValue.includes('data:text/html') ||
          attrValue.includes('data:text/javascript') ||
          (attrName === 'href' && attrValue.startsWith('data:')) ||
          (attrName === 'src' && attrValue.startsWith('data:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
}

export function isInterpolationEnabled(): boolean {
  return InvokerManager._interpolationEnabled;
}

// parseCommandString is now exported from core

export function createCommandString(...parts: string[]): string {
  if (parts.length > 0 && !parts[0].startsWith('--')) {
    parts[0] = `--${parts[0]}`;
  }
  return parts
    .map((part) => part.replace(/\\/g, "\\\\").replace(/:/g, "\\:"))
    .join(":");
}

/**
 * Centralized helper to dispatch a CommandEvent to a target element.
 * This encapsulates the CommandEvent creation and dispatch for consistency.
 * Used by the core polyfill and advanced event features.
 *
 * @param source The source element that triggered the command
 * @param command The command string to dispatch
 * @param targetElement The target element to receive the command
 * @param triggeringEvent The original DOM event that initiated this command (optional)
 */
// Re-export types and utilities from core
export type { CommandContext, CommandCallback };
export { InvokerManager, ErrorSeverity, createInvokerError, logInvokerError, parseCommandString, parseCommaSeparatedCommands };

// Import and re-export InvokerError type
import type { InvokerError } from './core';
export type { InvokerError };

export function _dispatchCommandEvent(
  source: HTMLElement,
  command: string,
  targetElement: HTMLElement,
  triggeringEvent?: Event,
  resolvedTargets?: HTMLElement[]
): void {
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog('Invokers: _dispatchCommandEvent called with command:', command, 'target:', targetElement?.id || targetElement);
  }

  // Validate inputs
  if (!source || !command || !targetElement) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugWarn('Invokers: _dispatchCommandEvent called with invalid parameters');
    }
    return;
  }

  // Check if CommandEvent is available (polyfill should have been loaded)
  if (typeof window === 'undefined' || !(window as any).CommandEvent) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugError('Invokers: CommandEvent not available. Make sure the polyfill is loaded.');
    }
    return;
  }

  // Create the CommandEvent with the triggering event attached
  const commandEvent = new (window as any).CommandEvent("command", {
    command,
    source,
    target: targetElement,
    cancelable: true,
    bubbles: true,
    composed: true,
  });

  // Attach the triggering event for advanced features
  if (triggeringEvent) {
    (commandEvent as any).triggeringEvent = triggeringEvent;
  }
  if (resolvedTargets && resolvedTargets.length > 0) {
    (commandEvent as any).resolvedTargets = resolvedTargets;
  }

  // Dispatch the event
  const success = document.dispatchEvent(commandEvent);
  if (!success && typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugWarn('Invokers: CommandEvent was cancelled or prevented');
  }
}

// Get the singleton instance
const invokerInstance = InvokerManager.getInstance();

// Command event listener is now handled by InvokerManager.deferListen()

// Setup the global for CDN users and backward compatibility
if (typeof window !== 'undefined') {
  // Only set up the global if it doesn't already exist
  if (!(window as any).Invoker) {
    (window as any).Invoker = {
      instance: invokerInstance,
      register: invokerInstance.register.bind(invokerInstance),
      executeCommand: invokerInstance.executeCommand.bind(invokerInstance),
      registerPlugin: invokerInstance.registerPlugin.bind(invokerInstance),
      unregisterPlugin: invokerInstance.unregisterPlugin.bind(invokerInstance),
      hasPlugin: invokerInstance.hasPlugin.bind(invokerInstance),
      registerMiddleware: invokerInstance.registerMiddleware.bind(invokerInstance),
      unregisterMiddleware: invokerInstance.unregisterMiddleware.bind(invokerInstance),
      getStats: invokerInstance.getStats.bind(invokerInstance),
      parseCommandString,
      createCommandString,
      reset: invokerInstance.reset.bind(invokerInstance),
      debug: false
    };
  } else {
    // If Invoker already exists, just update the instance
    (window as any).Invoker.instance = invokerInstance;
  }
}

export default invokerInstance;
