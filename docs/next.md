### **The Basics of the New Advanced Event API**

The new event handling system is a powerful, **opt-in** extension to the core Invokers library. Its purpose is to evolve Invokers from a `click`-driven library into a fully reactive one, allowing you to build highly dynamic interfaces without writing custom JavaScript.

The entire system is designed to be tree-shakeable. If you don't enable it, your users won't download the extra code.

#### **1. Step One: Enabling the Advanced API**

By default, these new features are turned off to keep the core library small. To activate them, you must import and call a special function once in your application's main script file.

```javascript
// In your main application script (e.g., app.js)
import 'invokers'; // Load the core library first
import { enableAdvancedEvents } from 'invokers/advanced';

// Call this function once to activate all new event features
enableAdvancedEvents();
```

Calling this function "wakes up" the advanced event listeners and the dynamic data capabilities across your entire application.

#### **2. The New Attributes: `command-on` and `data-on-event`**

Once enabled, you gain access to two new declarative attributes.

##### **A) `command-on`: Triggering Commands from Any DOM Event**

This is the most direct upgrade. It allows any element to execute a command in response to *any* DOM event, not just a button `click`.

The syntax is `command-on="<event-name>.<modifier>`:

**Example: A Self-Submitting Form (No Button Needed)**
Instead of a separate button, the form itself handles submission.

```html
<!-- The form listens for the "submit" event and triggers a fetch command -->
<form id="contact-form"
      command-on="submit"
      command="--fetch:send"
      commandfor="contact-form"
      data-response-target="#result">
  
  <input name="email" type="email">
  <button type="submit">Subscribe</button>
</form>

<div id="result"></div>
```
Invokers will automatically call `event.preventDefault()` on form submissions to prevent a page reload.

**Example: Keyboard Shortcuts**
You can add powerful modifiers to the event name.

```html
<!-- Show a search modal when the user presses K anywhere on the page -->
<body command-on="keydown.window.k.prevent"
      command="show-modal"
      commandfor="search-dialog">
  ...
</body>
```

##### **B) `data-on-event`: Listening for Custom Events**

This attribute decouples your components. It allows an element to listen for custom events dispatched from anywhere on the page and execute a command in response.

**Example: A Notification System**
A save button can emit a `notify` event, and a completely separate `toast` element can listen for it.

```html
<!-- The button emits a custom event with data -->
<button command="--emit:notify:{\"message\":\"Profile Saved!\",\"type\":\"success\"}">
  Save Profile
</button>

<!-- A separate toast element, anywhere on the page, listens for it -->
<div id="toast-notification"
     data-on-event="notify"
     command="--show">
  <!-- We'll see how to use the message data in the next step -->
  Notification will appear here!
</div>
```

#### **3. The Superpower: Dynamic Data with `{{...}}`**

This is what makes the new event system truly powerful. You can inject dynamic data from the event directly into your command attributes using `{{...}}` syntax.

When an event triggers a command, you have access to a context object:

*   `{{ this }}`: Refers to the element that the trigger is on. E.g., `{{ this.value }}`, `{{ this.dataset.id }}`.
*   `{{ event }}`: The raw DOM event. E.g., `{{ event.key }}`, `{{ event.clientX }}`.
*   `{{ detail }}`: The `detail` payload from a `CustomEvent`. E.g., `{{ detail.message }}`.

**Putting It All Together: A Live Search Example**

This example combines `command-on` and dynamic data to create a live search input that hits a server endpoint as the user types, all with zero custom JavaScript.

```html
<!-- The search input -->
<input type="search"
       name="query"
       placeholder="Search articles..."
       command-on="input"
       command="--fetch:get"
       commandfor="#search-results"
       data-url="/api/search?q={{ this.value }}">

<!-- The container where results will be rendered -->
<div id="search-results"></div>
```

