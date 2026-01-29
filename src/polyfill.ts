/**
 * @file polyfill.ts
 * @summary A high-fidelity polyfill for the W3C/WHATWG HTML Invoker Buttons proposal.
 * @license MIT (Assumed from project context)
 * @author Keith Cirkel, Luke Warlow (original authors of explainer/polyfill)
 * @description This code implements the proposed `command` and `commandfor` attributes for HTMLButtonElement
 *              and the `CommandEvent` interface, allowing declarative UI interactions in browsers
 *              that do not yet natively support these features.
 *              It includes handling for popovers and dialogs, and a mechanism for custom commands.
 */
import { debugLog, debugWarn, debugError } from './utils';
export function isSupported() {
  const target = typeof window !== "undefined" ? window : globalThis;
  return (
    typeof HTMLButtonElement !== "undefined" &&
    "command" in HTMLButtonElement.prototype &&
    // @ts-ignore
    "source" in ((target.CommandEvent || {}).prototype || {})
  );
}

// NOTE: The `isPolyfilled` function from the original polyfill code will not be exported
// directly from invokers itself, but its logic is relevant to understanding when to apply.
// For `invokers`, we will always apply the polyfill to ensure a consistent environment
// and to guarantee the `CommandEvent` and attributes are present, even if native support exists.

function enumerate(obj: object, key: PropertyKey, enumerable: boolean = true) {
  Object.defineProperty(obj, key, {
    ...Object.getOwnPropertyDescriptor(obj, key),
    enumerable,
  });
}

function getRootNode(node: Node): Node {
  // Validate input
  if (!node) {
    return node;
  }

  if (typeof node.getRootNode === "function") {
    try {
      return node.getRootNode();
    } catch (error) {
      // getRootNode can throw in some edge cases
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: getRootNode() threw an error:', error);
      }
    }
  }

  // Fallback for older environments or unusual node types
  if (node.parentNode) {
    return getRootNode(node.parentNode);
  }

  return node;
}

const commandEventSourceElements = new WeakMap<Event, Element | null>();
const commandEventActions = new WeakMap<Event, string>();

/**
 * Represents a declarative `command` event dispatched from an invoker button to its target.
 * This class mirrors the proposed W3C/WHATWG `CommandEvent` interface.
 */
declare global {
  interface CommandEventInit extends EventInit {
    command?: string;
    source?: Element;
    target?: Element;
  }
  interface CommandEvent extends Event {
    readonly command: string;
    readonly source: HTMLButtonElement | null;
  }
}

class CommandEventPolyfill extends Event {
  constructor(type: string, invokeEventInit: CommandEventInit = {}) {
    super(type, invokeEventInit);
    const { source, command, target } = invokeEventInit;

    // Validate source element
    if (source != null) {
      if (typeof source !== 'object') {
        throw new TypeError(`CommandEvent source must be an element or null, got ${typeof source}`);
      }
      // Check if it has element-like properties
      if (!source.nodeType || !source.tagName) {
        throw new TypeError(`CommandEvent source must be a DOM element with nodeType and tagName properties`);
      }
      // Additional validation for connected elements
      if (!source.isConnected && typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: CommandEvent source element is not connected to DOM');
      }
    }

    commandEventSourceElements.set(this, source || null);
    commandEventActions.set(
      this,
      command !== undefined ? String(command) : "",
    );

    // Store target for later retrieval
    if (target) {
      if (typeof target !== 'object' || !target.nodeType || !target.tagName) {
        throw new TypeError(`CommandEvent target must be a DOM element`);
      }
      (this as any)._commandEventTarget = target;
    }
  }

  get [Symbol.toStringTag]() {
    return "CommandEvent";
  }

  /**
   * The element (usually a <button>) that initiated the command.
   * If the event's target is in a different root (e.g., Shadow DOM),
   * this will return the host of the invoker's root.
   */
  get source(): Element | null {
    if (!commandEventSourceElements.has(this)) {
      throw new TypeError("CommandEvent.source accessed illegally - this CommandEvent was not properly constructed");
    }

    const source = commandEventSourceElements.get(this);
    if (!source) return null;

    // Check if source is still connected to DOM
    if (!source.isConnected) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: CommandEvent source element is no longer connected to DOM');
      }
      return source; // Still return it, but warn
    }

    const invokerRoot = getRootNode(source);
    const eventTarget = this.target as Node || (typeof document !== 'undefined' ? document : null);

    if (!eventTarget) {
      return source;
    }

    const eventRoot = getRootNode(eventTarget);

    // Ensure the source element is within the same document or shadow root context
    if (invokerRoot !== eventRoot) {
      // If cross-root, return the shadow host for encapsulation
      return invokerRoot instanceof ShadowRoot ? invokerRoot.host : null;
    }

    return source;
  }

  /**
   * The command string that was invoked (e.g., "show-modal", "--my-custom-command").
   */
  get command(): string {
    if (!commandEventActions.has(this)) {
      throw new TypeError("illegal invocation");
    }
    return commandEventActions.get(this) || "";
  }

  /**
   * The target element for the command (may differ from event.target).
   */
  get targetElement(): Element | null {
    return (this as any)._commandEventTarget || null;
  }

  // Deprecated properties for compatibility with older proposals
  get action(): never {
    throw new Error(
      "CommandEvent#action was renamed to CommandEvent#command",
    );
  }

  get invoker(): never {
    throw new Error(
      "CommandEvent#invoker was renamed to CommandEvent#source",
    );
  }
}
enumerate(CommandEventPolyfill.prototype, "source");
enumerate(CommandEventPolyfill.prototype, "command");

