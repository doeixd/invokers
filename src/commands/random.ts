// src/commands/random.ts
import type { InvokerManager, CommandContext } from '../core';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Random Command Pack - Declarative random data generation
 *
 * This pack provides commands for generating random data without custom JavaScript,
 * essential for demos, testing, and benchmark implementations like the JS Framework Benchmark.
 *
 * Commands included:
 * - --random:choice:list-id: Pick random item from datalist/template
 * - --random:concat:list1:list2:...: Concatenate random choices
 * - --random:number:min:max: Generate random integers
 * - --random:seed:value: Set seed for reproducible randomness
 * - --random:uuid: Generate UUID v4
 * - --random:store:list-id:key: Store random choice in dataset
 */

/**
 * Simple seeded random number generator using Linear Congruential Generator (LCG)
 * This provides reproducible randomness for testing and demos.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array
   */
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Global seeded random instance - null means use Math.random()
 */
let globalSeededRandom: SeededRandom | null = null;

/**
 * Get random number between 0 and 1, using seeded random if set
 */
function getRandom(): number {
  return globalSeededRandom ? globalSeededRandom.next() : Math.random();
}

/**
 * Get random integer between min and max (inclusive), using seeded random if set
 */
function getRandomInt(min: number, max: number): number {
  if (globalSeededRandom) {
    return globalSeededRandom.nextInt(min, max);
  }
  return Math.floor(getRandom() * (max - min + 1)) + min;
}

/**
 * Pick random element from array, using seeded random if set
 */
function randomChoice<T>(array: T[]): T {
  if (globalSeededRandom) {
    return globalSeededRandom.choice(array);
  }
  return array[Math.floor(getRandom() * array.length)];
}

/**
 * Parse a list from a datalist or template element
 */
