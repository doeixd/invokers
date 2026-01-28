// Import required dependencies and types
import { debugLog, debugWarn, debugError, debugGroup, debugGroupEnd } from './utils';
import { resolveTargets } from './target-resolver';
import { interpolateString } from './advanced/interpolation';

// Local type definitions to avoid circular dependencies
export enum ErrorSeverity {
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface InvokerError extends Error {
  severity: ErrorSeverity;
  element?: HTMLElement;
  command?: string;
  context?: any;
  recovery?: string;
  cause?: Error;
}

// Utility functions needed by core
export function createInvokerError(
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  options: {
    element?: HTMLElement;
    command?: string;
    context?: any;
    recovery?: string;
    cause?: Error;
  } = {}
): InvokerError {
  const error = new Error(message) as InvokerError;
  error.severity = severity;
  error.element = options.element;
  error.command = options.command;
  error.context = options.context;
  error.recovery = options.recovery;
  if (options.cause) {
    error.cause = options.cause;
  }
  return error;
}

export function logInvokerError(error: InvokerError | Error, prefix = 'Invokers'): void {
  const isInvokerError = 'severity' in error;
  const severity = isInvokerError ? (error as InvokerError).severity : ErrorSeverity.ERROR;
  const isDebugMode = typeof window !== 'undefined' && (window as any).Invoker?.debug;

  const logMethod = severity === ErrorSeverity.CRITICAL ? 'error'
    : severity === ErrorSeverity.ERROR ? 'error'
      : 'warn';

  if (isDebugMode) {
    debugGroup(`${prefix}: ${error.message}`);
    if (logMethod === 'error') {
      debugError('Error:', error);
    } else {
      debugWarn('Error:', error);
    }

    if (isInvokerError) {
      const invokerError = error as InvokerError;
      if (invokerError.element) {
        debugLog('Element:', invokerError.element);
      }
      if (invokerError.command) {
        debugLog('Command:', invokerError.command);
      }
      if (invokerError.context) {
        debugLog('Context:', invokerError.context);
      }
      if (invokerError.recovery) {
        debugLog('Suggested fix:', invokerError.recovery);
      }
    }
    debugGroupEnd();
  }
}

export function parseCommandString(commandString: string): string[] {
  if (!commandString || typeof commandString !== 'string') {
    return [];
  }

  const parts: string[] = [];
  let currentPart = "";
  let i = 0;
  let braceDepth = 0;

  while (i < commandString.length) {
    const char = commandString[i];

    if (char === "\\") {
      // Handle escape sequences - backslash escapes the next character
      const nextChar = commandString[i + 1];
      if (nextChar !== undefined) {
        currentPart += nextChar;
        i += 2;
      } else {
        // Trailing backslash - treat as literal
        currentPart += char;
        i++;
      }
    } else if (char === "{") {
      braceDepth++;
      currentPart += char;
      i++;
    } else if (char === "}") {
      braceDepth--;
      // Prevent negative brace depth (malformed braces)
      if (braceDepth < 0) {
        braceDepth = 0;
      }
      currentPart += char;
      i++;
    } else if (char === ":" && braceDepth === 0) {
      parts.push(currentPart);
      currentPart = "";
      i++;
    } else {
      currentPart += char;
      i++;
    }
  }

  // Add the final part
  parts.push(currentPart);
  return parts;
}

export function parseCommaSeparatedCommands(commandStr: string): string[] {
  if (!commandStr || typeof commandStr !== 'string') {
    return [];
  }

  const parts: string[] = [];
  let current = '';
  let braceDepth = 0;

  for (let i = 0; i < commandStr.length; i++) {
    const char = commandStr[i];

    if (char === '{' && (i === 0 || commandStr[i - 1] !== '\\')) {
      braceDepth++;
    } else if (char === '}' && (i === 0 || commandStr[i - 1] !== '\\')) {
      braceDepth--;
      // Prevent negative brace depth
      if (braceDepth < 0) {
        braceDepth = 0;
      }
    } else if (char === ',' && braceDepth === 0 && (i === 0 || commandStr[i - 1] !== '\\')) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Sanitizes command parameters to prevent injection attacks
 */
function sanitizeParams(params: string[]): string[] {
  return params.map(param => {
    // Ensure param is a string
    if (param == null) {
      return '';
    }

    const stringParam = String(param);

    // Remove potentially dangerous content
    let sanitized = stringParam
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:text\/html/gi, '') // Remove data URLs that could contain HTML
      .replace(/vbscript:/gi, '') // Remove VBScript URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/expression\s*\(/gi, ''); // Remove CSS expressions

    // Additional validation for URLs - only if the param looks like a URL
    if ((sanitized.includes('://') || sanitized.startsWith('//')) && typeof window !== 'undefined') {
      try {
        const url = new URL(sanitized, window.location.href);
        // Allow safe protocols only
        const allowedProtocols = ['http:', 'https:', 'ftp:', 'mailto:', 'tel:', 'sms:'];
        if (!allowedProtocols.includes(url.protocol)) {
          if ((window as any).Invoker?.debug) {
            debugWarn(`Invokers: Potentially unsafe URL protocol "${url.protocol}" detected and removed`);
          }
          return '';
        }
      } catch (e) {
        // If URL parsing fails, it might be malformed or not actually a URL - safer to remove
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Invokers: Malformed URL detected and removed:', sanitized);
        }
        return '';
      }
    }

    return sanitized;
  });
}

// Import types that will be used from index.ts
export interface CommandContext {
  readonly invoker: HTMLButtonElement;
  readonly targetElement: HTMLElement;
  readonly fullCommand: string;
  readonly triggeringEvent?: Event;
  readonly params: readonly string[];
  getTargets: () => HTMLElement[];
  updateAriaState: (targets: HTMLElement[]) => void;
  manageGroupState: () => void;
   executeAfter: (command: string, target?: string, state?: CommandState) => Promise<void>;
  executeConditional: (options: ConditionalCommands) => void;
}

export enum HookPoint {
  BEFORE_COMMAND = 'beforeCommand',
  AFTER_COMMAND = 'afterCommand',
  BEFORE_VALIDATION = 'beforeValidation',
  AFTER_VALIDATION = 'afterValidation',
  ON_SUCCESS = 'onSuccess',
  ON_ERROR = 'onError',
  ON_COMPLETE = 'onComplete'
}

export type MiddlewareFunction = (context: CommandContext & { result?: CommandExecutionResult }, hookPoint: HookPoint) => void | Promise<void>;

export interface InvokerPlugin {
  name: string;
  version?: string;
  description?: string;
  onRegister?(manager: InvokerManager): void;
  onUnregister?(manager: InvokerManager): void;
  middleware?: Partial<Record<HookPoint, MiddlewareFunction>>;
}

export type CommandCallback = (context: CommandContext) => void | Promise<void>;

export interface CommandExecutionResult {
  success: boolean;
  error?: Error;
  data?: any;
}

export type CommandState = 'active' | 'completed' | 'disabled' | 'once';

export interface ConditionalCommands {
  onSuccess?: string[];
  onError?: string[];
  onComplete?: string[];
}

// Performance monitor class - will be moved later but needed for now
class PerformanceMonitor {
  private executions: number[] = [];
  private readonly maxExecutions = 1000;
  private readonly windowMs = 1000;

  recordExecution(): boolean {
    const now = Date.now();
    
    // Remove old executions
    this.executions = this.executions.filter(time => now - time < this.windowMs);
    
    if (this.executions.length >= this.maxExecutions) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: Rate limit exceeded. Too many command executions.');
      }
      return false;
    }
    