**How it works:**
1.  `command-on="input"` tells Invokers to run a command every time the user types in the input field.
2.  The `--fetch:get` command is executed.
3.  The `data-url` attribute uses `{{ this.value }}`. Invokers replaces this placeholder with the current value of the input field *at the moment the event fires*.
4.  The request is sent to a URL like `/api/search?q=declarative`, and the HTML response is placed into the `#search-results` div.

This new API layer transforms Invokers from a tool for pre-defined interactions into a dynamic and reactive framework for building modern web applications.

### **Advanced Event API: In-Depth Details**

This API is an opt-in layer. It is **inactive by default** and must be enabled by calling `enableAdvancedEvents()` from the `invokers/advanced` module. Once enabled, the following features become available.

#### **1. The `command-on` Attribute**

This attribute allows any element to become an invoker in response to a DOM event.

**Syntax:** `command-on="<event-name>[.<modifier1>.<modifier2>...]"`

*   **`<event-name>`:** Any standard DOM event name (e.g., `input`, `submit`, `change`, `mouseenter`, `keydown`).
*   **`<modifier>`:** Optional flags that alter the listener's behavior.

**Required Companion Attributes:**
An element with `command-on` **must** also have `command` and `commandfor` attributes to specify what action to perform and on which target.

```html
<input type="text"
       command-on="input"
       command="--text:copy"
       commandfor="#char-count"
       data-copy-from="#source-for-length"> <!-- This pattern will be improved by dynamic data -->
```

**Available Modifiers:**

| Modifier | Description | Example |
| :--- | :--- | :--- |
| `.prevent` | Calls `event.preventDefault()`. Crucial for `submit` and `keydown` events. | `command-on="submit.prevent"` |
| `.stop` | Calls `event.stopPropagation()`. Prevents the event from bubbling up. | `command-on="click.stop"` |
| `.once` | The event listener will be automatically removed after it is triggered once. | `command-on="mouseenter.once"` |
| `.window` | Attaches the listener to the global `window` object instead of the element. | `command-on="keydown.window.s"` |
| `.{key}` | For `keydown` or `keyup`, only triggers if the specified key was pressed. | `command-on="keydown.enter.prevent"` |

**Key-Specific Modifiers:**
You can use key modifiers for shortcuts like `keydown.enter` or `keydown.k`. Common aliases are supported: `enter`, `escape`, `arrow-up`, `tab`, etc. Key chords (e.g., `ctrl` + key) are not supported yet.

#### **2. The `data-on-event` Attribute**

This attribute allows an element to listen for custom events dispatched from anywhere. It's the key to creating decoupled, component-like behavior.

**Syntax:** `data-on-event="<custom-event-name>"`

**Required Companion Attributes:**
Like `command-on`, it requires `command` and `commandfor`.

```html
<!-- Somewhere in the app, a button dispatches an event -->
<button command="--emit:cart:add:{\"id\":123,\"price\":99}">Add to Cart</button>

<!-- A totally separate component listens for it -->
<div id="cart-total"
     data-on-event="cart:add"
     command="--cart:update:{{detail.price}}"
     commandfor="#cart-total">
  <!-- Custom command would handle the logic -->
</div>
```

**Key Difference from `command-on`:**
*   `command-on` is for listening to *native DOM events* on the element itself (or `window` with the `.window` modifier).
*   `data-on-event` is for listening to *custom events* that bubble up to the element it is attached to.

#### **3. Dynamic Data Interpolation: `{{...}}`**

This is the core of the reactive system. When an event is handled by `command-on` or `data-on-event`, Invokers populates a context object that can be accessed inside any command attribute on that element.

**The Context Object (`{{...}}`)**

| Path | Type | Description | Example Usage |
| :--- | :--- | :--- | :--- |
| `{{ this }}` | `HTMLElement` | The element the listener is attached to. | `{{ this.value }}`, `{{ this.id }}`, `{{ this.dataset.userId }}` |
| `{{ event }}` | `Event` | The raw DOM event that triggered the command. | `{{ event.key }}`, `{{ event.clientX }}`, `{{ event.target.value }}` |
| `{{ detail }}` | `any` | The `detail` property of a `CustomEvent`. | `{{ detail.id }}`, `{{ detail.message }}` |
| `{{ target }}`| `HTMLElement` | The element targeted by the `commandfor` attribute. | `{{ target.textContent }}` |

