
### **Guiding Principles for New Commands**

1.  **Solve a Real Problem:** Each command should address a common web development task that is currently verbose or requires imperative JavaScript.
2.  **Stay Declarative:** The command should be configurable via simple parameters and `data-*` attributes, not complex inline scripts.
3.  **Be Secure:** Commands that interact with external data or user input must be designed with security as a priority (e.g., no `innerHTML` without sanitization).
4.  **Fit the Ecosystem:** New commands should leverage and integrate with the existing features like chaining (`data-and-then`), conditional execution (`data-after-success`), and the new selector/templating engines.

---

### **Proposed New Commands**

#### **Category 1: Enhanced DOM & Content Manipulation**

These commands go beyond simple appending/swapping and add more sophisticated control over the DOM.

**A. `--dom:wrap`**
*   **Purpose:** Wraps the target element(s) with new markup, either from a template or a simple tag.
*   **Syntax:**
    *   `command="--dom:wrap" data-template-id="wrapper-template"`
    *   `command="--dom:wrap:div" data-wrapper-class="card" data-wrapper-id="new-card"`
*   **Why it's needed:** Common UI patterns often require wrapping elements dynamically (e.g., wrapping a set of form fields in a `fieldset`, or an image in a `figure`). This is currently difficult to do declaratively.
*   **Example:**
    ```html
    <img id="my-image" src="...">
    <button command="--dom:wrap" commandfor="#my-image" data-template-id="figure-tpl">
      Add Caption
    </button>
    <template id="figure-tpl"><figure><figcaption>My Image</figcaption></figure></template>
    ```

**B. `--dom:unwrap`**
*   **Purpose:** Removes the parent of the target element, promoting the target element up one level in the DOM tree.
*   **Syntax:** `command="--dom:unwrap"`
*   **Why it's needed:** The logical opposite of wrapping. Useful for "ejecting" an element from a container.
*   **Example:**
    ```html
    <div class="wrapper"><p id="content">Hello</p></div>
    <button command="--dom:unwrap" commandfor="#content">Remove Wrapper</button>
    ```

**C. `--dom:toggle-empty-class`**
*   **Purpose:** A utility command that adds or removes a class on a target based on whether it has child elements.
*   **Syntax:** `command="--dom:toggle-empty-class:is-empty"`
*   **Why it's needed:** Solves the common "empty state" UI problem. For example, when the last item is deleted from a list, a message like "Your list is empty" should appear. This command, used in a `data-and-then` chain after a `--dom:remove`, automates this.
*   **Example:**
    ```html
    <ul id="todo-list">
      <li id="todo-1">... <button command="--dom:remove" commandfor="#todo-1" data-and-then="--dom:toggle-empty-class:list-is-empty" data-then-target="#todo-list">X</button></li>
    </ul>
    ```

---

#### **Category 2: Data & State Management (Stateless Approach)**

These commands help manage data and state without a formal state object, using the DOM and browser storage as the "source of truth."

**A. `--data:set` & `--data:copy`**
*   **Purpose:** Manipulates `dataset` attributes. This is a powerful, stateless way to "store" information directly on elements.
*   **Syntax:**
    *   `command="--data:set:userId:123"`
    *   `command="--data:copy:userId" data-copy-from="#source-element"`
*   **Why it's needed:** Provides a declarative way to manage simple state on elements, which can then be used by other commands or CSS. It's the stateless alternative to Alpine's `x-data`.
*   **Example:**
    ```html
    <div id="user-profile" data-user-id="123">...</div>
    <div id="edit-form">
      <button command="--data:copy:userId" commandfor="#edit-form" data-copy-from="#user-profile">
        Edit User
      </button>
    </div>
    <!-- Now the form has `data-user-id="123"` which can be used by --fetch:send -->
    ```