// Deprecated InvokeEvent for compatibility
class InvokeEventPolyfill extends Event {
  constructor(type: string, invokeEventInit: EventInit = {}) {
    super(type, invokeEventInit);
    throw new Error(
      "InvokeEvent has been deprecated, it has been renamed to `CommandEvent`",
    );
  }
}

const invokerAssociatedElements = new WeakMap<HTMLElement, Element>();

/**
 * Mixin to apply `commandforElement` and `command` properties to `HTMLButtonElement`.
 * This extends the `HTMLButtonElement` prototype to include the declarative command API.
 * @param ElementClass The HTML element class to extend (e.g., HTMLButtonElement).
 */
function applyInvokerMixin(ElementClass: typeof HTMLElement) {
  Object.defineProperties(ElementClass.prototype, {
    /**
     * Imperatively sets or gets the element controlled by the button.
     * Reflects the `commandfor` attribute.
     */
    commandForElement: {
      enumerable: true,
      configurable: true,
      set(targetElement: Element | null) {
        // Handle deprecated attributes for warnings
        if (this.hasAttribute("invokeaction")) {
          throw new TypeError(
            "Element has deprecated `invokeaction` attribute, replace with `command`",
          );
        } else if (this.hasAttribute("invoketarget")) {
          throw new TypeError(
            "Element has deprecated `invoketarget` attribute, replace with `commandfor`",
          );
        } else if (targetElement === null) {
          // If null, remove the attribute and clear associated element
          this.removeAttribute("commandfor");
          invokerAssociatedElements.delete(this);
        } else if (!(targetElement instanceof Element)) {
          // Ensure valid element type
          throw new TypeError(`commandForElement must be an element or null`);
        } else {
          // Set attribute (value is irrelevant for IDREF, just presence)
          this.setAttribute("commandfor", targetElement.id || ""); // Use ID if available
          const targetRootNode = getRootNode(targetElement);
          const thisRootNode = getRootNode(this);
          // Only associate if in the same document/root, or owner document
          if (
            thisRootNode === targetRootNode ||
            targetRootNode === this.ownerDocument
          ) {
            invokerAssociatedElements.set(this, targetElement);
          } else {
            invokerAssociatedElements.delete(this); // Remove if cross-root
          }
        }
      },
      get(): Element | null {
        // Buttons, inputs, and textareas support commandfor
        if (this.localName !== "button" && this.localName !== "input" && this.localName !== "textarea") {
          return null;
        }
        // Warn for deprecated attributes
        if (
          this.hasAttribute("invokeaction") ||
          this.hasAttribute("invoketarget")
        ) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn(
              "Element has deprecated `invoketarget` or `invokeaction` attribute, use `commandfor` and `command` instead",
            );
          }
          return null;
        }
        // Disabled buttons don't invoke
        if (this.disabled) {
          return null;
        }
        // Buttons in forms must be type="button" to use commandfor
        if (this.form && this.getAttribute("type") !== "button") {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn(
              "Element with `commandfor` is a form participant. " +
                "It should explicitly set `type=button` in order for `commandfor` to work",
            );
          }
          return null;
        }
        // First, check imperatively set element
        const targetElement = invokerAssociatedElements.get(this);
        if (targetElement) {
          if (targetElement.isConnected) {
            return targetElement;
          } else {
            // Clean up disconnected elements
            invokerAssociatedElements.delete(this);
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugWarn('Invokers: Cleaning up reference to disconnected element');
            }
            return null;
          }
        }
        // Fallback to IDREF lookup if not imperatively set
        const selector = this.getAttribute("commandfor");
        if (!selector) return null;

        const root = getRootNode(this) as any;
        const doc = this.ownerDocument || (root && root.ownerDocument) || (typeof document !== "undefined" ? document : null);

        // First try ID lookup - handle both #id and plain id formats
        let idToLookup = selector;
        if (selector.startsWith('#')) {
          idToLookup = selector.slice(1);
        }

        // Validate ID format (HTML5 spec: IDs must not contain whitespace)
        if (idToLookup && !/\s/.test(idToLookup)) {
          // Try direct ID lookup first (most common case)
          if (root && typeof root.getElementById === "function") {
            try {
              const element = root.getElementById(idToLookup);
              if (element) return element;
            } catch (error) {
              // getElementById can throw in some edge cases
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugWarn('Invokers: getElementById threw an error:', error);
              }
            }
          }

          if (doc && typeof doc.getElementById === "function") {
            try {
              const element = doc.getElementById(idToLookup);
              if (element) return element;
            } catch (error) {
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugWarn('Invokers: document.getElementById threw an error:', error);
              }
            }
          }
        }

        // Fallback to CSS selector lookup for complex selectors
        try {
          // Try different selector variations
          const selectorVariations = [
            selector.startsWith('#') ? selector : '#' + selector, // #id format
            selector // as-is (for class selectors, etc.)
          ];

          for (const sel of selectorVariations) {
            // Try root first (for shadow DOM)
            if (root && typeof root.querySelector === "function") {
              try {
                const element = root.querySelector(sel);
                if (element) return element;
              } catch (error) {
                // Invalid selector for this context, continue to next variation
                if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                  debugWarn(`Invokers: querySelector failed on root for selector "${sel}":`, error);
                }
              }
            }

            // Try document
            if (doc && typeof doc.querySelector === "function") {
              try {
                const element = doc.querySelector(sel);
                if (element) return element;
              } catch (error) {
                if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                  debugWarn(`Invokers: querySelector failed on document for selector "${sel}":`, error);
                }
              }
            }
          }
        } catch (e) {
          // Invalid selector syntax, return null
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn('Invokers: Invalid CSS selector:', selector, e);
          }
        }

        return null;
      },
    },
    /**
     * Gets or sets the command string.
     * Handles normalization for built-in commands and enforces `--` prefix for custom commands.
     */
     command: {
       enumerable: true,
       configurable: true,
       get(): string {
         const value = (this.getAttribute("command") || "").trim();
         // Custom commands always return their raw value (starting with --)
         if (value.startsWith("--")) return value;
         // Built-in commands are normalized to lowercase
         const valueLower = value.toLowerCase();
         switch (valueLower) {
          // Core commands (already implemented)
          case "show-modal":
          case "close":
          case "request-close":
          case "toggle-popover":
          case "hide-popover":
          case "show-popover":
          
          // Future commands - Openable elements
          case "toggle-openable":
          case "close-openable":
          case "open-openable":
          
          // Details elements
          case "toggle":
          case "open":
          
          // Picker elements
          case "show-picker":
          
          // Media elements
          case "play-pause":
          case "pause":
          case "play":
          case "toggle-muted":
          
          // Fullscreen elements
          case "toggle-fullscreen":
          case "request-fullscreen":
          case "exit-fullscreen":
          
          // Clipboard and sharing
          case "copy-text":
          case "share":
          
          // Number input elements
          case "step-up":
          case "step-down":
            return valueLower;
        }
        return ""; // Invalid command if not built-in or custom
      },
      set(value: string) {
        this.setAttribute("command", value);
      },
    },

    // Deprecated properties for compatibility with older proposals
    invokeAction: {
      enumerable: false,
      configurable: true,
      get(): never {
        throw new Error(
          `invokeAction is deprecated. It has been renamed to command`,
        );
      },
      set(_value: string): never {
        throw new Error(
          `invokeAction is deprecated. It has been renamed to command`,
        );
      },
    },

    invokeTargetElement: {
      enumerable: false,
      configurable: true,
      get(): never {
        throw new Error(
          `invokeTargetElement is deprecated. It has been renamed to command`,
        );
      },
      set(_value: Element | null): never {
        throw new Error(
          `invokeTargetElement is deprecated. It has been renamed to command`,
        );
      },
    },
  });
}

