[![npm version](https://badge.fury.io/js/invokers.svg)](https://www.npmjs.com/package/invokers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# ✨ Invokers 

### _Write Interactive HTML Without Writing JavaScript_

**Invokers lets you write future-proof HTML interactions without custom JavaScript.** It's a polyfill for the upcoming HTML Invoker Commands API and Interest Invokers (hover cards, tooltips), with a comprehensive set of extended commands automatically included for real-world needs like toggling, fetching, media controls, and complex workflow chaining. Think of it as **HTMX-lite**, but fully aligned with web standards.

## 📋 Table of Contents

- [🚀 Quick Demo](#-quick-demo)
- [🤔 How Does This Compare?](#-how-does-this-compare)
- [🎯 Why Invokers?](#-why-invokers)
- [🚀 Modular Architecture](#-modular-architecture)
- [📦 Installation & Basic Usage](#-installation--basic-usage)
- [🎛️ Command Packs](#️-command-packs)
- [📋 Command Cheatsheet](#-command-cheatsheet)
- [🔧 Command Syntax Guide](#-command-syntax-guide)
- [🎯 Comprehensive Demo](#-comprehensive-demo)
- [🏃‍♂️ Quick Start Examples](#️-quick-start-examples)
- [📚 Progressive Learning Guide](#-progressive-learning-guide)
- [🔌 Plugin System](#-plugin-system)
- [🧰 Extended Commands](#-extended-commands)
- [🎯 Advanced `commandfor` Selectors](#-advanced-commandfor-selectors)
- [🔄 Migration Guide](#-migration-guide)
- [📖 Documentation](#-documentation)
- [⚡ Performance](#-performance)
- [🛠️ Development](#️-development)
- [🎯 Browser Support](#-browser-support)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## Features

-   ✅ **Standards-First:** Built on the W3C/WHATWG `command` attribute and Interest Invokers proposals. Learn future-proof skills, not framework-specific APIs.
-   🧩 **Polyfill & Superset:** Provides the standard APIs in all modern browsers and extends them with a rich set of custom commands.
-   ✍️ **Declarative & Readable:** Describe *what* you want to happen in your HTML, not *how* in JavaScript. Create UIs that are self-documenting.
-   🔗 **Universal Command Chaining:** Chain any command with any other using `data-and-then` attributes or declarative `<and-then>` elements for complex workflows.
-   🎯 **Conditional Execution:** Execute different command sequences based on success/error states with built-in conditional logic.
-   🔄 **Lifecycle Management:** Control command execution with states like `once`, `disabled`, and `completed` for sophisticated interaction patterns.
-   ♿ **Accessible by Design:** Automatically manages `aria-*` attributes and focus behavior, guiding you to build inclusive interfaces.
-   🌐 **Server-Interactive:** Fetch content and update the DOM without a page reload using simple, declarative HTML attributes.
-   💡 **Interest Invokers:** Create hover cards, tooltips, and rich hints that work across mouse, keyboard, and touch with the `interestfor` attribute.
-   🚀 **Zero Dependencies & Tiny:** A featherlight addition to any project, framework-agnostic, and ready to use in seconds.
-   🎨 **View Transitions:** Built-in, automatic support for the [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for beautiful, animated UI changes with zero JS configuration.
-   🔧 **Singleton Architecture:** Optimized internal architecture ensures consistent behavior and prevents duplicate registrations.

## 🌐 Platform Proposals & Standards Alignment

Invokers is built on emerging web platform proposals from the OpenUI Community Group and WHATWG, providing a polyfill today for features that will become native browser APIs tomorrow. This section explains the underlying standards and how Invokers extends them.

### HTML Invoker Commands API

The [Invoker Commands API](https://open-ui.org/components/invokers.explainer/) is a W3C/WHATWG proposal that introduces the `command` and `commandfor` attributes to HTML `<button>` elements. This allows buttons to declaratively trigger actions on other elements without JavaScript.

#### Core Proposal Features
- **`command` attribute**: Specifies the action to perform (e.g., `show-modal`, `toggle-popover`)
- **`commandfor` attribute**: References the target element by ID
- **`CommandEvent`**: Dispatched on the target element when the button is activated
- **Built-in commands**: Native browser behaviors for dialogs and popovers

#### Example from the Specification
```html
<button command="show-modal" commandfor="my-dialog">Open Dialog</button>
<dialog id="my-dialog">Hello World</dialog>
```

#### How Invokers Extends This
Invokers provides a complete polyfill for the Invoker Commands API while adding extensive enhancements:

- **Extended Command Set**: Adds 50+ custom commands (`--toggle`, `--fetch:get`, `--media:play`, etc.) beyond the spec's basic commands
- **Advanced Event Triggers**: Adds `command-on` attribute for any DOM event (click, input, submit, etc.)
- **Expression Engine**: Adds `{{...}}` syntax for dynamic command parameters
- **Command Chaining**: Adds `<and-then>` elements and `data-and-then` attributes for workflow orchestration
- **Conditional Logic**: Adds success/error state handling with `data-after-success`/`data-after-error`
- **Lifecycle States**: Adds `once`, `disabled`, `completed` states for sophisticated interactions

### Interest Invokers (Hover Cards & Tooltips)

The [Interest Invokers](https://open-ui.org/components/interest-invokers.explainer/) proposal introduces the `interestfor` attribute for creating accessible hover cards, tooltips, and preview popovers that work across all input modalities.

#### Core Proposal Features
- **`interestfor` attribute**: Connects interactive elements to hovercard/popover content
- **Multi-modal Support**: Works with mouse hover, keyboard focus, and touchscreen long-press
- **Automatic Accessibility**: Manages ARIA attributes and focus behavior
- **Delay Controls**: CSS properties for customizing show/hide timing
- **Pseudo-classes**: `:interest-source` and `:interest-target` for styling

#### Example from the Specification
```html
<a href="/profile" interestfor="user-card">@username</a>
<div id="user-card" popover="hint">User details...</div>
```

#### How Invokers Extends This
Invokers includes a complete polyfill for Interest Invokers with additional enhancements:

- **Extended Element Support**: Works on all `HTMLElement` types (spec currently limits to specific elements)
- **Touchscreen Context Menu Integration**: Adds "Show Details" item to existing long-press menus
- **Advanced Delay Controls**: Full support for `interest-delay-start`/`interest-delay-end` CSS properties
- **Pseudo-class Support**: Implements `:interest-source` and `:interest-target` pseudo-classes
- **Combined Usage**: Works seamlessly with Invoker Commands on the same elements

### Popover API Integration

Invokers has deep integration with the [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API), automatically handling popover lifecycle and accessibility when using `popover` attributes.

#### Automatic Behaviors
- **Popover Commands**: `toggle-popover`, `show-popover`, `hide-popover` work natively
- **ARIA Management**: Automatic `aria-expanded` and `aria-details` attributes
- **Focus Management**: Proper focus restoration when popovers close
- **Top Layer Integration**: Works with the browser's top layer stacking context

### Standards Compliance & Future-Proofing

#### Current Browser Support
- **Chrome/Edge**: Full Invoker Commands support (v120+)
- **Firefox**: Partial support, actively developing
- **Safari**: Under consideration
- **Polyfill Coverage**: Invokers provides complete fallback for all browsers

#### Standards Timeline
- **Invoker Commands**: Graduated from OpenUI, in WHATWG HTML specification
- **Interest Invokers**: Active proposal, expected to graduate soon
- **Popover API**: Already shipping in major browsers

#### Migration Path
As browsers implement these features natively:
1. Invokers will automatically detect native support
2. Polyfill behaviors will gracefully disable
3. Your HTML markup remains unchanged
4. Enhanced features (chaining, expressions) continue to work

#### Why Invokers vs. Native-Only
While waiting for universal browser support, Invokers provides:
- **Immediate Availability**: Use these features today in any browser
- **Enhanced Functionality**: Command chaining, expressions, and advanced workflows
- **Backward Compatibility**: Works alongside native implementations
- **Progressive Enhancement**: Adds features without breaking existing code

This standards-first approach ensures your code is future-proof while providing powerful enhancements that complement the core platform proposals.

## 🚀 Quick Demo (30 seconds)

See Invokers in action with this copy-paste example:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Add Invokers via CDN (includes all commands) -->
  <script type="module" src="https://esm.sh/invokers/compatible"></script>
</head>
<body>
  <!-- Toggle a navigation menu with zero JavaScript -->
  <button type="button" command="--toggle" commandfor="nav-menu" aria-expanded="false">
    Menu
  </button>
  <nav id="nav-menu" hidden>
    <a href="/home">Home</a>
    <a href="/about">About</a>
    <!-- Dismiss button that hides itself -->
    <button type="button" command="--hide" commandfor="nav-menu">✕</button>
  </nav>

  <!-- Hover cards work automatically with Interest Invokers -->
  <a href="/profile" interestfor="profile-hint">@username</a>
  <div id="profile-hint" popover="hint">
    <strong>John Doe</strong><br>
    Software Developer<br>
    📍 San Francisco
  </div>
</body>
</html>
```

That's it! No event listeners, no DOM queries, no state management. The HTML describes the behavior, and Invokers makes it work.

## 🤔 How Does This Compare?

| Feature               | Vanilla JS | HTMX    | Alpine.js | **Invokers** |
| --------------------- | ---------- | ------- | --------- | ------------ |
| Declarative in HTML   | ❌          | ✅       | ✅         | ✅            |
| Standards-aligned     | ❌          | ❌       | ❌         | ✅            |
| Extended commands     | ❌          | ❌       | ❌         | ✅ (Auto)     |
| Workflow chaining     | ❌          | Limited | Limited   | ✅            |
| Accessible by default | ❌          | ❌       | ❌         | ✅            |
| Future-proof          | ❌          | ❌       | ❌         | ✅            |

<br />

## 🆚 vs HTMX

**Invokers embraces JavaScript** while keeping simple interactions simple. Unlike HTMX's hypermedia-first approach, Invokers focuses on rich client-side interactions with clean separation between HTML structure and JavaScript logic.

### HTMX: Hypermedia with Server State
```html
<!-- HTMX: Server handles everything, HTML becomes the API -->
<div hx-get="/api/todos" hx-trigger="load" hx-target="#todo-list">
  <button hx-post="/api/todos" hx-include="[name='task']" hx-target="#todo-list">
    Add Todo
  </button>
  <input name="task" placeholder="New task...">
</div>
<ul id="todo-list"></ul>
```

### Invokers: Client-Side Interactions with JS Control
```html
<!-- Invokers: HTML declares intent, JavaScript handles logic -->
<div id="todo-app">
  <form command-on="submit.prevent" command="--add-todo">
    <input name="task" placeholder="New task..." command-on="input" command="--update-preview">
    <button type="submit">Add Todo</button>
  </form>
  <div id="preview">Preview will appear here...</div>
  <ul id="todo-list"></ul>
</div>

<script>
  // Clean separation: JavaScript manages data and business logic
  const todos = [];
  const app = document.getElementById('todo-app');

  app.addEventListener('command', (e) => {
    if (e.command === '--add-todo') {
      const task = e.target.elements.task.value;
      if (task.trim()) {
        todos.push({ id: Date.now(), text: task, completed: false });
        renderTodos();
        e.target.reset();
      }
    }
  });

  function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = todos.map(todo => `
      <li>
        <input type="checkbox" ${todo.completed ? 'checked' : ''}
               command="--toggle-todo" data-todo-id="${todo.id}">
        <span ${todo.completed ? 'style="text-decoration: line-through"' : ''}>
          ${todo.text}
        </span>
        <button command="--delete-todo" data-todo-id="${todo.id}">×</button>
      </li>
    `).join('');
  }
</script>
```

**Key Differences:**
- **JavaScript Embrace**: Invokers doesn't hide JavaScript - it enhances it with declarative HTML
- **Client-Side Focus**: Perfect for SPAs and rich interactions without server round-trips
- **Clean Separation**: HTML declares *what* happens, JavaScript handles *how*
- **Not Hypermedia**: No assumption about server APIs or HTML-over-the-wire

## 🆚 vs Alpine.js

**Invokers keeps control flow and data out of the DOM by default**, while Alpine.js embeds JavaScript expressions directly in HTML attributes. Invokers embraces JavaScript but maintains clean separation between structure and logic.

### Alpine.js: Logic in HTML Attributes
```html
<!-- Alpine.js: JavaScript expressions in HTML attributes -->
<div x-data="{
  todos: [],
  newTodo: '',
  addTodo() {
    if (this.newTodo.trim()) {
      this.todos.push({ id: Date.now(), text: this.newTodo, completed: false });
      this.newTodo = '';
    }
  },
  toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) todo.completed = !todo.completed;
  }
}">
  <form @submit.prevent="addTodo()">
    <input x-model="newTodo" placeholder="New task...">
    <button type="submit">Add Todo</button>
  </form>

  <ul>
    <template x-for="todo in todos" :key="todo.id">
      <li>
        <input type="checkbox" :checked="todo.completed"
               @change="toggleTodo(todo.id)">
        <span :class="{ 'line-through': todo.completed }" x-text="todo.text"></span>
        <button @click="todos = todos.filter(t => t.id !== todo.id)">×</button>
      </li>
    </template>
  </ul>
</div>
```

### Invokers: Declarative HTML, Clean JavaScript
```html
<!-- Invokers: HTML declares intent, JavaScript manages state -->
<div id="todo-app">
  <form command-on="submit.prevent" command="--add-todo">
    <input name="task" placeholder="New task...">
    <button type="submit">Add Todo</button>
  </form>

  <ul id="todo-list">
    <!-- Todos rendered here by JavaScript -->
  </ul>
</div>

<script>
  // Clean separation: All logic in JavaScript, not scattered in HTML
  class TodoApp {
    constructor() {
      this.todos = [];
      this.app = document.getElementById('todo-app');
      this.bindEvents();
      this.render();
    }

    bindEvents() {
      this.app.addEventListener('command', (e) => {
        switch (e.command) {
          case '--add-todo':
            this.addTodo(e.target.elements.task.value);
            break;
          case '--toggle-todo':
            this.toggleTodo(parseInt(e.target.dataset.todoId));
            break;
          case '--delete-todo':
            this.deleteTodo(parseInt(e.target.dataset.todoId));
            break;
        }
      });
    }

    addTodo(text) {
      if (text.trim()) {
        this.todos.push({
          id: Date.now(),
          text: text.trim(),
          completed: false
        });
        this.render();
        this.app.querySelector('input[name="task"]').value = '';
      }
    }

    toggleTodo(id) {
      const todo = this.todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
        this.render();
      }
    }

    deleteTodo(id) {
      this.todos = this.todos.filter(t => t.id !== id);
      this.render();
    }

    render() {
      const list = document.getElementById('todo-list');
      list.innerHTML = this.todos.map(todo => `
        <li class="${todo.completed ? 'completed' : ''}">
          <input type="checkbox" ${todo.completed ? 'checked' : ''}
                 command="--toggle-todo" data-todo-id="${todo.id}">
          <span>${todo.text}</span>
          <button command="--delete-todo" data-todo-id="${todo.id}">×</button>
        </li>
      `).join('');
    }
  }

  // Initialize the app
  new TodoApp();
</script>
```

**Key Differences:**
- **DOM Separation**: Control flow and data logic stay in JavaScript, not embedded in HTML
- **JavaScript Embrace**: Full power of JavaScript without hiding it behind HTML attributes
- **Maintainable**: Logic is organized in proper JavaScript classes/functions, not scattered across HTML
- **Simple Things Stay Simple**: Basic interactions use simple HTML attributes, complex logic uses JavaScript
- **Standards-Based**: Uses web platform APIs instead of custom attribute syntax

## 🆚 vs Stimulus

**Invokers reduces JavaScript ceremony** while Stimulus organizes it. Both enhance HTML declaratively, but with fundamentally different philosophies about where behavior should live.

### Stimulus: JavaScript-Organized HTML Enhancement
```html
<!-- Stimulus: Behavior lives in JavaScript classes -->
<div data-controller="slideshow" data-slideshow-index-value="0">
  <div data-slideshow-target="slide" class="current">Slide 1</div>
  <div data-slideshow-target="slide">Slide 2</div>
  <button data-action="slideshow#next">Next</button>
</div>
```

```javascript
// Required JavaScript controller class
export default class extends Controller {
  static targets = ["slide"]
  static values = { index: Number }

  next() {
    this.indexValue = (this.indexValue + 1) % this.slideTargets.length
    this.showSlide(this.indexValue)
  }

  showSlide(index) {
    this.slideTargets.forEach((slide, i) => {
      slide.classList.toggle("current", i === index)
    })
  }
}
```

### Invokers: Declarative HTML-First Interactions
```html
<!-- Invokers: Simple interactions need no JavaScript -->
<div id="slideshow">
  <div class="slide current">Slide 1</div>
  <div class="slide">Slide 2</div>
  <button command="--carousel:nav:next" commandfor="slideshow">Next</button>
</div>
<!-- No JavaScript controller needed -->
```

**Key Differences:**
- **JavaScript Requirements**: Stimulus requires controller classes for all interactions; Invokers keeps common patterns purely declarative
- **Standards Alignment**: Stimulus uses custom `data-*` conventions; Invokers polyfills emerging W3C/WHATWG web standards
- **Code Organization**: Stimulus groups behavior in JavaScript classes; Invokers describes behavior directly in HTML
- **Bundle Size**: Stimulus ~9kB minimal; Invokers 25.8kB core + modular commands as needed
- **Learning Curve**: Stimulus requires JavaScript class knowledge; Invokers uses HTML-like command syntax

**Use Stimulus if** you prefer explicit JavaScript organization and have complex business logic.  
**Use Invokers if** you want to minimize JavaScript for common UI patterns and prefer future-proof web standards.

## 🎯 Why Invokers?

**Write interactive UIs without JavaScript.** Invokers transforms static HTML into dynamic, interactive interfaces using declarative attributes. Perfect for progressive enhancement, component libraries, and reducing JavaScript complexity.

```html
<!-- Toggle a menu -->
<button command="--toggle" commandfor="menu">Menu</button>
<nav id="menu" hidden>...</nav>

<!-- Form with dynamic feedback -->
<form command-on="submit.prevent" command="--fetch:send" commandfor="#result">
  <input name="query" placeholder="Search...">
  <button type="submit">Search</button>
</form>
<div id="result"></div>
```

## 🚀 Modular Architecture

**Choose exactly what you need.** Invokers now features a hyper-modular architecture with four tiers:

- **🏗️ Tier 0**: Core polyfill (25.8 kB) - Standards-compliant foundation
- **⚡ Tier 1**: Essential commands (~30 kB) - Basic UI interactions  
- **🔧 Tier 2**: Specialized packs (25-47 kB each) - Advanced functionality
- **🌟 Tier 3**: Reactive engine (26-42 kB) - Dynamic templating & events

## 📦 Installation & Basic Usage

### Core Installation (25.8 kB)

For developers who want just the standards polyfill:

```bash
npm install invokers
```

```javascript
import 'invokers';
// That's it! Now command/commandfor attributes work
```

```html
<!-- Native/polyfilled commands work immediately -->
<button command="toggle-popover" commandfor="menu">Menu</button>
<div id="menu" popover>Menu content</div>
```

### Essential UI Commands (+30 kB)

Add the most common interactive commands:

```javascript
import invokers from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
import { registerFormCommands } from 'invokers/commands/form';

registerBaseCommands(invokers);
registerFormCommands(invokers);
```

```html
<!-- Now you can use essential commands -->
<button command="--toggle" commandfor="sidebar">Toggle Sidebar</button>
<button command="--class:toggle:dark-mode" commandfor="body">Dark Mode</button>
<button command="--text:set:Hello World!" commandfor="output">Set Text</button>
```

## 🎛️ Command Packs

### Tier 1: Essential Commands

#### Base Commands (`invokers/commands/base`) - 29.2 kB
Essential UI state management without DOM manipulation.

```javascript
import { registerBaseCommands } from 'invokers/commands/base';
registerBaseCommands(invokers);
```

**Commands:** `--toggle`, `--show`, `--hide`, `--class:*`, `--attr:*`

```html
<button command="--toggle" commandfor="menu">Menu</button>
<button command="--class:add:active" commandfor="tab1">Activate Tab</button>
<button command="--attr:set:aria-expanded:true" commandfor="dropdown">Expand</button>
```

#### Form Commands (`invokers/commands/form`) - 30.5 kB
Form interactions and content manipulation.

```javascript
import { registerFormCommands } from 'invokers/commands/form';
registerFormCommands(invokers);
```

**Commands:** `--text:*`, `--value:*`, `--focus`, `--disabled:*`, `--form:*`, `--input:step`

```html
<button command="--text:set:Form submitted!" commandfor="status">Submit</button>
<button command="--value:set:admin@example.com" commandfor="email">Use Admin Email</button>
<button command="--input:step:5" commandfor="quantity">+5</button>
```

### Tier 2: Specialized Commands

#### DOM Manipulation (`invokers/commands/dom`) - 47.1 kB
Dynamic content insertion and templating.

```javascript
import { registerDomCommands } from 'invokers/commands/dom';
registerDomCommands(invokers);
```

**Commands:** `--dom:*`, `--template:*`

```html
<button command="--dom:append" commandfor="list" data-template-id="item-tpl">Add Item</button>
<button command="--template:render:user-card" commandfor="output" 
        data-name="John" data-email="john@example.com">Render User</button>
```

#### Flow Control (`invokers/commands/flow`) - 45.3 kB
Async operations, navigation, and data binding.

```javascript
import { registerFlowCommands } from 'invokers/commands/flow';
registerFlowCommands(invokers);
```

**Commands:** `--fetch:*`, `--navigate:*`, `--emit:*`, `--command:*`, `--bind:*`

```html
<button command="--fetch:get" data-url="/api/users" commandfor="user-list">Load Users</button>
<button command="--navigate:to:/dashboard">Go to Dashboard</button>
<input command-on="input" command="--bind:value" data-bind-to="#output" data-bind-as="text">
```

#### Media & Animation (`invokers/commands/media`) - 27.7 kB  
Rich media controls and interactions.

```javascript
import { registerMediaCommands } from 'invokers/commands/media';
registerMediaCommands(invokers);
```

**Commands:** `--media:*`, `--carousel:*`, `--scroll:*`, `--clipboard:*`

```html
<button command="--media:toggle" commandfor="video">Play/Pause</button>
<button command="--carousel:nav:next" commandfor="slideshow">Next</button>
<button command="--scroll:to" commandfor="section2">Scroll to Section</button>
<button command="--clipboard:copy" commandfor="code">Copy Code</button>
```

#### Browser APIs (`invokers/commands/browser`) - 25.3 kB
Cookie management and browser integration.

```javascript
import { registerBrowserCommands } from 'invokers/commands/browser';
registerBrowserCommands(invokers);
```

**Commands:** `--cookie:*`

```html
<button command="--cookie:set:theme:dark" data-cookie-expires="365">Set Dark Theme</button>
<button command="--cookie:get:theme" commandfor="current-theme">Show Theme</button>
```

#### Data Management (`invokers/commands/data`) - 45.2 kB
Complex data operations and array manipulation.

```javascript
import { registerDataCommands } from 'invokers/commands/data';
registerDataCommands(invokers);
```

**Commands:** `--data:*`, array operations, reactive data binding

```html
<button command="--data:set:userId:123" commandfor="profile">Set User ID</button>
<button command="--data:set:array:push:todos" data-value='{"title":"New Task"}'
        commandfor="app">Add Todo</button>
```

#### Device APIs (`invokers/commands/device`) - 28.1 kB
```javascript
import { registerDeviceCommands } from 'invokers/commands/device';
registerDeviceCommands(invokers);
```

**Commands:** `--device:vibrate`, `--device:share`, `--device:geolocation:get`, `--device:battery:get`, `--device:clipboard:*`, `--device:wake-lock*`

```html
<button command="--device:vibrate:200:100:200">Vibrate</button>
<button command="--device:share:title:Check this out:text:Amazing content:url:https://example.com">Share</button>
<button command="--device:geolocation:get" commandfor="location-display">Get Location</button>
```

#### Accessibility Helpers (`invokers/commands/accessibility`) - 26.8 kB
```javascript
import { registerAccessibilityCommands } from 'invokers/commands/accessibility';
registerAccessibilityCommands(invokers);
```

**Commands:** `--a11y:announce`, `--a11y:focus`, `--a11y:skip-to`, `--a11y:focus-trap`, `--a11y:aria:*`, `--a11y:heading-level`

```html
<button command="--a11y:announce:Item saved successfully">Save</button>
<button command="--a11y:focus" commandfor="search-input">Focus Search</button>
<button command="--a11y:focus-trap:enable" commandfor="modal">Open Modal</button>
```

## 📋 Command Cheatsheet

### Core Commands (Available Now)
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--toggle`             | Show/hide + update ARIA           | `command="--toggle" commandfor="menu"`      |
| `--show`               | Show one, hide siblings           | `command="--show" commandfor="panel-1"`     |
| `--hide`               | Hide element                      | `command="--hide" commandfor="alert"`       |
| `--class:add:name`     | Add CSS class                     | `command="--class:add:active"`              |
| `--class:remove:name`  | Remove CSS class                  | `command="--class:remove:loading"`          |
| `--class:toggle:name`  | Toggle CSS class                  | `command="--class:toggle:dark-mode"`        |
| `--text:set:message`   | Replace text content              | `command="--text:set:Hello World"`          |
| `--text:append:text`   | Append to text content            | `command="--text:append: more text"`        |
| `--text:prepend:text`  | Prepend to text content           | `command="--text:prepend:Prefix "`          |
| `--text:clear`         | Clear text content                | `command="--text:clear"`                    |
| `--attr:set:name:val`  | Set attribute                     | `command="--attr:set:disabled:true"`        |
| `--attr:remove:name`   | Remove attribute                  | `command="--attr:remove:disabled"`          |
| `--attr:toggle:name`   | Toggle attribute presence         | `command="--attr:toggle:hidden"`            |
| `--value:set`          | Set input value                   | `command="--value:set:new-value"`           |
| `--focus`              | Focus element                     | `command="--focus" commandfor="input"`      |
| `--disabled:toggle`    | Toggle disabled state             | `command="--disabled:toggle"`               |
| `--scroll:into-view`   | Scroll element into view          | `command="--scroll:into-view"`              |
| `--scroll:top`         | Scroll to top of element          | `command="--scroll:top"`                    |
| `--scroll:bottom`      | Scroll to bottom of element       | `command="--scroll:bottom"`                 |
| `--scroll:center`      | Scroll to center of element       | `command="--scroll:center"`                 |

### Storage Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--storage:local:set:key:val` | Store in localStorage         | `command="--storage:local:set:user:name"`   |
| `--storage:session:set:key:val` | Store in sessionStorage     | `command="--storage:session:set:temp:data"` |
| `--storage:local:get:key` | Get from localStorage          | `command="--storage:local:get:user"`         |
| `--storage:local:remove:key` | Remove from localStorage     | `command="--storage:local:remove:user"`      |
| `--storage:local:clear` | Clear all localStorage          | `command="--storage:local:clear"`            |
| `--storage:local:keys` | Get all localStorage keys       | `command="--storage:local:keys"`             |
| `--storage:local:has:key` | Check if key exists           | `command="--storage:local:has:user"`         |
| `--storage:local:size` | Get localStorage size in bytes  | `command="--storage:local:size"`             |

### Animation Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--animate:fade-in`    | Fade element in                   | `command="--animate:fade-in"`                |
| `--animate:fade-out`   | Fade element out                  | `command="--animate:fade-out"`               |
| `--animate:slide-up`   | Slide up animation                | `command="--animate:slide-up"`               |
| `--animate:slide-down` | Slide down animation              | `command="--animate:slide-down"`             |
| `--animate:bounce`     | Bounce animation                  | `command="--animate:bounce"`                 |
| `--animate:spin`       | Spin animation                    | `command="--animate:spin"`                   |

### Event Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--emit:event-name`    | Dispatch custom event             | `command="--emit:my-event:detail-data"`     |

### URL Manipulation Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--url:params-get:key` | Get URL parameter                 | `command="--url:params-get:id"`              |
| `--url:params-set:key:val` | Set URL parameter             | `command="--url:params-set:page:2"`          |
| `--url:params-set:key` | Set URL parameter from input      | `command="--url:params-set:query" commandfor="search-input"` |
| `--url:params-delete:key` | Delete URL parameter          | `command="--url:params-delete:id"`           |
| `--url:params-clear`   | Clear all URL parameters         | `command="--url:params-clear"`               |
| `--url:params-all`     | Get all URL parameters as JSON   | `command="--url:params-all"`                 |
| `--url:hash-get`       | Get URL hash                     | `command="--url:hash-get"`                   |
| `--url:hash-set:value` | Set URL hash                     | `command="--url:hash-set:section-1"`         |
| `--url:hash-set`       | Set URL hash from input          | `command="--url:hash-set" commandfor="hash-input"` |
| `--url:hash-clear`     | Clear URL hash                   | `command="--url:hash-clear"`                 |
| `--url:pathname-get`   | Get current pathname             | `command="--url:pathname-get"`               |
| `--url:pathname-set:path` | Set pathname                  | `command="--url:pathname-set:/new-page"`     |
| `--url:pathname-set`   | Set pathname from input          | `command="--url:pathname-set" commandfor="path-input"` |
| `--url:reload`         | Reload the page                  | `command="--url:reload"`                     |
| `--url:replace:url`    | Replace current URL              | `command="--url:replace:/new-page"`          |
| `--url:navigate:url`   | Navigate to URL                  | `command="--url:navigate:/new-page"`         |
| `--url:base`           | Get base URL (protocol+host)     | `command="--url:base"`                       |
| `--url:full`           | Get full current URL             | `command="--url:full"`                       |

**Input/Textarea Integration:** URL commands like `params-set`, `hash-set`, and `pathname-set` can get their values from `<input>` or `<textarea>` elements by using `commandfor` to target the input element. If no value is provided in the command string, the value will be taken from the target element's `value` property.

### History Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--history:push:url`   | Push new history entry            | `command="--history:push:/new-page"`         |
| `--history:replace:url`| Replace current history entry     | `command="--history:replace:/new-page"`      |
| `--history:back`       | Go back in history                | `command="--history:back"`                   |
| `--history:forward`    | Go forward in history             | `command="--history:forward"`                |
| `--history:go:delta`   | Go to specific history position   | `command="--history:go:-2"`                  |
| `--history:state:get`  | Get current history state         | `command="--history:state:get"`              |
| `--history:state:set:data` | Set history state            | `command="--history:state:set:json-data"`    |
| `--history:length`     | Get history length                | `command="--history:length"`                 |
| `--history:clear`      | Clear history state               | `command="--history:clear"`                  |

### Device API Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--device:vibrate:pattern` | Vibrate device               | `command="--device:vibrate:200:100:200"`     |
| `--device:share:url:text:title` | Share content            | `command="--device:share:url:http://ex.com"` |
| `--device:geolocation:get` | Get device location         | `command="--device:geolocation:get"`         |
| `--device:battery:get` | Get battery status              | `command="--device:battery:get"`             |
| `--device:clipboard:read` | Read from clipboard          | `command="--device:clipboard:read"`          |
| `--device:clipboard:write:text` | Write to clipboard     | `command="--device:clipboard:write:hello"`   |
| `--device:wake-lock`   | Request wake lock                | `command="--device:wake-lock"`               |
| `--device:wake-lock:release` | Release wake lock         | `command="--device:wake-lock:release"`       |

### Accessibility Commands
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--a11y:announce:text` | Announce to screen readers        | `command="--a11y:announce:Item saved"`       |
| `--a11y:focus`         | Focus element with announcement   | `command="--a11y:focus" commandfor="input"`  |
| `--a11y:skip-to:id`    | Skip navigation to element        | `command="--a11y:skip-to:main-content"`      |
| `--a11y:focus-trap:enable` | Enable focus trap            | `command="--a11y:focus-trap:enable"`         |
| `--a11y:aria:set:attr:val` | Set ARIA attribute          | `command="--a11y:aria:set:label:Save button"`|
| `--a11y:aria:remove:attr` | Remove ARIA attribute       | `command="--a11y:aria:remove:label"`         |
| `--a11y:heading-level:level` | Set heading level          | `command="--a11y:heading-level:2"`           |

### Extended Commands (Auto-Included)
| Command                | Purpose                           | Example                                      |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `--media:toggle`       | Toggle play/pause                 | `command="--media:toggle" commandfor="video"`|
| `--media:seek:seconds` | Seek media by seconds             | `command="--media:seek:10"`                  |
| `--media:mute`         | Toggle media mute                 | `command="--media:mute"`                     |
| `--carousel:nav:next`  | Navigate carousel                 | `command="--carousel:nav:next"`              |
| `--clipboard:copy`     | Copy text to clipboard            | `command="--clipboard:copy"`                 |
| `--form:reset`         | Reset form                        | `command="--form:reset"`                     |
| `--form:submit`        | Submit form                       | `command="--form:submit"`                    |
| `--input:step:amount`  | Step number input                 | `command="--input:step:1"`                   |
| `--dom:remove`         | Remove element from DOM           | `command="--dom:remove"`                     |
| `--dom:replace[:inner\:outer]` | Replace with template content (inner/outer) | `command="--dom:replace:outer" data-template-id="tpl"` |
| `--dom:swap[:inner\:outer]` | Swap content with template (inner/outer) | `command="--dom:swap:outer" data-template-id="tpl"`|
| `--dom:append[:inner\:outer]` | Append template content (inner/outer) | `command="--dom:append:outer" data-template-id="tpl"` |
| `--dom:prepend[:inner\:outer]` | Prepend template content (inner/outer) | `command="--dom:prepend:outer" data-template-id="tpl"` |
| `--dom:wrap[:tag]`     | Wrap element with template/tag    | `command="--dom:wrap:div" data-wrapper-class="card"` |
| `--dom:unwrap`         | Unwrap element from parent        | `command="--dom:unwrap"`                     |
| `--dom:toggle-empty-class:class` | Toggle class based on children | `command="--dom:toggle-empty-class:empty"`   |
| `--data:set:key:val`   | Set data attribute on element     | `command="--data:set:userId:123"`            |
| `--data:copy:key`      | Copy data attribute between elements | `command="--data:copy:userId" data-copy-from="#src"` |
| `--cookie:set:key:val` | Set browser cookie                | `command="--cookie:set:theme:dark"`          |
| `--cookie:get:key`     | Get cookie value                  | `command="--cookie:get:theme"`               |
| `--cookie:remove:key`  | Remove browser cookie             | `command="--cookie:remove:theme"`            |
| `--command:trigger:event` | Trigger event on element       | `command="--command:trigger:click" commandfor="#btn"` |
| `--command:delay:ms`   | Wait for milliseconds             | `command="--command:delay:2000"`             |
| `--on:interval:ms`     | Execute command at intervals      | `command-on="load" command="--on:interval:5000" data-interval-command="--fetch:get"` |
| `--bind:prop`          | Bind data between elements        | `command="--bind:value" data-bind-to="#output"` |
| `--text:copy`          | Copy text between elements        | `command="--text:copy" data-copy-from="#source"` |
| `--fetch:get`          | Fetch HTML and update element     | `command="--fetch:get" data-url="/api/data"` |
| `--fetch:send`         | Send form data via fetch          | `command="--fetch:send"`                     |
| `--navigate:to:url`    | Navigate using History API        | `command="--navigate:to:/new-page"`          |

### Native/Polyfilled Commands (No -- Prefix)
| Command                | Target Element        | Purpose                                      |
| ---------------------- | -------------------- | -------------------------------------------- |
| `show-modal`           | `<dialog>`           | Open dialog modally                          |
| `close`                | `<dialog>`, `<popover>` | Close dialog/popover                      |
| `request-close`        | `<dialog>`           | Request dialog close (allows cancel)         |
| `toggle-popover`       | `<popover>`          | Toggle popover visibility                    |
| `show-popover`         | `<popover>`          | Show popover                                 |
| `hide-popover`         | `<popover>`          | Hide popover                                 |
| `toggle`               | `<details>`          | Toggle details open/closed                   |
| `open`                 | `<details>`          | Open details element                         |
| `show-picker`          | `<input>`, `<select>`| Show native picker (date, file, etc.)      |
| `play-pause`           | `<video>`, `<audio>` | Toggle media playback                        |
| `play`                 | `<video>`, `<audio>` | Start media playback                         |
| `pause`                | `<video>`, `<audio>` | Pause media playback                         |
| `toggle-muted`         | `<video>`, `<audio>` | Toggle media mute state                      |
| `toggle-fullscreen`    | Any element          | Toggle fullscreen mode                       |
| `request-fullscreen`   | Any element          | Enter fullscreen mode                        |
| `exit-fullscreen`      | Any element          | Exit fullscreen mode                         |
| `copy-text`            | Any element          | Copy element's text to clipboard             |
| `share`                | Any element          | Share element's text or URL                  |
| `step-up`              | `<input type=number>`| Increment number input                       |
| `step-down`            | `<input type=number>`| Decrement number input                       |
| `toggle-openable`      | Openable elements    | Toggle open/close state                      |
| `open-openable`        | Openable elements    | Open element                                 |
| `close-openable`       | Openable elements    | Close element                                |

### Pipeline Commands
| Command                | Purpose                                      | Example                                      |
| ---------------------- | -------------------------------------------- | -------------------------------------------- |
| `--pipeline:execute:id`| Execute template-based command pipeline     | `command="--pipeline:execute:user-flow"`    |

💡 **Tip:** Commands starting with `--` are Invokers extensions. Commands without prefixes are native/future browser commands.

## 🔧 Command Syntax Guide

### Parameter Syntax
Commands use colon (`:`) separated parameters:
```html
<!-- Basic parameter -->
<button command="--text:set:Hello World">Set Text</button>

<!-- Multiple parameters -->
<button command="--storage:local:set:user:John">Save User</button>

<!-- Numeric parameters -->
<button command="--media:seek:30">Skip 30s</button>
```

### Data Attributes for Enhanced Control
Many commands support additional configuration via `data-*` attributes:

#### Fetch Commands
```html
<button type="button"
  command="--fetch:get"
  data-url="/api/data"
  data-loading-template="spinner"
  data-error-template="error-msg"
  data-response-target="#result"
  commandfor="content-area">
  Load Data
</button>
```

#### Animation Commands
```html
<button type="button"
  command="--animate:fade-in"
  data-animate-duration="2s"
  data-animate-delay="500ms"
  data-animate-easing="ease-out"
  data-animate-iterations="3">
  Custom Fade In
</button>
```

#### Storage Commands
```html
<button type="button"
  command="--storage:local:set:settings"
  data-storage-json="true"
  data-storage-expires="3600">
  Save Settings (JSON, expires in 1 hour)
</button>
```

#### Device Commands
```html
<button type="button"
  command="--device:geolocation:get"
  data-geo-high-accuracy="true"
  data-geo-timeout="10000"
  data-geo-max-age="300000">
  Get Location
</button>
```

### Error Handling
Commands include comprehensive error handling with helpful messages:
- **Validation errors** for incorrect parameters
- **Permission errors** for device APIs requiring user consent
- **Network errors** for fetch operations
- **Browser support warnings** for unsupported features

Errors are logged to console with recovery suggestions. Use browser dev tools to see detailed error information.

### Command States
Control command execution behavior with `data-state`:
```html
<!-- Execute once, then disable -->
<button command="--show" commandfor="welcome" data-state="once">Show Welcome</button>

<!-- Currently disabled -->
<button command="--toggle" commandfor="menu" data-state="disabled">Menu</button>

<!-- Completed, won't execute again -->
<button command="--fetch:get" data-url="/api" data-state="completed">Load Data</button>
```

### Tier 3: Advanced Features

#### Event Triggers (`invokers/advanced/events`) - 42.3 kB
Advanced event binding with `command-on` attribute.

```javascript
import { enableEventTriggers } from 'invokers/advanced/events';
enableEventTriggers();
```

```html
<!-- Respond to any DOM event -->
<form command-on="submit.prevent" command="--fetch:send">...</form>
<input command-on="input:debounce:300" command="--text:set:{{this.value}}" commandfor="preview">
```

#### Expression Engine (`invokers/advanced/expressions`) - 26.2 kB
Dynamic templating with `{{expression}}` syntax.

```javascript
import { enableExpressionEngine } from 'invokers/advanced/expressions';
enableExpressionEngine();
```

```html
<!-- Dynamic command parameters -->
<button command="--text:set:Hello {{user.name}}!" commandfor="greeting">Greet</button>
<button command="--class:toggle:{{this.dataset.theme}}-mode" commandfor="body">Theme</button>
```

#### Complete Advanced Features (`invokers/advanced`) - 42.4 kB
Both event triggers and expressions in one import.

```javascript
import { enableAdvancedEvents } from 'invokers/advanced';
enableAdvancedEvents();
```

```html
<!-- Fully dynamic interactions -->
<form command-on="submit.prevent" 
      command="--text:set:Submitted {{this.elements.name.value}}" 
      commandfor="status">
  <input name="name" placeholder="Your name">
  <button type="submit">Submit</button>
</form>
```

## 🎯 Comprehensive Demo

For a deeper dive into Invokers' capabilities, check out our [comprehensive demo](examples/comprehensive-demo.html) that showcases:

- **Advanced Event Handling** with `command-on` and dynamic interpolation
- **Async Operations** with promises, error handling, and loading states
- **Component Communication** through data binding and custom events
- **Library Integration** with Chart.js and external APIs
- **Advanced Templating** with loops, conditionals, and data injection
- **Programmatic Triggering** using the JavaScript API
- **Error Handling & Debugging** with detailed logging and recovery
- **Command Queuing** for sequential execution

The demo uses demo-specific commands that are separate from the core library. To use them in your own projects:

```javascript
import 'invokers'; // Core library
import { registerDemoCommands } from 'invokers/demo-commands';

registerDemoCommands(); // Only for demos/testing
```

Open `examples/comprehensive-demo.html` in your browser to explore all features interactively.

## 🏃‍♂️ Quick Start Examples

### Simple Tab System
```javascript
import invokers from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
registerBaseCommands(invokers);
```

```html
<div role="tablist">
  <button command="--show" commandfor="tab1" role="tab">Tab 1</button>
  <button command="--show" commandfor="tab2" role="tab">Tab 2</button>
</div>
<div id="tab1" role="tabpanel">Content 1</div>
<div id="tab2" role="tabpanel" hidden>Content 2</div>
```

### Dynamic Form with Validation
```javascript
import invokers from 'invokers';
import { registerFormCommands } from 'invokers/commands/form';
import { registerFlowCommands } from 'invokers/commands/flow';
import { enableAdvancedEvents } from 'invokers/advanced';

registerFormCommands(invokers);
registerFlowCommands(invokers);
enableAdvancedEvents();
```

```html
<form command-on="submit.prevent" command="--fetch:send" data-url="/api/contact">
  <input name="email" command-on="blur" 
         command="--text:set:Email: {{this.value}}" 
         commandfor="email-preview" required>
  <div id="email-preview"></div>
  <button type="submit">Submit</button>
</form>
```

### Rich Media Experience  
```javascript
import invokers from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
import { registerMediaCommands } from 'invokers/commands/media';

registerBaseCommands(invokers);
registerMediaCommands(invokers);
```

```html
<video id="player" src="video.mp4"></video>
<div class="controls">
  <button command="--media:toggle" commandfor="player" 
          data-play-text="Pause" data-pause-text="Play">Play</button>
  <button command="--media:seek:-10" commandfor="player">-10s</button>
  <button command="--media:seek:10" commandfor="player">+10s</button>
  <button command="--media:mute" commandfor="player">Mute</button>
</div>
```

## 📚 Progressive Learning Guide

Learn Invokers step by step, from basic interactions to complex workflows.

### 📚 Level 1: Basic Interactions

Start with these essential patterns you'll use every day.

#### Interest Invokers (Hover Cards & Tooltips)

Create accessible hover cards and tooltips that work across all input methods:

```html
<!-- Simple tooltip on hover/focus -->
<button type="button" interestfor="help-tip">Help</button>
<div id="help-tip" popover="hint">Click to toggle the sidebar</div>

<!-- Rich hover card with interactive content -->
<a href="/users/johndoe" interestfor="user-card">@johndoe</a>
<div id="user-card" popover="auto">
  <img src="/avatars/johndoe.jpg" alt="John's avatar">
  <h3>John Doe</h3>
  <p>Full-stack developer</p>
  <button type="button">Follow</button>
</div>

<!-- Link preview -->
<a href="https://example.com/article" interestfor="article-preview">
  Read the full article
</a>
<div id="article-preview" popover="hint">Quick reference guide...</div>

<!-- Adjustable delay timing -->
<style>
  .slow-hint { --interest-delay: 1s 500ms; }
</style>
<button type="button" interestfor="slow-tip" class="slow-hint">Slow hint</button>
<div id="slow-tip" popover="hint">Takes longer to appear</div>
```

#### Native Commands (Work in All Browsers)

```html
<!-- Open/close modal dialogs -->
<button type="button" command="show-modal" commandfor="my-dialog">
  Open Dialog
</button>
<dialog id="my-dialog">
  <p>Hello from a modal dialog!</p>
  <button type="button" command="close" commandfor="my-dialog">Close</button>
</dialog>
```

#### Future Native Commands (Polyfilled)

```html
<!-- Details/summary expansion -->
<button type="button" command="toggle" commandfor="faq-1">Toggle FAQ</button>
<details id="faq-1">
  <summary>What is Invokers?</summary>
  <p>Invokers is a library for declarative HTML interactions...</p>
</details>

<!-- Media controls -->
<button type="button" command="play-pause" commandfor="my-video">⏯️</button>
<button type="button" command="toggle-muted" commandfor="my-video">🔊</button>
<button type="button" command="toggle-fullscreen" commandfor="my-video">⛶</button>
<video id="my-video" src="video.mp4"></video>

<!-- File picker and number inputs -->
<button type="button" command="show-picker" commandfor="file-input">Browse Files</button>
<input type="file" id="file-input" hidden>

<button type="button" command="step-up" commandfor="quantity">+</button>
<input type="number" id="quantity" value="1" min="1" max="10">
<button type="button" command="step-down" commandfor="quantity">-</button>

<!-- Clipboard and sharing -->
<button type="button" command="copy-text" commandfor="code-snippet">Copy</button>
<code id="code-snippet">npm install invokers</code>

<button type="button" command="share" commandfor="article-url">Share</button>
<span id="article-url">https://example.com/great-article</span>
```

#### Toggle Menus & Accordions

```html
<!-- Toggle navigation menu -->
<button type="button" command="--toggle" commandfor="nav-menu" aria-expanded="false">
  Menu
</button>
<nav id="nav-menu" hidden>
  <a href="/home">Home</a>
  <a href="/about">About</a>
</nav>
```

#### Show/Hide Content

```html
<!-- Dismissible alerts -->
<div id="alert-message" class="alert">
  <p>Form saved successfully!</p>
  <button type="button" command="--hide" commandfor="alert-message">×</button>
</div>
```

### 📚 Level 2: Dynamic Content

Now add interactivity with text, classes, and attributes.

#### Tab Panels (Accessible by Default)

```html
<div role="tablist">
  <button type="button" command="--show" commandfor="panel-1" aria-expanded="true">
    Home
  </button>
  <button type="button" command="--show" commandfor="panel-2" aria-expanded="false">
    About
  </button>
</div>
<div>
  <div id="panel-1" role="tabpanel">Welcome to our homepage!</div>
  <div id="panel-2" role="tabpanel" hidden>Learn more about us.</div>
</div>
```

#### Dynamic Text & Styling

```html
<!-- Change text and add visual feedback -->
<button type="button"
  command="--text:set:✅ Saved!"
  commandfor="status"
  data-and-then="--class:add:success">
  Save Document
</button>
<div id="status" class="status-message">Ready to save</div>

<!-- Toggle dark mode -->
<button type="button"
  command="--class:toggle:dark-theme"
  commandfor="body"
  data-and-then="--text:set:Theme toggled!">
  🌙 Toggle Theme
</button>

<!-- Animate elements with custom timing -->
<button type="button"
  command="--animate:bounce"
  data-animate-duration="1s"
  data-animate-delay="200ms"
  data-animate-iterations="2">
  Celebrate!
</button>

<!-- Store user preferences -->
<button type="button"
  command="--storage:local:set:theme:dark"
  data-storage-expires="3600"
  data-and-then="--text:set:Preference saved!">
  Save Dark Theme
</button>

<!-- Focus management -->
<button type="button" command="--a11y:focus" commandfor="search-input">Focus Search</button>
<input type="text" id="search-input" placeholder="Search...">

<!-- URL manipulation -->
<button type="button" command="--url:params:set:page:2">Go to Page 2</button>
<button type="button" command="--url:hash:set:section-about">Jump to About</button>
```

#### Server Content

```html
<!-- Fetch and display server content -->
<button type="button"
  command="--fetch:get"
  data-url="/api/latest-posts"
  commandfor="posts-container"
  data-loading-template="spinner">
  Load Latest Posts
</button>
<div id="posts-container">Posts will appear here...</div>

<template id="spinner">
  <p>Loading posts...</p>
</template>
```

#### Form Submission

```html
<!-- Submit form data and update content dynamically -->
<form id="contact-form" action="/api/contact" method="post">
  <input type="text" name="name" required>
  <button type="button"
    command="--fetch:send"
    commandfor="contact-form"
    data-response-target="#result-area"
    data-loading-template="spinner">
    Submit Form
  </button>
</form>
<div id="result-area">Response will appear here...</div>

<template id="spinner">
  <div>Loading...</div>
</template>
```

The `data-response-target` attribute specifies where to display the server response, while `data-loading-template` shows a loading indicator during submission.

### 📚 Level 3: Advanced Workflows

Chain multiple commands together for complex interactions.

#### Simple Command Chaining

```html
<!-- Chain two commands: change text, then add a class -->
<button type="button"
  command="--text:set:Processing complete!"
  commandfor="status"
  data-and-then="--class:add:success">
  Complete Process
</button>
<div id="status">Ready to process</div>
```

#### Conditional Workflows

```html
<!-- Different commands based on success/failure -->
<button type="button"
  command="--fetch:get"
  data-url="/api/user-data"
  commandfor="profile"
  data-after-success="--class:add:loaded,--text:set:Profile loaded!"
  data-after-error="--class:add:error,--text:set:Failed to load profile"
  data-after-complete="--attr:set:aria-busy:false">
  Load Profile
</button>
<div id="profile" aria-busy="false">Profile will load here...</div>
```

#### Complex Workflows with `<and-then>` Elements

```html
<!-- Multi-step workflow with branching logic -->
<button type="button" command="--text:set:Starting..." commandfor="workflow">
  Start Complex Workflow

  <!-- Success path -->
  <and-then command="--class:add:processing" commandfor="workflow" data-condition="success" data-delay="500">
    <and-then command="--text:append: → Step 2 complete" commandfor="workflow" data-delay="1000">
      <and-then command="--class:remove:processing" commandfor="workflow">
        <and-then command="--class:add:success" commandfor="workflow">
        </and-then>
      </and-then>
    </and-then>
  </and-then>
</button>
<div id="workflow">Ready to start</div>
```

#### Device Integration Workflows

```html
<!-- Location-based features -->
<button type="button"
  command="--device:geolocation:get"
  data-and-then="--storage:local:set:last-location"
  data-after-success="--text:set:Location saved!"
  data-after-error="--text:set:Location access denied">
  Save My Location
</button>

<!-- Vibration feedback -->
<button type="button"
  command="--device:vibrate:100:200:100"
  data-and-then="--text:set:Vibration sent!">
  Send Haptic Feedback
</button>

<!-- Battery-aware features -->
<button type="button" command="--device:battery:get" commandfor="battery-status">
  Check Battery
</button>
<div id="battery-status">Battery info will appear here</div>
```

#### Advanced URL and History Management

```html
<!-- URL parameter manipulation -->
<button type="button" command="--url:params:set:filter:active">Show Active Items</button>
<button type="button" command="--url:params:delete:filter">Clear Filter</button>

<!-- History navigation -->
<button type="button" command="--history:push:/settings">Go to Settings</button>
<button type="button" command="--history:back">Go Back</button>

<!-- Hash-based navigation -->
<button type="button" command="--url:hash:set:contact">Jump to Contact</button>
```

#### Accessibility-Enhanced Interactions

```html
<!-- Screen reader announcements -->
<button type="button"
  command="--fetch:get"
  data-url="/api/data"
  data-after-success="--a11y:announce:Data loaded successfully"
  data-after-error="--a11y:announce:Failed to load data">
  Load Data
</button>

<!-- Focus management -->
<button type="button" command="--a11y:focus-trap:enable" commandfor="modal">Open Modal</button>
<div id="modal" role="dialog">
  <p>Modal content</p>
  <button type="button" command="--a11y:focus-trap:disable">Close</button>
</div>
```

## 🔌 Plugin System

Invokers features a powerful plugin system that allows you to extend functionality through middleware hooks. Plugins can intercept command execution at various lifecycle points, enabling features like analytics, security checks, UI enhancements, and more.

### Plugin Architecture

Plugins are objects that implement the `InvokerPlugin` interface and can register middleware functions for specific hook points in the command execution lifecycle:

```typescript
interface InvokerPlugin {
  name: string;
  version?: string;
  description?: string;

  onRegister?(manager: InvokerManager): void;
  onUnregister?(manager: InvokerManager): void;

  middleware?: Partial<Record<HookPoint, MiddlewareFunction>>;
}

type MiddlewareFunction = (context: CommandContext & { result?: CommandExecutionResult }, hookPoint: HookPoint) => void | Promise<void>;
```

### Hook Points

Plugins can hook into these command execution lifecycle points:

- `HookPoint.BEFORE_COMMAND` - Before any command execution begins
- `HookPoint.AFTER_COMMAND` - After command execution completes (success or error)
- `HookPoint.BEFORE_VALIDATION` - Before command parameter validation
- `HookPoint.AFTER_VALIDATION` - After validation passes
- `HookPoint.ON_SUCCESS` - When a command executes successfully
- `HookPoint.ON_ERROR` - When a command fails
- `HookPoint.ON_COMPLETE` - Always executes after command completion

### Creating a Plugin

```javascript
// Analytics plugin example
const analyticsPlugin = {
  name: 'analytics',
  version: '1.0.0',
  description: 'Tracks command usage',

  middleware: {
    [window.Invoker.HookPoint.BEFORE_COMMAND]: (context) => {
      console.log(`Command executed: ${context.fullCommand}`);
      // Track analytics here
    },
    [window.Invoker.HookPoint.ON_ERROR]: (context) => {
      console.error(`Command failed: ${context.fullCommand}`, context.result.error);
      // Report errors here
    }
  }
};

// Register the plugin
window.Invoker.instance.registerPlugin(analyticsPlugin);

// Later, unregister if needed
window.Invoker.instance.unregisterPlugin('analytics');
```

### Security Plugin Example

```javascript
const securityPlugin = {
  name: 'security',
  middleware: {
    [window.Invoker.HookPoint.BEFORE_COMMAND]: (context) => {
      // Rate limiting
      const now = Date.now();
      const lastExecution = context.invoker?.dataset.lastExecution || 0;

      if (now - lastExecution < 1000) {
        throw new Error('Rate limit exceeded');
      }

      context.invoker.dataset.lastExecution = now;

      // Security checks
      if (context.fullCommand.includes('dangerous')) {
        throw new Error('Security policy violation');
      }
    }
  }
};
```

### UI Enhancement Plugin Example

```javascript
const uiPlugin = {
  name: 'ui-enhancement',
  middleware: {
    [window.Invoker.HookPoint.BEFORE_COMMAND]: (context) => {
      // Add loading state
      if (context.invoker) {
        context.invoker.disabled = true;
        context.invoker.dataset.originalText = context.invoker.textContent;
        context.invoker.textContent = 'Loading...';
      }
    },
    [window.Invoker.HookPoint.ON_COMPLETE]: (context) => {
      // Remove loading state
      if (context.invoker) {
        context.invoker.disabled = false;
        context.invoker.textContent = context.invoker.dataset.originalText;
      }
    }
  }
};
```

### Global Middleware

You can also register middleware globally without creating a full plugin:

```javascript
// Register global middleware
window.Invoker.instance.registerMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, (context) => {
  console.log('All commands pass through here:', context.fullCommand);
});

// Unregister specific middleware
window.Invoker.instance.unregisterMiddleware(window.Invoker.HookPoint.BEFORE_COMMAND, middlewareFunction);
```

### Plugin Lifecycle

Plugins can implement `onRegister` and `onUnregister` methods for setup and cleanup:

```javascript
const myPlugin = {
  name: 'my-plugin',
  onRegister(manager) {
    console.log('Plugin registered, setting up...');
    // Initialize plugin resources
  },
  onUnregister(manager) {
    console.log('Plugin unregistered, cleaning up...');
    // Clean up resources
  }
};

// Register the plugin
window.Invoker.instance.registerPlugin(myPlugin);
```

## 🧰 Extended Commands

Invokers includes a comprehensive set of extended commands that are automatically available when you import the library. These provide advanced features for real-world applications:

### Automatically Included Commands:
- **Server Communication**: `--fetch:get`, `--fetch:send` - Load and send data to servers
- **Media Controls**: `--media:toggle`, `--media:seek`, `--media:mute` - Full media player controls
- **DOM Manipulation**: `--dom:remove`, `--dom:replace`, `--dom:swap`, `--dom:append`, `--dom:prepend` - Dynamic content updates
- **Form Handling**: `--form:reset`, `--form:submit` - Form interactions
- **Input Controls**: `--input:step`, `--value:set` - Control form input values and stepping
- **Focus Management**: `--focus` - Programmatically focus elements
- **State Management**: `--disabled:toggle` - Enable/disable form elements
- **Scroll Controls**: `--scroll:into-view`, `--scroll:to` - Smooth scrolling to elements
- **Storage**: `--storage:local:set`, `--storage:session:get` - Persist data in browser storage
- **Animation**: `--animate:fade-in`, `--animate:slide-up` - CSS animations and transitions
- **Event Emitting**: `--emit:custom-event` - Dispatch custom events
- **URL Manipulation**: `--url:params:get`, `--url:hash:set` - Work with URLs and browser history
- **History Navigation**: `--history:push`, `--history:back` - Browser history management
- **Device APIs**: `--device:vibrate`, `--device:geolocation:get` - Access device features
- **Accessibility**: `--a11y:announce`, `--a11y:focus-trap` - Screen reader and focus management
- **Clipboard**: `--clipboard:copy` - Copy text to clipboard
- **Navigation**: `--navigate:to` - Programmatic navigation
- **Text Operations**: `--text:copy` - Copy element text content
- **Carousel Controls**: `--carousel:nav` - Image carousel navigation

### Selective Command Registration (Advanced)

For applications that only need specific commands, you can selectively register them:

```javascript
import { registerAll } from 'https://esm.sh/invokers/commands';

// Register only media and fetch commands
registerAll(['--media:toggle', '--media:seek', '--fetch:get']);
```

This can help reduce bundle size in applications with strict performance requirements.

## 📚 Detailed Command Reference

### Storage Commands

The `--storage` commands provide comprehensive localStorage and sessionStorage management with advanced features like JSON support, expiration, and metadata.

#### Basic Storage Operations

```html
<!-- Store simple values -->
<button type="button" command="--storage:local:set:username:john">Save Username</button>
<button type="button" command="--storage:session:set:temp-data:123">Save Temp Data</button>

<!-- Retrieve values -->
<button type="button" command="--storage:local:get:username" commandfor="username-display">Load Username</button>
<div id="username-display">Username will appear here</div>

<!-- Remove specific keys -->
<button type="button" command="--storage:local:remove:username">Clear Username</button>

<!-- Clear all storage -->
<button type="button" command="--storage:local:clear">Clear All Local Data</button>
```

#### Advanced Features

```html
<!-- JSON storage with automatic serialization -->
<button type="button"
  command="--storage:local:set:user-settings"
  data-storage-json="true">
  Save Settings Object
</button>

<!-- Expiring data (in seconds) -->
<button type="button"
  command="--storage:local:set:session-token:abc123"
  data-storage-expires="3600">
  Save Token (expires in 1 hour)
</button>

<!-- Check if key exists -->
<button type="button" command="--storage:local:has:username" commandfor="status">Check Username</button>

<!-- Get storage size -->
<button type="button" command="--storage:local:size" commandfor="size-display">Show Storage Size</button>

<!-- List all keys -->
<button type="button" command="--storage:local:keys" commandfor="keys-list">List All Keys</button>
```

#### JavaScript Integration

```javascript
// Programmatic storage access
const settings = { theme: 'dark', lang: 'en' };
localStorage.setItem('user-prefs', JSON.stringify(settings));

// Then retrieve in HTML
<button command="--storage:local:get:user-prefs" commandfor="prefs-display">Load Preferences</button>
```

### Animation Commands

The `--animate` command provides CSS-based animations with customizable timing and effects.

#### Basic Animations

```html
<button type="button" command="--animate:fade-in">Fade In</button>
<button type="button" command="--animate:fade-out">Fade Out</button>
<button type="button" command="--animate:slide-up">Slide Up</button>
<button type="button" command="--animate:slide-down">Slide Down</button>
<button type="button" command="--animate:bounce">Bounce</button>
<button type="button" command="--animate:spin">Spin</button>
```

#### Custom Animation Properties

```html
<button type="button"
  command="--animate:fade-in"
  data-animate-duration="2s"
  data-animate-delay="500ms"
  data-animate-easing="ease-out"
  data-animate-iterations="3">
  Custom Fade In
</button>
```

#### Available Animations
- `fade-in`, `fade-out`
- `slide-up`, `slide-down`, `slide-left`, `slide-right`
- `bounce`, `shake`, `pulse`, `flip`
- `rotate-in`, `zoom-in`, `zoom-out`
- `spin`, `wobble`, `jello`, `heartbeat`, `rubber-band`

### Event Commands

The `--emit` command dispatches custom events with optional detail data and configurable event properties.

#### Basic Event Dispatch

```html
<!-- Dispatch simple custom event -->
<button command="--emit:my-event">Trigger Event</button>

<!-- Event with detail data -->
<button command="--emit:user-action:login">User Logged In</button>
<button command="--emit:data-updated:{\"id\":123,\"status\":\"saved\"}">Data Saved</button>
```

#### Event Configuration

```html
<!-- Configurable event properties -->
<button type="button"
  command="--emit:modal-opened:settings"
  data-emit-bubbles="true"
  data-emit-cancelable="true"
  data-emit-composed="true">
  Open Settings Modal
</button>
```

#### JavaScript Event Handling

```javascript
// Listen for custom events
document.addEventListener('my-event', (event) => {
  console.log('Event triggered!', event.detail);
});

// Handle emitted events
document.addEventListener('user-action', (event) => {
  console.log('Action:', event.detail); // "login"
});

document.addEventListener('data-updated', (event) => {
  console.log('Data:', event.detail); // {id: 123, status: "saved"}
});
```

#### Built-in Event Types

The command automatically handles built-in DOM events with appropriate event classes:

```html
<!-- Dispatches MouseEvent -->
<button command="--emit:click">Simulate Click</button>

<!-- Dispatches KeyboardEvent -->
<button command="--emit:keydown:Enter">Simulate Enter Key</button>

<!-- Dispatches InputEvent -->
<button command="--emit:input:new-value">Simulate Input</button>
```

### Pipeline Commands

The `--pipeline` command executes complex, template-based command sequences with conditional logic and error handling.

#### Basic Pipeline Execution

```html
<button type="button" command="--pipeline:execute:user-onboarding">
  Start User Onboarding
</button>

<template id="user-onboarding" data-pipeline="true">
  <pipeline-step command="--text:set:Welcome!" target="status" />
  <pipeline-step command="--class:add:welcome" target="app" delay="500" />
  <pipeline-step command="--show" target="tutorial-step-1" delay="1000" />
</template>
```

#### Conditional Pipeline Steps

```html
<template id="data-processing" data-pipeline="true">
  <!-- Always execute -->
  <pipeline-step command="--text:set:Processing..." target="status" />

  <!-- Only on success -->
  <pipeline-step command="--fetch:get" target="data-container"
                 data-url="/api/data" condition="success" />
  <pipeline-step command="--class:add:loaded" target="data-container"
                 condition="success" />

  <!-- Only on error -->
  <pipeline-step command="--text:set:Failed to load data" target="status"
                 condition="error" />
  <pipeline-step command="--class:add:error" target="status"
                 condition="error" />
</template>
```

#### Advanced Pipeline Features

```html
<template id="complex-workflow" data-pipeline="true">
  <!-- One-time initialization -->
  <pipeline-step command="--storage:local:set:initialized:true"
                 once="true" />

  <!-- Delayed execution -->
  <pipeline-step command="--animate:fade-in" target="content"
                 delay="2000" />

  <!-- Data passing -->
  <pipeline-step command="--fetch:get" target="user-data"
                 data-url="/api/user" data-response-target="#profile" />

  <!-- Cleanup (always runs) -->
  <pipeline-step command="--attr:set:aria-busy:false" target="app"
                 condition="always" />
</template>
```

#### Pipeline Step Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `command` | Command to execute | `command="--text:set:Done"` |
| `target` | Target element ID | `target="status"` |
| `condition` | When to execute: `success`, `error`, `always` | `condition="success"` |
| `delay` | Delay in milliseconds | `delay="1000"` |
| `once` | Execute only once, then remove from template | `once="true"` |
| `data-*` | Pass data attributes to command | `data-url="/api/data"` |

#### Error Handling in Pipelines

Pipelines automatically handle errors and can continue with error-specific steps:

```html
<template id="robust-operation" data-pipeline="true">
  <pipeline-step command="--fetch:get" target="content" data-url="/api/data" />

  <!-- Success path -->
  <pipeline-step command="--class:add:success" target="content"
                 condition="success" />

  <!-- Error recovery -->
  <pipeline-step command="--text:set:Using cached data" target="content"
                 condition="error" />
  <pipeline-step command="--storage:local:get:cached-data" target="content"
                 condition="error" />
</template>
```

### Media Commands

Control HTML5 video and audio elements with advanced playback features.

#### Basic Media Controls

```html
<!-- Toggle play/pause with visual feedback -->
<button type="button"
  command="--media:toggle"
  commandfor="my-video"
  data-play-text="Pause"
  data-pause-text="Play">
  Play
</button>

<video id="my-video" src="movie.mp4"></video>
```

#### Advanced Media Controls

```html
<!-- Seek forward/backward -->
<button command="--media:seek:10" commandfor="my-video">+10s</button>
<button command="--media:seek:-5" commandfor="my-video">-5s</button>

<!-- Mute/unmute -->
<button command="--media:mute" commandfor="my-video">Toggle Mute</button>
```

### Carousel Commands

Navigate image or content carousels with smooth transitions.

```html
<div id="image-carousel">
  <div>Image 1</div>
  <div hidden>Image 2</div>
  <div hidden>Image 3</div>
</div>

<button command="--carousel:nav:next" commandfor="image-carousel">Next</button>
<button command="--carousel:nav:prev" commandfor="image-carousel">Previous</button>
```

### DOM Manipulation Commands

Dynamically update page content with template-based operations.

#### Template-Based Content

```html
<!-- Templates for content -->
<template id="new-item-template">
  <div class="item">New Item Content</div>
</template>

<template id="loading-template">
  <div class="loading">Loading...</div>
</template>
```

#### DOM Operations

```html
<!-- Replace element content -->
<button command="--dom:replace" commandfor="old-content" data-template-id="new-item-template">
  Replace Content
</button>

<!-- Swap inner content (default behavior) -->
<button command="--dom:swap" commandfor="container" data-template-id="new-item-template">
  Swap Content
</button>

<!-- Swap inner content explicitly -->
<button command="--dom:swap:inner" commandfor="container" data-template-id="new-item-template">
  Swap Inner Content
</button>

<!-- Swap entire element (outer replacement) -->
<button command="--dom:swap:outer" commandfor="container" data-template-id="new-item-template">
  Replace Element
</button>

<!-- Add content -->
<button command="--dom:append" commandfor="list" data-template-id="new-item-template">
  Add Item
</button>

<button command="--dom:prepend" commandfor="list" data-template-id="new-item-template">
  Add to Top
</button>

<!-- Remove element -->
<button command="--dom:remove" commandfor="temp-element">Remove</button>
```

### Form Commands

Enhanced form interaction and validation.

```html
<form id="my-form">
  <input type="text" name="username" required>
  <input type="email" name="email" required>
</form>

<!-- Form actions -->
<button command="--form:reset" commandfor="my-form">Reset Form</button>
<button command="--form:submit" commandfor="my-form">Submit Form</button>
```

### Input Commands

Control number inputs and form values.

```html
<!-- Number input stepping -->
<button command="--input:step:1" commandfor="quantity">+</button>
<input type="number" id="quantity" value="1" min="1" max="10">
<button command="--input:step:-1" commandfor="quantity">-</button>

<!-- Set input values -->
<button command="--value:set:new-value" commandfor="text-input">Set Value</button>
```

### Text Commands

Advanced text manipulation and copying.

```html
<!-- Text operations -->
<button command="--text:set:Hello World" commandfor="message">Set Text</button>
<button command="--text:append: more text" commandfor="message">Append Text</button>
<button command="--text:prepend:Prefix: " commandfor="message">Prepend Text</button>
<button command="--text:clear" commandfor="message">Clear Text</button>

<!-- Copy text between elements -->
<div id="source">Text to copy</div>
<button command="--text:copy" data-copy-from="#source" commandfor="destination">Copy Text</button>
<div id="destination"></div>
```

### Clipboard Commands

Copy text content to clipboard with feedback.

```html
<code id="code-snippet">npm install invokers</code>

<button type="button" command="--clipboard:copy" commandfor="code-snippet">Copy</button>
```

## The Vision: A More Declarative Web

For too long, creating interactive UIs has meant a disconnect between structure (HTML) and behavior (JavaScript). This leads to scattered code, accessibility oversights, and boilerplate that slows down development. The web platform is evolving to fix this.

**Invokers embraces this evolution, letting you build complex interactions with the simplicity and elegance of plain HTML.**

### Before: The Manual JavaScript Way

```html
<!-- The button is just a button. Its purpose is hidden in a script file. -->
<button id="menu-toggle">Menu</button>
<nav id="main-menu" hidden>...</nav>

<script>
// Somewhere else in your project...
document.getElementById('menu-toggle').addEventListener('click', (e) => {
  const menu = document.getElementById('main-menu');
  menu.hidden = !menu.hidden;
  // We have to remember to manually sync accessibility state.
  e.target.setAttribute('aria-expanded', !menu.hidden);
});
</script>
```

### After: The Invokers Way (The Future Standard)

With Invokers, your HTML becomes the single source of truth. It's clean, readable, and requires no custom JavaScript for this common pattern.

```html
<!-- The button's purpose is clear just by reading the markup. -->
<button type="button" command="--toggle" commandfor="main-menu" aria-expanded="false">
  Menu
</button>
<nav id="main-menu" hidden>...</nav>

<!-- Add Invokers to your page, and you're done. -->
<script type="module" src="https://esm.sh/invokers"></script>
```

<br />

## ⚡ Advanced Events (Opt-In)

Invokers includes powerful advanced event features that transform it from a click-driven library into a fully reactive framework. These features are **opt-in** to keep the core library lightweight.

### Enabling Advanced Events

To use advanced event features, import and call `enableAdvancedEvents()` once in your application:

```javascript
// In your main application script (e.g., app.js)
import 'invokers'; // Load the core library first
import { enableAdvancedEvents } from 'invokers/advanced';

// Call this function once to activate all new event features
enableAdvancedEvents();
```

### New Attributes: `command-on` and `data-on-event`

Once enabled, you gain access to two new declarative attributes for triggering commands from any DOM event.

#### `command-on`: Trigger Commands from Any Event

Allows any element to execute a command in response to *any* DOM event, not just button clicks.

```html
<!-- Self-submitting form (no submit button needed) -->
<form id="contact-form"
      command-on="submit"
      command="--fetch:send"
      commandfor="contact-form"
      data-response-target="#result">
  <input name="email" type="email">
</form>

<!-- Keyboard shortcuts -->
<body command-on="keydown.window.ctrl.k.prevent"
      command="show-modal"
      commandfor="search-dialog">
  ...
</body>
```

#### `data-on-event`: Listen for Custom Events

Allows elements to listen for custom events dispatched from anywhere on the page.

```html
<!-- Button emits a custom event -->
<button command="--emit:notify:{\"message\":\"Profile Saved!\",\"type\":\"success\"}">
  Save Profile
</button>

<!-- Separate toast listens for it -->
<div id="toast-notification"
     data-on-event="notify"
     command="--show">
  Notification will appear here!
</div>
```

### Dynamic Data with `{{...}}` Syntax

Inject dynamic data from events directly into command attributes using `{{...}}` placeholders. Supports full JavaScript-like expressions for complex data manipulation.

```html
<!-- Live search input -->
<input type="search"
       name="query"
       placeholder="Search articles..."
       command-on="input"
       command="--fetch:get"
       commandfor="#search-results"
       data-url="/api/search?q={{ this.value }}">

<div id="search-results"></div>
```

#### Expression Syntax

The `{{...}}` syntax supports a safe subset of JavaScript expressions:

**Arithmetic & Logic:**
```html
<!-- Calculate values -->
<button command="--media:seek:{{ this.currentTime + 30 }}">Skip 30s</button>

<!-- Conditional logic -->
<div command-on="click"
     command="{{ this.classList.contains('active') ? '--hide' : '--show' }}"
     commandfor="panel">
  Toggle Panel
</div>
```

**Property Access:**
```html
<!-- Deep property access -->
<span>{{ event.detail.user.profile.name }}</span>

<!-- Array access -->
<img src="{{ this.images[this.currentIndex] }}"
     command-on="click"
     command="--set:{{ this.currentIndex + 1 }}"
     commandfor="currentIndex">
```

**String Operations:**
```html
<!-- String concatenation -->
<data-url="/api/search?q={{ this.value + '&limit=10' }}"></data-url>

<!-- String length checks -->
<input command-on="input"
       command="{{ this.value.length > 50 ? '--show' : '--hide' }}"
       commandfor="warning-message">
```

**Complex Expressions:**
```html
<!-- Multi-step calculations -->
<progress value="{{ (this.completed / this.total) * 100 }}"></progress>

<!-- Nested conditionals -->
<div class="{{ this.status === 'error' ? 'text-red' : this.status === 'success' ? 'text-green' : 'text-gray' }}">
  {{ this.message }}
</div>
```

#### Available Context Variables

- `{{ this }}`: The element that triggered the event
- `{{ event }}`: The raw DOM event object
- `{{ detail }}`: Data from CustomEvent.detail

#### Expression Security & Limitations

**✅ Safe Operations:**
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparisons: `===`, `!==`, `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logic: `&&`, `||`, `!`
- Property access: `obj.prop`, `obj['key']`, `arr[0]`
- Ternary conditionals: `condition ? true : false`
- Parentheses for grouping

**❌ Not Supported (Security):**
- Function calls: `obj.method()` (methods are accessible but not callable)
- Object/array creation: `{}`, `[]`, `new`
- Global access: `window`, `document`, `console`
- Loops, assignments, or any imperative code
- Template literals or other ES6+ features

**Performance & Caching:**
Expressions are automatically cached for optimal performance. Parsed expressions are stored in an LRU cache, making repeated evaluations of the same expression extremely fast.

**Error Handling:**
Invalid expressions return `undefined` and log helpful error messages to the console. Your UI gracefully degrades when expressions fail.

```html
<!-- Safe fallback: if expression fails, attribute uses empty value -->
<button command="--set:{{ nonexistent.property }}">Click me</button>
```

### Event Modifiers

Enhance event handling with modifiers:

| Modifier | Description | Example |
| :--- | :--- | :--- |
| `.prevent` | Calls `event.preventDefault()` | `command-on="submit.prevent"` |
| `.stop` | Calls `event.stopPropagation()` | `command-on="click.stop"` |
| `.once` | Listener removes itself after one trigger | `command-on="mouseenter.once"` |
| `.window` | Attaches to global window object | `command-on="keydown.window.ctrl.s"` |
| `.debounce` | Waits for pause in events (250ms default) | `command-on="input.debounce"` |
| `.debounce.<ms>` | Custom debounce delay | `command-on="input.debounce.300"` |
| `.{key}` | Only triggers on specific key | `command-on="keydown.enter.prevent"` |

### Command Chaining with Expressions

Combine expressions with command chaining for dynamic, data-driven workflows:

```html
<!-- Dynamic command sequences based on form state -->
<form command-on="submit.prevent"
      command="{{ this.elements.namedItem('agree').checked ? '--fetch:send' : '--show' }}"
      commandfor="{{ this.elements.namedItem('agree').checked ? 'submit-success' : 'agree-warning' }}"
      data-and-then="{{ this.elements.namedItem('agree').checked ? '--reset' : '' }}"
      data-and-then-commandfor="{{ this.elements.namedItem('agree').checked ? 'contact-form' : '' }}">

  <input name="agree" type="checkbox" required>
  <label>Agree to terms</label>

  <button type="submit">Submit</button>
</form>

<!-- Multi-step wizard with conditional navigation -->
<div id="wizard-step-1">
  <select name="user-type">
    <option value="individual">Individual</option>
    <option value="business">Business</option>
  </select>

  <button command-on="click"
          command="--hide"
          commandfor="wizard-step-1"
          data-and-then="--show"
          data-and-then-commandfor="wizard-step-{{ event.target.form.elements.namedItem('user-type').value === 'business' ? '2b' : '2a' }}">
    Next
  </button>
</div>
```

### Advanced Event Examples

**Real-time Form Validation:**
```html
<form>
  <input name="email"
         type="email"
         command-on="blur"
         command="{{ this.validity.valid ? '--hide' : '--show' }}"
         commandfor="email-error">

  <div id="email-error" hidden>Invalid email address</div>
</form>
```

**Dynamic API Calls:**
```html
<select name="category"
        command-on="change"
        command="--fetch:get"
        commandfor="products-list"
        data-url="/api/products?category={{ this.value }}&limit={{ this.dataset.limit || 10 }}">
  <option value="electronics">Electronics</option>
  <option value="books">Books</option>
</select>
```

**Keyboard Shortcuts with Context:**
```html
<body command-on="keydown.window.ctrl.s.prevent"
      command="{{ document.activeElement?.tagName === 'INPUT' ? '--emit:save-form' : '--emit:save-document' }}">
```

### ⚠️ Important Considerations & Gotchas

**Expression Evaluation Context:**
- Expressions run in a sandboxed environment with no access to global objects
- `this` refers to the element that triggered the event, not your component's `this`
- Property access follows JavaScript rules: `obj.undefinedProp` returns `undefined`
- Array bounds are not checked: `arr[999]` returns `undefined`

**Performance Considerations:**
- Expressions are evaluated on every event trigger
- Complex expressions with deep property access may impact performance
- Consider debouncing rapid events like `input` or `mousemove`

**Error Handling:**
- Invalid expressions return `undefined` and log to console
- Your UI should gracefully handle undefined values
- Test expressions thoroughly in development

**Security:**
- Only safe property access and arithmetic operations are allowed
- No function calls, object creation, or global access
- Expressions cannot modify data, only read it

**JSON in HTML Attributes:**
- When passing JSON to commands (like `--emit:event:{"key":"value"}`), avoid HTML entity encoding
- ❌ Wrong: `command="--emit:notify:{\"message\":\"Hello\"}"`
- ❌ Wrong: `command="--emit:notify:{&quot;message&quot;:&quot;Hello&quot;}"`
- ✅ Correct: `command='--emit:notify:{"message":"Hello"}'` (use single quotes around attribute)

**Browser Support:**
- Advanced events require a modern browser with Proxy support
- Falls back gracefully in unsupported browsers (expressions become literal text)

**Debugging:**
- Check browser console for expression errors
- Use browser dev tools to inspect the context variables
- Test expressions in isolation before using in production

## 🎨 Declarative Templating

Create dynamic, data-driven interfaces without JavaScript using declarative templates and data injection.

### Template Data Injection

Use `data-with-json` to inject JSON data into templates, and `data-tpl-*` attributes to customize template rendering.

```html
<!-- Template with data injection -->
<template id="user-card-template">
  <div class="user-card">
    <h3 data-tpl-text="name"></h3>
    <p data-tpl-text="role"></p>
    <img data-tpl-src="avatar" data-tpl-alt="name">
    <button data-tpl-command="followCommand" data-tpl-commandfor="followTarget">
      Follow
    </button>
  </div>
</template>

<!-- Button that renders the template -->
<button type="button"
        command="--dom:replace"
        commandfor="user-container"
        data-template-id="user-card-template"
        data-with-json='{"name":"Alice","role":"Developer","avatar":"/alice.jpg","followCommand":"--emit:follow:alice","followTarget":"follow-stats"}'>
  Show User Card
</button>

<div id="user-container"></div>
```

### Unique ID Generation

Use `{{__uid}}` placeholders for generating unique IDs across template instances:

```html
<template id="modal-template">
  <div class="modal" id="modal-{{__uid}}">
    <div class="modal-content">
      <h2 data-tpl-text="title"></h2>
      <p data-tpl-text="message"></p>
      <button command="--hide" commandfor="#modal-{{__uid}}">Close</button>
    </div>
  </div>
</template>
```

### Selector Rewriting

Templates automatically rewrite `@closest` selectors to use generated unique IDs, enabling proper scoping:

```html
<template id="item-template">
  <div class="item" id="item-{{__uid}}">
    <span data-tpl-text="name"></span>
    <button command="--class:toggle:active" commandfor="@closest(.item)">
      Toggle
    </button>
  </div>
</template>

<!-- The @closest selector becomes #item-123 when rendered -->
```

### Complete Example: Todo List

```html
<!-- Template for todo items -->
<template id="todo-item-template">
  <div class="todo-item" id="todo-{{__uid}}">
    <input type="checkbox"
           command="--class:toggle:completed"
           commandfor="@closest(.todo-item)">
    <span data-tpl-text="text"></span>
    <button command="--dom:remove" commandfor="@closest(.todo-item)">
      Delete
    </button>
  </div>
</template>

<!-- Form to add new todos -->
<form command-on="submit.prevent"
      command="--dom:append"
      commandfor="todo-list"
      data-template-id="todo-item-template"
      data-with-json='{"text": ""}'>
  <input name="todo-text" placeholder="Add a todo..." required>
  <button type="submit">Add</button>
</form>

<!-- Container for todo items -->
<ul id="todo-list" class="todo-list"></ul>
```

This creates a fully functional todo list where:
- New items are added via the form
- Checkboxes toggle completion state
- Delete buttons remove items
- Each item has a unique ID for proper scoping

## 🎯 Advanced `commandfor` Selectors

Invokers supports powerful contextual selectors that go beyond simple IDs, enabling complex DOM targeting patterns without JavaScript.

### Contextual Selectors

| Selector | Description | Example |
| -------- | ----------- | ------- |
| `@closest(selector)` | Target the closest ancestor matching the selector | `commandfor="@closest(.card)"` |
| `@child(selector)` | Target direct children matching the selector | `commandfor="@child(.item)"` |
| `@children(selector)` | Target all children matching the selector | `commandfor="@children(.item)"` |

### Global CSS Selectors

You can also use any standard CSS selector directly:

```html
<!-- Target all elements with a class -->
<button command="--hide" commandfor=".modal">Close All Modals</button>

<!-- Target elements within a specific container -->
<button command="--toggle" commandfor="#sidebar .menu-item">Toggle Menu Items</button>

<!-- Complex selectors work too -->
<button command="--class:add:active" commandfor="article[data-category='featured']">
  Mark Featured Articles
</button>
```

### Selector Examples

**Accordion with Contextual Targeting:**
```html
<div class="accordion">
  <div class="accordion-item">
    <button command="--toggle" commandfor="@closest(.accordion-item .content)">
      Toggle Section
    </button>
    <div class="content" hidden>Content here...</div>
  </div>
</div>
```

**List Management:**
```html
<ul class="todo-list">
  <li class="todo-item">
    <input type="checkbox" command="--class:toggle:completed" commandfor="@closest(.todo-item)">
    <span>Task description</span>
    <button command="--dom:remove" commandfor="@closest(.todo-item)">Delete</button>
  </li>
</ul>
```

**Tab Interface:**
```html
<div class="tabs">
  <button command="--class:add:active" commandfor="@closest(.tab)" data-and-then="--class:remove:active" data-and-then-commandfor="@closest(.tabs .tab)">
    Tab 1
  </button>
  <div class="tab-content">Tab 1 content</div>
</div>
```

## 🔄 Migration Guide

### From Monolithic to Modular

**Before (v1.4.x):**
```javascript
import 'invokers';
// 160 kB - everything included
```

**After (v1.5.x) - Recommended:**
```javascript
// Start minimal (25.8 kB)
import invokers from 'invokers';

// Add what you need
import { registerBaseCommands } from 'invokers/commands/base';
import { registerFormCommands } from 'invokers/commands/form';

registerBaseCommands(invokers);
registerFormCommands(invokers);
// ~60 kB total - only what you use
```

**After (v1.5.x) - Compatibility Layer:**
```javascript
// For existing apps that need all commands (82 kB)
import 'invokers/compatible';
// All commands are now available - no changes needed to your HTML
```

### Compatibility Layer

For existing applications that want to upgrade to v1.5.x without changing their code, use the compatibility layer:

```javascript
// Drop-in replacement for the old monolithic import
import { InvokerManager } from 'invokers/compatible';

// OR for side-effects only
import 'invokers/compatible';
```

The compatibility layer:
- ✅ Pre-registers all command packs automatically
- ✅ Enables all advanced features by default
- ✅ Maintains full backward compatibility
- ✅ Bundle size: 82 kB (still smaller than v1.4.x's 160 kB)

### Progressive Enhancement Strategy

1. **Start with core**: Get standards compliance
2. **Add base commands**: Essential UI interactions  
3. **Add specialized packs**: As features are needed
4. **Enable advanced features**: For dynamic applications

## 📖 Documentation

### Command Reference
- **Base Commands**: Essential UI state management
- **Form Commands**: Content and form manipulation  
- **DOM Commands**: Dynamic content insertion
- **Flow Commands**: Async operations and navigation
- **Media Commands**: Rich media controls
- **Browser Commands**: Browser API integration
- **Data Commands**: Complex data operations

### Advanced Features
- **Event Triggers**: `command-on` attribute for any DOM event
- **Expression Engine**: `{{expression}}` syntax for dynamic parameters
- **Command Chaining**: `data-and-then` for complex workflows
- **Interest Invokers**: `interestfor` for hover interactions

### API Reference
```javascript
// Core API
invokers.register(name, callback);
invokers.executeCommand(command, targetId, source);

// Global API (when using CDN)
window.Invoker.register(name, callback);
window.Invoker.executeCommand(command, targetId, source);
```

## ⚡ Performance

### Bundle Size Comparison
- **Core only**: 25.8 kB (polyfill + engine)
- **Essential UI**: ~60 kB (core + base + form)  
- **Full power**: ~200 kB (all packs + advanced)
- **Original v1.4**: 160 kB (everything forced)

### Best Practices
- Start with core, add incrementally
- Use tree-shaking with ES modules
- Enable advanced features only when needed
- Leverage browser caching for separate chunks

## 🛠️ Development

### Build Requirements
- Node.js 16+
- TypeScript 5.7+
- Pridepack (build tool)

### Commands
```bash
npm run build     # Build all modules
npm run test      # Run tests  
npm run dev       # Development mode
npm run clean     # Clean build artifacts
```

### Testing with Modules
```javascript
import { InvokerManager } from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';

beforeEach(() => {
  const manager = InvokerManager.getInstance();
  manager.reset();
  registerBaseCommands(manager); // Register needed commands
});
```

## 🎯 Browser Support

- **Modern browsers**: Full feature support
- **Legacy browsers**: Graceful degradation
- **Mobile browsers**: Touch and gesture support
- **Accessibility**: Screen reader and keyboard navigation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/doeixd/invokers.git
cd invokers
npm install
npm run build
npm test
```

## 📄 License

MIT © [Patrick Glenn](https://github.com/doeixd)

## 🙏 Acknowledgments

- W3C/WHATWG for the Invoker Commands proposal
- The web standards community
- Contributors and early adopters

---

**Ready to build declarative UIs?** Start with `npm install invokers` and explore the [examples](./examples/) directory for inspiration!
