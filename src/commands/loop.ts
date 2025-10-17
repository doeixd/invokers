// src/commands/loop.ts
import type { InvokerManager, CommandContext } from '../core';
import { createInvokerError, ErrorSeverity, isInterpolationEnabled } from '../index';
import { interpolateString } from '../advanced/interpolation';

/**
 * Loop context variables available in templates during iteration
 */
interface LoopContext {
  index: number;      // 0-based iteration index
  index1: number;     // 1-based iteration index
  count: number;      // Total number of iterations
  isFirst: boolean;   // True for first iteration
  isLast: boolean;    // True for last iteration
  isEven: boolean;    // True for even index
  isOdd: boolean;     // True for odd index
  [key: string]: any; // Allow additional context properties
}

/**
 * Loop Command Pack - Declarative iteration and batch operations
 *
 * This pack provides commands for declarative looping and large-scale DOM operations
 * essential for benchmarks like the JS Framework Benchmark.
 *
 * Commands included:
 * - --dom:repeat-append:count: Append template N times
 * - --dom:repeat-replace:count: Replace with N repetitions
 * - --dom:repeat-prepend:count: Prepend template N times
 * - --dom:repeat-update:step: Update every Nth element
 */

/**
 * Maximum number of iterations allowed in a single loop (safety limit)
 */
const MAX_LOOP_ITERATIONS = 50000;
const BATCH_SIZE = 100;

/**
 * Batch manager for optimizing DOM operations
 */
class BatchManager {
  private batches = new Map<string, {
    operations: Array<() => void>,
    fragment: DocumentFragment | null
  }>();
  private rafScheduled = false;

  /**
   * Start a batch for a target element
   */
  startBatch(targetId: string): void {
    if (!this.batches.has(targetId)) {
      this.batches.set(targetId, {
        operations: [],
        fragment: document.createDocumentFragment()
      });
    }
  }

  /**
   * Add operation to batch
   */
  addOperation(targetId: string, operation: () => void): void {
    const batch = this.batches.get(targetId);
    if (batch) {
      batch.operations.push(operation);
      this.scheduleCommit();
    } else {
      // Not in batch mode, execute immediately
      operation();
    }
  }

  /**
   * Commit batch for specific target
   */
  commitBatch(targetId: string): void {
    const batch = this.batches.get(targetId);
    if (!batch) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    // Execute all operations
    batch.operations.forEach(op => op());

    // Append fragment if it has content
    if (batch.fragment && batch.fragment.childNodes.length > 0) {
      target.appendChild(batch.fragment);
    }

    this.batches.delete(targetId);
  }

  /**
   * Commit all pending batches
   */
  commitAll(): void {
    for (const targetId of this.batches.keys()) {
      this.commitBatch(targetId);
    }
  }

  /**
   * Schedule commit using requestAnimationFrame
   */
  private scheduleCommit(): void {
    if (!this.rafScheduled) {
      this.rafScheduled = true;
      requestAnimationFrame(() => {
        this.commitAll();
        this.rafScheduled = false;
      });
    }
  }
}

// Global batch manager instance
const batchManager = new BatchManager();

/**
 * Gets a template element by ID
 */






/**
 * Gets a template element by ID
 */
function getTemplate(templateId: string, invoker: HTMLElement): HTMLTemplateElement {
  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    throw createInvokerError(
      `Template element "${templateId}" not found or is not a <template>`,
      ErrorSeverity.ERROR,
      {
        element: invoker,
        context: { templateId },
        recovery: `Ensure a <template id="${templateId}"> exists in the document`
      }
    );
  }
  return template;
}

/**
 * Creates loop context variables for a specific iteration
 */
function createLoopContext(index: number, count: number, additionalContext?: Record<string, any>): LoopContext {
  return {
    index,
    index1: index + 1,
    count,
    isFirst: index === 0,
    isLast: index === count - 1,
    isEven: index % 2 === 0,
    isOdd: index % 2 !== 0,
    ...additionalContext
  };
}

/**
 * Processes a template fragment with loop context and interpolation
 */