const onHandlers = new WeakMap<HTMLElement, EventListenerOrEventListenerObject>();

// Extend HTMLElement to include the oncommand property for TypeScript
declare global {
  interface HTMLElement {
    oncommand: EventListenerOrEventListenerObject | null;
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
   interface HTMLButtonElement {
     /**
      * Gets or sets the command string for the button.
      */
     command: string;
     /**
      * Gets or sets the element controlled by the button.
      */
     commandForElement: Element | null;
     /**
      * Gets or sets the element controlled by the interest invoker.
      */
     interestForElement: Element | null;
   }
   interface HTMLInputElement {
     /**
      * Gets or sets the command string for the input.
      */
     command: string;
     /**
      * Gets or sets the element controlled by the input.
      */
     commandForElement: Element | null;
     /**
      * Gets or sets the element controlled by the interest invoker.
      */
     interestForElement: Element | null;
   }
   interface HTMLTextAreaElement {
     /**
      * Gets or sets the command string for the textarea.
      */
     command: string;
     /**
      * Gets or sets the element controlled by the textarea.
      */
     commandForElement: Element | null;
     /**
      * Gets or sets the element controlled by the interest invoker.
      */
     interestForElement: Element | null;
   }
  interface HTMLAnchorElement {
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
  interface HTMLAreaElement {
    /**
     * Gets or sets the element controlled by the interest invoker.
     */
    interestForElement: Element | null;
  }
}

/**
 * Extends `HTMLElement.prototype` to include `oncommand` event handler.
 */
Object.defineProperties(HTMLElement.prototype, {
  oncommand: {
    enumerable: true,
    configurable: true,
    get(): EventListenerOrEventListenerObject | null {
      oncommandObserver.takeRecords(); // Ensure up-to-date state
      return onHandlers.get(this) || null;
    },
    set(handler: EventListenerOrEventListenerObject | null) {
      const existing = onHandlers.get(this) || null;
      if (existing) {
        this.removeEventListener("command", existing);
      }
      if (typeof handler === "object" || typeof handler === "function") {
        if (handler !== null) {
          onHandlers.set(this, handler);
        } else {
          onHandlers.delete(this);
        }
      } else {
        onHandlers.delete(this);
      }
      if (typeof handler == "function") {
        this.addEventListener("command", handler);
      }
    },
  },
});

/**
 * Applies `oncommand` attribute values as event handlers.
 * @param els An iterable of elements to apply handlers to.
 */
function applyOnCommandHandler(els: Iterable<Element>) {
  for (const el of els) {
    if (typeof Element !== "undefined" && !(el instanceof Element)) continue; // Skip if not an Element
    const oncommandAttr = el.getAttribute("oncommand");
    if (oncommandAttr !== null && (el as any).oncommand !== null) { // Only set if not already set by JS
        try {
            // eslint-disable-next-line no-new-func
            (el as any).oncommand = new Function("event", oncommandAttr) as EventListener;
        } catch (e) {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugError(`Invokers Polyfill: Error parsing oncommand attribute for element:`, el, e);
            }
        }
    }
  }
}

/** MutationObserver to watch for new `oncommand` attributes or elements. */
const oncommandObserver = new MutationObserver((records) => {
  for (const record of records) {
    const { target } = record;
    if (record.type === "childList") {
      if (typeof Element !== "undefined" && target instanceof Element) {
        applyOnCommandHandler(Array.from(target.querySelectorAll("[oncommand]")));
      } else if (target && typeof (target as any).querySelectorAll === "function") {
        applyOnCommandHandler(Array.from((target as Element).querySelectorAll("[oncommand]")));
      }
    } else { // attributeChanged
      if (target instanceof HTMLElement && target.hasAttribute("oncommand")) {
        applyOnCommandHandler([target]);
      } else if (target instanceof HTMLElement) { // attribute removed
        target.oncommand = null; // Clear handler if attribute removed
      }
    }
  }
});

/**
 * Handles the activation of an invoker button, dispatches `CommandEvent`,
 * and performs default actions for built-in commands.
 * @param event The click event that triggered the activation.
 */
function handleInvokerActivation(event: MouseEvent | KeyboardEvent) {
  // Respect defaultPrevented (e.g., if another handler already stopped it)
  if (event.defaultPrevented) return;

  // Only process click events (or key events, if extending)
  if (event.type !== "click") return;

  // Validate event target
  if (!event.target || !(event.target instanceof HTMLElement)) {
    return;
  }

  // Check for deprecated attributes and warn
  const oldInvoker = (event.target as HTMLElement).closest(
    "button[invoketarget], button[invokeaction], input[invoketarget], input[invokeaction], textarea[invoketarget], textarea[invokeaction]",
  );
  if (oldInvoker) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugWarn(
        "Invokers Polyfill: Elements with `invoketarget` or `invokeaction` are deprecated and should be renamed to use `commandfor` and `command` respectively",
      );
    }
  }

    // Find the actual invoker element (button, input, or textarea)
    const source = (event.target as HTMLElement).closest<HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement>(
      "button[command], input[command], textarea[command]"
    );

    if (!source) return; // Not an invoker element

    // Additional validation: ensure the element is still connected
    if (!source.isConnected) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn('Invokers: Invoker element is not connected to DOM');
      }
      return;
    }

    const commandOn = source.getAttribute('command-on');
    if (commandOn) {
      const commandOnEvent = commandOn.split('.')[0];
      if (commandOnEvent === 'click' && source.command.startsWith('--')) {
        return;
      }
    }

   // Validate element type and attributes for forms
   if (source.form && source.localName === "button" && source.getAttribute("type") !== "button") {
     event.preventDefault(); // Prevent form submission
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugError( // Use console.error as this is an invalid setup
          "Invokers Polyfill: Button with `command` is a form participant. " +
            "It should explicitly set `type=button` in order for `command` to work. " +
            "To act as a Submit/Reset button, it must not have command or commandfor attributes.",
            source
        );
      }
     return;
   }

    // For native commands, both command and commandfor must be present
    // For custom commands (--prefix), commandfor is optional
    const isCustomCommand = source.command.startsWith('--');
    if (!isCustomCommand && !source.hasAttribute("commandfor")) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugError( // Use console.error as this is an invalid setup
          `Invokers Polyfill: Element with native command must also have a commandfor attribute to function.`,
          source
        );
      }
      return;
    }

    // Validate command value based on spec
    // Note: source.command getter already normalizes built-in values and validates `--` prefix
    const commandValue = source.command;
    if (!commandValue || commandValue.trim() === "") {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(
          `Invokers Polyfill: Empty or invalid command value "${source.getAttribute("command")}" for element:`,
          source,
          `Custom commands must begin with "--"`
        );
      }
      return;
    }

     let invokee = source.commandForElement;
     if (!invokee) {
       // For custom commands without commandfor, dispatch to document.body
       if (isCustomCommand) {
         invokee = document.body;
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('Invokers: Custom command without target, dispatching to document.body');
         }
       } else {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn("Invokers Polyfill: commandfor target not found for built-in command:", source);
          }
         return;
       }
     }

     // Final validation: ensure target is still connected
     if (!invokee.isConnected) {
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugWarn('Invokers: Target element is not connected to DOM:', invokee);
       }
       return;
     }

    // Helper function to check if a command is built-in
    function isBuiltInCommand(command: string): boolean {
      const normalized = command.toLowerCase();
      return normalized === 'show-modal' ||
             normalized === 'close' ||
             normalized === 'request-close' ||
             normalized === 'toggle-popover' ||
             normalized === 'hide-popover' ||
             normalized === 'show-popover' ||
             normalized === 'toggle-openable' ||
             normalized === 'close-openable' ||
             normalized === 'open-openable' ||
             normalized === 'toggle' ||
             normalized === 'open' ||
             normalized === 'play-pause' ||
             normalized === 'play' ||
             normalized === 'pause' ||
             normalized === 'toggle-muted' ||
             normalized === 'show-picker' ||
             normalized === 'step-up' ||
             normalized === 'step-down' ||
             normalized === 'copy-text' ||
             normalized === 'share' ||
             normalized === 'toggle-fullscreen' ||
             normalized === 'request-fullscreen' ||
             normalized === 'exit-fullscreen';
    }

    // Helper function to split commands on commas, respecting escaped commas
    function splitCommands(commandString: string): string[] {
      if (!commandString || typeof commandString !== 'string') {
        return [];
      }

      const commands: string[] = [];
      let currentCommand = '';
      let i = 0;
      let braceDepth = 0;

      while (i < commandString.length) {
        const char = commandString[i];

        if (char === '\\' && i + 1 < commandString.length && commandString[i + 1] === ',') {
          // Escaped comma - include the comma in the current command
          currentCommand += ',';
          i += 2; // Skip the backslash and comma
        } else if (char === '{') {
          braceDepth++;
          currentCommand += char;
          i++;
        } else if (char === '}') {
          braceDepth--;
          // Prevent negative brace depth
          if (braceDepth < 0) {
            braceDepth = 0;
          }
          currentCommand += char;
          i++;
        } else if (char === ',' && braceDepth === 0) {
          // Unescaped comma outside braces - split here
          if (currentCommand.trim()) {
            commands.push(currentCommand.trim());
          }
          currentCommand = '';
          i++;
        } else {
          currentCommand += char;
          i++;
        }
      }

      // Add the last command if any
      if (currentCommand.trim()) {
        commands.push(currentCommand.trim());
      }

      return commands;
    }

    // Split comma-separated commands and dispatch events for each
    // Use the raw attribute value to preserve original formatting
    const rawCommandValue = source.getAttribute('command') || '';
    const commands = splitCommands(rawCommandValue);

    for (const command of commands) {
       // Validate each individual command
       const trimmedCommand = command.trim();
       if (!trimmedCommand) {
         continue; // Skip empty commands
       }

       if (!trimmedCommand.startsWith('--') && !isBuiltInCommand(trimmedCommand)) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn(
             `Invokers Polyfill: "${trimmedCommand}" is not a valid command value. Custom commands must begin with "--"`
           );
         }
         continue; // Skip invalid commands but continue with others
       }

       // 1. Dispatch the CommandEvent for each command
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
          debugLog('Polyfill dispatching CommandEvent for command:', trimmedCommand);
        }

       const commandEvent = new CommandEventPolyfill("command", {
         command: trimmedCommand,
         source,
         target: invokee,
         cancelable: true,
         bubbles: true, // Should bubble to be caught by document listeners
         composed: true, // Allow crossing shadow boundaries
       });

       // Dispatch and check for errors
       let dispatchSuccessful = false;
       try {
         dispatchSuccessful = invokee.dispatchEvent(commandEvent);
       } catch (error) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugError('Invokers: Error dispatching CommandEvent:', error);
         }
         continue; // Skip to next command if dispatch fails
       }

       if (!dispatchSuccessful && typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugWarn('Invokers: CommandEvent was cancelled by a handler');
       }

      // If the event was prevented, stop default behavior for this command
      if (commandEvent.defaultPrevented) continue;

      // 2. Perform default actions for built-in commands
      const normalizedCommand = commandEvent.command.toLowerCase(); // Use the normalized command from the event

      // Handle popover commands
      if (invokee.matches('[popover]')) {
        const isPopoverOpen = invokee.matches(":popover-open");
        if (normalizedCommand === "toggle-popover") {
            (invokee as HTMLElement & { showPopover?: (options?: any) => void; hidePopover?: (options?: any) => void; })[isPopoverOpen ? 'hidePopover' : 'showPopover']?.({ source });
        } else if (normalizedCommand === "hide-popover" && isPopoverOpen) {
            (invokee as HTMLElement & { hidePopover: Function }).hidePopover();
        } else if (normalizedCommand === "show-popover" && !isPopoverOpen) {
            (invokee as HTMLElement & { showPopover?: (options?: any) => void }).showPopover?.({ source });
        }
      }

      // Handle dialog commands
      if (invokee.localName === "dialog") {
        const isDialogOpen = invokee.hasAttribute("open");
        if (normalizedCommand === "show-modal" && !isDialogOpen) {
            (invokee as HTMLDialogElement).showModal();
        } else if (normalizedCommand === "close" && isDialogOpen) {
            (invokee as HTMLDialogElement).close();
        }
      }

      // Handle details commands
      if (invokee.localName === "details") {
        const isOpen = (invokee as HTMLDetailsElement).open;
        if (normalizedCommand === "toggle") {
            (invokee as HTMLDetailsElement).open = !isOpen;
        } else if (normalizedCommand === "open" && !isOpen) {
            (invokee as HTMLDetailsElement).open = true;
        } else if (normalizedCommand === "close" && isOpen) {
            (invokee as HTMLDetailsElement).open = false;
        }
      }

      // Handle openable elements (elements with toggleOpenable method)
      if (normalizedCommand.includes("openable") && typeof (invokee as any).toggleOpenable === "function") {
        if (normalizedCommand === "toggle-openable") {
          (invokee as any).toggleOpenable();
        } else if (normalizedCommand === "open-openable") {
          (invokee as any).openOpenable?.();
        } else if (normalizedCommand === "close-openable") {
          (invokee as any).closeOpenable?.();
        }
      }

      // Handle picker commands for select and input elements
      if ((invokee.localName === "select" || invokee.localName === "input") && normalizedCommand === "show-picker") {
        try {
          if (typeof (invokee as any).showPicker === "function") {
            // Check if we're in a secure context and have user activation
            if (document.hasFocus() && source.ownerDocument.hasFocus()) {
              (invokee as any).showPicker();
            }
          }
        } catch (e) {
          // showPicker can throw for various security reasons, fail silently
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn("Invokers: showPicker failed:", e);
          }
        }
      }

       // Handle media element commands
       if (invokee.localName === "video" || invokee.localName === "audio") {
         const media = invokee as HTMLMediaElement;
         try {
           if (normalizedCommand === "play-pause") {
             if (media.paused) {
               media.play().catch((error) => {
                 if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                   debugWarn('Invokers: Media play failed (likely autoplay policy):', error);
                 }
               });
             } else {
               media.pause();
             }
           } else if (normalizedCommand === "play" && media.paused) {
             media.play().catch((error) => {
               if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                 debugWarn('Invokers: Media play failed (likely autoplay policy):', error);
               }
             });
           } else if (normalizedCommand === "pause" && !media.paused) {
             media.pause();
           } else if (normalizedCommand === "toggle-muted") {
             media.muted = !media.muted;
           }
         } catch (error) {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('Invokers: Media command failed:', error);
           }
         }
       }

      // Handle fullscreen commands
      if (normalizedCommand.includes("fullscreen")) {
        if (normalizedCommand === "toggle-fullscreen") {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            invokee.requestFullscreen().catch(() => {});
          }
        } else if (normalizedCommand === "request-fullscreen" && !document.fullscreenElement) {
          invokee.requestFullscreen().catch(() => {});
        } else if (normalizedCommand === "exit-fullscreen" && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }

       // Handle clipboard commands
       if (normalizedCommand === "copy-text" && typeof navigator.clipboard !== "undefined") {
         try {
           // For form elements, prefer value attribute over text content
           const textToCopy = (invokee as HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement).value ||
                             invokee.textContent ||
                             invokee.getAttribute('data-copy-text') ||
                             "";
           if (textToCopy.trim()) {
             navigator.clipboard.writeText(textToCopy).catch((error) => {
               if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                 debugWarn('Invokers: Clipboard write failed:', error);
               }
             });
           } else if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('Invokers: No text content found to copy');
           }
         } catch (error) {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('Invokers: Clipboard command failed:', error);
           }
         }
       }

        // Handle share commands
        if (normalizedCommand === "share" && typeof navigator.share !== "undefined") {
          try {
            // Resolve target element if commandfor is specified
            let targetElement: HTMLElement | null = null;
            const commandfor = invokee.getAttribute('commandfor') || invokee.getAttribute('aria-controls');
            if (commandfor) {
              targetElement = document.getElementById(commandfor) || document.querySelector(`[id="${commandfor}"]`);
            }

            // Get content from target element or invokee
            const contentElement = targetElement || invokee;
            const content = contentElement.textContent ||
                           contentElement.getAttribute('data-share-text') ||
                           contentElement.getAttribute('value') ||
                           "";
            const title = invokee.getAttribute('data-share-title') ||
                         invokee.getAttribute('title');
            const url = invokee.getAttribute('data-share-url') ||
                       (invokee instanceof HTMLAnchorElement ? invokee.href : null) ||
                       window.location.href;

            // Check if content looks like a URL
            const urlPattern = /^https?:\/\/[^\s]+$/i;
            const shareData: ShareData = {};

            if (title && title.trim()) {
              shareData.title = title.trim();
            }

            if (urlPattern.test(content.trim())) {
              shareData.url = content.trim();
            } else if (content && content.trim()) {
              shareData.text = content.trim();
            }

            // Fallback to current URL if no content
            if (!shareData.url && !shareData.text) {
              shareData.url = url;
            }

            navigator.share(shareData).catch((error) => {
              if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
                debugWarn('Invokers: Share failed:', error);
              }
            });
          } catch (error) {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              debugWarn('Invokers: Share command failed:', error);
            }
          }
        }

      // Handle number input commands
      if (invokee.localName === "input" && (invokee as HTMLInputElement).type === "number") {
        const input = invokee as HTMLInputElement;
        if (normalizedCommand === "step-up") {
          input.stepUp();
          // Dispatch input event for reactive updates
          input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        } else if (normalizedCommand === "step-down") {
          input.stepDown();
          // Dispatch input event for reactive updates
          input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        }
    }
  }
}