**B. `--cookie:set`, `--cookie:get`, `--cookie:remove`**
*   **Purpose:** Declarative management of browser cookies.
*   **Syntax:**
    *   `command="--cookie:set:theme:dark" data-cookie-expires="365"`
    *   `command="--cookie:get:theme" commandfor="#output"`
*   **Why it's needed:** A common requirement for storing simple, persistent data like user preferences or session info. Complements the existing `--storage` commands for `localStorage`.

---

#### **Category 3: Advanced Flow Control & Reactivity**

These commands provide more control over the timing and execution of other commands.

**A. `--command:trigger`**
*   **Purpose:** Programmatically triggers a `click` (or other event) on another element. This allows for creating complex, indirect workflows.
*   **Syntax:** `command="--command:trigger:click" commandfor="#other-button"`
*   **Why it's needed:** Allows one invoker to start a chain of actions orchestrated by other invokers on the page, decoupling complex workflows.
*   **Example:** "Save & Close" button.
    ```html
    <button id="save-btn" command="--fetch:send" commandfor="#my-form">Save</button>
    <button id="close-btn" command="--hide" commandfor="#my-dialog">Close</button>

    <button command="--command:trigger:click" commandfor="#save-btn" 
            data-and-then="--command:trigger:click" data-then-target="#close-btn">
      Save and Close
    </button>
    ```

**B. `--command:delay`**
*   **Purpose:** A simple command that does nothing but wait for a specified time. Useful for creating timed sequences in a `data-and-then` chain.
*   **Syntax:** `command="--command:delay:500"` (waits 500ms).
*   **Why it's needed:** Sometimes you need to introduce a small delay for UX reasons (e.g., show a "Saved!" message, wait a second, then hide it).
*   **Example:**
    ```html
    <button command="--text:set:✅ Saved!" commandfor="#status"
            data-and-then="--command:delay:2000"
            data-then-target="#status">
      Save
      <!-- Using <and-then> is even more readable for this -->
      <and-then command="--command:delay:2000">
        <and-then command="--text:set:"></and-then>
      </and-then>
    </button>
    ```

**C. `--on:interval`**
*   **Purpose:** Executes a command repeatedly at a given interval.
*   **Syntax:** `command-on="load" command="--on:interval:5000" data-interval-command="--fetch:get"`
*   **Why it's needed:** For declarative polling. This allows you to create auto-updating blocks (e.g., stock tickers, notification feeds) without writing any JavaScript `setInterval` code. The command should also manage clearing the interval when the element is removed from the DOM.
*   **Example:** An auto-refreshing dashboard widget.
    ```html
    <div id="live-data" 
         command-on="load" 
         command="--on:interval:10000" 
         commandfor="#live-data"
         data-interval-command="--fetch:get" 
         data-url="/api/latest-stats">
      Loading...
    </div>
    ```

### Implementation & Modularity

*   **Core vs. Advanced:**
    *   **Core Candidates:** `--dom:wrap`, `--dom:unwrap`, `--data:*` could arguably be in the core library as they are fundamental DOM/data operations.
    *   **Advanced Candidates:** `--cookie:*`, `--command:*`, and especially `--on:interval` are more specialized and are perfect candidates for an `invokers/extended-commands` or `invokers/advanced` module that must be opted into.
*   **Integration:** All new commands must be designed to work with the existing ecosystem. For instance, `--on:interval`'s `data-interval-command` should fully support chaining, conditional execution, and interpolation, making it incredibly powerful.
### **Proposal: Adding `inner` and `outer` Modifiers to DOM Commands**

The core idea is to add an optional second parameter to the `--dom:*` commands to specify the "swap style," similar to htmx's `hx-swap` attribute. This maintains a clean, single-attribute API while greatly expanding functionality.

**The Default Behavior (Backward Compatible):**
If no modifier is provided, the commands will retain their current, intuitive behavior.

*   `--dom:swap` defaults to `--dom:swap:inner`
*   `--dom:replace` defaults to `--dom:replace:outer`