**How It Works:**
Before a command is executed, Invokers scans all `data-*` attributes and the `command` attribute on the invoker element. It replaces any `{{...}}` placeholders with the corresponding values from the context.

**Example: Real-time Form Validation**
This example shows an input field that, upon losing focus (`blur`), runs a (hypothetical) custom command to validate its own content.

```html
<!-- Assuming a custom '--validate' command has been registered -->
<input type="email" name="email"
       command-on="blur"
       command="--validate:email:{{this.value}}"
       commandfor="#email-error-message">

<div id="email-error-message"></div>
```
*   `command-on="blur"`: The trigger.
*   The `command` attribute is dynamically constructed *at the moment of the blur event*. If the user typed "test@a.com", the command executed would be `--validate:email:test@a.com`.

**Example: Data from a Custom Event**
Using the shopping cart example from before, we can now display the data.

```html
<!-- The button emits an event -->
<button command="--emit:notify:{\"message\":\"Item Added!\"}">Add Item</button>

<!-- The listener uses the event's detail -->
<div id="toast"
     data-on-event="notify"
     command="--text:set:{{detail.message}}"
     data-and-then="--show"
     commandfor="toast">
</div>
```
1.  User clicks the button.
2.  A `CustomEvent` named `notify` is dispatched with `detail: { message: "Item Added!" }`.
3.  The `#toast` div's listener catches this event.
4.  The `command` attribute is interpolated to `"--text:set:Item Added!"`.
5.  This command is executed on `#toast`, setting its text.
6.  The `data-and-then` command then runs, making the toast visible.

**Security:**
The interpolation mechanism is **safe**. It does not use `eval()`. It performs a simple property lookup on the context object. An expression like `{{window.alert('xss')}}` will not execute; it will resolve to an empty string because `window` is not a property of the provided context.

#### **4. Execution Flow**

Understanding the order of operations is key:

1.  An event (e.g., `input`) fires on an element with `command-on`.
2.  The `EventManager`'s listener catches it and handles any modifiers (e.g., `.prevent`, `.stop`, `.once`).
3.  The manager constructs the dynamic `interpolationContext` (`this`, `event`, `detail`).
4.  It reads the `command` attribute string from the element (e.g., `"--fetch:get?q={{this.value}}"`).
5.  It runs the **interpolation** step, creating the final command string (e.g., `"--fetch:get?q=my-query"`).
6.  It dispatches this final, interpolated command string as part of a `CommandEvent` to the specified `commandfor` target.
7.  The core `InvokerManager` receives this `CommandEvent` and executes the command as it always has.

This flow ensures that the advanced, optional event layer is a clean "pre-processor" that feeds into the stable, existing command execution pipeline.

### **Implementation Preamble: Integrating Modular, Opt-In Event Support**

#### **1. The Vision: Evolving Invokers into a Reactive, Event-Driven Library**

This document outlines the plan to transform Invokers from a powerful, `click`-driven library into a fully-fledged, reactive, event-driven one. The goal is to empower developers to build even more complex, dynamic user interfaces—like live search, real-time validation, and decoupled components—while retaining the declarative simplicity of writing interactions directly in HTML.

#### **2. The Core Challenge & Guiding Principle: "Modularity and Performance First"**

The primary challenge is to add this significant new functionality *without compromising the library's core promise of being lightweight and minimal.* Many users choose Invokers specifically for its tiny footprint. Forcing them to include code for advanced event handling they may never use would be a betrayal of that trust.

Therefore, our guiding principle for this implementation is **Modularity and Performance First**. This means:

> Users must not pay the bundle-size or performance cost for advanced features they do not use.

Every architectural decision in the following plan is made through this lens. The new features must be implemented as a distinct, tree-shakeable layer that is explicitly activated by the developer.

#### **3. The High-Level Plan: A Three-Pillar Approach**