    this.executions.push(now);
    return true;
  }

  reset(): void {
    this.executions = [];
  }

  getStats() {
    return {
      executionsInWindow: this.executions.length,
      maxExecutions: this.maxExecutions,
      windowMs: this.windowMs
    };
  }
}



// Stub imports that will be resolved properly later
const NATIVE_COMMAND_KEYWORDS = new Set([
  'show-modal', 'close', 'request-close',
  'toggle-popover', 'hide-popover', 'show-popover',
  'toggle-openable', 'close-openable', 'open-openable',
  'toggle', 'open',
  'play-pause', 'play', 'pause', 'toggle-muted',
  'show-picker',
  'step-up', 'step-down',
  'copy-text', 'share',
  'toggle-fullscreen', 'request-fullscreen', 'exit-fullscreen'
]);

let isDebugMode = false;

// Stub manager classes that will be imported properly later
class AndThenManager {
  private invokerManager: InvokerManager;

  constructor(invokerManager: InvokerManager) {
    this.invokerManager = invokerManager;
  }

   /**
    * Processes <and-then> elements after a command execution. This is the main
    * entry point that finds top-level <and-then> children of the invoker and
    * kicks off the recursive execution process.
    *
    * @param invokerElement The original <button> that was activated.
    * @param executionResult The success/failure result of the invoker's command.
    * @param primaryTarget The main target of the invoker's command.
    */
    public async processAndThen(
      invokerElement: HTMLButtonElement,
      executionResult: CommandExecutionResult,
      primaryTarget: HTMLElement
    ): Promise<void> {
      // Disable the invoker during <and-then> execution to prevent concurrent chains
      const wasDisabled = invokerElement.disabled;
      invokerElement.disabled = true;
      invokerElement.setAttribute('aria-busy', 'true');

      try {
        // Find all *top-level* and-then elements that are direct children of the invoker.
        const topLevelAndThens = Array.from(invokerElement.children).filter(
          child => child.tagName.toLowerCase() === 'and-then'
        ) as HTMLElement[];

       // Sequentially execute each top-level chain.
       for (const andThenElement of topLevelAndThens) {
         // The initial recursive call starts here.
         await this.executeAndThenRecursively(
           andThenElement,
           invokerElement,
           executionResult,
           primaryTarget
         );
       }
      } finally {
        // Re-enable the invoker
        invokerElement.disabled = wasDisabled;
        invokerElement.removeAttribute('aria-busy');
      }
   }

  /**
   * Executes a command from an <and-then> element and its descendants recursively.
   * This is the core of the chaining logic.
   *
   * @param andThenElement The current <and-then> element to execute.
   * @param originalInvoker The very first button in the chain, used for context.
   * @param parentResult The execution result from the parent command.
   * @param primaryTarget The original target, used as a fallback.
   * @param depth The current recursion depth to prevent stack overflows.
   */
    private async executeAndThenRecursively(
      andThenElement: HTMLElement,
      originalInvoker: HTMLButtonElement,
      parentResult: CommandExecutionResult,
      primaryTarget: HTMLElement,
      depth: number = 0
    ): Promise<void> {
      // 1. Safety Check: Prevent infinite recursion.
      const MAX_DEPTH = 25;
      if (depth > MAX_DEPTH) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugError(`Maximum <and-then> depth (${MAX_DEPTH}) reached, stopping execution to prevent infinite loop.`);
         }
        return;
      }

      // 2. Element Validation: Ensure the element is still in the DOM
      if (!andThenElement || !andThenElement.isConnected) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('<and-then> element is no longer in DOM, skipping execution.');
        }
        return;
      }

       // 3. State Check: Skip elements that have already run, are disabled, or are currently executing.
       const state = andThenElement.dataset.state;
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog(`<and-then> state check: element=${andThenElement.tagName}, state="${state}", command="${andThenElement.getAttribute('command')}"`);
       }

       // Validate state values
       const validStates = ['active', 'completed', 'disabled', 'once'];
       if (state && !validStates.includes(state)) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn(`<and-then> invalid state "${state}", treating as active`);
         }
       }

       if (state === 'disabled' || state === 'completed' || state === 'active') {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog(`<and-then> skipping: already ${state}`);
         }
         return;
       }

        // 4. Conditional Check: Execute only if the condition is met.
        const condition = andThenElement.dataset.condition || 'always';
        const validConditions = ['success', 'error', 'always'];
        if (!validConditions.includes(condition)) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn(`<and-then> invalid condition "${condition}", defaulting to "always"`);
          }
        }

        if (!this.shouldExecuteCondition(condition, parentResult)) {
          return;
        }

       // 4. Mark as active immediately to prevent concurrent executions
       andThenElement.dataset.state = 'active';
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog(`<and-then> marked as active: command="${andThenElement.getAttribute('command')}"`);
       }

       // 5. Command and Target Validation
     const command = andThenElement.getAttribute('command');
     if (!command || typeof command !== 'string' || command.trim() === '') {
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugError('<and-then> element is missing required "command" attribute or command is empty.');
       }
       return;
     }

     const targetId = andThenElement.getAttribute('commandfor') || originalInvoker.getAttribute('commandfor') || primaryTarget.id;
     if (!targetId || typeof targetId !== 'string' || targetId.trim() === '') {
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugError('<and-then> element is missing required target (commandfor attribute or fallback).');
       }
       return;
     }

     const delay = parseInt(andThenElement.dataset.delay || '0', 10);
     if (isNaN(delay) || delay < 0) {
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugWarn('<and-then> invalid delay value, defaulting to 0');
       }
     }

     // 6. Apply Delay
     if (delay > 0) {
       await new Promise(resolve => setTimeout(resolve, delay));
     }

      // 7. Execute the Command
     let currentExecutionResult: CommandExecutionResult = { success: true };
     try {
       // Use a synthetic invoker to pass context attributes like `data-*`
       // without re-triggering the top-level follow-up logic on the original invoker.
       const syntheticInvoker = this.createSyntheticInvoker(andThenElement, command, targetId);
       await this.invokerManager.executeCommand(command, targetId, syntheticInvoker);
     } catch (error) {
       // If the command fails, capture the result to pass to children.
       currentExecutionResult = { success: false, error: error as Error };
      }

      // 8. Recurse for Children
    const nestedAndThens = Array.from(andThenElement.children).filter(
      child => child.tagName.toLowerCase() === 'and-then'
    ) as HTMLElement[];

     for (const nested of nestedAndThens) {
       await this.executeAndThenRecursively(
         nested,
         originalInvoker,
         currentExecutionResult, // Pass the result of *this* command down.
         primaryTarget,
         depth + 1
       );
     }

      // 9. Final State Management
      const isOnce = andThenElement.hasAttribute('data-once');
      if (isOnce) {
        // Check if element is still in DOM before removing (might have been removed during execution)
        if (andThenElement.parentNode) {
          andThenElement.remove();
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugLog(`<and-then> removed (data-once): command="${command}"`);
          }
        }
      } else {
        andThenElement.dataset.state = 'completed';
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugLog(`<and-then> marked as completed: command="${command}"`);
        }
      }
   }

  /**
   * Creates a temporary, in-memory <button> to act as the invoker for an
   * <and-then> command, allowing `data-*` attributes to be passed for context.
   */
  private createSyntheticInvoker(andThenElement: HTMLElement, command: string, targetId: string): HTMLButtonElement {
    const syntheticInvoker = document.createElement('button');
    syntheticInvoker.setAttribute('command', command.startsWith('--') ? command : `--${command}`);
    syntheticInvoker.setAttribute('commandfor', targetId);

    // Copy all data attributes from the <and-then> to the synthetic button
    // so the command's context can access them via `invoker.dataset`.
    for (const key in andThenElement.dataset) {
      syntheticInvoker.dataset[key] = andThenElement.dataset[key];
    }
    return syntheticInvoker;
  }

  /**
   * Determines if a condition is met based on the result of the parent command.
   */
  private shouldExecuteCondition(condition: string, result: CommandExecutionResult): boolean {
    switch (condition.toLowerCase()) {
      case 'success':
        return result.success === true;
      case 'error':
        return result.success === false;
      case 'always':
        return true;
      default:
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugError(`Unknown condition for <and-then> element: "${condition}"`);
        }
        return false; // Fail safe
    }
  }
}