**The New, Extended Syntax:**
The syntax becomes `command="--dom:<action>:<style>"`.

---

### **Updated DOM Command Cheatsheet with Modifiers**

#### **1. `--dom:swap` (Swapping Content)**

This command now focuses on swapping HTML content into a target element.

*   **`--dom:swap:inner` (The Default)**
    *   **Action:** Replaces the inner content of the target element (`target.innerHTML = ...`). The target element itself is preserved.
    *   **Use Case:** Updating the content of a container, like a div, a list, or a panel. This is the most common swap type.
    *   **Example:**
        ```html
        <div id="content">Old content here</div>
        <button command="--dom:swap:inner" commandfor="#content" data-template-id="new-content">
          Update Content
        </button>
        <!-- Result: <div id="content">[New content here]</div> -->
        ```

*   **`--dom:swap:outer`**
    *   **Action:** Replaces the **entire target element** with the new content (`target.outerHTML = ...`). The target element is removed from the DOM.
    *   **Use Case:** When the new content needs to replace the container itself, for example, changing a loading placeholder (`<div id="item-1">Loading...</div>`) into the final content (`<div id="item-1" class="loaded">...</div>`).
    *   **Example:**
        ```html
        <div id="placeholder">Loading...</div>
        <button command="--dom:swap:outer" commandfor="#placeholder" data-template-id="final-content">
          Load Item
        </button>
        <!-- Result: [The entire content of the template, replacing the placeholder div] -->
        ```

#### **2. `--dom:replace` (Synonym for `swap:outer`)**

To improve clarity and align with user expectations, `--dom:replace` can be treated as a direct alias for `--dom:swap:outer`. This makes the API more intuitive.

*   `--dom:replace` is the same as `--dom:swap:outer`
*   `--dom:replace:outer` (explicit) is the same as `--dom:swap:outer`
*   `--dom:replace:inner` is the same as `--dom:swap:inner`

This allows developers to use whichever verb (`swap` or `replace`) feels more natural to them.

#### **3. `--dom:append` (Adding Content at the End)**

*   **`--dom:append:inner` (The Default)**
    *   **Action:** Appends the new content as the last child of the target element (`target.append(...)`).
    *   **Use Case:** Adding a new item to the end of a list, a new row to a table, or a new log entry.
    *   **Example:**
        ```html
        <ul id="list"><li>First</li></ul>
        <button command="--dom:append" commandfor="#list" data-template-id="new-item">Add</button>
        <!-- Result: <ul id="list"><li>First</li><li>New Item</li></ul> -->
        ```
*   **`--dom:append:outer`**
    *   **Action:** Inserts the new content immediately *after* the target element, as a sibling (`target.after(...)`).
    *   **Use Case:** Adding a new element after an existing one without nesting it, such as adding a new form field after the previous one, or implementing an "infinite scroll" pattern where new pages of content are added after the last loaded page.
    *   **Example:**
        ```html
        <div id="item-1">Item 1</div>
        <button command="--dom:append:outer" commandfor="#item-1" data-template-id="item-2">
          Load Next
        </button>
        <!-- Result: <div id="item-1">Item 1</div><div id="item-2">Item 2</div> -->
        ```

#### **4. `--dom:prepend` (Adding Content at the Beginning)**

*   **`--dom:prepend:inner` (The Default)**
    *   **Action:** Prepends the new content as the first child of the target element (`target.prepend(...)`).
    *   **Use Case:** Adding a new item to the top of a list or a "new tweets" style feed.
    *   **Example:**
        ```html
        <ul id="list"><li>Last</li></ul>
        <button command="--dom:prepend" commandfor="#list" data-template-id="new-item">Add Newest</button>
        <!-- Result: <ul id="list"><li>New Item</li><li>Last</li></ul> -->
        ```