/**
 * Sets up global click listener for invoker buttons.
 * @param target The DOM node to attach the listener to (e.g., `document` or a ShadowRoot).
 */
function setupInvokeListeners(target: Node) {
  // Add debug logging to track listener attachment
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog('Invokers: Setting up click listeners on:', target);
  }
  
  target.addEventListener("click", handleInvokerActivation as EventListener, true); // Use capturing to catch first
  
  // Mark that the listener was successfully attached
  if (typeof window !== 'undefined') {
    (window as any).__invokerClickListenerVerified = true;
  }
  
  // Verify the listener was added by checking if we can see it (development debug)
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog('Invokers: Click listener attached successfully');
  }
}

/**
 * Observes newly attached Shadow DOM roots to apply listeners and `oncommand` handlers.
 * @param ElementClass The base class (e.g., `HTMLElement`) to observe shadow roots for.
 * @param callback The function to call with the new ShadowRoot.
 */
function observeShadowRoots(ElementClass: typeof HTMLElement, callback: (shadowRoot: ShadowRoot) => void) {
  // Patch attachShadow
  const attachShadow = ElementClass.prototype.attachShadow;
  ElementClass.prototype.attachShadow = function (init: ShadowRootInit) {
    const shadow = attachShadow.call(this, init);
    callback(shadow);
    return shadow;
  };
  // Patch attachInternals for declarative custom elements
  const attachInternals = ElementClass.prototype.attachInternals;
  ElementClass.prototype.attachInternals = function (this: Element) { // Use 'this' context
    const internals = attachInternals.call(this);
    if (internals.shadowRoot) callback(internals.shadowRoot);
    return internals;
  };
}