function processLoopFragment(
  template: HTMLTemplateElement,
  loopContext: LoopContext,
  invoker: HTMLElement
): DocumentFragment {
  const fragment = template.content.cloneNode(true) as DocumentFragment;

  if (!isInterpolationEnabled()) {
    return fragment;
  }

  // Create full context with invoker data
  const fullContext: any = {
    ...loopContext,
    this: invoker,
    event: (invoker as any).triggeringEvent,
  };

  // Add invoker dataset to context
  for (const [key, value] of Object.entries(invoker.dataset)) {
    if (key !== 'templateId' && !key.startsWith('on') && !key.startsWith('command')) {
      fullContext[key] = value;
    }
  }

  // Process data-with-json if present
  if (invoker.dataset.withJson) {
    try {
      const jsonData = JSON.parse(invoker.dataset.withJson);
      Object.assign(fullContext, jsonData);
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).Invoker && (window as any).Invoker.debug) {
        console.warn('Invokers: Invalid JSON in data-with-json:', error);
      }
    }
  }

  // Process interpolation in text nodes
  const processTextNodes = (element: Element | DocumentFragment): void => {
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        if (textContent.includes('{{')) {
          try {
            node.textContent = interpolateString(textContent, fullContext);
          } catch (error) {
            if (typeof window !== 'undefined' && (window as any).Invoker && (window as any).Invoker.debug) {
              console.warn('Invokers: Loop interpolation error:', error);
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        processTextNodes(node as Element);
      }
    }
  };

  processTextNodes(fragment);

  // Process attributes
  const allElements = fragment.querySelectorAll('*');
  for (const element of allElements) {
    for (const attr of Array.from(element.attributes)) {
      if (attr.value.includes('{{')) {
        try {
          const interpolated = interpolateString(attr.value, fullContext);
          element.setAttribute(attr.name, interpolated);
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker && (window as any).Invoker.debug) {
            console.warn('Invokers: Loop attribute interpolation error:', error);
          }
        }
      }
    }
  }

  return fragment;
}

/**
 * Performs a batched DOM operation using requestAnimationFrame for better performance
 */