*   **`--dom:prepend:outer`**
    *   **Action:** Inserts the new content immediately *before* the target element, as a sibling (`target.before(...)`).
    *   **Use Case:** Inserting an element before another, like adding a header before a section or inserting a banner above a content block.
    *   **Example:**
        ```html
        <div id="item-2">Item 2</div>
        <button command="--dom:prepend:outer" commandfor="#item-2" data-template-id="item-1">
          Insert Before
        </button>
        <!-- Result: <div id="item-1">Item 1</div><div id="item-2">Item 2</div> -->
        ```

### **Implementation Plan & Considerations**

1.  **Update Command Parser:** The core `parseCommandString` utility is already designed to handle colon-separated parameters. The logic in `InvokerManager` that finds and executes commands will need to be slightly adjusted to handle the optional second parameter for these specific commands.

2.  **Modify Command Logic:** The implementation of each `--dom:*` command in `invoker-commands.ts` will be updated with a `switch` statement or `if/else` block based on the second parameter (`style`).

    ```typescript
    // src/invoker-commands.ts

    "--dom:append": ({ invoker, targetElement, params }: CommandContext) => {
      const style = params[0] || 'inner'; // Default to 'inner'
      const fragment = getAndProcessTemplateFragment(invoker); // Use the new template engine

      switch (style) {
        case 'outer':
          targetElement.after(fragment);
          break;
        case 'inner':
        default:
          targetElement.append(fragment);
          break;
      }
    },
    // ... other commands updated similarly
    ```

3.  **View Transitions:** A key consideration is that `ViewTransitionAPI` works best when replacing the contents of a stable container.
    *   `inner` swaps are perfect for View Transitions.
    *   `outer` swaps and appends/prepends will require careful consideration. The transition should likely be wrapped around the parent container to ensure a smooth visual change. The implementation should be smart enough to detect this. For example, for an `outer` swap, the `startViewTransition` call might need to wrap `targetElement.parentElement.replaceChild(...)` instead of a direct `targetElement.replaceWith(...)`.

4.  **Documentation:** The README's command cheatsheet must be updated to clearly show the new `:<style>` parameter and explain the difference between the `inner` and `outer` behaviors for each command. The "Declarative List & Component Patterns" section should be updated to use these new modifiers in its examples, as they are essential for many common patterns.

By adding these `inner` and `outer` modifiers, the `--dom` command set becomes dramatically more expressive and capable, allowing Invokers to handle nearly any DOM manipulation scenario that developers currently turn to libraries like htmx for, all within its own consistent, declarative framework.


Excellent. This `--bind` command is a powerful concept that bridges the gap between the purely event-driven model and a more reactive, data-binding model, but in a stateless, declarative way. It essentially says, "When this command runs, take a value *from* the target and put it *onto* another element."

Let's flesh this out into a detailed specification, covering its syntax, use cases, implementation, and relationship to existing features.

---

### **Explainer & Specification: The `--bind` Command**

#### **1. The Vision: Declarative, One-Way Data Binding**

The `--bind` command provides a declarative, one-way data binding mechanism that is triggered by an event. Its purpose is to synchronize data between different parts of the UI without writing custom JavaScript or managing a formal state object.

It answers the question: "How do I make this element's content reflect the value of that other element?"

This is a powerful complement to the existing commands:
*   `--text:set:Hello` sets a *static* value.
*   `--text:copy` copies from a source to a target.
*   `--bind` creates a dynamic link, copying a value *from* the `commandfor` target *to* another element specified by a `data-*` attribute.

#### **2. The API: Syntax and Attributes**

The command is designed to be readable and flexible, using a combination of the `command` attribute and a `data-bind-to` attribute to define the data flow.

**The Command:** `command="--bind:<source-property>"`

*   This part specifies **what data to get** from the target element(s) identified by `commandfor`.
*   **`<source-property>`:**
    *   `value`: Gets the `.value` of an element (for `<input>`, `<textarea>`, `<select>`).
    *   `text`: Gets the `.textContent` of an element.
    *   `html`: Gets the `.innerHTML` of an element.
    *   `attr:<name>`: Gets the value of a specific attribute (e.g., `attr:data-user-id`).
    *   `data:<name>`: A shorthand for `attr:data-<name>`.