To achieve our goal while adhering to our principle, the implementation is broken into three pillars:

1.  **Keep the Core Lean:** The default `invokers` import will remain small and fast. Its responsibility will continue to be the standards-based polyfill for `click`-driven commands on `<button>` elements. It will contain no logic for advanced event triggers or data interpolation by default.

2.  **Isolate Advanced Features:** All new logic for handling custom event triggers (`command-on`, `data-on-event`) and dynamic data interpolation (`{{...}}`) will be built in separate, self-contained modules (`event-trigger-manager.ts`, `interpolation.ts`). These modules will not be included in the main library bundle by default.

3.  **Provide an Explicit Opt-In:** We will introduce a single, clear public function, `enableAdvancedEvents()`, exposed via a separate entry point (e.g., `invokers/advanced`). A developer who wants the new features will make a conscious decision to import and call this function once in their application. This call will act as the "on switch," initializing the advanced modules and wiring them into the core library.

#### **4. Architectural Strategy in a Nutshell**

The `EventTriggerManager` will be responsible for scanning the DOM and attaching the necessary listeners for attributes like `command-on`. The `Interpolation` utility will handle safely parsing `{{...}}` syntax.

Crucially, both of these systems will funnel their work back into the existing `InvokerManager` pipeline by dispatching a standard `CommandEvent`. This is a key architectural decision: **we are not building a separate execution pipeline**. We are simply creating new, optional "on-ramps" to the robust command processing, chaining, and plugin system that already exists. This maximizes code reuse and ensures a consistent developer experience.

#### **5. What Success Looks Like**

Upon completion, we will have achieved the best of both worlds:

*   **For Library Users:** The default bundle remains tiny for simple use cases. A single import and function call unlocks a powerful suite of reactive, declarative patterns without needing to pull in another library like Alpine.js.
*   **For End Users:** Websites built with Invokers will continue to load instantly. Developers will have the tools to create richer, more responsive UIs that feel modern and dynamic, all while writing less custom JavaScript.

This modular approach will significantly expand the capabilities of Invokers, solidifying its place as a versatile tool for modern web development while staying true to its minimalist ethos. The following plan details the specific steps to make this vision a reality.



### **Revised Implementation Plan: Modular Event Support**

#### **Phase 0: Core Refinements (Preparation)**

1.  **Centralized `CommandEvent` Dispatch (Minor Refactor):**
    *   **File:** `src/index.ts`
    *   **Action:** Export a helper function `_dispatchCommandEvent` (or similar, underscore for internal use but still accessible). This function will take the `source` element, the `command` string, the `targetElement`, and the `triggeringEvent` (the original DOM event).
    *   **Reason:** This function encapsulates the `CommandEvent` creation and dispatch, ensuring consistency and making it easier for new event sources (like `command-on`) to funnel into the core Invokers pipeline.

2.  **`CommandContext` Enhancement (Internal):**
    *   **File:** `src/index.ts`
    *   **Action:** Add `triggeringEvent?: Event;` to the `CommandContext` interface.
    *   **Reason:** Allows commands to access the raw DOM event that initiated them, which is crucial for features like `event.preventDefault()` in command callbacks or accessing `event.detail` for custom events.

#### **Phase 1: Dynamic Data Interpolation Utility (Opt-in Core Functionality)**

This enables `{{...}}` syntax in command strings. It needs to be available to `InvokerManager` for chained commands, but only if activated.

1.  **Create Interpolation Utility Module:**
    *   **File:** `src/interpolation.ts` (New File)
    *   **Content:**
        ```typescript
        // src/interpolation.ts
        
        // Safely access nested properties of an object using a dot-notation string.
        function getDeepValue(obj: any, path: string): any {
          if (typeof obj !== 'object' || obj === null || !path) return undefined;
          
          return path.split('.').reduce((acc, part) => {
            if (typeof acc !== 'object' || acc === null) return undefined;
            return acc[part];
          }, obj);
        }
        
        // Interpolates a string with placeholders like {{path.to.value}}
        export function interpolateString(template: string, context: Record<string, any>): string {
          return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
            const value = getDeepValue(context, key.trim());
            return value !== undefined && value !== null ? String(value) : ''; // Return empty string for undefined/null
          });
        }
        ```

