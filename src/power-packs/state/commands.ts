import type { InvokerManager } from '../../core';
import type { CommandCallback, CommandContext } from '../../index';
import { createInvokerError, ErrorSeverity } from '../../index';
import { getStateStore } from './store';

const stateCommands: Record<string, CommandCallback> = {
  '--state:set': ({ params }: CommandContext) => {
    if (params.length < 2) {
      throw createInvokerError(
        'State set command requires path and value parameters',
        ErrorSeverity.ERROR,
        {
          command: '--state:set',
          recovery: 'Use format: --state:set:path:value'
        }
      );
    }

    const [path, ...valueParts] = params;
    const value = valueParts.join(':'); // Rejoin in case value contains colons

    try {
      // Try to parse as JSON first, fallback to string
      const parsedValue = value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false' || !isNaN(Number(value))
        ? JSON.parse(value)
        : value;

      getStateStore().set(path, parsedValue);
    } catch (error) {
      throw createInvokerError(
        `Failed to set state value: ${error}`,
        ErrorSeverity.ERROR,
        {
          command: '--state:set',
          cause: error as Error,
          recovery: 'Ensure value is valid JSON or a simple string/number'
        }
      );
    }
  },

  '--state:get': ({ targetElement, params }: CommandContext) => {
    if (params.length < 1) {
      throw createInvokerError(
        'State get command requires path parameter',
        ErrorSeverity.ERROR,
        {
          command: '--state:get',
          recovery: 'Use format: --state:get:path'
        }
      );
    }

    const path = params[0];
    const value = getStateStore().get(path);

    if (targetElement) {
      if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'SELECT') {
        (targetElement as HTMLInputElement).value = String(value ?? '');
      } else {
        targetElement.textContent = String(value ?? '');
      }
    }
  },

  '--state:array:push': ({ params }: CommandContext) => {
    if (params.length < 2) {
      throw createInvokerError(
        'State array push command requires array path and value parameters',
        ErrorSeverity.ERROR,
        {
          command: '--state:array:push',
          recovery: 'Use format: --state:array:push:path:value'
        }
      );
    }

    const [path, ...valueParts] = params;
    const value = valueParts.join(':');

    const currentArray = getStateStore().get(path) || [];
    if (!Array.isArray(currentArray)) {
      throw createInvokerError(
        `State path "${path}" is not an array`,
        ErrorSeverity.ERROR,
        {
          command: '--state:array:push',
          recovery: 'Ensure the target path contains an array'
        }
      );
    }

    try {
      // Try to parse as JSON first, fallback to string like --state:set
      const parsedValue = value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false' || !isNaN(Number(value))
        ? JSON.parse(value)
        : value;

      currentArray.push(parsedValue);
      getStateStore().set(path, currentArray);
    } catch (error) {
      throw createInvokerError(
        `Failed to push to state array: ${error}`,
        ErrorSeverity.ERROR,
        {
          command: '--state:array:push',
          cause: error as Error,
          recovery: 'Ensure value is valid JSON or a simple string/number'
        }
      );
    }
  },

  '--state:array:remove': ({ params }: CommandContext) => {
    if (params.length < 2) {
      throw createInvokerError(
        'State array remove command requires array path and index parameters',
        ErrorSeverity.ERROR,
        {
          command: '--state:array:remove',
          recovery: 'Use format: --state:array:remove:path:index'
        }
      );
    }

    const [path, indexStr] = params;
    const index = parseInt(indexStr, 10);

    if (isNaN(index)) {
      throw createInvokerError(
        'Array index must be a valid number',
        ErrorSeverity.ERROR,
        {
          command: '--state:array:remove',
          recovery: 'Use a numeric index'
        }
      );
    }

    const currentArray = getStateStore().get(path);
    if (!Array.isArray(currentArray)) {
      throw createInvokerError(
        `State path "${path}" is not an array`,
        ErrorSeverity.ERROR,
        {
          command: '--state:array:remove',
          recovery: 'Ensure the target path contains an array'
        }
      );
    }

    if (index < 0 || index >= currentArray.length) {
      throw createInvokerError(
        `Array index ${index} is out of bounds`,
        ErrorSeverity.ERROR,
        {
          command: '--state:array:remove',
          recovery: `Use an index between 0 and ${currentArray.length - 1}`
        }
      );
    }

    currentArray.splice(index, 1);
    getStateStore().set(path, currentArray);
  },

  '--state:array:clear': ({ params }: CommandContext) => {
    if (params.length < 1) {
      throw createInvokerError(
        'State array clear command requires array path parameter',
        ErrorSeverity.ERROR,
        {
          command: '--state:array:clear',
          recovery: 'Use format: --state:array:clear:path'
        }
      );
    }

    const path = params[0];
    const currentArray = getStateStore().get(path);

    if (currentArray !== undefined && !Array.isArray(currentArray)) {
      throw createInvokerError(
        `State path "${path}" is not an array`,
        ErrorSeverity.ERROR,
        {
          command: '--state:array:clear',
          recovery: 'Ensure the target path contains an array'
        }
      );
    }

    getStateStore().set(path, []);
  },

  '--state:delete': ({ params }: CommandContext) => {
    if (params.length < 1) {
      throw createInvokerError(
        'State delete command requires path parameter',
        ErrorSeverity.ERROR,
        {
          command: '--state:delete',
          recovery: 'Use format: --state:delete:path'
        }
      );
    }

    const path = params[0];
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const parentPath = keys.join('.');
    const parent = parentPath ? getStateStore().get(parentPath) : getStateStore()['state'];

    if (parent && typeof parent === 'object') {
      delete parent[lastKey];
      if (parentPath) {
        getStateStore().set(parentPath, parent);
      }
    }
  }
};

export function registerStateCommands(manager: InvokerManager): void {
  for (const name in stateCommands) {
    if (stateCommands.hasOwnProperty(name)) {
      manager.register(name, stateCommands[name]);
    }
  }
}