**The Invoker Attribute:** `data-bind-to="<destination-selector>"`

*   This specifies **where the data should go**. The destination element.
*   It accepts any valid selector supported by the new advanced selector engine (`#id`, `.class`, `@closest(div)`, etc.).

**The Destination Attribute:** `data-bind-as="<destination-property>"`

*   This attribute, placed on the invoker, specifies **how the data should be applied** to the destination element.
*   **`<destination-property>`:**
    *   `text` (Default): Sets the `.textContent` of the destination.
    *   `html`: Sets the `.innerHTML` of the destination (will be sanitized).
    *   `value`: Sets the `.value` of the destination.
    *   `attr:<name>`: Sets a specific attribute on the destination.
    *   `data:<name>`: A shorthand for `attr:data-<name>`.
    *   `class:add`: Adds the source value as a class name.
    *   `class:remove`: Removes the source value as a class name.

#### **3. Real-World Use Cases & Examples**

This command unlocks many common UI patterns.

**A. Live Preview Pane**

A classic "Markdown editor" style UI where typing in a textarea updates a preview pane in real-time.

```html
<!-- The textarea is the source of the data -->
<textarea id="markdown-input"
          command-on="input"
          command="--bind:value"
          commandfor="#markdown-input"  <!-- The command's target is ITSELF -->
          data-bind-to="#preview-pane"
          data-bind-as="text">
</textarea>

<!-- The preview pane is the destination -->
<div id="preview-pane">Type in the box above to see a preview.</div>
```
**How it works:**
1.  On `input`, the `--bind:value` command runs.
2.  `commandfor="#markdown-input"` tells it to look at the textarea itself.
3.  `:value` tells it to get the `.value` property.
4.  `data-bind-to="#preview-pane"` identifies the destination.
5.  `data-bind-as="text"` tells it to set the `.textContent` of the destination.

**B. Synchronizing Two Form Fields**

Making a "billing address is the same as shipping address" checkbox work.

```html
<!-- The source input -->
<input id="shipping-zip" type="text" placeholder="Shipping ZIP">

<!-- The invoker checkbox -->
<input type="checkbox"
       command-on="change"
       command="--bind:value"
       commandfor="#shipping-zip"
       data-bind-to="#billing-zip"
       data-bind-as="value">
<label>Billing ZIP is same as shipping</label>

<!-- The destination input -->
<input id="billing-zip" type="text" placeholder="Billing ZIP">
```
*Note: This would need additional logic to clear the field when unchecked, which could be done with a `data-and-then` chain or a custom command.*

**C. Dynamic Configuration based on a Select Dropdown**

Update a `data-*` attribute on a container based on a user's selection, which can then be used by CSS or other commands.

```html
<select id="theme-selector"
        command-on="change"
        command="--bind:value"
        commandfor="#theme-selector" <!-- Target is self -->
        data-bind-to="body"
        data-bind-as="data:theme">
  <option value="light">Light Theme</option>
  <option value="dark">Dark Theme</option>
  <option value="sepia">Sepia Theme</option>
</select>
```
**How it works:** When the user selects "dark", the command `--bind:value` runs. It gets "dark" from the select's value and applies it to the `body` element as `data-theme="dark"`. CSS can then use this attribute: `body[data-theme='dark'] { ... }`.

**D. Master/Detail View Selection**

Clicking an item in a list updates a detail panel with information from that item's `data-*` attributes.