function applyToTarget(target: any) {
  // Add debug logging to track polyfill application
  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog('Invokers: Applying polyfill to target:', target);
    debugLog('Invokers: Native support check:', isSupported());
  }

  // INVOKERS LIBRARY: Always apply the polyfill for consistent behavior
  // Unlike typical polyfills, we want consistent behavior across all browsers
  // and don't want to rely on varying native implementations
  const hasNativeSupport = isSupported();
  if (hasNativeSupport) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: Native support detected, but applying polyfill for consistency');
    }
  }

  // Ensure the polyfill is only applied once
  if ((target as any).CommandEvent === CommandEventPolyfill) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: Polyfill already applied, skipping');
    }
    return; // Already applied
  }

  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog('Invokers: Proceeding with polyfill application');
  }

  // Hijack native 'invoke' and 'command' events if they exist,
  // to prevent conflicts and ensure our polyfilled event is the one processed.
  // This is a crucial step if browsers partially implement or change behavior.
  target.document.addEventListener(
    "invoke",
    (e: Event) => {
      if (e.type === "invoke" && e.isTrusted) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
  target.document.addEventListener(
    "command",
    (e: Event) => {
      // Only prevent if it's a native/trusted command event
      if (e.type === "command" && e.isTrusted && !e.defaultPrevented && e.eventPhase === Event.AT_TARGET) {
          // Check if a CommandEvent, not just a generic custom event type "command"
          // This is a tricky part: we want to block native CommandEvents if they exist,
          // but allow our own polyfilled CommandEvents to proceed.
          // A heuristic could be `e instanceof CommandEventPolyfill` but that might not work
          // if `globalThis.CommandEvent` is already the native one.
          // For now, if native is supported, our polyfill will largely step aside anyway.
          // This listener is primarily for older `invoke` event issues and preventing double-firing
          // in environments where CommandEvent is partially or inconsistently implemented.
          // For a full polyfill, we'd ensure `isSupported()` is false before applying.
          // Given `invokers` wants a consistent environment, we always apply.
          // For now, let's assume if it's a trusted 'command' event from another source, we block.
          // The `invokers` library will then dispatch its own `CommandEventPolyfill` which won't be blocked here.
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );

    // Apply the `command` and `commandfor` properties to HTMLButtonElement
    applyInvokerMixin(target.HTMLButtonElement);
    // Also apply to input and textarea elements for command-on support
    applyInvokerMixin(target.HTMLInputElement);
    applyInvokerMixin(target.HTMLTextAreaElement);

  // Observe newly attached Shadow DOM roots
  observeShadowRoots(target.HTMLElement, (shadow) => {
    setupInvokeListeners(shadow);
    oncommandObserver.observe(shadow, { subtree: true, childList: true, attributeFilter: ["oncommand"] });
    applyOnCommandHandler(Array.from(shadow.querySelectorAll("[oncommand]")));
  });

  // Set up listeners for the main document
  setupInvokeListeners(target.document);
  
   // Fallback: ensure listeners are attached even if there were issues above
   if (typeof window !== 'undefined') {
     // Use setTimeout to ensure this runs after all initialization
     setTimeout(() => {
       // Double-check that click listeners are actually attached
       if (!(window as any).__invokerClickListenerVerified) {
         if ((window as any).Invoker?.debug) {
           debugWarn('Invokers: Click listener verification failed, adding fallback listener');
         }

         // Add a fallback click listener to ensure functionality
         const fallbackListener = (event: MouseEvent) => {
           if (event.defaultPrevented) return;
           if (event.type !== "click") return;

           const source = (event.target as HTMLElement)?.closest?.('button[command], input[command], textarea[command]');
           if (!source || !source.isConnected) return;

           const command = source.getAttribute('command');
           if (!command?.trim()) return;

           let target: Element | null = null;
           const commandfor = source.getAttribute('commandfor');
           if (commandfor?.trim()) {
             target = document.getElementById(commandfor) ||
                     document.querySelector(commandfor) ||
                     null;
           }

           if (!target && command.startsWith('--')) {
             target = document.body;
           }

           if (!target) return;

           try {
             const commandEvent = new (window as any).CommandEvent("command", {
               command: command.trim(),
               source: source,
               target: target,
               cancelable: true,
               bubbles: true,
               composed: true,
             });

             target.dispatchEvent(commandEvent);
           } catch (error) {
             if ((window as any).Invoker?.debug) {
               debugError('Invokers: Fallback CommandEvent dispatch failed:', error);
             }
           }
         };

         document.addEventListener("click", fallbackListener, true);
         (window as any).__invokerClickListenerVerified = true;
       }
     }, 0);
   }

  // Initial scan for `oncommand` attributes
  oncommandObserver.observe(target.document, {
    subtree: true,
    childList: true,
    attributeFilter: ["oncommand"],
  });
  applyOnCommandHandler(Array.from(target.document.querySelectorAll("[oncommand]")));

  // Expose the polyfilled CommandEvent globally if not already defined
  if (typeof (target as any)['CommandEvent'] === 'undefined') {
    Object.defineProperty(target, "CommandEvent", {
        value: CommandEventPolyfill,
        configurable: true,
        writable: true,
        enumerable: false,
    });
  } else {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugWarn("Invokers Polyfill: `CommandEvent` already exists. The polyfill's CommandEvent will not overwrite it.");
    }
  }
  // Expose InvokeEvent globally (for deprecation warnings)
  if (typeof (target as any)['InvokeEvent'] === 'undefined') {
      Object.defineProperty(target, "InvokeEvent", {
          value: InvokeEventPolyfill,
          configurable: true,
          writable: true,
          enumerable: false,
      });
  }

}

/**
 * Applies the Invoker Buttons polyfill to the current environment.
 * This should be called once to enable the `command`/`commandfor` attributes and `CommandEvent`.
 */
export function apply() {
  const target = (typeof global !== "undefined" && (global as any).window) || (typeof window !== "undefined" ? window : globalThis);

  applyToTarget(target);

  // Also apply to global.window immediately if it exists and is different (for test environments)
  const globalWindow = (typeof global !== "undefined" && (global as any).window);
  if (globalWindow && globalWindow !== target) {
    applyToTarget(globalWindow);
  }

  // Use setTimeout as additional safety for test environments that set global.window after import
  setTimeout(() => {
    const delayedGlobalWindow = (typeof global !== "undefined" && (global as any).window);
    if (delayedGlobalWindow && delayedGlobalWindow !== target && delayedGlobalWindow !== globalWindow) {
      applyToTarget(delayedGlobalWindow);
    }
  }, 0);
}

// Automatically apply the polyfill when this module is imported.
// This ensures that the global CommandEvent and attribute setters are ready
// before InvokerManager tries to use them.
apply();