async function batchedOperation(
  targetElement: HTMLElement,
  count: number,
  operation: (batchFragment: DocumentFragment, start: number, end: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    let currentIndex = 0;

    const processBatch = () => {
      const end = Math.min(currentIndex + BATCH_SIZE, count);
      const batchFragment = document.createDocumentFragment();

      operation(batchFragment, currentIndex, end);

      // Append batch to target element
      targetElement.appendChild(batchFragment);

      currentIndex = end;

      if (currentIndex < count) {
        requestAnimationFrame(processBatch);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(processBatch);
  });
}

export function registerLoopCommands(manager: InvokerManager): void {

  // --dom:repeat-append:count
  // Appends a template N times with auto-incremented {{index}} variable
  manager.register('--dom:repeat-append', async ({ invoker, targetElement, params }: CommandContext) => {
    try {
      if (!invoker || !invoker.isConnected) {
        throw createInvokerError('--dom:repeat-append failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--dom:repeat-append', element: invoker, recovery: 'Ensure the element is still in the document.'
        });
      }

      if (!targetElement || !targetElement.isConnected) {
        throw createInvokerError('--dom:repeat-append failed: Target element not connected to DOM', ErrorSeverity.ERROR, {
          command: '--dom:repeat-append', element: invoker, recovery: 'Ensure the target element exists and is in the document.'
        });
      }

      const [countStr] = params;

      if (!countStr) {
        throw createInvokerError(
          'Repeat append command requires a count parameter',
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-append',
            element: invoker,
            recovery: 'Specify the number of iterations: --dom:repeat-append:1000'
          }
        );
      }

      const count = parseInt(countStr, 10);

      if (isNaN(count) || count < 0) {
        throw createInvokerError(
          'Repeat append count must be a valid non-negative integer',
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-append',
            element: invoker,
            context: { countStr },
            recovery: 'Use a valid number: --dom:repeat-append:1000'
          }
        );
      }

      if (count > MAX_LOOP_ITERATIONS) {
        throw createInvokerError(
          `Repeat append count ${count} exceeds maximum ${MAX_LOOP_ITERATIONS}`,
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-append',
            element: invoker,
            context: { count, max: MAX_LOOP_ITERATIONS },
            recovery: `Reduce count to ${MAX_LOOP_ITERATIONS} or less, or increase window.Invoker.maxLoopIterations`
          }
        );
      }

      const templateId = invoker.dataset.templateId;
      if (!templateId) {
        throw createInvokerError(
          'Repeat append command requires data-template-id attribute',
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-append',
            element: invoker,
            recovery: 'Add data-template-id="template-name" attribute to the button'
          }
        );
      }

      const template = getTemplate(templateId, invoker);

      // Get optional start index and step
      const startIndex = parseInt(invoker.dataset.startIndex || '0', 10);
      const step = parseInt(invoker.dataset.step || '1', 10);

      try {
        // Use batching for large operations (>100 items)
        if (count > BATCH_SIZE) {
          await batchedOperation(targetElement, count, (batchFragment, start, end) => {
            for (let i = start; i < end; i++) {
              const actualIndex = i;
              const adjustedIndex = startIndex + (actualIndex * step);

              const loopContext = createLoopContext(adjustedIndex, count);
              const fragment = processLoopFragment(template, loopContext, invoker);
              batchFragment.appendChild(fragment);
            }
          });

          // Use view transitions if available
          const updateDOM = () => {
            // Fragments are already appended by batchedOperation
            // No additional DOM manipulation needed
          };

          if (document.startViewTransition) {
            await document.startViewTransition(updateDOM).finished;
          }
        } else {
          // Build all fragments for small operations
          const masterFragment = document.createDocumentFragment();

          for (let i = 0; i < count; i++) {
            const actualIndex = i;
            const adjustedIndex = startIndex + (actualIndex * step);

            const loopContext = createLoopContext(adjustedIndex, count);
            const fragment = processLoopFragment(template, loopContext, invoker);
            masterFragment.appendChild(fragment);
          }

          // Use view transitions if available
          const updateDOM = () => {
            targetElement.appendChild(masterFragment);
          };

          if (document.startViewTransition) {
            await document.startViewTransition(updateDOM).finished;
          } else {
            updateDOM();
          }
        }

        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          console.log('--dom:repeat-append: Appended', count, 'template instances to target element');
        }
       } catch (error) {
        throw createInvokerError(
          'Failed to repeat-append template',
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-append',
            element: invoker,
            cause: error as Error,
            context: { count, templateId },
            recovery: 'Check template structure and interpolation expressions'
          }
        );
      }
    } catch (error) {
      throw createInvokerError('--dom:repeat-append failed', ErrorSeverity.ERROR, {
        command: '--dom:repeat-append', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameters.'
      });
    }
  });

  // --dom:repeat-replace:count
  // Replaces target content with N repetitions of template
  manager.register('--dom:repeat-replace', async ({ invoker, targetElement, params }: CommandContext) => {
    const [countStr] = params;
    let count: number;
    let arrayData: any[] | null = null;

    // Check if using data-driven mode
    const arrayKey = invoker.dataset.arrayKey;
    if (arrayKey) {
      // Data-driven mode: repeat for each item in array
      let sourceElement = targetElement;
      const sourceId = invoker.dataset.source;
      if (sourceId) {
        const sourceEl = document.getElementById(sourceId);
        if (sourceEl) {
          sourceElement = sourceEl;
        }
      }
      const arrayJson = sourceElement.dataset[arrayKey];
      if (!arrayJson) {
        throw createInvokerError(
          `Array key '${arrayKey}' not found in ${sourceElement === targetElement ? 'target' : 'source'} element dataset`,
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-replace',
            element: invoker,
            recovery: `Ensure data-array-key="${arrayKey}" points to valid JSON array in ${sourceElement === targetElement ? 'target' : 'source'} dataset`
          }
        );
      }
      try {
        arrayData = JSON.parse(arrayJson);
        if (!Array.isArray(arrayData)) {
          throw new Error('Not an array');
        }
        count = arrayData.length;
      } catch (error) {
        throw createInvokerError(
          `Invalid JSON array in dataset key '${arrayKey}'`,
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-replace',
            element: invoker,
            cause: error as Error,
            recovery: `Ensure dataset.${arrayKey} contains valid JSON array`
          }
        );
      }
    } else {
      // Count-based mode
      if (!countStr) {
        throw createInvokerError(
          'Repeat replace command requires a count parameter',
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-replace',
            element: invoker,
            recovery: 'Specify the number of iterations: --dom:repeat-replace:10000'
          }
        );
      }

      count = parseInt(countStr, 10);

      if (isNaN(count) || count < 0) {
        throw createInvokerError(
          'Repeat replace count must be a valid non-negative integer',
          ErrorSeverity.ERROR,
          {
            command: '--dom:repeat-replace',
            element: invoker,
            context: { countStr },
            recovery: 'Use a valid number: --dom:repeat-replace:10000'
          }
        );
      }
    }

    if (count > MAX_LOOP_ITERATIONS) {
      throw createInvokerError(
        `Repeat replace count ${count} exceeds maximum ${MAX_LOOP_ITERATIONS}`,
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-replace',
          element: invoker,
          context: { count, max: MAX_LOOP_ITERATIONS },
          recovery: `Reduce count to ${MAX_LOOP_ITERATIONS} or less`
        }
      );
    }

    const templateId = invoker.dataset.templateId;
    if (!templateId) {
      throw createInvokerError(
        'Repeat replace command requires data-template-id attribute',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-replace',
          element: invoker,
          recovery: 'Add data-template-id="template-name" attribute to the button'
        }
      );
    }

    const template = getTemplate(templateId, invoker);

    try {
      // Clear target first
      targetElement.innerHTML = '';

      // Use batching for large operations (>100 items)
      if (count > BATCH_SIZE) {
        await batchedOperation(targetElement, count, (batchFragment, start, end) => {
          for (let i = start; i < end; i++) {
            const additionalContext = arrayData ? { item: arrayData[i] } : {};
            const loopContext = createLoopContext(i, count, additionalContext);
            const fragment = processLoopFragment(template, loopContext, invoker);
            batchFragment.appendChild(fragment);
          }
        });
      } else {
        // Build all fragments for small operations
        const masterFragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
          const additionalContext = arrayData ? { item: arrayData[i] } : {};
          const loopContext = createLoopContext(i, count, additionalContext);
          const fragment = processLoopFragment(template, loopContext, invoker);
          masterFragment.appendChild(fragment);
        }

        // Use view transitions if available
        const updateDOMReplace = () => {
          targetElement.appendChild(masterFragment);
        };

        if (document.startViewTransition) {
          await document.startViewTransition(updateDOMReplace).finished;
        } else {
          updateDOMReplace();
        }
      }

    } catch (error) {
      throw createInvokerError(
        'Failed to repeat-replace template',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-replace',
          element: invoker,
          cause: error as Error,
          context: { count, templateId },
          recovery: 'Check template structure and interpolation expressions'
        }
      );
    }
  });

  // --dom:repeat-prepend:count
  // Prepends template N times
  manager.register('--dom:repeat-prepend', async ({ invoker, targetElement, params }: CommandContext) => {
    const [countStr] = params;

    if (!countStr) {
      throw createInvokerError(
        'Repeat prepend command requires a count parameter',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-prepend',
          element: invoker,
          recovery: 'Specify the number of iterations: --dom:repeat-prepend:10'
        }
      );
    }

    const count = parseInt(countStr, 10);

    if (isNaN(count) || count < 0) {
      throw createInvokerError(
        'Repeat prepend count must be a valid non-negative integer',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-prepend',
          element: invoker,
          context: { countStr },
          recovery: 'Use a valid number: --dom:repeat-prepend:10'
        }
      );
    }

    if (count > MAX_LOOP_ITERATIONS) {
      throw createInvokerError(
        `Repeat prepend count ${count} exceeds maximum ${MAX_LOOP_ITERATIONS}`,
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-prepend',
          element: invoker,
          context: { count, max: MAX_LOOP_ITERATIONS },
          recovery: `Reduce count to ${MAX_LOOP_ITERATIONS} or less`
        }
      );
    }

    const templateId = invoker.dataset.templateId;
    if (!templateId) {
      throw createInvokerError(
        'Repeat prepend command requires data-template-id attribute',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-prepend',
          element: invoker,
          recovery: 'Add data-template-id="template-name" attribute to the button'
        }
      );
    }

    const template = getTemplate(templateId, invoker);

    try {
      // Use batching for large operations (>100 items)
      if (count > BATCH_SIZE) {
        // For prepend with batching, we need to collect all fragments first, then prepend
        const allFragments: DocumentFragment[] = [];

        await batchedOperation(targetElement, count, (_batchFragment, start, end) => {
          for (let i = start; i < end; i++) {
            const loopContext = createLoopContext(i, count);
            const fragment = processLoopFragment(template, loopContext, invoker);
            allFragments.push(fragment);
          }
        });

        // Prepend all collected fragments at once
        const updateDOMPrepend = () => {
          for (const fragment of allFragments.reverse()) { // Reverse to maintain order
            targetElement.prepend(fragment);
          }
        };

        if (document.startViewTransition) {
          await document.startViewTransition(updateDOMPrepend).finished;
        } else {
          updateDOMPrepend();
        }
      } else {
        // Build all fragments for small operations
        const masterFragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
          const loopContext = createLoopContext(i, count);
          const fragment = processLoopFragment(template, loopContext, invoker);
          masterFragment.appendChild(fragment);
        }

        // Use view transitions if available
        const updateDOMPrepend = () => {
          targetElement.prepend(masterFragment);
        };

        if (document.startViewTransition) {
          await document.startViewTransition(updateDOMPrepend).finished;
        } else {
          updateDOMPrepend();
        }
      }

    } catch (error) {
      throw createInvokerError(
        'Failed to repeat-prepend template',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-prepend',
          element: invoker,
          cause: error as Error,
          context: { count, templateId },
          recovery: 'Check template structure and interpolation expressions'
        }
      );
    }
  });

  // --dom:repeat-update:step
  // Updates every Nth element matching selector
  manager.register('--dom:repeat-update', async ({ invoker, targetElement, params }: CommandContext) => {
    const [stepStr] = params;

    if (!stepStr) {
      throw createInvokerError(
        'Repeat update command requires a step parameter',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-update',
          element: invoker,
          recovery: 'Specify the step (e.g., every 10th): --dom:repeat-update:10'
        }
      );
    }

    const step = parseInt(stepStr, 10);

    if (isNaN(step) || step < 1) {
      throw createInvokerError(
        'Repeat update step must be a valid positive integer',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-update',
          element: invoker,
          context: { stepStr },
          recovery: 'Use a valid number greater than 0: --dom:repeat-update:10'
        }
      );
    }

    // Get the command to execute on each element
    const updateCommand = invoker.dataset.command;
    const commandTarget = invoker.dataset.commandTarget;
    const classToAdd = invoker.dataset.classAdd;

    if (!updateCommand && !classToAdd) {
      throw createInvokerError(
        'Repeat update command requires data-command or data-class-add attribute',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-update',
          element: invoker,
          recovery: 'Add data-command="--text:append: !!!" or data-class-add="highlight" to specify what to do to each element'
        }
      );
    }

    try {
      // Get all children or query selector results
      const selector = invoker.dataset.selector || '*';
      const elements = Array.from(targetElement.querySelectorAll(selector));

      // Get optional start index
      const startIndex = parseInt(invoker.dataset.startIndex || '0', 10);

      // Update every Nth element starting from startIndex
      for (let i = startIndex; i < elements.length; i += step) {
        const element = elements[i];

        if (classToAdd) {
          element.classList.add(classToAdd);
        } else if (updateCommand && updateCommand.includes('--text:append:')) {
          const textToAppend = updateCommand.split('--text:append:')[1];
          const targetElem = commandTarget
            ? element.querySelector(commandTarget)
            : element;

          if (targetElem) {
            targetElem.textContent = (targetElem.textContent || '') + textToAppend;
          }
        }
      }

        if (typeof window !== 'undefined' && (window as any).Invoker && (window as any).Invoker.debug) {
          console.log(`Invokers: Updated ${Math.ceil(elements.length / step)} elements (every ${step}th)`);
        }

      } catch (error) {
      throw createInvokerError(
        'Failed to repeat-update elements',
        ErrorSeverity.ERROR,
        {
          command: '--dom:repeat-update',
          element: invoker,
          cause: error as Error,
          context: { step },
          recovery: 'Check selector and update command'
        }
      );
    }
  });

  // --dom:clear
  // Clears all children from target element
  manager.register('--dom:clear', ({ targetElement }: CommandContext) => {
    const updateDOMClear = () => {
      targetElement.replaceChildren();
    };

    document.startViewTransition
      ? document.startViewTransition(updateDOMClear)
      : updateDOMClear();
  });

  // --dom:batch:start
  // Signals the start of a batch operation
  manager.register('--dom:batch:start', ({ invoker, targetElement }: CommandContext) => {
    if (!targetElement?.id) {
      throw createInvokerError(
        'Batch start requires target element with id',
        ErrorSeverity.ERROR,
        {
          command: '--dom:batch:start',
          element: invoker,
          recovery: 'Add id="container-id" to the target element'
        }
      );
    }
    batchManager.startBatch(targetElement.id);
  });

  // --dom:batch:end
  // Commits all batched changes at once
  manager.register('--dom:batch:end', ({ invoker, targetElement }: CommandContext) => {
    if (!targetElement?.id) {
      throw createInvokerError(
        'Batch end requires target element with id',
        ErrorSeverity.ERROR,
        {
          command: '--dom:batch:end',
          element: invoker,
          recovery: 'Add id="container-id" to the target element'
        }
      );
    }
    batchManager.commitBatch(targetElement.id);
  });

  // --dom:batch:auto
  // Automatically batches operations within a command chain
  manager.register('--dom:batch:auto', ({ invoker, targetElement }: CommandContext) => {
    if (!targetElement?.id) {
      throw createInvokerError(
        'Batch auto requires target element with id',
        ErrorSeverity.ERROR,
        {
          command: '--dom:batch:auto',
          element: invoker,
          recovery: 'Add id="container-id" to the target element'
        }
      );
    }

    // Start batch and set up auto-commit on next tick
    batchManager.startBatch(targetElement.id);
    setTimeout(() => batchManager.commitBatch(targetElement.id), 0);
  });
}