```html
<ul id="item-list">
  <li id="item-1" data-item-name="Apple" data-item-price="1.99"
      command-on="click"
      command="--bind:data:item-name"
      commandfor="#item-1"
      data-bind-to="#detail-name"
      data-bind-as="text"
      data-and-then="--bind:data:item-price"
      data-then-target="#detail-price">
    Apple
  </li>
  <!-- ... other list items ... -->
</ul>

<div id="detail-panel">
  <h3 id="detail-name">Select an item</h3>
  <p>Price: $<span id="detail-price">0.00</span></p>
</div>
```
**How it works:**
1.  The user clicks the `<li>`.
2.  The first command, `--bind:data:item-name`, runs. It gets "Apple" from `data-item-name` and puts it into `#detail-name`.
3.  The `data-and-then` chain fires. It re-uses the *same `commandfor`* (`#item-1`) but uses `data-then-target` to set a *new destination* (`#detail-price`). The command is `--bind:data:item-price`, which gets "1.99" and places it in the price span.

#### **4. Implementation Plan**

This command fits perfectly into the advanced, opt-in module.

1.  **File:** `src/invoker-commands.ts` (or an extended commands file loaded by `advanced-events.ts`).
2.  **Action:** Register the new `--bind` command.

```typescript
// Inside the commands object
"--bind": ({ invoker, targetElement, params }: CommandContext) => {
  const sourceProperty = params[0];
  if (!sourceProperty) {
    throw createInvokerError("The --bind command requires a source property (e.g., value, text, attr:name).", ...);
  }

  // 1. Get the data from the source (the command's target)
  let sourceValue: any;
  if (sourceProperty === 'value' && (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement || targetElement instanceof HTMLSelectElement)) {
    sourceValue = targetElement.value;
  } else if (sourceProperty === 'text') {
    sourceValue = targetElement.textContent;
  } else if (sourceProperty === 'html') {
    sourceValue = targetElement.innerHTML;
  } else if (sourceProperty.startsWith('attr:')) {
    const attrName = sourceProperty.substring(5);
    sourceValue = targetElement.getAttribute(attrName);
  } else if (sourceProperty.startsWith('data:')) {
    const dataName = sourceProperty.substring(5);
    sourceValue = targetElement.dataset[dataName];
  } else {
    throw createInvokerError(`Invalid source property for --bind: "${sourceProperty}"`, ...);
  }

  // 2. Find the destination element(s)
  const destinationSelector = invoker.dataset.bindTo;
  if (!destinationSelector) {
    throw createInvokerError("The --bind command requires a 'data-bind-to' attribute on the invoker.", ...);
  }
  const destinations = resolveTargets(destinationSelector, invoker);

  // 3. Apply the data to the destination(s)
  const destinationProperty = invoker.dataset.bindAs || 'text'; // Default to textContent

  destinations.forEach(dest => {
    if (destinationProperty === 'value' && (dest instanceof HTMLInputElement || dest instanceof HTMLTextAreaElement || dest instanceof HTMLSelectElement)) {
      dest.value = sourceValue;
    } else if (destinationProperty === 'text') {
      dest.textContent = sourceValue;
    } else if (destinationProperty === 'html') {
      dest.innerHTML = sanitizeHTML(sourceValue); // SECURITY: Always sanitize HTML binds.
    } else if (destinationProperty.startsWith('attr:')) {
      const attrName = destinationProperty.substring(5);
      if (sourceValue === null) dest.removeAttribute(attrName);
      else dest.setAttribute(attrName, sourceValue);
    } else if (destinationProperty.startsWith('data:')) {
      const dataName = destinationProperty.substring(5);
      if (sourceValue === null) delete dest.dataset[dataName];
      else dest.dataset[dataName] = sourceValue;
    } else if (destinationProperty === 'class:add') {
      dest.classList.add(sourceValue);

    } else if (destinationProperty === 'class:remove') {
      dest.classList.remove(sourceValue);
    }
  });
}
Excellent questions. Let's flesh out the `--bind` command to its full potential by detailing how it integrates with the most advanced features of the Invokers ecosystem: chaining, event interpolation, and template data interpolation.

This deep integration is what will make `--bind` feel like a core, indispensable part of the library rather than a simple, tacked-on utility.

---

### **`--bind` Command: Advanced Integration Details**

#### **1. Integration with Chaining (`data-and-then` and `<and-then>`)**

The `--bind` command is designed to be a fully-fledged citizen in the chaining ecosystem. It works seamlessly as either the initiator of a chain or as a step within one.

**A. Using `--bind` as the Initial Command**

This is the most common pattern. An event triggers a `--bind`, and then other commands follow.

```html
<input id="username"
       command-on="input"
       command="--bind:value"
       commandfor="#username"
       data-bind-to="#live-preview"
       data-and-then="--class:remove:is-invalid"
       data-then-target="#username">

