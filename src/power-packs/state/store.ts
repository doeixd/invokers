/**
 * Global state store for Invokers State module.
 * Provides reactive state management with JSON script initialization.
 */

import { debugLog, debugWarn, debugError } from '../../utils';
export interface StateStore {
  [key: string]: any;
}

class InvokerStateStore {
  private state: StateStore = {};
  private listeners: Map<string, Set<(value: any, oldValue: any) => void>> = new Map();

  /**
   * Initialize the state store from JSON scripts in the document.
   * Looks for <script type="application/json" data-state="store-name">...</script>
   */
  initialize(): void {
    if (typeof document === 'undefined') return;

    const stateScripts = document.querySelectorAll('script[type="application/json"][data-state]');
    debugError(`[InvokerState] Found ${stateScripts.length} state scripts`);
    stateScripts.forEach(script => {
      const storeName = script.getAttribute('data-state');
      if (!storeName) return;

      try {
        const data = JSON.parse(script.textContent || '{}');
        debugError(`[InvokerState] Setting store "${storeName}" with data:`, data);
        this.setStore(storeName, data);
      } catch (error) {
        debugWarn(`[InvokerState] Failed to parse state script for "${storeName}":`, error);
      }
    });
  }

  /**
   * Get a value from the state store.
   */
  get(path: string): any {
    return this.getNestedValue(this.state, path);
  }

  /**
   * Set a value in the state store and notify listeners.
   */
  set(path: string, value: any): void {
    const oldValue = this.get(path);
    this.setNestedValue(this.state, path, value);
    this.notifyListeners(path, value, oldValue);
  }

  /**
   * Set an entire store object.
   */
  setStore(storeName: string, data: StateStore): void {
    this.state[storeName] = { ...data };

    // Notify all listeners that match this store and its children
    this.listeners.forEach((callbacks, listenerPath) => {
      // Check if the listener path is for this store or its children
      if (listenerPath.startsWith(`${storeName}.`) || listenerPath === `${storeName}.*`) {
        // Get the actual value for this listener's path
        const value = this.get(listenerPath);
        callbacks.forEach(callback => callback(value, undefined));
      }
    });
  }

  /**
   * Get an entire store object.
   */
  getStore(storeName: string): StateStore | undefined {
    return this.state[storeName];
  }

  /**
   * Get the entire state object for expression evaluation.
   */
  getState(): StateStore {
    return this.state;
  }

  /**
   * Get a proxy to the entire state for safe access.
   */
  getStateProxy(): any {
    return new Proxy(this.state, {
      get: (target, prop: string) => {
        return target[prop];
      }
    });
  }

  /**
   * Subscribe to changes on a specific path.
   */
  subscribe(path: string, callback: (value: any, oldValue: any) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Notify listeners of a change.
   */
  private notifyListeners(path: string, value: any, oldValue: any): void {
    // Notify exact path listeners
    const exactListeners = this.listeners.get(path);
    if (exactListeners) {
      exactListeners.forEach(callback => callback(value, oldValue));
    }

    // Notify wildcard listeners (e.g., "store.*" for any change in "store")
    const parts = path.split('.');
    for (let i = parts.length - 1; i >= 0; i--) {
      const wildcardPath = [...parts.slice(0, i), '*'].join('.');
      const wildcardListeners = this.listeners.get(wildcardPath);
      if (wildcardListeners) {
        wildcardListeners.forEach(callback => callback(value, oldValue));
      }
    }
  }

  /**
   * Get a nested value from an object using dot notation.
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set a nested value in an object using dot notation.
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Reset the entire state store.
   */
  reset(): void {
    this.state = {};
    this.listeners.clear();
  }
}

// Global singleton instance
let stateStoreInstance: InvokerStateStore | null = null;

export function getStateStore(): InvokerStateStore {
  if (!stateStoreInstance) {
    stateStoreInstance = new InvokerStateStore();
  }
  return stateStoreInstance;
}

export function initializeStateStore(): void {
  getStateStore().initialize();
}

export function resetStateStore(): void {
  if (stateStoreInstance) {
    stateStoreInstance.reset();
  }

  // Also reset computed properties and bindings
  // Import dynamically to avoid circular dependencies
  import('./computed').then(({ resetComputedProperties }) => {
    resetComputedProperties();
  });
  import('./binding').then(({ resetDataBinding }) => {
    resetDataBinding();
  });
}