2.  **Integrate Conditional Interpolation into `InvokerManager`:**
    *   **File:** `src/index.ts`
    *   **Action:**
        *   Add a private flag: `private _interpolationEnabled = false;`
        *   Add a public setter to enable it: `public _enableInterpolation(): void { this._interpolationEnabled = true; }` (underscore for internal activation by the public `enableAdvancedEvents` later).
        *   Modify `executeCustomCommand` (and potentially `triggerFollowup` for `data-and-then` attributes) to use an internal interpolation helper:
            ```typescript
            // src/index.ts (inside InvokerManager class)

            // ... (existing imports)
            // import { interpolateString } from './interpolation'; // NOT directly imported here to enable tree-shaking


            private _interpolationEnabled = false;

            // Internal method to safely try interpolation
            // Will only call interpolateString if enabled, otherwise returns template as-is
            private _tryInterpolate(template: string, context: Record<string, any>): string {
              if (this._interpolationEnabled && typeof window.Invoker?.getInterpolationUtility === 'function') {
                const interpolate = window.Invoker.getInterpolationUtility();
                return interpolate(template, context);
              }
              return template;
            }

            // ...

            /**
             * Executes a custom command and then triggers a follow-up command if specified.
             * This is the new heart of the chaining mechanism.
             */
            private async executeCustomCommand(commandStr: string, event: CommandEvent): Promise<void> {
              const source = event.source as HTMLButtonElement; // The original invoker

              // Create base interpolation context for the current command
              const interpolationContext = {
                event: (event as any).triggeringEvent, // The original DOM event
                this: source, // The invoker element itself
                target: event.target, // The command target element
                detail: ((event as any).triggeringEvent as CustomEvent)?.detail, // Detail from CustomEvent
              };

              // The command string from the attribute might contain {{...}} from external triggers
              // We interpolate the current command before finding its callback
              const interpolatedCommandStr = this._tryInterpolate(commandStr, interpolationContext);

              for (const registeredCommand of this.sortedCommandKeys) {
                if (interpolatedCommandStr.startsWith(registeredCommand) && 
                    (interpolatedCommandStr.length === registeredCommand.length || interpolatedCommandStr[registeredCommand.length] === ":")) {
                  const callback = this.commands.get(registeredCommand);
                  if (callback) {
                    event.preventDefault();
                    const params = parseCommandString(interpolatedCommandStr.substring(registeredCommand.length + 1));
                    const context = this.createContext(event, interpolatedCommandStr, params); // Pass interpolated command

                    await callback(context); // Await the primary command

                    // After the primary command is complete, trigger the follow-up.
                    this.triggerFollowup(source, event.target as HTMLElement, (event as any).triggeringEvent);
                  }
                  return;
                }
              }
            }

            /**
             * Triggers a follow-up command (data-and-then, <and-then>).
             * This method also needs to interpolate the chained command string.
             */
            private triggerFollowup(originalInvoker: HTMLElement, primaryTarget: HTMLElement, triggeringEvent?: Event): void {
              const followupCommandTemplate = originalInvoker.dataset.andThen || originalInvoker.dataset.thenCommand;
              if (!followupCommandTemplate || !primaryTarget.id) {
                if (followupCommandTemplate) console.warn("Invokers: A chained command requires the target element to have an ID.", primaryTarget);
                return;
              }

              // Create interpolation context for the chained command
              const interpolationContext = {
                event: triggeringEvent, // Original event for context
                this: originalInvoker, // The invoker that defined the chain
                target: primaryTarget, // The primary target of the chain
                detail: (triggeringEvent as CustomEvent)?.detail, // Detail from CustomEvent
              };

              // Interpolate the chained command string
              const interpolatedFollowupCommand = this._tryInterpolate(followupCommandTemplate, interpolationContext);

              // Create a synthetic event to trigger the next command
              const syntheticInvoker = document.createElement("button");
              syntheticInvoker.setAttribute("type", "button");
              syntheticInvoker.setAttribute("command", interpolatedFollowupCommand);
              syntheticInvoker.setAttribute("commandfor", primaryTarget.id);

              // Transfer data-then-* and data-and-then-* attributes for further chaining
              for (const attr in originalInvoker.dataset) {
                  // ... (logic for transferring attributes remains the same) ...
              }

              // Use the centralized dispatcher to send the (potentially interpolated) chained command
              _dispatchCommandEvent(syntheticInvoker, triggeringEvent);
            }
            ```