<div id="live-preview"></div>
```
*   **Execution Flow:**
    1.  User types in the `#username` input. The `input` event fires.
    2.  `--bind:value` executes. It takes the value from `#username` and puts it into `#live-preview`.
    3.  After the bind is complete, the `data-and-then` chain executes.
    4.  The chained command `--class:remove:is-invalid` runs on the target specified by `data-then-target` (the input itself), removing an error class.

**B. Using `--bind` within a Chain**

`--bind` can also be a *consequence* of another action, like a fetch.

```html
<button command="--fetch:get"
        data-url="/api/user/123"
        commandfor="#user-data-container"
        data-and-then="--bind:data:username"
        data-then-target="#user-data-container" 
        data-bind-to="#welcome-message"
        data-bind-as="text">
  Load User
</button>

<!-- This container will be filled by the fetch response -->
<div id="user-data-container"></div>
<!-- This message will be updated by the chained bind command -->
<h1 id="welcome-message">Welcome!</h1>
```
*   **How it works:**
    1.  The button is clicked, and `--fetch:get` runs.
    2.  The server responds with something like `<div data-username="Alice">Details...</div>`. This HTML replaces the content of `#user-data-container`.
    3.  After the fetch is complete, the `data-and-then` chain executes.
    4.  The new `--bind` command runs. `data-then-target` is used to specify that the *source* of the bind is still the `#user-data-container`.
    5.  `--bind:data:username` reads the `data-username` attribute ("Alice") from the newly fetched content.
    6.  `data-bind-to` and `data-bind-as` (which are attributes on the original invoker) tell the command to set the `textContent` of `#welcome-message` to "Alice".

**Consideration: Attribute Scoping in Chains**
The attributes for the chained `--bind` command (`data-bind-to`, `data-bind-as`) are read from the **original invoker** (`<button>`). This is a consistent and predictable model. The `data-then-*` attributes are used to modify the standard `command/commandfor` parameters for the chained command.

---

#### **2. Integration with Event Interpolation `{{...}}`**

This is where `--bind` becomes incredibly dynamic. The `{{...}}` syntax can be used to construct any part of the `--bind` command or its configuration.

**A. Dynamic Source Property**

You can change *what* you bind based on another element's state.

```html
<!-- Let the user choose what data to display -->
<select id="property-selector"
        command-on="change"
        command="--bind:{{this.value}}"
        commandfor="#source-element"
        data-bind-to="#output"
        data-bind-as="text">
  <option value="text">Show Text</option>
  <option value="html">Show HTML</option>
  <option value="attr:data-id">Show ID</option>
</select>

<div id="source-element" data-id="xyz-123">Some <b>bold</b> text</div>
<div id="output"></div>
```
*   **How it works:** When the selection changes, the `command` attribute string is interpolated. If the user has "Show ID" selected, the final command becomes `--bind:attr:data-id`, and "xyz-123" is displayed in the output.

**B. Dynamic Destination**

You can change *where* you bind data to.

