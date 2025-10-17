/**
 * @file flow.ts
 * @summary Flow Control Command Pack for the Invokers library.
 * @description
 * This module provides commands for controlling application flow including
 * asynchronous operations, event dispatching, navigation, and data binding.
 * These commands enable complex interactions and dynamic workflows.
 *
 * This is now a compatibility layer that imports from the specialized command packs.
 *
 * @example
 * ```javascript
 * import { registerFlowCommands } from 'invokers/commands/flow';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerFlowCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import { registerFetchCommands } from './fetch';
import { registerWebSocketCommands } from './websocket';
import { registerSSECommands } from './sse';
import { registerNavigationCommands } from './navigation';

export function registerFlowCommands(manager: InvokerManager): void {
  registerFetchCommands(manager);
  registerWebSocketCommands(manager);
  registerSSECommands(manager);
  registerNavigationCommands(manager);
}