#### **Phase 2: Event Trigger Manager (`command-on`, `data-on-event`)**

This module will handle attaching listeners for non-click DOM events and custom events.

1.  **Create Event Trigger Manager Module:**
    *   **File:** `src/event-trigger-manager.ts` (New File)
    *   **Content:**
        ```typescript
        // src/event-trigger-manager.ts
        
        import { _dispatchCommandEvent, InvokerManager } from './index'; // Access the central dispatcher
        import { interpolateString } from './interpolation'; // This is required for interpolation logic here

        // Event modifiers that have special handling
        const MODIFIERS: Record<string, (e: Event) => void> = {
          'prevent': (e: Event) => e.preventDefault(),
          'stop': (e: Event) => e.stopPropagation(),
          'once': (e: Event) => e.currentTarget?.removeEventListener(e.type, handleTrigger),
          // Add other modifiers like `self`, `capture`, `passive` as needed
        };

        // Handles any DOM event that triggers a command (from command-on or data-on-event)
        function handleTrigger(event: Event) {
          const source = event.currentTarget as HTMLElement;
          const commandAttribute = source.getAttribute('command') || source.dataset.onEventCommand; // command for custom event listener
          const commandforAttribute = source.getAttribute('commandfor') || source.dataset.onEventCommandfor; // commandfor for custom event listener

          if (!commandAttribute || !commandforAttribute) {
            console.warn("Invokers: Missing 'command' or 'commandfor' attribute on event triggered element:", source);
            return;
          }

          // Handle modifiers like .prevent and .stop
          const triggerAttr = source.getAttribute('command-on') || source.dataset.onEvent!;
          const modifiers = triggerAttr.split('.').slice(1);
          for (const mod of modifiers) {
            MODIFIERS[mod]?.(event);
          }

          // Create interpolation context for this specific event trigger
          const interpolationContext = {
            event: event,
            this: source,
            target: document.getElementById(commandforAttribute) || null, // Best guess at target for context
            detail: (event as CustomEvent)?.detail,
          };

          // Interpolate the command string using the activated utility
          // This ensures the interpolation code is only run if `enableAdvancedEvents` was called
          const interpolatedCommand = interpolateString(commandAttribute, interpolationContext);
          
          // Now dispatch the CommandEvent to the core InvokerManager
          _dispatchCommandEvent(source, interpolatedCommand, commandforAttribute, event);
        }

        // --- Scanning and Observing DOM for Event Triggers ---

        function attachListeners(element: HTMLElement) {
          // command-on (any DOM event)
          if (element.hasAttribute('command-on') && !element.dataset.commandOnAttached) {
            const triggerAttr = element.getAttribute('command-on')!;
            const eventName = triggerAttr.split('.')[0];
            element.addEventListener(eventName, handleTrigger);
            element.dataset.commandOnAttached = 'true';
          }

          // data-on-event (custom events)
          if (element.hasAttribute('data-on-event') && !element.dataset.onEventAttached) {
            const eventName = element.dataset.onEvent!;
            // For data-on-event, the `command` and `commandfor` attributes are implied
            // to be present on the same element, or can be specified as `data-on-event-command`
            // and `data-on-event-commandfor` to avoid conflicts.
            // For simplicity in this plan, assume `command` and `commandfor` are present.
            // If the element has `data-on-event-command` and `data-on-event-commandfor`, use those.
            if (!element.hasAttribute('command') && !element.hasAttribute('data-on-event-command')) {
                console.warn(`Invokers: Element with 'data-on-event="${eventName}"' must also have a 'command' or 'data-on-event-command' attribute.`, element);
                return;
            }
            if (!element.hasAttribute('commandfor') && !element.hasAttribute('data-on-event-commandfor')) {
                console.warn(`Invokers: Element with 'data-on-event="${eventName}"' must also have a 'commandfor' or 'data-on-event-commandfor' attribute.`, element);
                return;
            }

            element.addEventListener(eventName, handleTrigger);
            element.dataset.onEventAttached = 'true';
          }
        }

        function disconnectListeners(element: HTMLElement) {
          if (element.dataset.commandOnAttached) {
            const triggerAttr = element.getAttribute('command-on')!;
            const eventName = triggerAttr.split('.')[0];
            element.removeEventListener(eventName, handleTrigger);
            delete element.dataset.commandOnAttached;
          }
          if (element.dataset.onEventAttached) {
            const eventName = element.dataset.onEvent!;
            element.removeEventListener(eventName, handleTrigger);
            delete element.dataset.onEventAttached;
          }
        }

        // MutationObserver to attach/detach listeners for dynamically added/removed elements
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as HTMLElement;
                  if (element.hasAttribute('command-on') || element.hasAttribute('data-on-event')) {
                    attachListeners(element);
                  }
                  element.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
                }
              });
              mutation.removedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as HTMLElement;
                  disconnectListeners(element);
                  element.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(disconnectListeners);
                }
              });
            } else if (mutation.type === 'attributes') {
              const element = mutation.target as HTMLElement;
              // If command-on or data-on-event attribute changes/is added/removed, re-evaluate
              if (
                  (mutation.attributeName === 'command-on' && element.hasAttribute('command-on') && !element.dataset.commandOnAttached) ||
                  (mutation.attributeName === 'data-on-event' && element.hasAttribute('data-on-event') && !element.dataset.onEventAttached)
              ) {
                  attachListeners(element);
              } else if (
                  (mutation.attributeName === 'command-on' && !element.hasAttribute('command-on') && element.dataset.commandOnAttached) ||
                  (mutation.attributeName === 'data-on-event' && !element.hasAttribute('data-on-event') && element.dataset.onEventAttached)
              ) {
                  disconnectListeners(element);
              }
            }
          }
        });

        export class EventTriggerManager {
          private static instance: EventTriggerManager;

          public static getInstance(): EventTriggerManager {
            if (!EventTriggerManager.instance) {
              EventTriggerManager.instance = new EventTriggerManager();
            }
            return EventTriggerManager.instance;
          }

          public initialize(root: Node = document.body) {
            // Scan existing DOM
            root.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
            // Observe future changes
            observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['command-on', 'data-on-event'] });
            console.log('Invokers EventTriggerManager initialized.');
          }

          public shutdown() {
            observer.disconnect();
            document.querySelectorAll<HTMLElement>('[command-on][data-command-on-attached], [data-on-event][data-on-event-attached]').forEach(disconnectListeners);
            console.log('Invokers EventTriggerManager shut down.');
          }
        }
        ```