```html
<input id="data-input" value="Important Data">

<!-- Select to choose the destination -->
<select command-on="change"
        command="--bind:value"
        commandfor="#data-input"
        data-bind-to="{{this.value}}"
        data-bind-as="text">
  <option value="#field-a">Field A</option>
  <option value="#field-b">Field B</option>
</select>

<div id="field-a"></div>
<div id="field-b"></div>
```
*   **How it works:** The `data-bind-to` attribute is interpolated to either `"#field-a"` or `"#field-b"` based on which radio button is checked at the moment of the click.

---

#### **3. Integration with Template Data Interpolation (`data-with-json`)**

This use case is slightly different. The `--bind` command is about moving data between *existing* DOM elements. The template engine is about creating *new* elements. While `--bind` itself wouldn't be used inside a template with `data-tpl-*`, the *principles* of data flow are closely related.

The more powerful synergy comes from using `--bind` to **prepare the data** that will be used by a subsequent templating command in a chain.

**The "Edit in Place" Pattern**

This is a classic, complex UI pattern that becomes declarative with this integration.

1.  A user clicks an "Edit" button on an item.
2.  A `--bind` command copies the item's data into a form.
3.  A `--dom:swap` command replaces the static item view with the form.

```html
<!-- The static view of an item -->
<div id="item-view-1" data-name="First Item" data-status="active">
  <p>Name: <span class="name">First Item</span></p>
  <p>Status: <span class="status">active</span></p>
  <button command="--bind:data:name"
          commandfor="#item-view-1"
          data-bind-to="#edit-form-name-input" 
          data-bind-as="value"
          data-and-then="--bind:data:status"
          data-then-target="#edit-form-status-select">
    Edit
    <and-then command="--dom:swap:outer" 
              commandfor="#item-view-1" 
              data-template-id="edit-form-template">
    </and-then>
  </button>
</div>

<!-- A single, reusable edit form template -->
<template id="edit-form-template">
  <form id="edit-form">
    <input id="edit-form-name-input" name="name">
    <select id="edit-form-status-select" name="status">
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
    <button>Save</button>
    <button>Cancel</button>
  </form>
</template>
```
*   **Execution Flow:**
    1.  User clicks "Edit".
    2.  The first `--bind` command runs. It finds `#item-view-1`, gets its `data-name`, and sets the value of the (currently invisible) `#edit-form-name-input` inside the template.
    3.  The `data-and-then` chain fires the second `--bind`, which copies the `data-status` to the `<select>` element.
    4.  The `<and-then>` chain fires the final `--dom:swap:outer` command. It replaces `#item-view-1` with the *already pre-populated* form from the template.

The user sees a seamless transition from a static view to an edit form that is correctly filled with the item's data, all orchestrated declaratively. This demonstrates how `--bind` acts as a powerful data-staging tool for other commands.

---

### **Fetch HTML Selection (`data-select`, `data-select-all`)**

When using `--fetch:get` (or other fetch commands) with HTML responses, you can now target specific parts of the returned HTML before swapping.

**Use `data-select` to swap a single match:**

```html
<button command="--fetch:get"
        data-url="/posts?page=2"
        commandfor="#tbody"
        data-select="#tbody">
  Next Page
</button>
```

**Use `data-select-all` to swap multiple matches:**

```html
<button command="--fetch:get"
        data-url="/widgets"
        commandfor="#widget-list"
        data-select-all=".widget">
  Refresh Widgets
</button>
```

**Notes:**
- `data-select` uses the first matching element from the response.
- `data-select-all` uses all matching elements and inserts them using the current replace strategy.

---

### **Anchor Invokers (Optional)**

Use anchors as invokers by enabling the anchor adapter. This infers `--fetch:get` when no `command` is present and uses `href` as `data-url`.

```javascript
import { enableAnchorInvokers } from 'invokers/anchors';

enableAnchorInvokers();
```

```html
<a href="/posts?page=2" commandfor="#tbody" data-select="#tbody">
  Next Page
</a>
```

For custom elements, register an adapter with `registerInvokerAdapter` and call `enableAdapterInvokers` to attach the delegated listener.
