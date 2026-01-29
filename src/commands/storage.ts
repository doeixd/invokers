/**
 * @file storage.ts
 * @description Storage command implementations for localStorage and sessionStorage
 */
import { debugLog, debugWarn } from '../utils';
import type { InvokerManager } from '../core';
import { createInvokerError, ErrorSeverity } from '../index';

interface StorageItem {
  value: any;
  expires?: number;
}

function isExpired(item: StorageItem): boolean {
  return item.expires ? Date.now() > item.expires : false;
}

function getStorage(storageType: string): Storage | null {
  if (storageType !== 'local' && storageType !== 'session') {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugWarn('--storage: Invalid storage type:', storageType, '. Must be "local" or "session"');
    }
    return null;
  }
  return storageType === 'local' ? localStorage : sessionStorage;
}

function parseStorageItem(rawValue: string | null): StorageItem | null {
  if (!rawValue) return null;

  try {
    const item: StorageItem = JSON.parse(rawValue);
    if (isExpired(item)) {
      return null; // Treat expired items as non-existent
    }
    return item;
  } catch {
    // If not JSON, treat as plain string
    return { value: rawValue };
  }
}

function stringifyStorageItem(value: any, expires?: number): string {
  const item: StorageItem = { value };
  if (expires) {
    item.expires = expires;
  }
  return JSON.stringify(item);
}

export function registerStorageCommands(manager: InvokerManager): void {
  manager.register('--storage', ({ targetElement, params, invoker }) => {
    try {
      if (invoker && !invoker.isConnected) {
        throw createInvokerError('--storage failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--storage', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      const storageType = params[0];
      const action = params[1];
      const key = params[2];
      const value = params.slice(3).join(':');

      if (!storageType) {
        throw createInvokerError('--storage failed: Storage type required', ErrorSeverity.ERROR, {
          command: '--storage', element: invoker, recovery: 'Use --storage:local:action or --storage:session:action'
        });
      }

      if (!action) {
        throw createInvokerError('--storage failed: Action required', ErrorSeverity.ERROR, {
          command: '--storage', element: invoker, recovery: 'Use --storage:type:set/get/remove/clear/keys/has/size'
        });
      }

      const storage = getStorage(storageType);
      if (!storage) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('--storage failed: Invalid storage type', { storageType, command: '--storage', element: invoker });
        }
        return; // Gracefully handle invalid storage type
      }

      try {
        switch (action) {
          case 'set': {
            if (!key) {
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugWarn('--storage set failed: Key required', { command: '--storage', element: invoker });
              }
              return; // Gracefully handle missing key
            }
            let actualValue = value;
            if (!actualValue && targetElement && targetElement.isConnected) {
              // If no value provided in command, get from target element
              if (targetElement instanceof HTMLInputElement) {
                if (targetElement.type === 'checkbox') {
                  actualValue = targetElement.checked.toString();
                } else {
                  actualValue = targetElement.value;
                }
              } else {
                actualValue = targetElement.textContent || '';
              }
            }
             let expires: number | undefined;
             if (actualValue.startsWith('expires:')) {
               const expiresValue = parseInt(actualValue.split(':')[1]);
               // If expires value is small (< year 2286), treat as relative milliseconds from now
               // Otherwise, treat as absolute timestamp
               expires = expiresValue < 1e10 ? Date.now() + expiresValue : expiresValue;
               actualValue = actualValue.split(':').slice(2).join(':');
             }
             const finalValue = actualValue;
            storage.setItem(key, stringifyStorageItem(finalValue, expires));

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage set:', storageType, key, '=', finalValue);
            }
            break;
          }

          case 'get': {
            if (!key) {
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugWarn('--storage get failed: Key required', { command: '--storage', element: invoker });
              }
              return; // Gracefully handle missing key
            }
            const rawValue = storage.getItem(key);
            const item = parseStorageItem(rawValue);
            if (item === null && rawValue !== null) {
              // Item exists but is expired, remove it
              storage.removeItem(key);
            }
            if (targetElement && targetElement.isConnected) {
              targetElement.textContent = item ? item.value : '';
            }

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage get:', storageType, key, '=', item ? item.value : 'null');
            }
            break;
          }

          case 'remove': {
            if (!key) {
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugWarn('--storage remove failed: Key required', { command: '--storage', element: invoker });
              }
              return; // Gracefully handle missing key
            }
            storage.removeItem(key);

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage remove:', storageType, key);
            }
            break;
          }

          case 'clear': {
            storage.clear();

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage clear:', storageType);
            }
            break;
          }

          case 'keys': {
            const keys = Object.keys(storage);
            if (targetElement && targetElement.isConnected) {
              targetElement.textContent = keys.join(', ');
            }

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage keys:', storageType, keys);
            }
            break;
          }

          case 'has': {
            if (!key) {
              throw createInvokerError('--storage has failed: Key required', ErrorSeverity.ERROR, {
                command: '--storage', element: invoker, recovery: 'Use --storage:type:has:key'
              });
            }
            const item = parseStorageItem(storage.getItem(key));
            const hasKey = item !== null;
            if (targetElement && targetElement.isConnected) {
              targetElement.textContent = hasKey ? 'true' : 'false';
            }

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage has:', storageType, key, '=', hasKey);
            }
            break;
          }

          case 'size': {
            let size = 0;
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (key) {
                const item = parseStorageItem(storage.getItem(key));
                if (item) size++;
              }
            }
            if (targetElement && targetElement.isConnected) {
              targetElement.textContent = size.toString();
            }

            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugLog('--storage size:', storageType, size);
            }
            break;
          }

          default:
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugWarn('--storage failed: Unknown action', { action, command: '--storage', element: invoker });
            }
            return; // Gracefully handle unknown action
        }
      } catch (storageError) {
        throw createInvokerError('--storage failed: Storage operation error', ErrorSeverity.ERROR, {
          command: '--storage', element: invoker, cause: storageError as Error, recovery: 'Check storage availability and permissions.'
        });
      }
    } catch (error) {
      if (error instanceof Error && 'severity' in error) {
        throw error; // Re-throw InvokerError
      }
      throw createInvokerError(
        `Storage operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorSeverity.ERROR,
        {
          command: '--storage',
          recovery: 'Check storage type, action, and parameters'
        }
      );
    }
  });
}