#### **Phase 3: Public Activation Function (`enableAdvancedEvents()`)**

This function ties everything together and acts as the public API for opting into advanced event features.

1.  **Create Public Activation Module:**
    *   **File:** `src/advanced-events.ts` (New File)
    *   **Content:**
        ```typescript
        // src/advanced-events.ts

        import { InvokerManager } from './index';
        import { EventTriggerManager } from './event-trigger-manager';
        import { interpolateString } from './interpolation'; // Import the interpolation utility

        /**
         * Enables advanced event triggering (e.g., `command-on`, `data-on-event`)
         * and dynamic data interpolation (e.g., `{{this.value}}`) in Invokers.
         *
         * Call this function once in your application if you want to use these features.
         * If not called, the code for these features will be tree-shaken out of your bundle.
         */
        export function enableAdvancedEvents(): void {
          const invokerInstance = InvokerManager.getInstance();

          // 1. Enable interpolation in the core InvokerManager
          invokerInstance._enableInterpolation(); // Marks interpolation as active
          
          // 2. Register the interpolation utility on a global accessor (used by InvokerManager)
          // This avoids directly importing interpolation.ts into index.ts, improving tree-shaking
          if (typeof window !== 'undefined' && window.Invoker) {
              (window.Invoker as any).getInterpolationUtility = () => interpolateString;
          }

          // 3. Initialize the EventTriggerManager
          EventTriggerManager.getInstance().initialize();

          console.log("Invokers: Advanced event features (command-on, data-on-event, interpolation) enabled.");
        }
        ```

