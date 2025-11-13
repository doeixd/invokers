// src/target-resolver.ts

/**
 * Resolves target elements based on a selector string and invoker element.
 * Supports contextual selectors (@closest, @child, @children), ID selectors, and CSS selectors.
 *
 * @param selector The selector string to resolve
 * @param invoker The element that initiated the command (for contextual selectors)
 * @returns Array of matching elements
 */
export function resolveTargets(selector: string, invoker: HTMLElement): Element[] {
  // Input validation
  if (!selector || typeof selector !== 'string') {
    return [];
  }

  const trimmedSelector = selector.trim();
  if (!trimmedSelector) {
    return [];
  }

  // 1. Contextual Selectors (prefixed with @)
  if (trimmedSelector.startsWith('@')) {
    if (!invoker || !invoker.isConnected) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn('Invokers: Invoker element is not connected to DOM');
      }
      return [];
    }
    const match = trimmedSelector.match(/^@([a-z]+)\((.*)\)$/);
    if (!match) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(`Invokers: Invalid contextual selector syntax: "${trimmedSelector}"`);
      }
      return [];
    }

    const type = match[1];
    let innerSelector = match[2];

    // Validate inner selector is not empty
    if (!innerSelector || !innerSelector.trim()) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(`Invokers: Empty inner selector in "${trimmedSelector}"`);
      }
      return [];
    }

    // Unescape backslash-escaped parentheses
    innerSelector = innerSelector.replace(/\\([()])/g, '$1');

    try {
      switch (type) {
        case 'closest':
          const closest = invoker.closest(innerSelector);
          return closest ? [closest] : [];

        case 'child':
          const child = invoker.querySelector(innerSelector);
          return child ? [child] : [];

        case 'children':
          return Array.from(invoker.querySelectorAll(innerSelector));

        default:
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn(`Invokers: Unknown contextual selector type "@${type}". Supported types: closest, child, children`);
          }
          return [];
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.error(`Invokers: Error in contextual selector "${trimmedSelector}":`, error);
      }
      return [];
    }
  }

  // 2. ID Selectors
  // Check if it's an explicit ID selector (#id)
  if (trimmedSelector.startsWith('#')) {
    const id = trimmedSelector.slice(1);
    if (id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
      try {
        const element = document.getElementById(id);
        return element ? [element] : [];
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.warn(`Invokers: Error getting element by ID "${id}":`, error);
        }
        return [];
      }
    }
  }

  // 3. Fallback: treat as plain ID (backward compatibility)
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(trimmedSelector)) {
    try {
      const element = document.getElementById(trimmedSelector);
      if (element) {
        return [element];
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn(`Invokers: Error getting element by ID "${trimmedSelector}":`, error);
      }
    }
  }

  // 4. Global CSS Selector (fallback)
  try {
    const elements = document.querySelectorAll(trimmedSelector);
    return Array.from(elements);
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.error(`Invokers: Invalid CSS selector "${trimmedSelector}":`, error);
    }
    return [];
  }
}