function parseList(listId: string, invoker: HTMLButtonElement): string[] {
  // Try datalist first
  const datalist = document.getElementById(listId);

  if (datalist && datalist.tagName === 'DATALIST') {
    // Get options from datalist
    const options = Array.from(datalist.querySelectorAll('option'));
    if (options.length > 0) {
      return options.map(opt => opt.value || opt.textContent || '').filter(Boolean);
    }

    // Fallback: check if datalist has text content with comma-separated values
    const textContent = datalist.textContent?.trim();
    if (textContent) {
      return textContent.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Try template
  if (datalist && datalist.tagName === 'TEMPLATE') {
    const template = datalist as HTMLTemplateElement;
    const textContent = template.content.textContent?.trim() || template.textContent?.trim();
    if (textContent) {
      return textContent.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // Not found or empty
  throw createInvokerError(
    `List element "${listId}" not found or empty`,
    ErrorSeverity.ERROR,
    {
      command: '--random:choice',
      element: invoker,
      context: { listId },
      recovery: 'Ensure the list exists as a <datalist> or <template> element with comma-separated values'
    }
  );
}

/**
 * Generate a UUID v4 string
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (getRandom() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Registers the random command pack with an InvokerManager instance.
 *
 * @param manager The InvokerManager instance to register commands with
 *
 * @example
 * ```typescript
 * import invokers from 'invokers';
 * import { registerRandomCommands } from 'invokers/commands/random';
 *
 * // Register random commands
 * registerRandomCommands(invokers);
 * ```
 *
 * @example
 * ```html
 * <!-- Define word lists -->
 * <datalist id="adjectives">
 *   pretty,large,big,small,tall,short,long,handsome
 * </datalist>
 *
 * <datalist id="colors">
 *   red,yellow,blue,green,pink,brown,purple,orange
 * </datalist>
 *
 * <!-- Generate random adjective -->
 * <button command="--random:choice:adjectives" commandfor="output">
 *   Random Adjective
 * </button>
 * <span id="output"></span>
 *
 * <!-- Generate random label by concatenating random words -->
 * <button command="--random:concat:adjectives:colors"
 *         data-separator=" "
 *         commandfor="label">
 *   Random Label
 * </button>
 * <span id="label"></span>
 *
 * <!-- Generate random ID -->
 * <button command="--random:number:1:1000" commandfor="id">
 *   Random ID
 * </button>
 * <span id="id"></span>
 * ```
 */
export function registerRandomCommands(manager: InvokerManager): void {

  // --random:choice:list-id
  // Picks a random item from a <datalist> or <template> containing comma-separated values
  manager.register('--random:choice', async ({ invoker, targetElement, params }: CommandContext) => {
    try {
      if (invoker && !invoker.isConnected) {
        throw createInvokerError('--random:choice failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:choice', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--random:choice failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:choice', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const [listId] = params;

      if (!listId) {
        throw createInvokerError(
          'Random choice command requires a list ID',
          ErrorSeverity.ERROR,
          {
            command: '--random:choice',
            element: invoker,
            recovery: 'Specify the ID of a datalist or template: --random:choice:myList'
          }
        );
      }

      try {
        const items = parseList(listId, invoker);
        const choice = randomChoice(items);

        // Set the text content of the target element
        const updateDOM = () => {
          if (targetElement.isConnected) {
            targetElement.textContent = choice;

            // Also store in dataset for potential chaining
            targetElement.dataset.randomValue = choice;
          }
        };

        await (document.startViewTransition
          ? document.startViewTransition(updateDOM).finished
          : Promise.resolve(updateDOM()));

        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('--random:choice: Selected', choice, 'from list', listId);
        }
      } catch (error) {
        throw createInvokerError(
          'Failed to pick random choice',
          ErrorSeverity.ERROR,
          {
            command: '--random:choice',
            element: invoker,
            cause: error as Error,
            context: { listId },
            recovery: 'Check that the list element exists and contains comma-separated values'
          }
        );
      }
    } catch (error) {
      throw createInvokerError('--random:choice failed', ErrorSeverity.ERROR, {
        command: '--random:choice', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameters.'
      });
    }
  });

  // --random:concat:list1:list2:list3...
  // Concatenates random choices from multiple lists
  manager.register('--random:concat', async ({ invoker, targetElement, params }: CommandContext) => {
    try {
      if (invoker && !invoker.isConnected) {
        throw createInvokerError('--random:concat failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:concat', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--random:concat failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:concat', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      if (params.length === 0) {
        throw createInvokerError(
          'Random concat command requires at least one list ID',
          ErrorSeverity.ERROR,
          {
            command: '--random:concat',
            element: invoker,
            recovery: 'Specify one or more list IDs: --random:concat:list1:list2:list3'
          }
        );
      }

      try {
        const separator = invoker.dataset.separator || ' ';
        const choices: string[] = [];

        for (const listId of params) {
          const items = parseList(listId, invoker);
          const choice = randomChoice(items);
          choices.push(choice);
        }

        const result = choices.join(separator);

        // Set the text content of the target element
        const updateDOM = () => {
          if (targetElement.isConnected) {
            targetElement.textContent = result;

            // Store individual choices in dataset
            choices.forEach((choice, index) => {
              targetElement.dataset[`randomValue${index}`] = choice;
            });

            // Store combined result
            targetElement.dataset.randomValue = result;
          }
        };

        await (document.startViewTransition
          ? document.startViewTransition(updateDOM).finished
          : Promise.resolve(updateDOM()));

        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('--random:concat: Concatenated', choices.length, 'choices into', result);
        }
      } catch (error) {
        throw createInvokerError(
          'Failed to concatenate random choices',
          ErrorSeverity.ERROR,
          {
            command: '--random:concat',
            element: invoker,
            cause: error as Error,
            context: { listIds: params },
            recovery: 'Check that all list elements exist and contain comma-separated values'
          }
        );
      }
    } catch (error) {
      throw createInvokerError('--random:concat failed', ErrorSeverity.ERROR, {
        command: '--random:concat', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameters.'
      });
    }
  });

  // --random:number:min:max
  // Generates a random integer between min and max (inclusive)
  manager.register('--random:number', async ({ invoker, targetElement, params }: CommandContext) => {
    try {
      if (invoker && !invoker.isConnected) {
        throw createInvokerError('--random:number failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:number', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--random:number failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:number', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const [minStr, maxStr] = params;

      if (!minStr || !maxStr) {
        throw createInvokerError(
          'Random number command requires min and max values',
          ErrorSeverity.ERROR,
          {
            command: '--random:number',
            element: invoker,
            recovery: 'Specify min and max: --random:number:1:100'
          }
        );
      }

      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);

      if (isNaN(min) || isNaN(max)) {
        throw createInvokerError(
          'Random number command requires valid integer values',
          ErrorSeverity.ERROR,
          {
            command: '--random:number',
            element: invoker,
            context: { minStr, maxStr },
            recovery: 'Use valid integers: --random:number:1:100'
          }
        );
      }

      if (min > max) {
        throw createInvokerError(
          'Random number min value must be less than or equal to max',
          ErrorSeverity.ERROR,
          {
            command: '--random:number',
            element: invoker,
            context: { min, max },
            recovery: 'Ensure min <= max: --random:number:1:100'
          }
        );
      }

      const randomNum = getRandomInt(min, max);

      // Set the text content of the target element
      const updateDOM = () => {
        if (targetElement.isConnected) {
          targetElement.textContent = String(randomNum);
          targetElement.dataset.randomValue = String(randomNum);
        }
      };

      await (document.startViewTransition
        ? document.startViewTransition(updateDOM).finished
        : Promise.resolve(updateDOM()));

      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log('--random:number: Generated random number:', randomNum, 'between', min, 'and', max);
      }
    } catch (error) {
      // Re-throw InvokerErrors as-is (they already have proper context)
      if (error && typeof error === 'object' && 'severity' in error) {
        throw error;
      }
      throw createInvokerError('--random:number failed', ErrorSeverity.ERROR, {
        command: '--random:number', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameter format.'
      });
    }
  });

  // --random:seed:value
  // Sets a seed for deterministic randomness (useful for testing)
  manager.register('--random:seed', ({ invoker, params }: CommandContext) => {
    try {
      if (invoker && !invoker.isConnected) {
        throw createInvokerError('--random:seed failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:seed', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      const [seedStr] = params;

      if (!seedStr) {
        throw createInvokerError(
          'Random seed command requires a seed value',
          ErrorSeverity.ERROR,
          {
            command: '--random:seed',
            element: invoker,
            recovery: 'Specify a seed value: --random:seed:12345'
          }
        );
      }

      const seed = parseInt(seedStr, 10);

      if (isNaN(seed)) {
        throw createInvokerError(
          'Random seed must be a valid integer',
          ErrorSeverity.ERROR,
          {
            command: '--random:seed',
            element: invoker,
            context: { seedStr },
            recovery: 'Use a valid integer: --random:seed:12345'
          }
        );
      }

      try {
        // Initialize seeded random with the provided seed
        globalSeededRandom = new SeededRandom(seed);

        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('--random:seed: Random seed set to', seed);
        }
      } catch (error) {
        throw createInvokerError('--random:seed failed: Error setting random seed', ErrorSeverity.ERROR, {
          command: '--random:seed', element: invoker, cause: error as Error, recovery: 'Check seed value format.'
        });
      }
    } catch (error) {
      // Re-throw InvokerErrors as-is (they already have proper context)
      if (error && typeof error === 'object' && 'severity' in error) {
        throw error;
      }
      throw createInvokerError('--random:seed failed', ErrorSeverity.ERROR, {
        command: '--random:seed', element: invoker, cause: error as Error, recovery: 'Check element connectivity and seed parameter.'
      });
    }
  });

  // --random:uuid
  // Generates a UUID v4 string
  manager.register('--random:uuid', async ({ targetElement }: CommandContext) => {
    try {
      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--random:uuid failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:uuid', element: targetElement, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const uuid = generateUUID();

      // Set the text content of the target element
      const updateDOM = () => {
        if (targetElement.isConnected) {
          targetElement.textContent = uuid;
          targetElement.dataset.randomValue = uuid;
        }
      };

      await (document.startViewTransition
        ? document.startViewTransition(updateDOM).finished
        : Promise.resolve(updateDOM()));

      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log('--random:uuid: Generated UUID:', uuid);
      }
    } catch (error) {
      throw createInvokerError('--random:uuid failed', ErrorSeverity.ERROR, {
        command: '--random:uuid', element: targetElement, cause: error as Error, recovery: 'Check target element connectivity.'
      });
    }
  });

  // --random:store:list-id:key
  // Stores random choice in target element's dataset
  manager.register('--random:store', ({ invoker, targetElement, params }: CommandContext) => {
    try {
      if (invoker && !invoker.isConnected) {
        throw createInvokerError('--random:store failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:store', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--random:store failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--random:store', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const [listId, key] = params;

      if (!listId) {
        throw createInvokerError(
          'Random store command requires a list ID',
          ErrorSeverity.ERROR,
          {
            command: '--random:store',
            element: invoker,
            recovery: 'Specify a list ID and optional key: --random:store:myList:myKey'
          }
        );
      }

      try {
        const items = parseList(listId, invoker);
        const choice = randomChoice(items);

        // Store in dataset with specified key or default to 'randomValue'
        const dataKey = key || 'randomValue';
        if (targetElement.isConnected) {
          targetElement.dataset[dataKey] = choice;
        }

        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('--random:store: Stored random value', choice, 'in dataset.' + dataKey);
        }
      } catch (error) {
        throw createInvokerError(
          'Failed to store random choice',
          ErrorSeverity.ERROR,
          {
            command: '--random:store',
            element: invoker,
            cause: error as Error,
            context: { listId, key },
            recovery: 'Check that the list element exists and contains comma-separated values'
          }
        );
      }
    } catch (error) {
      // Re-throw InvokerErrors as-is (they already have proper context)
      if (error && typeof error === 'object' && 'severity' in error) {
        throw error;
      }
      throw createInvokerError('--random:store failed', ErrorSeverity.ERROR, {
        command: '--random:store', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameters.'
      });
    }
  });
}

/**
 * Reset the random seed to use Math.random() again
 * Exported for testing purposes
 */
export function resetRandomSeed(): void {
  globalSeededRandom = null;
}

/**
 * Get the current random number generator (for testing)
 * @internal
 */
export function _getSeededRandom(): SeededRandom | null {
  return globalSeededRandom;
}