2.  **Expose the new function:**
    *   **File:** `pridepack.json`
    *   **Action:** Add a new entrypoint:
        ```json
        {
          // ... existing entries ...
          "./advanced": "./src/advanced-events.ts"
        }
        ```
    *   **File:** `package.json`
    *   **Action:** Add a new export:
        ```json
        "exports": {
          // ... existing exports ...
          "./advanced": {
            "types": "./dist/types/advanced-events.d.ts",
            "development": {
              "require": "./dist/cjs/development/advanced.js",
              "import": "./dist/esm/development/advanced.js"
            },
            "require": "./dist/cjs/production/advanced.js",
            "import": "./dist/esm/production/advanced.js"
          }
        }
        ```
    *   **File:** `src/index.ts`
    *   **Action:** Export `_enableInterpolation()` and `getInterpolationUtility` for internal use by `advanced-events.ts` and `_tryInterpolate` in `InvokerManager`.
        ```typescript
        // src/index.ts (add to InvokerManager class and exports)
        
        // ... Inside InvokerManager ...
        public _enableInterpolation(): void { this._interpolationEnabled = true; }

        // And in the global window.Invoker API:
        // (window.Invoker as any).getInterpolationUtility = () => interpolateString; // This is added by advanced-events.ts
        ```

#### **Phase 4: Documentation, Examples & Testing**

1.  **Update `README.md`:**
    *   Clearly distinguish core features from advanced, opt-in features.
    *   Add a new section: **"Enabling Advanced Events (Opt-In)"** explaining how to `import { enableAdvancedEvents } from 'invokers/advanced';` and call it.
    *   Update relevant examples (`--fetch:get` with `data-url` using `{{this.value}}`, live character counter, form `submit` trigger) to use the new `command-on` or `data-on-event` attributes and dynamic data interpolation.

2.  **Create `examples/advanced-events-demo.html`:**
    *   This demo should explicitly `import { enableAdvancedEvents } from '../dist/esm/development/advanced.js';` and call it.
    *   Showcases:
        *   `command-on="submit"` for a form.
        *   `command-on="input"` for a live character counter (`{{this.value.length}}`).
        *   `command-on="mouseover"` to show/hide elements.
        *   `data-on-event="custom:update"` listening for custom events (`{{event.detail.id}}`).
        *   Keyboard shortcuts with modifiers (`command-on="keydown.enter"`).

3.  **Create `test/advanced-events.test.ts`:**
    *   Tests should `import { enableAdvancedEvents } from '../src/advanced-events';` and call it in `beforeEach`.
    *   Test cases:
        *   `command-on="submit"` on a form: Check form submission prevented, command executed.
        *   `command-on="input"` with `{{this.value}}`: Verify dynamic text updates.
        *   `data-on-event="custom:event"` with `{{event.detail}}`: Verify command executes and uses event detail.
        *   Event modifiers (`.prevent`, `.stop`, `.once`): Assert their behavior.
        *   **Crucially, add a test that asserts tree-shaking is effective:** In a test file that *does not* import `advanced-events.ts`, ensure that code related to `EventTriggerManager` or `interpolation.ts` is not accidentally pulled in (this might require inspecting bundle sizes or mocking global behavior if `enableAdvancedEvents` is never called).
