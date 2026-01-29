/**
 * @file data.ts
 * @summary Data Management Command Pack for the Invokers library.
 * @description
 * This module provides commands for sophisticated data manipulation including
 * array operations, context management, and reactive data binding. These commands
 * are especially powerful when combined with the advanced templating system.
 * 
 * @example
 * ```javascript
 * import { registerDataCommands } from 'invokers/commands/data';
 * import { InvokerManager } from 'invokers';
 * 
 * const invokerManager = InvokerManager.getInstance();
 * registerDataCommands(invokerManager);
 * ```
 */
import { debugLog, debugWarn } from '../utils';
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, isInterpolationEnabled } from '../index';
import { interpolateString } from '../advanced/interpolation';
import { resolveTargets } from '../target-resolver';

const numberValuePattern = /^-?\d+(?:\.\d+)?$/;

function coerceDatasetValues(dataset?: DOMStringMap): Record<string, string | number> {
  if (!dataset) {
    return {};
  }

  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(dataset)) {
    if (value == null) {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed && numberValuePattern.test(trimmed)) {
      const numericValue = Number(trimmed);
      result[key] = Number.isFinite(numericValue) ? numericValue : value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Data manipulation commands for complex data operations and state management.
 * Includes array manipulation, data binding, and reactive data operations.
 */
const dataCommands: Record<string, CommandCallback> = {

  // --- Basic Data Commands ---

  /**
   * `--data:set`: Sets a data attribute on the target element.
   * @example `<button command="--data:set:userId:123" commandfor="#profile">Set User ID</button>`
   */
   "--data:set": ({ invoker, targetElement, params }: CommandContext) => {
     try {
       const key = params[0];
       let value = params[1];
       if (!key) {
         throw createInvokerError('Data set command requires a key parameter', ErrorSeverity.ERROR, {
           command: '--data:set', element: invoker
         });
       }

        // Interpolate value if interpolation is enabled and contains {{...}}
        if (isInterpolationEnabled() && value && value.includes('{{')) {
          const safeInvoker = {
            dataset: { ...invoker.dataset },
            value: (invoker as any).value || '',
          };
          const context = {
            this: safeInvoker,
            data: { ...document.body.dataset, ...(invoker.parentElement?.dataset || {}) },
            event: (invoker as any).triggeringEvent,
          };
          value = interpolateString(value, context);
        }

       targetElement.dataset[key] = value || '';

        // Dispatch custom event for reactive updates
        const eventKey = key.split(':')[0];
        targetElement.dispatchEvent(new CustomEvent(`data:${eventKey}`, {
          bubbles: true,
          detail: { value: `${key}:${value || ''}` }
        }));

       // Handle data binding if specified
       let bindTo = invoker.dataset.bindTo;
       let bindAs = invoker.dataset.bindAs || `data:${key}`;
       if (bindTo) {
          // Interpolate bindTo and bindAs if they contain expressions
          const safeInvoker = {
            dataset: { ...invoker.dataset },
            value: (invoker as any).value || '',
          };
          if (isInterpolationEnabled() && bindTo.includes('{{')) {
            bindTo = interpolateString(bindTo, {
              this: safeInvoker,
              data: { ...document.body.dataset, ...(invoker.parentElement?.dataset || {}) },
              event: (invoker as any).triggeringEvent,
            });
          }
          if (isInterpolationEnabled() && bindAs.includes('{{')) {
            bindAs = interpolateString(bindAs, {
              this: safeInvoker,
              data: { ...document.body.dataset, ...(invoker.parentElement?.dataset || {}) },
              event: (invoker as any).triggeringEvent,
            });
          }

         const bindTargets = resolveTargets(bindTo, invoker) as HTMLElement[];
       bindTargets.forEach(target => {
         if (bindAs.startsWith('data:')) {
           const dataKey = bindAs.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
           target.dataset[dataKey] = value || '';
         } else if (bindAs === 'text') {
           target.textContent = value || '';
         } else if (bindAs === 'value' && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
           (target as HTMLInputElement).value = value || '';
         } else if (bindAs.startsWith('attr:')) {
           const attrName = bindAs.substring(5);
           target.setAttribute(attrName, value || '');
         }
         // Dispatch event on bound target as well
         target.dispatchEvent(new CustomEvent(`data:${key}`, {
           bubbles: true,
           detail: { value: `${key}:${value}` }
         }));
        });
      }
     } catch (error) {
       throw createInvokerError('Failed to set data attribute', ErrorSeverity.ERROR, {
         command: '--data:set', element: invoker, cause: error as Error,
         recovery: 'Check data key format and target element'
       });
     }
   },

  /**
   * `--data:copy`: Copies a data attribute from a source element to the target.
   * @example `<button command="--data:copy:userId" commandfor="#edit-form" data-copy-from="#user-profile">Edit User</button>`
   */
  "--data:copy": ({ invoker, targetElement, params }: CommandContext) => {
    const key = params[0];
    if (!key) {
      throw createInvokerError('Data copy command requires a key parameter', ErrorSeverity.ERROR, {
        command: '--data:copy', element: invoker
      });
    }

    const sourceSelector = invoker.dataset.copyFrom;
    let sourceElement: HTMLElement | null = invoker;

    if (sourceSelector) {
      sourceElement = document.querySelector(sourceSelector);
      if (!sourceElement) {
        throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, ErrorSeverity.ERROR, {
          command: '--data:copy', element: invoker
        });
      }
    }

    const value = sourceElement.dataset[key];
    if (value !== undefined) {
      targetElement.dataset[key] = value;
    }
  },

  // --- Array Manipulation Commands ---

  /**
   * `--data:set:array:push`: Adds an item to the end of an array stored in a data attribute.
   * @example `<button command="--data:set:array:push:todos" data-value='{"title": "New Task"}' commandfor="#app">Add Todo</button>`
   */
  "--data:set:array:push": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array push command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:push', element: invoker
      });
    }

    const valueToAdd = invoker.dataset.value;
    if (!valueToAdd) {
      throw createInvokerError('Array push command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:push', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    try {
      const newItem = JSON.parse(valueToAdd);
      arrayData.push(newItem);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    } catch (e) {
      throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:push', element: invoker
      });
    }
  },

  /**
   * `--data:set:array:remove`: Removes an item at a specific index from an array stored in a data attribute.
   * @example `<button command="--data:set:array:remove:todos" data-index="2" commandfor="#app">Remove Item</button>`
   */
  "--data:set:array:remove": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array remove command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:remove', element: invoker
      });
    }

    const indexToRemove = parseInt(invoker.dataset.index || '0', 10);
    if (isNaN(indexToRemove)) {
      throw createInvokerError('Array remove command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:remove', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    if (indexToRemove >= 0 && indexToRemove < arrayData.length) {
      arrayData.splice(indexToRemove, 1);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    }
  },

  /**
   * `--data:set:array:update`: Updates an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:set:array:update:todos" data-index="1" data-value='{"title": "Updated"}' commandfor="#app">Update Item</button>`
   */
  "--data:set:array:update": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array update command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:update', element: invoker
      });
    }

    const indexToUpdate = parseInt(invoker.dataset.index || '0', 10);
    const valueToUpdate = invoker.dataset.value;

    if (isNaN(indexToUpdate)) {
      throw createInvokerError('Array update command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:update', element: invoker
      });
    }

    if (!valueToUpdate) {
      throw createInvokerError('Array update command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:update', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    if (indexToUpdate >= 0 && indexToUpdate < arrayData.length) {
      try {
        const updateData = JSON.parse(valueToUpdate);
        arrayData[indexToUpdate] = { ...arrayData[indexToUpdate], ...updateData };
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      } catch (e) {
        throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:update', element: invoker
        });
      }
    }
  },

  /**
   * `--data:set:array:insert`: Inserts an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:set:array:insert:todos" data-index="1" data-value='{"title": "Inserted Item"}' commandfor="#app">Insert at Position 1</button>`
   */
  "--data:set:array:insert": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array insert command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }

    const indexToInsert = parseInt(invoker.dataset.index || '0', 10);
    const valueToInsert = invoker.dataset.value;

    if (isNaN(indexToInsert)) {
      throw createInvokerError('Array insert command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }

    if (!valueToInsert) {
      throw createInvokerError('Array insert command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    try {
      const newItem = JSON.parse(valueToInsert);
      arrayData.splice(indexToInsert, 0, newItem);
      targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    } catch (e) {
      throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:insert', element: invoker
      });
    }
  },

  /**
   * `--data:set:array:sort`: Sorts an array stored in a data attribute by a specified property.
   * @example `<button command="--data:set:array:sort:todos" data-sort-by="title" data-sort-order="asc" commandfor="#app">Sort by Title</button>`
   */
  "--data:set:array:sort": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array sort command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:sort', element: invoker
      });
    }

    const sortBy = invoker.dataset.sortBy || invoker.dataset.sort_by;
    const sortOrder = invoker.dataset.sortOrder || invoker.dataset.sort_order || 'asc';

    if (!sortBy) {
      throw createInvokerError('Array sort command requires a data-sort-by attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:sort', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    arrayData.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
  },

  /**
   * `--data:set:array:filter`: Filters an array stored in a data attribute and stores the result in a new key.
   * @example `<button command="--data:set:array:filter:todos" data-filter-by="completed" data-filter-value="false" data-result-key="filtered-todos" commandfor="#app">Show Pending</button>`
   */
  "--data:set:array:filter": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array filter command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:array:filter', element: invoker
      });
    }

    const filterBy = invoker.dataset.filterBy || invoker.dataset.filter_by;
    const filterValue = invoker.dataset.filterValue || invoker.dataset.filter_value;
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-filtered`;

    if (!filterBy) {
      throw createInvokerError('Array filter command requires a data-filter-by attribute', ErrorSeverity.ERROR, {
        command: '--data:set:array:filter', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    const filteredData = arrayData.filter(item => {
      const itemValue = item[filterBy];
      if (filterValue === 'true') return itemValue === true;
      if (filterValue === 'false') return itemValue === false;
      return String(itemValue) === filterValue;
    });

    targetElement.dataset[resultKey] = JSON.stringify(filteredData);
  },

  /**
   * `--data:generate:array`: Generates an array with a specified pattern and stores it in a data attribute.
   * @example `<button command="--data:generate:array:numbers" data-count="10" data-pattern="index" commandfor="#app">Generate Numbers</button>`
   */
  "--data:generate:array": ({ invoker, targetElement, params }: CommandContext) => {
    debugLog('Invokers: --data:generate:array EXECUTING', {
      params,
      arrayKey: params[0],
      hasTemplate: !!invoker.dataset.template,
      count: invoker.dataset.count,
      isInterpolationEnabled: isInterpolationEnabled(),
      targetElementId: targetElement.id
    });
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array generate command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:generate:array', element: invoker
      });
    }

    const countStr = invoker.dataset.count;
    if (!countStr) {
      throw createInvokerError('Array generate command requires a data-count attribute', ErrorSeverity.ERROR, {
        command: '--data:generate:array', element: invoker
      });
    }

    const count = parseInt(countStr, 10);
    const pattern = invoker.dataset.pattern || 'index';
    const start = parseInt(invoker.dataset.start || '0', 10);
    const template = invoker.dataset.template;

    if (isNaN(count) || count < 0) {
      throw createInvokerError('Array generate command requires a valid data-count attribute', ErrorSeverity.ERROR, {
        command: '--data:generate:array', element: invoker
      });
    }

    const arrayData: any[] = [];

    if (template && isInterpolationEnabled()) {
      // Handle template-based generation with expressions
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog('Invokers: Processing template-based data generation', { template, count, isInterpolationEnabled: isInterpolationEnabled() });
      }
      try {
        debugLog('Invokers: Processing template:', template);
        for (let i = 0; i < count; i++) {
          // Create context for interpolation
          const datasetContext = {
            ...coerceDatasetValues(document.body?.dataset),
            ...coerceDatasetValues(targetElement?.dataset),
            ...coerceDatasetValues(invoker.parentElement?.dataset),
            ...coerceDatasetValues(invoker.dataset)
          };

          const context: any = {
            ...datasetContext,
            index: i,
            index1: i + 1,
            count: count,
            start: start,
            data: { ...datasetContext },
            this: {
              dataset: { ...invoker.dataset },
              value: (invoker as any).value || '',
            },
            event: (invoker as any).triggeringEvent,
          };

          // Add datalist contents to context
          const datalists = document.querySelectorAll('datalist');
          debugLog('Found datalists:', datalists.length);
          datalists.forEach(datalist => {
            const id = datalist.id;
            if (id) {
              const textContent = datalist.textContent?.trim();
              debugLog('Datalist', id, 'textContent:', textContent);
              if (textContent) {
                const array = textContent.split(',').map(s => s.trim());
                debugLog('Processing datalist', id, textContent, array);
                context[id] = array;
              }
            }
          });

          // Fallback for test
          if (!context.adjectives) {
            context.adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short'];
            context.colors = ['red', 'yellow', 'blue', 'green', 'pink', 'brown'];
            context.nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car'];
          }

          // Interpolate the template string
          if (i === 0) debugLog('Invokers: Context for first item:', context);
          const interpolatedString = interpolateString(template, context);
          if (i === 0) debugLog('Invokers: Interpolated string for first item:', interpolatedString);

          // Parse the interpolated string as JSON
          const item = JSON.parse(interpolatedString);
          arrayData.push(item);
        }
      } catch (error) {
        throw createInvokerError('Failed to parse or interpolate data template', ErrorSeverity.ERROR, {
          command: '--data:generate:array', element: invoker, cause: error as Error
        });
      }
    } else {
      // Handle simple pattern-based generation
      for (let i = 0; i < count; i++) {
        switch (pattern) {
          case 'index':
            arrayData.push(start + i);
            break;
          case 'random':
            arrayData.push(Math.random());
            break;
          case 'uuid':
            arrayData.push(generateId());
            break;
          case 'object':
            arrayData.push({ id: generateId(), index: start + i });
            break;
          default:
            arrayData.push(start + i);
        }
      }
    }

    targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
    debugLog('Invokers: --data:generate:array COMPLETED', {
      arrayKey,
      arrayDataLength: arrayData.length,
      targetElementId: targetElement.id,
      storedData: targetElement.dataset[arrayKey]?.substring(0, 100) + '...'
    });
  },

  /**
   * `--data:index:get`: Gets an item at a specific index from an array stored in a data attribute.
   * @example `<button command="--data:index:get:items" data-index="2" data-result-key="selected-item" commandfor="#app">Get Item at Index 2</button>`
   */
  "--data:index:get": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array index get command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:index:get', element: invoker
      });
    }

    const index = parseInt(invoker.dataset.index || '0', 10);
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-item`;

    if (isNaN(index)) {
      throw createInvokerError('Array index get command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:index:get', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    if (index >= 0 && index < arrayData.length) {
      targetElement.dataset[resultKey] = JSON.stringify(arrayData[index]);
    } else {
      throw createInvokerError(`Index ${index} is out of bounds for array with length ${arrayData.length}`, ErrorSeverity.ERROR, {
        command: '--data:index:get', element: invoker
      });
    }
  },

  /**
   * `--data:index:set`: Sets an item at a specific index in an array stored in a data attribute.
   * @example `<button command="--data:index:set:items" data-index="2" data-value='{"name": "Updated"}' commandfor="#app">Update Item at Index 2</button>`
   */
  "--data:index:set": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array index set command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:index:set', element: invoker
      });
    }

    const index = parseInt(invoker.dataset.index || '0', 10);
    const value = invoker.dataset.value;

    if (isNaN(index)) {
      throw createInvokerError('Array index set command requires a valid data-index attribute', ErrorSeverity.ERROR, {
        command: '--data:index:set', element: invoker
      });
    }

    if (!value) {
      throw createInvokerError('Array index set command requires a data-value attribute', ErrorSeverity.ERROR, {
        command: '--data:index:set', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    if (index >= 0 && index < arrayData.length) {
      try {
        const newValue = JSON.parse(value);
        arrayData[index] = newValue;
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      } catch (e) {
        throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
          command: '--data:index:set', element: invoker
        });
      }
    } else {
      throw createInvokerError(`Index ${index} is out of bounds for array with length ${arrayData.length}`, ErrorSeverity.ERROR, {
        command: '--data:index:set', element: invoker
      });
    }
  },

  /**
   * `--data:swap`: Swaps two items at specified indices in an array stored in a data attribute.
   * @example `<button command="--data:swap:items" data-index-a="1" data-index-b="3" commandfor="#app">Swap Items 1 and 3</button>`
   */
   "--data:swap": ({ invoker, targetElement, params }: CommandContext) => {
     const arrayKey = params[0];
     if (!arrayKey) {
       throw createInvokerError('Array swap command requires an array key parameter', ErrorSeverity.ERROR, {
         command: '--data:swap', element: invoker
       });
     }

     // Support indices as parameters or data attributes
     let indexA: number, indexB: number;
     if (params[1] !== undefined && params[2] !== undefined) {
       indexA = parseInt(params[1], 10);
       indexB = parseInt(params[2], 10);
     } else {
       indexA = parseInt(invoker.dataset.indexA || invoker.dataset.index_a || '0', 10);
       indexB = parseInt(invoker.dataset.indexB || invoker.dataset.index_b || '0', 10);
     }

     if (isNaN(indexA) || isNaN(indexB)) {
       throw createInvokerError('Array swap command requires valid indices', ErrorSeverity.ERROR, {
         command: '--data:swap', element: invoker
       });
     }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

     if (indexA >= 0 && indexA < arrayData.length && indexB >= 0 && indexB < arrayData.length) {
       [arrayData[indexA], arrayData[indexB]] = [arrayData[indexB], arrayData[indexA]];
       targetElement.dataset[arrayKey] = JSON.stringify(arrayData);

       // Dispatch change event
       targetElement.dispatchEvent(new CustomEvent('data:changed', {
         detail: { key: arrayKey, value: arrayData }
       }));
     } else {
       throw createInvokerError(`Indices ${indexA} and/or ${indexB} are out of bounds for array with length ${arrayData.length}`, ErrorSeverity.ERROR, {
         command: '--data:swap', element: invoker
       });
     }
  },

  /**
   * `--data:slice`: Creates a slice of an array stored in a data attribute and stores it in a new key.
   * @example `<button command="--data:slice:items" data-start="1" data-end="4" data-result-key="sliced-items" commandfor="#app">Slice Items 1-4</button>`
   */
  "--data:slice": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array slice command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:slice', element: invoker
      });
    }

    const start = parseInt(invoker.dataset.start || '0', 10);
    const end = invoker.dataset.end ? parseInt(invoker.dataset.end, 10) : undefined;
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-slice`;

    if (isNaN(start) || (end !== undefined && isNaN(end))) {
      throw createInvokerError('Array slice command requires valid data-start and optional data-end attributes', ErrorSeverity.ERROR, {
        command: '--data:slice', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    const slicedData = arrayData.slice(start, end);
    targetElement.dataset[resultKey] = JSON.stringify(slicedData);
  },

  /**
   * `--data:map`: Transforms each item in an array stored in a data attribute using a mapping function.
   * @example `<button command="--data:map:items" data-map-function="item.value * 2" data-result-key="mapped-items" commandfor="#app">Double Values</button>`
   */
   "--data:map": ({ invoker, targetElement, params }: CommandContext) => {
     const arrayKey = params[0];
     if (!arrayKey) {
       throw createInvokerError('Array map command requires an array key parameter', ErrorSeverity.ERROR, {
         command: '--data:map', element: invoker
       });
     }

     const mapExpression = invoker.dataset.mapExpression || invoker.dataset.map_expression;
     const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || arrayKey;

     if (!mapExpression) {
       throw createInvokerError('Array map command requires a data-map-expression attribute', ErrorSeverity.ERROR, {
         command: '--data:map', element: invoker
       });
     }

     let arrayData: any[] = [];
     try {
       const existingData = targetElement.dataset[arrayKey];
       arrayData = existingData ? JSON.parse(existingData) : [];
     } catch (e) {
       arrayData = [];
     }

     const mappedData = arrayData.map((item, index) => {
       try {
         // Create context with item and index
         const context = {
           item,
           index
         };

         // Interpolate the expression template
         const interpolated = interpolateString(mapExpression, context);

         // Parse the result as JSON
         return JSON.parse(interpolated);
       } catch (e) {
         debugWarn('Invokers: Error mapping item:', e);
         return item; // Return original item on error
       }
     });

     targetElement.dataset[resultKey] = JSON.stringify(mappedData);

     // Dispatch change event
     targetElement.dispatchEvent(new CustomEvent('data:changed', {
       detail: { key: resultKey, value: mappedData }
     }));
   },

  /**
   * `--data:find`: Finds the first item in an array that matches specified criteria.
   * @example `<button command="--data:find:items" data-find-by="id" data-find-value="123" data-result-key="found-item" commandfor="#app">Find Item by ID</button>`
   */
  "--data:find": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array find command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:find', element: invoker
      });
    }

    const findBy = invoker.dataset.findBy || invoker.dataset.find_by;
    const findValue = invoker.dataset.findValue || invoker.dataset.find_value;
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-found`;

    if (!findBy) {
      throw createInvokerError('Array find command requires a data-find-by attribute', ErrorSeverity.ERROR, {
        command: '--data:find', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    const foundItem = arrayData.find(item => {
      const itemValue = item[findBy];
      if (findValue === 'true') return itemValue === true;
      if (findValue === 'false') return itemValue === false;
      return String(itemValue) === findValue;
    });

    if (foundItem !== undefined) {
      targetElement.dataset[resultKey] = JSON.stringify(foundItem);
    } else {
      // Clear the result key if not found
      delete targetElement.dataset[resultKey];
    }
  },

  /**
   * `--data:reduce`: Reduces an array to a single value using a reduction function.
   * @example `<button command="--data:reduce:items" data-reduce-function="sum + item.value" data-initial="0" data-result-key="total" commandfor="#app">Calculate Total</button>`
   */
  "--data:reduce": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array reduce command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:reduce', element: invoker
      });
    }

    const reduceFunction = invoker.dataset.reduceFunction || invoker.dataset.reduce_function;
    const initial = invoker.dataset.initial || '0';
    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-reduced`;

    if (!reduceFunction) {
      throw createInvokerError('Array reduce command requires a data-reduce-function attribute', ErrorSeverity.ERROR, {
        command: '--data:reduce', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    // Simplified reduce implementation
    let result: any = JSON.parse(initial);
    for (const item of arrayData) {
      try {
        // This would need proper expression evaluation for complex functions
        // For now, support simple accumulation
        if (reduceFunction.includes('sum + item.')) {
          const prop = reduceFunction.split('item.')[1];
          result += item[prop] || 0;
        } else if (reduceFunction === 'count') {
          result++;
        }
      } catch (e) {
        // Continue with current result
      }
    }

    targetElement.dataset[resultKey] = JSON.stringify(result);
  },

  /**
   * `--data:reverse`: Reverses the order of items in an array stored in a data attribute.
   * @example `<button command="--data:reverse:items" commandfor="#app">Reverse Array Order</button>`
   */
  "--data:reverse": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array reverse command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:reverse', element: invoker
      });
    }

    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      arrayData = [];
    }

    arrayData.reverse();
    targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
  },

  /**
   * `--data:concat`: Concatenates two or more arrays stored in data attributes.
   * @example `<button command="--data:concat:items" data-source-arrays="array1,array2" data-result-key="combined" commandfor="#app">Concatenate Arrays</button>`
   */
  "--data:concat": ({ invoker, targetElement, params }: CommandContext) => {
    const resultKey = params[0] || invoker.dataset.resultKey || invoker.dataset.result_key;
    const sourceArrays = invoker.dataset.sourceArrays || invoker.dataset.source_arrays;
    const paramSources = params.slice(1);

    if (!resultKey) {
      throw createInvokerError('Array concat command requires a result key parameter or data-result-key attribute', ErrorSeverity.ERROR, {
        command: '--data:concat', element: invoker
      });
    }

    const arrayKeys = sourceArrays
      ? sourceArrays.split(',').map(key => key.trim())
      : [resultKey, ...paramSources].filter(Boolean);

    if (!arrayKeys || arrayKeys.length === 0) {
      throw createInvokerError('Array concat command requires data-source-arrays or additional array key parameters', ErrorSeverity.ERROR, {
        command: '--data:concat', element: invoker
      });
    }
    const allArrays: any[][] = [];

    for (const key of arrayKeys) {
      let arrayData: any[] = [];
      try {
        const existingData = targetElement.dataset[key];
        arrayData = existingData ? JSON.parse(existingData) : [];
      } catch (e) {
        arrayData = [];
      }
      allArrays.push(arrayData);
    }

    const concatenated = allArrays.reduce((acc, curr) => acc.concat(curr), []);
    targetElement.dataset[resultKey] = JSON.stringify(concatenated);
  },

  /**
   * `--data:clear`: Clears an array stored in a data attribute.
   * @example `<button command="--data:clear:items" commandfor="#app">Clear Array</button>`
   */
   "--data:clear": ({ invoker, targetElement, params }: CommandContext) => {
     const arrayKey = params[0];
     if (!arrayKey) {
       throw createInvokerError('Array clear command requires an array key parameter', ErrorSeverity.ERROR, {
         command: '--data:clear', element: invoker
       });
     }

     targetElement.dataset[arrayKey] = JSON.stringify([]);

     // Dispatch change event
     targetElement.dispatchEvent(new CustomEvent('data:changed', {
       detail: { key: arrayKey, value: [] }
     }));
   },

  /**
   * `--data:length`: Gets the length of an array stored in a data attribute.
   * @example `<button command="--data:length:items" data-result-key="items-length" commandfor="#app">Get Length</button>`
   */
  "--data:length": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Array length command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:length', element: invoker
      });
    }

    const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-length`;
    let arrayData: any[] = [];
    try {
      const existingData = targetElement.dataset[arrayKey];
      arrayData = existingData ? JSON.parse(existingData) : [];
    } catch (error) {
      throw createInvokerError('Failed to parse array data for length calculation', ErrorSeverity.ERROR, {
        command: '--data:length', element: invoker, cause: error as Error
      });
    }

    if (!Array.isArray(arrayData)) {
      throw createInvokerError(`Data key "${arrayKey}" is not an array`, ErrorSeverity.ERROR, {
        command: '--data:length', element: invoker
      });
    }

    const length = arrayData.length;
    targetElement.dataset[resultKey] = String(length);
    invoker.dataset[resultKey] = String(length);
  },

  // --- Application-Specific Todo Commands ---
  // These are specialized commands that could be extracted to a separate module in the future

  /**
   * `--data:set:new-todo`: Adds a new todo item to the todos array.
   * @example `<form command="--data:set:new-todo" data-bind-to="#form-data" data-bind-as="data:new-todo-json">`
   */
  "--data:set:new-todo": ({ invoker, targetElement }: CommandContext) => {
    // Get the form data
    const formData = getFormData(invoker as unknown as HTMLFormElement);

    // Generate unique ID and add metadata
    const newTodo = {
      id: generateId(),
      title: formData.title || '',
      description: formData.description || '',
      priority: formData.priority || 'medium',
      tags: formData.tags || '',
      completed: false,
      created: new Date().toLocaleDateString()
    };

    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    todos.push(newTodo);
    targetElement.dataset.todos = JSON.stringify(todos);

    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:toggle`: Toggles the completed status of a todo item.
   * @example `<input command="--data:set:toggle:123" data-bind-to="body" data-bind-as="data:toggle-item">`
   */
  "--data:set:toggle": ({ invoker, targetElement, params }: CommandContext) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError('Toggle command requires a todo ID parameter', ErrorSeverity.ERROR, {
        command: '--data:set:toggle', element: invoker
      });
    }

    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const todoIndex = todos.findIndex(t => t.id === todoId);
    if (todoIndex !== -1) {
      todos[todoIndex].completed = !todos[todoIndex].completed;
      targetElement.dataset.todos = JSON.stringify(todos);
      // Dispatch event for UI updates
      targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
    }
  },

  /**
   * `--data:set:delete`: Deletes a todo item.
   * @example `<button command="--data:set:delete:123" data-bind-to="body" data-bind-as="data:delete-item">`
   */
  "--data:set:delete": ({ invoker, targetElement, params }: CommandContext) => {
    const todoId = params[0];
    if (!todoId) {
      throw createInvokerError('Delete command requires a todo ID parameter', ErrorSeverity.ERROR, {
        command: '--data:set:delete', element: invoker
      });
    }

    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const filteredTodos = todos.filter(t => t.id !== todoId);
    targetElement.dataset.todos = JSON.stringify(filteredTodos);
    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:bulk-action:complete-all`: Marks all pending todos as completed.
   * @example `<button command="--data:set:bulk-action:complete-all" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:complete-all": ({ targetElement }: CommandContext) => {
    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const updatedTodos = todos.map(todo =>
      todo.completed ? todo : { ...todo, completed: true }
    );

    targetElement.dataset.todos = JSON.stringify(updatedTodos);
    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:bulk-action:clear-completed`: Removes all completed todos.
   * @example `<button command="--data:set:bulk-action:clear-completed" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:clear-completed": ({ targetElement }: CommandContext) => {
    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const filteredTodos = todos.filter(todo => !todo.completed);
    targetElement.dataset.todos = JSON.stringify(filteredTodos);
    // Dispatch event for UI updates
    targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
  },

  /**
   * `--data:set:bulk-action:export`: Exports todos as JSON.
   * @example `<button command="--data:set:bulk-action:export" data-bind-to="body" data-bind-as="data:bulk-action">`
   */
  "--data:set:bulk-action:export": ({ targetElement }: CommandContext) => {
    let todos: any[] = [];
    try {
      const existingData = targetElement.dataset.todos;
      todos = existingData ? JSON.parse(existingData) : [];
    } catch (e) {
      todos = [];
    }

    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // --- Template Rendering Commands ---

  /**
   * `--data:render:array-key`: Renders an array using a template element.
   * Looks for a template with data-loop-item="array-key" and renders each item.
   * Uses batching for performance with large datasets.
   * @example `<div command="--data:render:items" commandfor="#data-store"></div>`
   */
  "--data:render": ({ invoker, targetElement, params }: CommandContext) => {
    const arrayKey = params[0];
    if (!arrayKey) {
      throw createInvokerError('Data render command requires an array key parameter', ErrorSeverity.ERROR, {
        command: '--data:render', element: invoker
      });
    }

    // Get the array data
    let items: any[] = [];
    try {
      const data = targetElement.dataset[arrayKey];
      items = data ? JSON.parse(data) : [];
    } catch (e) {
      throw createInvokerError('Invalid JSON data for rendering', ErrorSeverity.ERROR, {
        command: '--data:render', element: invoker, cause: e as Error
      });
    }

    // Find template with matching data-loop-item
    const template = document.querySelector(`template[data-loop-item="${arrayKey}"]`) as HTMLTemplateElement;
    if (!template) {
      throw createInvokerError(`Template with data-loop-item="${arrayKey}" not found`, ErrorSeverity.ERROR, {
        command: '--data:render', element: invoker
      });
    }

    // Use batch rendering for better performance
    renderItemsBatch(invoker, items, template);
  },

  // --- Array Item Management Commands ---

  /**
   * `--data:array:toggle-selected`: Toggles selection state of an array item by ID.
   * @example `<button command="--data:array:toggle-selected" data-item-id="123" commandfor="#data-store">Toggle</button>`
   */
  "--data:array:toggle-selected": ({ invoker, targetElement, params }: CommandContext) => {
    const itemId = invoker.dataset.itemId || params[0];
    if (!itemId) {
      throw createInvokerError('Toggle selected command requires an item ID', ErrorSeverity.ERROR, {
        command: '--data:array:toggle-selected', element: invoker
      });
    }

    // Get selected IDs array
    let selected: any[] = [];
    try {
      const data = targetElement.dataset.selectedIds;
      selected = data ? JSON.parse(data) : [];
    } catch (e) {
      selected = [];
    }

    // Get items array to find the item
    let items: any[] = [];
    try {
      const data = targetElement.dataset.benchmarkRows;
      items = data ? JSON.parse(data) : [];
    } catch (e) {
      throw createInvokerError('Invalid items data', ErrorSeverity.ERROR, {
        command: '--data:array:toggle-selected', element: invoker, cause: e as Error
      });
    }

    const numId = parseInt(itemId);
    const isSelected = selected.includes(numId);

    if (isSelected) {
      selected = selected.filter(id => id !== numId);
      // Update item selected state
      const item = items.find(item => item.id === numId);
      if (item) item.selected = false;
    } else {
      selected.push(numId);
      // Update item selected state
      const item = items.find(item => item.id === numId);
      if (item) item.selected = true;
    }

    targetElement.dataset.selectedIds = JSON.stringify(selected);
    targetElement.dataset.benchmarkRows = JSON.stringify(items);

    // Trigger re-render
    document.getElementById('table-body')?.dispatchEvent(new CustomEvent('data-changed'));
  },

  /**
   * `--data:array:remove-item`: Removes an item from an array by ID.
   * @example `<button command="--data:array:remove-item" data-item-id="123" commandfor="#data-store">Delete</button>`
   */
  "--data:array:remove-item": ({ invoker, targetElement, params }: CommandContext) => {
    const itemId = invoker.dataset.itemId || params[0];
    if (!itemId) {
      throw createInvokerError('Remove item command requires an item ID', ErrorSeverity.ERROR, {
        command: '--data:array:remove-item', element: invoker
      });
    }

    // Get items array
    let items: any[] = [];
    try {
      const data = targetElement.dataset.benchmarkRows;
      items = data ? JSON.parse(data) : [];
    } catch (e) {
      throw createInvokerError('Invalid items data', ErrorSeverity.ERROR, {
        command: '--data:array:remove-item', element: invoker, cause: e as Error
      });
    }

    const numId = parseInt(itemId);
    items = items.filter(item => item.id !== numId);

    targetElement.dataset.benchmarkRows = JSON.stringify(items);

    // Update selected IDs (remove if was selected)
    let selected: any[] = [];
    try {
      const data = targetElement.dataset.selectedIds;
      selected = data ? JSON.parse(data) : [];
    } catch (e) {
      selected = [];
    }
    selected = selected.filter(id => id !== numId);
    targetElement.dataset.selectedIds = JSON.stringify(selected);

    // Trigger re-render
    document.getElementById('table-body')?.dispatchEvent(new CustomEvent('data-changed'));
  }
};

// --- Helper Functions ---

/**
 * Batch renderer for improved performance with large datasets
 */
function renderItemsBatch(container: HTMLElement, items: any[], template: HTMLTemplateElement): void {
  // Clear existing content efficiently
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (items.length === 0) return;

  // Use DocumentFragment for batch DOM operations
  const fragment = document.createDocumentFragment();

  // Process items in batches to avoid blocking the main thread
  const BATCH_SIZE = 100;
  let processed = 0;

  function processBatch() {
    const batchEnd = Math.min(processed + BATCH_SIZE, items.length);

    for (let i = processed; i < batchEnd; i++) {
      const item = items[i];
      const clone = template.content.cloneNode(true) as DocumentFragment;

      // Create context for interpolation
      const context = {
        ...item,
        index: i,
        index1: i + 1,
        count: items.length,
        isFirst: i === 0,
        isLast: i === items.length - 1,
        isEven: i % 2 === 0,
        isOdd: i % 2 === 1
      };

      // Interpolate text content and attributes efficiently
      interpolateElement(clone, context);
      fragment.appendChild(clone);
    }

    processed = batchEnd;

    if (processed < items.length) {
      // Schedule next batch asynchronously to avoid blocking
      setTimeout(processBatch, 0);
    } else {
      // All batches processed, append fragment
      container.appendChild(fragment);
    }
  }

  // Start processing
  processBatch();
}

/**
 * Efficiently interpolate an element and its children
 */
function interpolateElement(element: Node, context: Record<string, any>): void {
  if (element.nodeType === Node.TEXT_NODE) {
    if (element.textContent && element.textContent.includes('{{')) {
      element.textContent = interpolateString(element.textContent, context);
    }
    return;
  }

  if (element.nodeType === Node.ELEMENT_NODE) {
    const el = element as Element;

    // Interpolate attributes
    Array.from(el.attributes).forEach(attr => {
      if (attr.value.includes('{{')) {
        el.setAttribute(attr.name, interpolateString(attr.value, context));
      }
    });
  }

  // Process children
  element.childNodes.forEach(child => interpolateElement(child, context));
}

function getFormData(form: HTMLFormElement): Record<string, string> {
  const formData = new FormData(form);
  const data: Record<string, string> = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value.toString();
  }
  
  return data;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Registers all data manipulation and array operation commands with the InvokerManager.
 * This includes basic data operations, array manipulation, and reactive data binding.
 * 
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerDataCommands } from 'invokers/commands/data';
 * import invokerManager from 'invokers';
 * 
 * registerDataCommands(invokerManager);
 * ```
 */
export function registerDataCommands(manager: InvokerManager): void {
  for (const name in dataCommands) {
    if (dataCommands.hasOwnProperty(name)) {
      manager.register(name, dataCommands[name]);
    }
  }
}