class PipelineManager {
  constructor(private _invokerManager: InvokerManager) {
    // Keep reference for future use
    void this._invokerManager;
  }
  
  async executePipeline(_pipelineId: string, _context: CommandContext): Promise<void> {
    // Stub implementation
  }
}

export class InvokerManager {
  // --- Singleton Implementation ---
  private static _instance: InvokerManager;

  private readonly commands = new Map<string, CommandCallback>();
  private sortedCommandKeys: string[] = [];
  private commandStates = new Map<string, CommandState>();
  private _andThenManager: AndThenManager;
  private _pipelineManager: PipelineManager;
  private readonly performanceMonitor = new PerformanceMonitor();

  // --- Plugin/Middleware System ---
  private plugins = new Map<string, InvokerPlugin>();
  private middleware = new Map<HookPoint, MiddlewareFunction[]>();

  // --- Advanced Event Features ---
  public static _interpolationEnabled = false;

   // The constructor is now private to enforce the singleton pattern.
   private constructor() {
     this._andThenManager = new AndThenManager(this);
     this._pipelineManager = new PipelineManager(this);
     // Suppress unused variable warnings for stub implementations
     void this._pipelineManager;

      // Initialize for both browser and test environments
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        this.registerCoreLibraryCommands();
        // Defer listener attachment until DOM is ready
        this.deferListen();
      } else if (typeof global !== "undefined" && (global as any).window && (global as any).document) {
        // Test environment with jsdom
        this.registerCoreLibraryCommands();
        this.deferListen();
      }
   }

  /**
   * Gets the single, authoritative instance of the InvokerManager.
   */
  public static getInstance(): InvokerManager {
    if (!InvokerManager._instance) {
      InvokerManager._instance = new InvokerManager();
    }
    return InvokerManager._instance;
  }

  /**
   * Enables interpolation features for advanced event handling.
   * Internal method called by enableAdvancedEvents().
   */
  public _enableInterpolation(): void {
    InvokerManager._interpolationEnabled = true;
  }

  /**
   * Resets the InvokerManager to its initial state, clearing all commands and state.
   */
  public reset(): void {
    // Clear all registered commands
    this.commands.clear();
    this.sortedCommandKeys = [];
    this.commandStates.clear();
    this.plugins.clear();
    this.middleware.clear();

    // Reset performance monitor
    this.performanceMonitor.reset();

    // Note: Interpolation is not reset as it's a global feature enabled by enableAdvancedEvents()
    if (isDebugMode) {
      debugLog("Invokers: Reset complete.");
    }
  }

  /**
   * Safely attempts to interpolate a template string with context data.
   * Only performs interpolation if advanced features are enabled.
   *
   * @param template The template string that may contain {{...}} placeholders
   * @param context The context object for interpolation
   * @returns The interpolated string, or the original template if interpolation is disabled
   */
  private _tryInterpolate(template: string, context: Record<string, any>): string {
    if (InvokerManager._interpolationEnabled && typeof interpolateString === 'function') {
      try {
        return interpolateString(template, context);
      } catch (error) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Invokers: Template interpolation failed:', error);
        }
        return template;
      }
    }
    return template;
  }

  /**
   * Programmatically executes a command on a target element with comprehensive validation.
   * This is useful for chaining commands without dispatching events.
   *
   * @param command The command string to execute.
   * @param targetId The ID of the target element.
   * @param source Optional source element (for context).
   */
  public async executeCommand(command: string, targetId: string, source?: HTMLElement): Promise<void> {
    // Performance check
    if (!this.performanceMonitor.recordExecution()) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: Rate limit exceeded, command execution aborted');
      }
      return; // Abort if too many executions
    }

    // Validate inputs
    if (!command || typeof command !== 'string' || command.trim() === '') {
      const error = createInvokerError(
        'Command must be a non-empty string',
        ErrorSeverity.ERROR,
        {
          command,
          recovery: 'Provide a valid command string like "--toggle" or "show-modal"'
        }
      );
      logInvokerError(error);
      return;
    }

    // Normalize command
    const normalizedCommand = command.trim();

    if (targetId !== null && targetId !== undefined && typeof targetId !== 'string') {
      const error = createInvokerError(
        'Target ID must be a string, null, or undefined',
        ErrorSeverity.ERROR,
        {
          command: normalizedCommand,
          context: { targetId },
          recovery: 'Provide a valid element ID that exists in the DOM, or null/empty string for commands that don\'t need targets'
        }
      );
      logInvokerError(error);
      return;
    }

    let targetElement: HTMLElement | null = null;
    let targets: HTMLElement[] = [];

    // Only resolve targets if targetId is provided and not empty
    const normalizedTargetId = targetId?.trim();
    if (normalizedTargetId) {
      // Find target element using resolveTargets (supports complex selectors)
      targets = resolveTargets(normalizedTargetId, source || document.body) as HTMLElement[];
      if (targets.length === 0) {
        // Provide helpful suggestions for missing elements
        let suggestions: string[] = [];
        if (typeof document !== 'undefined') {
          const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(Boolean);
          suggestions = allIds.filter(id =>
            id.toLowerCase().includes(normalizedTargetId.toLowerCase()) ||
            normalizedTargetId.toLowerCase().includes(id.toLowerCase())
          );
        }

        const error = createInvokerError(
          `Target element with selector "${normalizedTargetId}" not found`,
          ErrorSeverity.ERROR,
          {
            command: normalizedCommand,
            element: source,
            context: {
              targetId: normalizedTargetId,
              availableIds: suggestions.slice(0, 10), // Show first 10 suggestions
              totalElements: suggestions.length
            },
            recovery: suggestions.length > 0
              ? `Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
              : 'Check that the target element exists and has the correct selector'
          }
        );
        logInvokerError(error);
        return;
      }

      targetElement = targets[0];
    }
    // If targetId is empty, targetElement remains null and targets remains empty

    try {
      const mockEvent = {
        command,
        source: source || null,
        target: targetElement,
        preventDefault: () => { },
        type: 'command'
      } as any;

      await this.executeCustomCommand(command, mockEvent);
      } catch (error) {
        // Re-enable disabled buttons after command failure for graceful degradation
        if (source && source.hasAttribute('disabled')) {
          source.removeAttribute('disabled');
        }

        // If it's already an InvokerError, log it (don't throw for API calls)
        // But throw in test environments for better testability
        if (error && typeof error === 'object' && 'severity' in error) {
          if (typeof globalThis !== 'undefined' && (globalThis as any).it) {
            // In test environment, throw for better test expectations
            throw error;
          }
          logInvokerError(error as InvokerError);
          return;
        }

        const invokerError = createInvokerError(
          `Failed to execute command "${command}" on element "${targetId}"`,
          ErrorSeverity.ERROR,
          {
            command,
            element: source,
            cause: error as Error,
            recovery: 'Check command syntax and target element'
          }
        );
        logInvokerError(invokerError);
      }
  }

  /**
   * Registers a plugin with middleware and lifecycle hooks.
   */
  public registerPlugin(plugin: InvokerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      debugWarn(`Invokers: Plugin "${plugin.name}" is already registered`);
      return;
    }

    this.plugins.set(plugin.name, plugin);

    // Register middleware functions
    if (plugin.middleware) {
      for (const [hookPoint, middlewareFn] of Object.entries(plugin.middleware)) {
        if (middlewareFn) {
          this.registerMiddleware(hookPoint as HookPoint, middlewareFn);
        }
      }
    }

    // Call plugin's onRegister hook
    if (plugin.onRegister) {
      try {
        // Create a proxy to prevent plugins from modifying the manager
        const managerProxy = new Proxy(this, {
          set: (target, property, value) => {
            // Allow setting internal properties (starting with _) but prevent others
            if (typeof property === 'string' && !property.startsWith('_') && !['plugins', 'middleware', 'commands'].includes(property)) {
              debugWarn(`Invokers: Plugin "${plugin.name}" attempted to modify manager property "${property}". This is not allowed for security.`);
              return false;
            }
            return Reflect.set(target, property, value);
          }
        });
        plugin.onRegister(managerProxy);
      } catch (error) {
        debugError(`Invokers: Error in plugin "${plugin.name}" onRegister:`, error);
      }
    }

    if (isDebugMode) {
      debugLog(`Invokers: Plugin "${plugin.name}" registered successfully`);
    }
  }

  /**
   * Unregisters a plugin.
   */
  public unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      debugWarn(`Invokers: Plugin "${pluginName}" is not registered`);
      return;
    }

    // Call plugin's onUnregister hook
    if (plugin.onUnregister) {
      try {
        plugin.onUnregister(this);
      } catch (error) {
        debugError(`Invokers: Error in plugin "${pluginName}" onUnregister:`, error);
      }
    }

    // Remove middleware functions
    if (plugin.middleware) {
      for (const hookPoint of Object.keys(plugin.middleware) as HookPoint[]) {
        this.unregisterMiddleware(hookPoint, plugin.middleware[hookPoint]!);
      }
    }

    this.plugins.delete(pluginName);

    if (isDebugMode) {
      debugLog(`Invokers: Plugin "${pluginName}" unregistered successfully`);
    }
  }

  /**
   * Registers a middleware function for a specific hook point.
   */
  public registerMiddleware(hookPoint: HookPoint, middleware: MiddlewareFunction): void {
    if (!this.middleware.has(hookPoint)) {
      this.middleware.set(hookPoint, []);
    }
    this.middleware.get(hookPoint)!.push(middleware);
  }

  /**
    * Unregisters a middleware function from a specific hook point.
    */
   public unregisterMiddleware(hookPoint: HookPoint, middleware: MiddlewareFunction): void {
     const middlewareList = this.middleware.get(hookPoint);
     if (middlewareList) {
       const index = middlewareList.indexOf(middleware);
       if (index > -1) {
         middlewareList.splice(index, 1);
       }
     }
   }

  /**
    * Checks if a plugin is currently registered.
    */
   public hasPlugin(pluginName: string): boolean {
     return this.plugins.has(pluginName);
   }

  /**
    * Gets a list of all registered plugin names.
    */
   public getRegisteredPlugins(): string[] {
     return Array.from(this.plugins.keys());
   }

  /**
   * Executes all middleware for a given hook point.
   */
  private async executeMiddleware(hookPoint: HookPoint, context: CommandContext & { result?: CommandExecutionResult }, allowErrors: boolean = false): Promise<void> {
    const middlewareList = this.middleware.get(hookPoint);
    if (!middlewareList || middlewareList.length === 0) {
      return;
    }

    for (const middleware of middlewareList) {
      try {
        await Promise.resolve(middleware(context, hookPoint));
      } catch (error) {
        if (allowErrors) {
          // For validation/pre-command middleware, errors should propagate
          throw error;
        } else {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugError(`Invokers: Middleware error at ${hookPoint}:`, error);
          }
          // Continue with other middleware even if one fails
        }
      }
    }
  }

  /**
   * Registers a new custom command with comprehensive validation.
   * All commands must start with `--` to be valid.
   *
   * @param name The unique name of the command (e.g., `'--class'` or `'class'`).
   * @param callback The function to execute for this command.
   */
  public register(name: string, callback: CommandCallback): void {
    // Validate inputs
    if (name == null || typeof name !== 'string') {
      const error = createInvokerError(
        'Command name must be a non-empty string',
        ErrorSeverity.ERROR,
        {
          context: { name },
          recovery: 'Provide a valid command name like "--my-command"'
        }
      );
      logInvokerError(error);
      return;
    }

    if (!callback || typeof callback !== 'function') {
      const error = createInvokerError(
        `Command callback for "${name}" must be a function`,
        ErrorSeverity.ERROR,
        {
          command: name,
          context: { callback },
          recovery: 'Provide a function that accepts a CommandContext parameter'
        }
      );
      logInvokerError(error);
      return;
    }

    // Validate command name format
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      const error = createInvokerError(
        'Command name cannot be empty or whitespace only',
        ErrorSeverity.ERROR,
        {
          recovery: 'Provide a meaningful command name like "--toggle" or "--fetch"'
        }
      );
      logInvokerError(error);
      return;
    }

    // Check for maximum command name length
    if (trimmedName.length > 100) {
      const error = createInvokerError(
        'Command name is too long (maximum 100 characters)',
        ErrorSeverity.ERROR,
        {
          command: trimmedName,
          recovery: 'Use a shorter, more descriptive command name'
        }
      );
      logInvokerError(error);
      return;
    }

    // Handle prefix normalization
    let normalizedName = trimmedName;
    const wasOriginallyWithoutPrefix = !normalizedName.startsWith('--');
    if (!normalizedName.startsWith('--')) {
      normalizedName = `--${normalizedName}`;
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(`Invokers: Command "${trimmedName}" registered without '--' prefix. Automatically registered as "${normalizedName}".`);
      }
    }

    // Validate against reserved native commands - only when originally registered without prefix
    if (wasOriginallyWithoutPrefix && NATIVE_COMMAND_KEYWORDS.has(trimmedName)) {
      const error = createInvokerError(
        `Cannot register command "${trimmedName}" - conflicts with native command "${trimmedName}"`,
        ErrorSeverity.ERROR,
        {
          command: trimmedName,
          recovery: 'Choose a different command name that doesn\'t conflict with native commands, or use the -- prefix for custom commands'
        }
      );
      logInvokerError(error);
      return;
    }

    // Check for overwrites
    if (this.commands.has(normalizedName)) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(`Invokers: Command "${normalizedName}" is already registered and will be overwritten`);
      }
    }

    try {
      this.commands.set(normalizedName, callback);
      this.sortedCommandKeys = Array.from(this.commands.keys()).sort((a, b) => b.length - a.length);

      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog(`Invokers: Successfully registered command "${normalizedName}"`);
      }
    } catch (error) {
      const invokerError = createInvokerError(
        `Failed to register command "${normalizedName}"`,
        ErrorSeverity.CRITICAL,
        {
          command: normalizedName,
          cause: error as Error,
          recovery: 'Check that the callback function is valid and the command name is unique'
        }
      );
      logInvokerError(invokerError);
    }
   }

   /**
    * Composes multiple commands into a single composite command.
    * Commands can be specified as full command strings (e.g., '--class:add:success') that will be parsed and executed.
    * The composite command executes each command in sequence, with options for error handling.
    *
    * @param commands Array of command strings to compose (e.g., ['--toggle', '--class:add:success'])
    * @param options Configuration options for the composition
    * @returns The name of the newly registered composite command
    *
    * @example
    * ```typescript
    * const manager = InvokerManager.getInstance();
    *
    * // Create a composite command that toggles and adds a success class
    * const compositeName = manager.composeCommands(
    *   ['--toggle', '--class:add:success'],
    *   { name: '--toggle-and-success' }
    * );
    *
    * // Use the composite command in HTML
    * <button command="--toggle-and-success" commandfor="panel">Toggle & Success</button>
    * ```
    */
   public composeCommands(
     commands: string[],
     options: {
       name?: string;
       stopOnError?: boolean;
     } = {}
   ): string {
     const {
       name = `--composite-${Date.now()}`,
       stopOnError = false
     } = options;

     // Validate inputs
     if (!Array.isArray(commands) || commands.length === 0) {
       const error = createInvokerError(
         'composeCommands requires a non-empty array of command strings',
         ErrorSeverity.ERROR,
         {
           context: { commands },
           recovery: 'Provide an array of valid command strings like ["--toggle", "--class:add:success"]'
         }
       );
       logInvokerError(error);
       return '';
     }

     // Validate that all command strings are valid
     for (const command of commands) {
       if (!command || typeof command !== 'string' || !command.trim()) {
         const error = createInvokerError(
           'All commands must be non-empty strings',
           ErrorSeverity.ERROR,
           {
             context: { commands, invalidCommand: command },
             recovery: 'Ensure all command strings are valid and non-empty'
           }
         );
         logInvokerError(error);
         return '';
       }
     }

      // Create the composite command
      const compositeCallback: CommandCallback = async (context) => {
        const { invoker, targetElement } = context;

       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog(`Invokers: Executing composite command "${name}" with ${commands.length} sub-commands`);
       }

       for (let i = 0; i < commands.length; i++) {
         const commandString = commands[i];

         try {
           // Execute the sub-command by calling executeCommand recursively
           await this.executeCommand(commandString, targetElement?.id || '', invoker);

           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugLog(`Invokers: Sub-command "${commandString}" completed successfully`);
           }

         } catch (error) {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn(`Invokers: Sub-command "${commandString}" failed:`, error);
           }

           if (stopOnError) {
             // Re-throw the error to stop the composite command
             throw error;
           }

           // Continue with the next command if not stopping on error
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugLog(`Invokers: Continuing with next command after "${commandString}" failure`);
           }
         }
       }

       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog(`Invokers: Composite command "${name}" completed`);
       }
     };

     // Register the composite command
     this.register(name, compositeCallback);

     if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
       debugLog(`Invokers: Registered composite command "${name}" composing: ${commands.join(', ')}`);
     }

      return name;
    }

   /**
    * Handles incoming `CommandEvent`s. This is now an async method to allow
    * for awaiting the full command chain.
    */
  public async handleCommand(event: any): Promise<void> {
    const commandStr = event.command;

    if (commandStr.startsWith('--')) {
      await this.executeCustomCommand(commandStr, event);
    } else if (NATIVE_COMMAND_KEYWORDS.has(commandStr)) {
      // Native commands are handled by the polyfill - do not preventDefault
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog(`Invokers: Native command "${commandStr}" handled by polyfill`);
      }
    } else if (commandStr !== "") {
      // Backwards Compatibility: Handle old, non-prefixed library commands.
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(`Invokers (Compatibility): Non-spec-compliant command "${commandStr}" detected. Please update your HTML to use '--${commandStr}' for future compatibility. Attempting to handle...`);
      }
      await this.executeCustomCommand(`--${commandStr}`, event);
    }
  }

  /**
   * Executes a custom command and then triggers a follow-up command if specified.
   * This is the new heart of the chaining mechanism with enhanced lifecycle support.
   */
  private async executeCustomCommand(commandStr: string, event: any): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: executeCustomCommand called with:', commandStr);
    }

    // Validate command string
    if (!commandStr || typeof commandStr !== 'string' || commandStr.trim() === '') {
      const error = createInvokerError(
        'Invalid command string provided',
        ErrorSeverity.ERROR,
        {
          command: commandStr,
          element: event.source as HTMLElement,
          recovery: 'Ensure the command attribute contains a valid command string'
        }
      );
      logInvokerError(error);
      return;
    }

    // Performance monitoring
    if (!this.performanceMonitor.recordExecution()) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: Rate limit exceeded during command execution');
      }
      return; // Abort if too many executions
    }

    let commandFound = false;
    for (const registeredCommand of this.sortedCommandKeys) {
      if (commandStr.startsWith(registeredCommand) && (commandStr.length === registeredCommand.length || commandStr[registeredCommand.length] === ":")) {
        commandFound = true;
        const callback = this.commands.get(registeredCommand);

        if (!callback) {
          const error = createInvokerError(
            `Command "${registeredCommand}" is registered but callback is missing`,
            ErrorSeverity.CRITICAL,
            {
              command: commandStr,
              element: event.source as HTMLElement,
              recovery: 'This is an internal error. Please report this issue.'
            }
          );
          logInvokerError(error);
          return;
        }

        event.preventDefault(); // Stop default polyfill/browser action

        // Create base interpolation context for the current command
        let interpolationContext: any = {
          ...(event.source || {}), // Spread button properties (paramName, paramValue, etc.)
          event: (event as any).triggeringEvent, // The original DOM event
          this: event.source, // The invoker element itself
          target: event.target, // The command target element
          detail: ((event as any).triggeringEvent as CustomEvent)?.detail, // Detail from CustomEvent
        };

        // Parse and merge data-context if present
        if (event.source?.dataset?.context) {
          try {
            const contextData = JSON.parse(event.source.dataset.context);
            interpolationContext = { ...interpolationContext, ...contextData };
          } catch (error) {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugWarn('Invokers: Failed to parse data-context:', error);
            }
          }
        }

         // Parse parameters with brace awareness to handle {{...}} correctly
         const paramsStr = commandStr.substring(registeredCommand.length + 1);
         const rawParams = parseCommandString(paramsStr);

         // Interpolate each parameter that contains {{...}}
         const interpolatedParams = rawParams.map(param =>
           param.includes('{{') ? this._tryInterpolate(param, interpolationContext) : param
         );
         const sanitizedParams = sanitizeParams(interpolatedParams);

         // Reconstruct interpolated command string for context/logging
         const interpolatedCommandStr = interpolatedParams.length > 0 && interpolatedParams[0] !== ''
           ? registeredCommand + ':' + interpolatedParams.join(':')
           : registeredCommand;

         const context = this.createContext(event, interpolatedCommandStr, sanitizedParams);
         const invoker = event.source as HTMLButtonElement;

          // For multi-target commands, execute on each target
          const targets = context.getTargets();

           // Allow commands to execute even with no targets if they don't require DOM elements
           // (e.g., URL commands that operate on window.location)
           if (targets.length === 0) {
             // For commands that don't need targets, execute with a dummy target element
             try {
               const dummyTarget = document.createElement('div');
               dummyTarget.style.display = 'none';
               dummyTarget.id = 'invokers-dummy-target';
               document.body.appendChild(dummyTarget);

               const targetContext = {
                 ...context,
                 targetElement: dummyTarget
               };

              // Execute BEFORE_COMMAND middleware
              await this.executeMiddleware(HookPoint.BEFORE_COMMAND, targetContext, true);

              // Execute the command callback directly
              await Promise.resolve(callback(targetContext));

              // Execute AFTER_COMMAND middleware
              await this.executeMiddleware(HookPoint.AFTER_COMMAND, { ...targetContext, result: { success: true } });

              // Process chaining if invoker exists
              if (context.invoker) {
                await this._andThenManager.processAndThen(context.invoker, { success: true }, dummyTarget);
                await this.processAttributeChaining(context.invoker, { success: true }, dummyTarget, interpolatedCommandStr);
              }

              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugLog(`Invokers: Command "${registeredCommand}" executed successfully (no targets required)`);
              }
            } catch (error) {
              // If it's already an InvokerError, re-throw it as-is
              if (error && typeof error === 'object' && 'severity' in error) {
                throw error;
              }

              const invokerError = createInvokerError(
                `Command "${registeredCommand}" execution failed`,
                ErrorSeverity.ERROR,
                {
                  command: commandStr,
                  element: invoker,
                  cause: error as Error,
                  recovery: 'Check command syntax and parameters'
                }
              );
              throw invokerError;
            }
            return;
          }

          // Execute BEFORE_COMMAND middleware for all targets before execution
          for (const target of targets) {
            const targetContext = {
              ...context,
              targetElement: target
            };
            await this.executeMiddleware(HookPoint.BEFORE_COMMAND, targetContext, true);
            // Merge any modifications back to the original context
            Object.assign(context, targetContext);
          }

        try {

            // Execute command on each target
            for (const target of targets) {
              // Create target-specific context
              const targetContext = {
                ...context,
                targetElement: target
              };

             // Execute BEFORE_VALIDATION middleware
             await this.executeMiddleware(HookPoint.BEFORE_VALIDATION, targetContext, true);
             // Merge modifications back
             Object.assign(context, targetContext);

             // Check command state before execution
             const commandKey = `${commandStr}:${target.id}`;
             let currentState = this.commandStates.get(commandKey) || 'active';

             // Check if state is specified on the invoker (if it exists)
             if (invoker) {
               const invokerState = (invoker.dataset.state as CommandState) || (invoker.getAttribute('data-state') as CommandState);
               if (invokerState) {
                 // If the state was already set in commandStates and is 'completed', don't override
                 if (!(this.commandStates.has(commandKey) && this.commandStates.get(commandKey) === 'completed')) {
                   currentState = invokerState;
                 }
               }
             }

             // For chained commands (null invoker), check if the command should be prevented
             if (currentState === 'disabled' || currentState === 'completed') {
               continue; // Skip this target
             }

             let executionResult: CommandExecutionResult = { success: true };

             try {
               // Validate context before execution
               const validationErrors = this.validateContext(targetContext);
               if (validationErrors.length > 0) {
                 throw createInvokerError(
                   `Command execution aborted: ${validationErrors.join(', ')}`,
                   ErrorSeverity.ERROR,
                   {
                     command: commandStr,
                     element: targetContext.invoker || targetContext.targetElement,
                     context: { validationErrors },
                     recovery: 'Fix the validation errors and try again'
                   }
                 );
               }

               // Execute AFTER_VALIDATION middleware
               await this.executeMiddleware(HookPoint.AFTER_VALIDATION, targetContext);

                // Await the primary command with timeout protection
                const executionPromise = Promise.resolve(callback(targetContext));
               const timeoutPromise = new Promise((_, reject) => {
                 setTimeout(() => reject(new Error('Command execution timeout')), 30000); // 30 second timeout
               });

               await Promise.race([executionPromise, timeoutPromise]);

               // Update state after successful execution
               if (currentState === 'once') {
                 this.commandStates.set(commandKey, 'completed');
               }

               // Execute ON_SUCCESS middleware
               await this.executeMiddleware(HookPoint.ON_SUCCESS, { ...targetContext, result: executionResult });

               if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                  debugLog(`Invokers: Command "${registeredCommand}" executed successfully on target ${target.id || target}`);
               }

               } catch (error) {
                 executionResult = { success: false, error: error as Error };

                 // Execute ON_ERROR middleware
                 await this.executeMiddleware(HookPoint.ON_ERROR, { ...targetContext, result: executionResult });

                 // If it's already an InvokerError, re-throw it as-is
                 if (error && typeof error === 'object' && 'severity' in error) {
                   throw error;
                 }

                  const invokerError = createInvokerError(
                   `Command "${registeredCommand}" execution failed`,
                   ErrorSeverity.ERROR,
                   {
                     command: commandStr,
                     element: targetContext.invoker || targetContext.targetElement,
                     cause: error as Error,
                     context: {
                       params: targetContext.params,
                       targetId: targetContext.targetElement?.id,
                       invokerState: currentState
                     },
                     recovery: 'Check command syntax and ensure all required attributes are present'
                   }
                 );
                 throw invokerError;
               }

             // Execute ON_COMPLETE middleware (always runs)
             await this.executeMiddleware(HookPoint.ON_COMPLETE, { ...targetContext, result: executionResult });

             // Execute AFTER_COMMAND middleware
             await this.executeMiddleware(HookPoint.AFTER_COMMAND, { ...targetContext, result: executionResult });

              // Process <and-then> elements and trigger follow-up (only for the first target to avoid duplication)

              if (context.invoker && target === targets[0]) {
              await this._processAndThenElements(context.invoker, executionResult, target);
                
                // Also process data-and-then attribute-based chaining
                await this.processAttributeChaining(context.invoker, executionResult, target, interpolatedCommandStr);
              }
           }
          } catch (commandError) {
            // Process error chaining before handling the error
            if (context.invoker && targets.length > 0) {
              await this._processAndThenElements(context.invoker, { success: false }, targets[0]);
              await this.processAttributeChaining(context.invoker, { success: false }, targets[0], interpolatedCommandStr);
            }

            // If it's already an InvokerError, re-throw it as-is
            if (commandError && typeof commandError === 'object' && 'severity' in commandError) {
              throw commandError;
            }

            const wrapperError = createInvokerError(
              `Failed to execute command "${registeredCommand}"`,
              ErrorSeverity.CRITICAL,
              {
                command: commandStr,
                element: event.source as HTMLElement,
                cause: commandError as Error,
                recovery: 'Check command syntax and ensure all required attributes are present'
              }
            );
            logInvokerError(wrapperError);
            throw wrapperError;
          }

        return; // Stop after the first, longest match
      }
    }

    // If no command was found, provide helpful suggestions
    if (!commandFound) {
      const error = createInvokerError(
        `Unknown command "${commandStr}"`,
        ErrorSeverity.ERROR,
        {
          command: commandStr,
          element: event.source as HTMLElement,
          context: {
            availableCommands: this.sortedCommandKeys.slice(0, 10)
          },
          recovery: 'Check the command name and ensure it\'s registered. Custom commands must start with "--"'
        }
      );
      logInvokerError(error);
    }
  }


  /**
   * Validates the command context before execution
   */
  private validateContext(context: CommandContext): string[] {
    const errors: string[] = [];

    // Allow null targetElement for commands that don't require DOM targets
    if (context.targetElement && !context.targetElement.isConnected) {
      errors.push('Target element is not connected to the DOM');
    }

    if (context.params.some(param => param == null)) {
      errors.push('Command contains null or undefined parameters');
    }

    return errors;
  }



  /**
   * Defers listener attachment until DOM is ready.
   */
  private deferListen(): void {
    // Only add listeners if they haven't been added yet
    if ((typeof window !== "undefined" && (window as any).__invokerListenersAdded) ||
        (typeof global !== "undefined" && (global as any).__invokerListenersAdded)) {
      return;
    }

    const attachListeners = () => {
      if ((typeof window !== "undefined" && (window as any).__invokerListenersAdded) ||
          (typeof global !== "undefined" && (global as any).__invokerListenersAdded)) {
        return;
      }
      this.listen();
      if (typeof window !== "undefined") {
        (window as any).__invokerListenersAdded = true;
      }
      if (typeof global !== "undefined") {
        (global as any).__invokerListenersAdded = true;
      }
    };

    // If document is already ready, attach immediately
    if (typeof document !== "undefined" && document.readyState !== "loading") {
      attachListeners();
    } else if (typeof document !== "undefined") {
      // Wait for DOM to be ready
      document.addEventListener("DOMContentLoaded", attachListeners);
    }
  }

  /**
   * Attaches the global `command` event listener to the document.
   */
  private listen(): void {
    // The listener now calls the async handleCommand method.
    document.addEventListener("command", async (e) => {
      await this.handleCommand(e);
      e.stopImmediatePropagation();
    }, false); // Use bubble phase instead of capture
  }

  /**
   * Ensures command event listeners are attached. Call this after DOM setup in test environments.
   */
  public ensureListenersAttached(): void {
    if ((typeof window !== "undefined" && !(window as any).__invokerListenersAdded) ||
        (typeof global !== "undefined" && !(global as any).__invokerListenersAdded)) {
      this.listen();
      if (typeof window !== "undefined") {
        (window as any).__invokerListenersAdded = true;
      }
      if (typeof global !== "undefined") {
        (global as any).__invokerListenersAdded = true;
      }
    }
  }

  /**
    * Registers the essential set of built-in commands provided by the core library.
    */
  private registerCoreLibraryCommands(): void {
    // This method is now intentionally empty. Core commands are an opt-in pack.
  }

  private createContext(event: any, fullCommand: string, params: readonly string[]): CommandContext {
    // For data-on-event and command-on elements, treat them as valid invokers even if they're not buttons
    const sourceElement = event.source as HTMLElement;

    // Validate that source element exists and is in DOM
    if (sourceElement && !sourceElement.isConnected) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: Source element is not connected to DOM');
      }
    }

    const invoker = (sourceElement?.hasAttribute?.('command') ||
                     sourceElement?.hasAttribute?.('command-on') ||
                     sourceElement?.hasAttribute?.('data-on-event'))
      ? sourceElement as HTMLButtonElement
      : event.source as HTMLButtonElement;

    const targetElement = (event.targetElement as HTMLElement) || (event.target as HTMLElement);



    const getTargets = (): HTMLElement[] => {
      const invokerResolvedTargets = (invoker as any)?.__invokersResolvedTargets as HTMLElement[] | undefined;
      if (invokerResolvedTargets && invokerResolvedTargets.length > 0) {
        return invokerResolvedTargets;
      }
      const resolvedTargets = (event as any).resolvedTargets as HTMLElement[] | undefined;
      if (resolvedTargets && resolvedTargets.length > 0) {
        return resolvedTargets;
      }
      // For chained commands, use the target from the event directly
      if ((event as any).isChained) {
        return targetElement ? [targetElement] : [];
      }

      // For chained commands (null invoker), always get fresh references
      if (!invoker) {
        const freshTarget = getFreshTargetElement();
        return freshTarget ? [freshTarget] : [];
      }

      // Validate invoker exists and is connected
      if (!invoker || !invoker.isConnected) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugWarn('Invokers: Invoker element is not available or not connected to DOM');
        }
        return targetElement ? [targetElement] : [];
      }

      if (invoker.hasAttribute('data-on-event-commandfor') && (event as any)?.triggeringEvent?.type) {
        const dataOnEvent = invoker.getAttribute('data-on-event') || invoker.dataset.onEvent;
        if (dataOnEvent && (event as any).triggeringEvent.type === dataOnEvent) {
          return targetElement ? [targetElement] : [];
        }
      }

      // Use advanced target resolver for all selector types
      // First try commandfor attribute (spec-compliant)
      let selector = invoker.getAttribute("commandfor");
      if (selector && selector.trim()) {
        const targets = resolveTargets(selector.trim(), invoker) as HTMLElement[];
        if (targets.length > 0) {
          return targets;
        }
      }

      // Fallback to legacy aria-controls
      const controls = invoker.getAttribute("aria-controls")?.trim();
      if (controls) {
        // Convert space-separated IDs to CSS selector
        selector = "#" + controls.split(/\s+/).filter(Boolean).join(", #");
        const targets = resolveTargets(selector, invoker) as HTMLElement[];
        if (targets.length > 0) {
          return targets;
        }
      }

      // Final fallback to data-target
      const dataTarget = invoker.dataset.target?.trim();
      if (dataTarget) {
        const targets = resolveTargets(dataTarget, invoker) as HTMLElement[];
        if (targets.length > 0) {
          return targets;
        }
      }

      // If no selector found, return the event target (for backward compatibility)
      return targetElement ? [targetElement] : [];
    };

    // For chained commands (null invoker), ensure we get a fresh reference to the target element
    const getFreshTargetElement = (): HTMLElement | null => {
      if (targetElement && targetElement.id) {
        return document.getElementById(targetElement.id);
      }
      return targetElement;
    };

    const updateAriaState = (targets: HTMLElement[]) => {
      if (!invoker) return;
      const isExpanded = targets.some(t => !t.hidden);
      invoker.setAttribute("aria-expanded", String(isExpanded));
      if (invoker.hasAttribute("aria-pressed")) {
        invoker.setAttribute("aria-pressed", String(isExpanded));
      }
    };

    const manageGroupState = () => {
      if (!invoker) return;
      const targets = getTargets();
      if (targets.length === 0 || !targets[0].parentElement) return;

      const container = targets[0].parentElement;
      const allTargetIDs = new Set(Array.from(container.children).map(t => t.id).filter(Boolean));

      const invokersInGroup = Array.from(
        document.querySelectorAll<HTMLButtonElement>("[commandfor], [aria-controls]")
      ).filter(btn => {
        const controlledIds = (btn.getAttribute("commandfor") ? [btn.getAttribute("commandfor")] : []).concat(btn.getAttribute("aria-controls")?.split(/\s+/) ?? []);
        return controlledIds.some(id => allTargetIDs.has(id!));
      });

      invokersInGroup.forEach(otherInvoker => {
        if (otherInvoker !== invoker) {
          otherInvoker.setAttribute("aria-expanded", "false");
          if (otherInvoker.hasAttribute("aria-pressed")) {
            otherInvoker.setAttribute("aria-pressed", "false");
          }
        }
      });
    };

    const executeAfter = async (command: string, target?: string, state: CommandState = 'active') => {
      if (!invoker) return;
      await this.scheduleCommand(command, target || targetElement.id, state, targetElement, invoker);
    };

    const executeConditional = (options: ConditionalCommands) => {
      if (!invoker) return;
      // Store conditional commands in data attributes for later execution
      if (options.onSuccess && options.onSuccess.length > 0) {
        invoker.dataset.afterSuccess = options.onSuccess.join(',');
      }

      if (options.onError && options.onError.length > 0) {
        invoker.dataset.afterError = options.onError.join(',');
      }

      if (options.onComplete && options.onComplete.length > 0) {
        invoker.dataset.afterComplete = options.onComplete.join(',');
      }
    };

    return {
      invoker,
      targetElement: invoker ? targetElement : getFreshTargetElement() || targetElement,
      fullCommand,
      params,
      triggeringEvent: (event as any).triggeringEvent,
      getTargets,
      updateAriaState,
      manageGroupState,
      executeAfter,
      executeConditional
    };
  }

   /**
    * Processes data-and-then attribute-based command chaining
    */
    private async processAttributeChaining(
    invokerElement: HTMLButtonElement,
    executionResult: CommandExecutionResult,
    primaryTarget: HTMLElement,
    commandStr?: string
  ): Promise<void> {
    // Only process attribute chaining for the primary command to prevent infinite loops
    const invokerCommand = invokerElement.getAttribute('command');
    if (commandStr && invokerCommand && commandStr !== invokerCommand) {
      return;
    }

    const afterSuccessCommands = (invokerElement.dataset.afterSuccess || invokerElement.getAttribute('data-after-success') || '')
      .split(',')
      .filter(Boolean);
    const afterErrorCommands = (invokerElement.dataset.afterError || invokerElement.getAttribute('data-after-error') || '')
      .split(',')
      .filter(Boolean);
    const afterCompleteCommands = (invokerElement.dataset.afterComplete || invokerElement.getAttribute('data-after-complete') || '')
      .split(',')
      .filter(Boolean);

    // Process universal data-and-then
    const andThenCommand = invokerElement.dataset.andThen || invokerElement.getAttribute('data-and-then') || '';
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: Checking data-and-then, dataset.andThen:', andThenCommand, 'hasAttribute:', invokerElement.hasAttribute('data-and-then'), 'getAttribute:', invokerElement.getAttribute('data-and-then'));
    }
    if (andThenCommand) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog('Invokers: Processing data-and-then:', andThenCommand, 'on invoker:', invokerElement);
      }
      const targetId = invokerElement.dataset.thenTarget
        || invokerElement.getAttribute('data-then-target')
        || invokerElement.getAttribute('commandfor')
        || primaryTarget.id;
      await this.scheduleCommand(andThenCommand, targetId, 'active', primaryTarget, invokerElement);
      // Remove data-and-then after processing to prevent infinite loops
      invokerElement.removeAttribute('data-and-then');
    }

    // Process conditional chaining
    if (executionResult.success && afterSuccessCommands) {
      for (const command of afterSuccessCommands) {
        const targetId = invokerElement.dataset.thenTarget
          || invokerElement.getAttribute('data-then-target')
          || invokerElement.getAttribute('commandfor')
          || primaryTarget.id;
        await this.scheduleCommand(command.trim(), targetId, 'active', primaryTarget, invokerElement);
      }
    }

    if (!executionResult.success && afterErrorCommands) {
      for (const command of afterErrorCommands) {
        const targetId = invokerElement.dataset.thenTarget
          || invokerElement.getAttribute('data-then-target')
          || invokerElement.getAttribute('commandfor')
          || primaryTarget.id;
        await this.scheduleCommand(command.trim(), targetId, 'active', primaryTarget, invokerElement);
      }
    }

    if (afterCompleteCommands) {
      for (const command of afterCompleteCommands) {
        const targetId = invokerElement.dataset.thenTarget
          || invokerElement.getAttribute('data-then-target')
          || invokerElement.getAttribute('commandfor')
          || primaryTarget.id;
        await this.scheduleCommand(command.trim(), targetId, 'active', primaryTarget, invokerElement);
      }
    }
  }

  /**
   * Processes <and-then> elements for command chaining
   */
  private async _processAndThenElements(
    invokerElement: HTMLElement,
    executionResult: CommandExecutionResult,
    primaryTarget: HTMLElement
  ): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('_processAndThenElements called with success:', executionResult.success, 'invoker:', invokerElement);
    }

    // Process <and-then> elements (only direct children to avoid double-processing nested ones)
    const andThenElements = Array.from(invokerElement.children).filter(el => el.tagName === 'AND-THEN') as HTMLElement[];
    for (const andThen of andThenElements) {
      const command = andThen.getAttribute('command');
      if (!command) continue;

      // Check condition
      const condition = andThen.getAttribute('data-condition');
      if (condition) {
        const shouldExecute = (condition === 'success' && executionResult.success) ||
                              (condition === 'error' && !executionResult.success) ||
                              (condition === 'always');
        if (!shouldExecute) continue;
      }

      const targetId = andThen.getAttribute('commandfor') || andThen.getAttribute('data-then-target') || primaryTarget.id;
      const delay = parseInt(andThen.getAttribute('data-delay') || '0', 10);
      const isOnce = andThen.getAttribute('data-once') === 'true';

      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog('Invokers: Processing <and-then> command:', command, 'target:', targetId, 'delay:', delay, 'once:', isOnce);
      }

      const executeAndThen = async () => {
        await this.scheduleCommand(command, targetId, 'active', primaryTarget, andThen);
        if (isOnce) {
          andThen.remove();
        }
      };

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        await executeAndThen();
      } else {
        await executeAndThen();
      }
    }
  }

  /**
   * Gets performance monitoring statistics
   */
  public getStats() {
    return {
      executionsInWindow: this.performanceMonitor.getStats().executionsInWindow,
      executionsLastSecond: this.performanceMonitor.getStats().executionsInWindow, // Alias for compatibility
      maxExecutions: this.performanceMonitor.getStats().maxExecutions,
      windowMs: this.performanceMonitor.getStats().windowMs
    };
  }

  /**
   * Schedules a command for execution with optional state management.
   */
  private async scheduleCommand(command: string, targetId: string, state: CommandState, primaryTarget?: HTMLElement, invoker?: HTMLElement): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: scheduleCommand called with command:', command, 'targetId:', targetId);
    }

    // Validate inputs
    if (!command || typeof command !== 'string' || command.trim() === '') {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: Invalid command in scheduleCommand');
      }
      return;
    }

    const normalizedTargetId = targetId?.trim() || '';
    const commandKey = `${command.trim()}:${normalizedTargetId}`;

    // Check command state
    const currentState = this.commandStates.get(commandKey);
    if (currentState === 'disabled') {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog(`Invokers: Command "${commandKey}" is disabled, skipping`);
      }
      return;
    }

    if (currentState === 'completed') {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog(`Invokers: Command "${commandKey}" already completed, skipping`);
      }
      return;
    }

    // For chained commands, directly execute the command instead of using synthetic buttons
    // This avoids issues with event propagation in test environments
    let targetElement: HTMLElement | null = null;
    if (targetId) {
      const targets = resolveTargets(targetId, document.body) as HTMLElement[];
      targetElement = targets.length > 0 ? targets[0] : null;
    }
    if (!targetElement && primaryTarget && targetId === primaryTarget.id) {
      targetElement = primaryTarget;
    }
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('scheduleCommand targetElement:', targetElement, 'for targetId:', targetId);
    }
    if (targetElement) {
      const mockEvent = {
        command,
        source: invoker || null, // Use provided invoker for chained commands
        target: targetElement,
        preventDefault: () => { },
        type: 'command',
        isChained: true // Flag to indicate this is a chained command execution
      } as any;
      await this.executeCustomCommand(command, mockEvent);
    }

    // Update state after execution
    if (state === 'once') {
      this.commandStates.set(commandKey, 'completed');
    } else if (state === 'completed') {
      this.commandStates.set(commandKey, 'completed');
    }
  }
}
