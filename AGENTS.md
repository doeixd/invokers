# Invokers Library Guide for AI Agents

This document provides comprehensive information for AI agents working with the modularized Invokers library. It covers the new architecture, usage patterns, testing setup, and development considerations after the v1.5 modularization.

## 🏗️ New Modular Architecture

**Invokers** is now a hyper-modular, four-tier architecture that allows developers to import exactly what they need, from a minimal 25.8 kB core to a full-featured application framework.

### Core Philosophy
- **Standards-First**: Built on emerging W3C/WHATWG proposals
- **Modular by Design**: Import only what you need
- **Progressive Enhancement**: Start minimal, add features incrementally
- **Future-Proof**: Aligned with web platform evolution

## 🎯 Four-Tier Architecture

### **Tier 0: Core Polyfill** (`invokers`) - 25.8 kB
The foundational layer providing standards compliance.

**Contents:**
- `polyfill.ts` - CommandEvent and attribute polyfills
- `InvokerManager` - Command execution engine (empty by design)
- Core utilities and types

**Usage:**
```javascript
import 'invokers';
// Standards-compliant command/commandfor now work
```

### **Tier 1: Essential Commands**
The first commands most developers will add.

#### Base Commands (`invokers/commands/base`) - 29.2 kB
```javascript
import { registerBaseCommands } from 'invokers/commands/base';
registerBaseCommands(invokerManager);
```
**Commands**: `--toggle`, `--show`, `--hide`, `--class:*`, `--attr:*`

#### Form Commands (`invokers/commands/form`) - 30.5 kB  
```javascript
import { registerFormCommands } from 'invokers/commands/form';
registerFormCommands(invokerManager);
```
**Commands**: `--text:*`, `--value:*`, `--focus`, `--disabled:*`, `--form:*`, `--input:step`, `--text:copy`

### **Tier 2: Specialized Command Packs**

#### DOM Manipulation (`invokers/commands/dom`) - 47.1 kB
```javascript
import { registerDomCommands } from 'invokers/commands/dom';
registerDomCommands(invokerManager);
```
**Commands**: `--dom:*`, `--template:*`, data context management

#### Fetch Commands (`invokers/commands/fetch`) - ~15 kB
```javascript
import { registerFetchCommands } from 'invokers/commands/fetch';
registerFetchCommands(invokerManager);
```
**Commands**: `--fetch:get`, `--fetch:put`, `--fetch:patch`

#### WebSocket Commands (`invokers/commands/websocket`) - ~12 kB
```javascript
import { registerWebSocketCommands } from 'invokers/commands/websocket';
registerWebSocketCommands(invokerManager);
```
**Commands**: `--websocket:connect`, `--websocket:disconnect`, `--websocket:send`, `--websocket:status`, `--websocket:on:message`

#### Server-Sent Events (`invokers/commands/sse`) - ~10 kB
```javascript
import { registerSSECommands } from 'invokers/commands/sse';
registerSSECommands(invokerManager);
```
**Commands**: `--sse:connect`, `--sse:disconnect`, `--sse:status`, `--sse:on:message`, `--sse:on:event`

#### Navigation & Flow Control (`invokers/commands/navigation`) - ~8 kB
```javascript
import { registerNavigationCommands } from 'invokers/commands/navigation';
registerNavigationCommands(invokerManager);
```
**Commands**: `--navigate:to`, `--emit`, `--bind`, `--command:trigger`, `--command:delay`

#### Media & Animation (`invokers/commands/media`) - 27.7 kB
```javascript
import { registerMediaCommands } from 'invokers/commands/media';
registerMediaCommands(invokerManager);
```
**Commands**: `--media:*`, `--carousel:*`, `--scroll:*`, `--clipboard:*`

#### Browser APIs (`invokers/commands/browser`) - 25.3 kB
```javascript
import { registerBrowserCommands } from 'invokers/commands/browser';
registerBrowserCommands(invokerManager);
```
**Commands**: `--cookie:*`

#### Data Management (`invokers/commands/data`) - 45.2 kB
```javascript
import { registerDataCommands } from 'invokers/commands/data';
registerDataCommands(invokerManager);
```
**Commands**: `--data:*`, array operations, reactive data binding

#### Device APIs (`invokers/commands/device`) - 28.1 kB
```javascript
import { registerDeviceCommands } from 'invokers/commands/device';
registerDeviceCommands(invokerManager);
```
**Commands**: `--device:vibrate`, `--device:share`, `--device:geolocation:get`, `--device:battery:get`, `--device:clipboard:*`, `--device:wake-lock*`

#### Accessibility Helpers (`invokers/commands/accessibility`) - 26.8 kB
```javascript
import { registerAccessibilityCommands } from 'invokers/commands/accessibility';
registerAccessibilityCommands(invokerManager);
```
**Commands**: `--a11y:announce`, `--a11y:focus`, `--a11y:skip-to`, `--a11y:focus-trap`, `--a11y:aria:*`, `--a11y:heading-level`

### **Tier 3: Advanced Reactive Engine**

#### Event Triggers (`invokers/advanced/events`) - 42.3 kB
```javascript
import { enableEventTriggers } from 'invokers/advanced/events';
enableEventTriggers();
```
**Features**: `command-on` attribute for any DOM event

#### Expression Engine (`invokers/advanced/expressions`) - 26.2 kB
```javascript
import { enableExpressionEngine } from 'invokers/advanced/expressions';
enableExpressionEngine();
```
**Features**: `{{expression}}` interpolation in commands

#### Complete Advanced (`invokers/advanced`) - 42.4 kB
```javascript
import { enableAdvancedEvents } from 'invokers/advanced';
enableAdvancedEvents();
```
**Features**: Both event triggers and expression engine

### **Tier 4: Advanced Modules** ⭐ **NEW**
Advanced application features for complex use cases. These modules provide high-level abstractions for common application patterns.

#### State Management (`invokers/state`) - ~83 kB
```javascript
import { enableState } from 'invokers/state';
enableState();
```
**Features**:
- Global reactive state store with JSON script initialization
- State manipulation commands (`--state:set`, `--state:get`, `--state:array:push`, etc.)
- Computed properties via `<data-let>` elements
- Two-way data binding with `data-bind` attribute

**Usage**:
```html
<!-- Initialize state -->
<script type="application/json" data-state="user">
  {"name": "John", "items": []}
</script>

<!-- State commands -->
<button command="--state:set:user.name:Jane">Update Name</button>
<button command="--state:array:push:user.items:new-item">Add Item</button>

<!-- Computed properties -->
<data-let data-let="state.user.name + ' has ' + count(state.user.items) + ' items'" data-target="#summary"></data-let>

<!-- Two-way binding -->
<input data-bind="user.name" placeholder="Enter name">
```

#### Control Flow (`invokers/control`) - ~56 kB
```javascript
import { enableControl } from 'invokers/control';
enableControl();
```
**Features**:
- Conditional rendering with `data-if`/`data-else` attributes
- Switch/case rendering with `data-switch`/`data-case` attributes
- Promise-based chaining infrastructure for async command sequences

**Usage**:
```html
<!-- Conditional rendering -->
<div data-if="state.user.loggedIn">Welcome back!</div>
<div data-else>Please log in</div>

<!-- Switch/case rendering -->
<div data-switch="state.view.mode">
  <div data-case="view">📖 Viewing mode</div>
  <div data-case="edit">✏️ Editing mode</div>
  <div data-case="default">❓ Unknown mode</div>
</div>
```

#### Components (`invokers/components`) - ~55 kB
```javascript
import { enableComponents } from 'invokers/components';
enableComponents();
```
**Features**:
- Component templates with props (`{{prop.name}}`)
- Content projection via slots (`<slot>`, `data-slot`)
- Scoped CSS for encapsulation

**Usage**:
```html
<!-- Component definition -->
<template data-component="my-button" data-props="text,color" data-slots="icon">
  <button class="btn" style="color: {{prop.color}};">
    <slot name="icon"></slot>
    {{prop.text}}
  </button>
</template>

<style scoped data-component="my-button">
  .btn { border: none; padding: 10px 20px; }
</style>

<!-- Component usage -->
<my-button text="Click me" color="blue">
  <span data-slot="icon">⭐</span>
</my-button>
```

## 🧪 Testing Patterns

### Basic Test Setup (Recommended)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';

describe('Base Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();
    
    // IMPORTANT: Register the commands you need for testing
    registerBaseCommands(manager);
  });

  // ... tests
});
```

### Compatibility Layer Testing (For Existing Tests)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from 'invokers/compatible';

describe('All Commands Available', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    // All commands are pre-registered - no manual registration needed
  });

  it('should toggle element visibility', async () => {
    document.body.innerHTML = `
      <button command="--toggle" commandfor="target">Toggle</button>
      <div id="target" hidden>Content</div>
    `;

    const button = document.querySelector('button')!;
    const target = document.querySelector('#target')!;

    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(target.hasAttribute('hidden')).toBe(false);
  });
});
```

### Testing Multiple Command Packs
```typescript
import { InvokerManager } from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
import { registerFormCommands } from 'invokers/commands/form';
import { registerFlowCommands } from 'invokers/commands/flow';

beforeEach(() => {
  const manager = InvokerManager.getInstance();
  manager.reset();
  
  // Register all packs needed for your tests
  registerBaseCommands(manager);
  registerFormCommands(manager);
  registerFlowCommands(manager);
});
```

### Testing Advanced Features
```typescript
import { enableAdvancedEvents } from 'invokers/advanced';

beforeEach(() => {
  // Enable advanced features when needed
  enableAdvancedEvents();
});

it('should handle command-on events', async () => {
  document.body.innerHTML = `
    <form command-on="submit.prevent" command="--text:set:Submitted!" commandfor="output">
      <button type="submit">Submit</button>
    </form>
    <div id="output"></div>
  `;
  
  const form = document.querySelector('form')!;
  const output = document.querySelector('#output')!;
  
  form.dispatchEvent(new Event('submit'));
  await new Promise(resolve => setTimeout(resolve, 0));
  
  expect(output.textContent).toBe('Submitted!');
});
```

## 🎨 Usage Patterns

### Progressive Enhancement
```javascript
// 1. Start with core (25.8 kB)
import invokers from 'invokers';

// 2. Add essential commands (~30 kB each)
import { registerBaseCommands } from 'invokers/commands/base';
import { registerFormCommands } from 'invokers/commands/form';

registerBaseCommands(invokers);
registerFormCommands(invokers);

// 3. Add specialized features as needed
import { registerDomCommands } from 'invokers/commands/dom';
import { enableAdvancedEvents } from 'invokers/advanced';

registerDomCommands(invokers);
enableAdvancedEvents();
```

### Bundle Size Strategy
```javascript
// Minimalist approach (25.8 kB)
import 'invokers';

// Basic UI (25.8 + 29.2 kB = ~55 kB)
import invokers from 'invokers';
import { registerBaseCommands } from 'invokers/commands/base';
registerBaseCommands(invokers);

// Content-heavy app (55 + 30.5 + 47.1 kB = ~133 kB)
import { registerFormCommands } from 'invokers/commands/form';
import { registerDomCommands } from 'invokers/commands/dom';
registerFormCommands(invokers);
registerDomCommands(invokers);

// App with HTTP requests (~133 + 15 kB = ~148 kB)
import { registerFetchCommands } from 'invokers/commands/fetch';
registerFetchCommands(invokers);

// Real-time app with WebSockets (~148 + 12 kB = ~160 kB)
import { registerWebSocketCommands } from 'invokers/commands/websocket';
registerWebSocketCommands(invokers);

// Full-featured app (~200+ kB)
import { registerNavigationCommands } from 'invokers/commands/navigation';
import { registerMediaCommands } from 'invokers/commands/media';
import { registerDataCommands } from 'invokers/commands/data';
import { enableAdvancedEvents } from 'invokers/advanced';

registerFlowCommands(invokers);
registerMediaCommands(invokers);
registerDataCommands(invokers);
enableAdvancedEvents();
```

## 🔧 Development Considerations

### Command Registration Patterns
All command packs follow the same registration pattern:

```typescript
// src/commands/example.ts
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

const exampleCommands: Record<string, CommandCallback> = {
  '--example:action': ({ invoker, targetElement, params }: CommandContext) => {
    // Command implementation
  }
};

export function registerExampleCommands(manager: InvokerManager): void {
  for (const name in exampleCommands) {
    if (exampleCommands.hasOwnProperty(name)) {
      manager.register(name, exampleCommands[name]);
    }
  }
}
```

### Error Handling
```typescript
import { createInvokerError, ErrorSeverity } from '../index';

// In command implementations
throw createInvokerError(
  'Command failed: specific reason',
  ErrorSeverity.ERROR,
  {
    command: '--example:action',
    element: invoker,
    context: { params },
    recovery: 'Suggested fix for the user'
  }
);
```

### Debug Mode
```typescript
// Enable debug mode for verbose logging
if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
  console.log('Debug information');
}

// Or set debug flag
window.Invoker = { debug: true };
```

## 📦 Build & Package Configuration

### Entry Points (pridepack.json)
```json
{
  "target": "es2018",
  "entrypoints": {
    ".": "./src/index.ts",                           // Core: polyfill + InvokerManager (25.8 kB)
    "./commands": "./src/invoker-commands.ts",      // Legacy monolithic (deprecated)
    "./commands/base": "./src/commands/base.ts",    // Essential UI commands (29.2 kB)
    "./commands/form": "./src/commands/form.ts",    // Form commands (30.5 kB)
    "./commands/dom": "./src/commands/dom.ts",      // DOM manipulation (47.1 kB)
    "./commands/fetch": "./src/commands/fetch.ts",   // HTTP fetch commands (~15 kB)
    "./commands/websocket": "./src/commands/websocket.ts", // WebSocket commands (~12 kB)
    "./commands/sse": "./src/commands/sse.ts",       // Server-Sent Events (~10 kB)
    "./commands/navigation": "./src/commands/navigation.ts", // Navigation & flow control (~8 kB)
    "./commands/flow": "./src/commands/flow.ts",     // Compatibility layer (45.3 kB)
    "./commands/media": "./src/commands/media.ts",   // Media & animations (27.7 kB)
    "./commands/browser": "./src/commands/browser.ts", // Browser APIs (25.3 kB)
    "./commands/data": "./src/commands/data.ts",    // Data management (45.2 kB)
    "./commands/storage": "./src/commands/storage.ts", // Storage commands (new)
    "./compatible": "./src/compatible.ts",          // All commands pre-registered (200+ kB)
    "./demo-commands": "./src/demo-commands.ts",     // Demo/example commands
    "./interest": "./src/interest-invokers.ts",      // Interest invokers (Tier 2)
    "./advanced": "./src/advanced/index.ts",        // Full advanced features (42.4 kB)
    "./advanced/events": "./src/advanced/events.ts", // Event triggers only (42.3 kB)
    "./advanced/expressions": "./src/advanced/expressions.ts" // Expression engine only (26.2 kB)
  },
  "external": [],
  "minify": false,
  "sourcemap": true
}
```

### Package Exports (package.json)
All command packs are properly exported for both development and production, with full TypeScript support. The exports follow a consistent pattern:

```json
{
  "./commands/base": {
    "types": "./dist/types/commands/base.d.ts",
    "development": {
      "require": "./dist/cjs/development/commands/base.js",
      "import": "./dist/esm/development/commands/base.js"
    },
    "require": "./dist/cjs/production/commands/base.js",
    "import": "./dist/esm/production/commands/base.js"
  }
}
```

### Build Architecture Insights

#### Singleton Pattern Implementation
- **InvokerManager** uses singleton pattern with private constructor
- `getInstance()` method ensures single global instance
- All command packs register with the same manager instance
- Prevents duplicate registrations and ensures consistent state

#### Modular Loading Strategy
- **Tree Shaking**: Unused command packs are automatically excluded from bundles
- **Progressive Enhancement**: Start with core (25.8 kB), add features as needed
- **Bundle Size Optimization**: Import only what you use
- **Development vs Production**: Separate builds with/without debug logging

#### Entry Point Dependencies
- **Core (`src/index.ts`)**: Imports polyfill, exports InvokerManager singleton
- **Command Packs**: Each pack exports a `register*Commands(manager)` function
- **Advanced Features**: `enableAdvancedEvents()` enables interpolation and event triggers
- **Compatible Layer**: Imports all packs and pre-registers them for backward compatibility

## 🏗️ Architecture Deep Dive

### Module Interconnection Patterns

#### Core Module Flow
```
src/index.ts → src/polyfill.ts (immediate application)
         ↓
src/core.ts → InvokerManager singleton
         ↓
Command Packs → register*Commands(manager)
```

#### Command Registration Pattern
All command packs follow identical registration pattern:

```typescript
// src/commands/example.ts
import type { InvokerManager } from '../core';
import { createInvokerError, ErrorSeverity } from '../index';

const exampleCommands: Record<string, CommandCallback> = {
  '--example:action': ({ invoker, targetElement, params }: CommandContext) => {
    // Implementation
  }
};

export function registerExampleCommands(manager: InvokerManager): void {
  for (const name in exampleCommands) {
    manager.register(name, exampleCommands[name]);
  }
}
```

#### Advanced Features Integration
```typescript
// src/advanced/index.ts
export function enableAdvancedEvents(): void {
  const manager = InvokerManager.getInstance();
  manager._enableInterpolation(); // Enable {{...}} in commands

  EventTriggerManager.getInstance().initialize(); // Enable command-on attributes
}
```

### Dependency Management

#### Import Hierarchy
- **Tier 0 (Core)**: No external dependencies, self-contained
- **Tier 1 (Essential)**: Depends only on core types and utilities
- **Tier 2 (Specialized)**: May depend on Tier 1 commands + advanced features
- **Tier 3 (Advanced)**: Depends on core + expression engine

#### Circular Dependency Prevention
- Core types defined in `core.ts` to avoid circular imports
- Advanced features use lazy loading and conditional checks
- Command packs import only what they need from core

### State Management Architecture

#### Global State
- **InvokerManager**: Singleton instance holds all commands and plugins
- **Command States**: Per-command execution state (`active`, `completed`, `disabled`, `once`)
- **Performance Monitor**: Rate limiting and execution tracking
- **Plugin System**: Middleware hooks and lifecycle management

#### Command Execution Context
Each command receives a `CommandContext` with:
- `invoker`: The button/element that triggered the command
- `targetElement`: The element the command acts upon
- `params`: Parsed command parameters
- `getTargets()`: Function to resolve target elements
- `updateAriaState()`: Accessibility state management
- `executeAfter()`: Programmatic chaining

### Error Handling Architecture

#### Structured Error System
- **ErrorSeverity**: `WARNING`, `ERROR`, `CRITICAL`
- **InvokerError**: Extended Error with context and recovery suggestions
- **Debug Mode**: Conditional verbose logging
- **Graceful Degradation**: Errors don't crash the system

#### Error Propagation
- Command validation errors prevent execution
- Runtime errors are caught and logged with context
- Chain errors don't break parent command execution
- Recovery suggestions guide users to fixes

### Performance Optimizations

#### Caching Strategies
- **Expression Cache**: LRU cache for parsed expressions (100 entries)
- **Command Sorting**: Commands sorted by specificity for faster matching
- **Rate Limiting**: 1000 executions/second global limit
- **Lazy Loading**: Advanced features loaded only when enabled

#### Bundle Optimization
- **Tree Shaking**: Unused modules automatically excluded
- **Code Splitting**: Separate entry points for selective importing
- **Minification**: Production builds are minified
- **Source Maps**: Development builds include source maps for debugging

## 🚨 Migration Notes

### Breaking Changes in v1.5
- **Core is empty by design**: `registerCoreLibraryCommands()` method is now empty
- **Explicit imports required**: Commands must be imported and registered
- **Advanced features opt-in**: `command-on` and `{{...}}` require explicit enabling

### Backward Compatibility
- Old monolithic `invoker-commands.ts` still exists for gradual migration
- Can mix old and new import styles during transition
- All existing HTML attributes and commands work the same way

### Migration Strategy
1. **Phase 1**: Install v1.5, add required imports for existing functionality
2. **Phase 2**: Gradually switch to modular imports
3. **Phase 3**: Remove unused command packs to optimize bundle size

### **Tier 4: Advanced Modules** (New in v2.0)
Advanced, opt-in modules that provide framework-level features for complex SPAs.

#### State Module (`invokers/state`) - ~83 kB
```javascript
import { enableStateModule } from 'invokers/state';
enableStateModule();
```
**Features:**
- Global state store from JSON script tags
- State manipulation commands (`--state:set`, `--state:array:push`, etc.)
- Computed properties with `<data-let>`
- Two-way data binding with `data-bind`

#### Control Flow Module (`invokers/control`) - ~75 kB
```javascript
import { enableControl } from 'invokers/control';
enableControl();
```
**Features:**
- Conditional rendering with `data-if`/`data-else`
- Switch/case rendering with `data-switch`/`data-case`
- Loop constructs with `data-for-each`, `data-while`, `data-repeat`
- Error boundaries with `data-try`, `data-catch`, `data-finally`
- Async control with `data-parallel`, `data-race`, `data-sequence`
- Promise-based command chaining with `{{result}}`

#### Components Module (`invokers/components`) - ~55 kB
```javascript
import { enableComponents } from 'invokers/components';
enableComponents();
```
**Features:**
- Component templates with props (`{{prop.name}}`)
- Content projection with slots (`<slot>`, `data-slot`)
- Scoped CSS for style encapsulation

#### Forms Module (`invokers/forms`) - ~35 kB
```javascript
import { enableForms } from 'invokers/forms';
enableForms();
```
**Features:**
- Form validation with built-in rules (required, email, min/max, custom)
- Reactive form state with dirty/pristine tracking
- Form submission handling with loading states and error handling
- Form-specific commands for validation and state management

## 🎯 Best Practices for AI Agents

1. **Always register needed commands** in tests and examples
2. **Start with core + base** for most use cases
3. **Enable advanced features** only when using `command-on` or `{{...}}`
4. **Check bundle sizes** when adding new packs
5. **Use progressive enhancement** - start minimal, add features
6. **Test modular loading** to ensure proper registration
7. **Follow error handling patterns** for consistency

## 🎯 Interest Invokers API (Official Specification)

The `interestfor` attribute provides a standards-compliant way to create hover-triggered UI elements like tooltips, hovercards, and preview popovers. This section covers the official W3C specification details for AI agents implementing or working with Interest Invokers.

### 📋 Official Element Support

The `interestfor` attribute is officially supported on:
- `<button>` elements
- `<a href="...">` elements (including `<area>` and SVG `<a>`)
- **Polyfill Extension**: Our implementation extends support to all `HTMLElement` types for broader compatibility

**Usage:**
```html
<!-- Basic hovercard -->
<button interestfor="user-card">Profile</button>
<div id="user-card" popover="auto">User details...</div>

<!-- Link preview -->
<a href="/article" interestfor="preview">Read Article</a>
<div id="preview" popover="hint">Article preview...</div>
```

### 🎮 Human Interface Device (HID) Support

#### **Mouse Users**
- **Interest Trigger**: Hover element for 500ms (configurable via CSS)
- **Lose Interest**: De-hover element for 500ms
- **Popover Behavior**: Can hover from invoker to popover without closing

#### **Keyboard Users**
- **Interest Trigger**: Focus element for 500ms
- **Lose Interest**: Press `ESC` key or move focus away
- **Accessibility**: Full keyboard navigation support

#### **Touchscreen Users**
- **Interest Trigger**: Long-press gesture
- **Context Menu**: Adds "Show Details" item to existing context menu
- **No Conflicts**: Preserves existing browser context menus (copy, share, etc.)

### 🎨 CSS Properties & Styling

#### **Delay Configuration**
```css
/* Configure hover delays */
[interestfor] {
  interest-delay-start: 0.5s;  /* Show delay */
  interest-delay-end: 200ms;   /* Hide delay */
}

/* Shorthand */
[interestfor] {
  interest-delay: 0.5s 200ms;
}
```

#### **Pseudo Classes**
```css
/* Style elements currently showing interest */
:interest-source {
  background-color: lightblue;
  border: 2px solid blue;
}

/* Style target elements that have interest */
:interest-target {
  box-shadow: 0 0 10px rgba(0,0,0,0.2);
}
```

### 📢 Events & JavaScript API

#### **InterestEvent Interface**
```typescript
interface InterestEvent : Event {
  readonly attribute Element source;  // Element with interestfor
}

// Listen for interest events
document.getElementById('target').addEventListener('interest', (e) => {
  console.log('Interest shown from:', e.source);
});

document.getElementById('target').addEventListener('loseinterest', (e) => {
  console.log('Interest lost from:', e.source);
});
```

#### **Custom Events on Invoker**
```javascript
// Invoker elements also dispatch custom events
button.addEventListener('interest:shown', (e) => {
  // Interest was shown
});

button.addEventListener('interest:lost', (e) => {
  // Interest was lost
});
```

### ♿ Accessibility (ARIA) Requirements

#### **Plain Hints (Tooltips)**
- `popover="hint"` with only generic/text/image content
- Sets `aria-describedby` on invoker
- **No** `aria-expanded` attribute
- Screen readers announce via existing description mechanisms

#### **Rich Hints (Hovercards)**
- `popover="auto"` or `popover="manual"`, or complex hint content
- Sets `aria-expanded="true"/"false"` on invoker
- Sets `aria-details` relation between invoker and popover
- Popover gets `role="tooltip"`
- Sequential focus navigation includes popover content

#### **Automatic ARIA Management**
```html
<!-- Plain hint - aria-describedby only -->
<code interestfor="api-tooltip">fetch()</code>
<div id="api-tooltip" popover="hint">Makes HTTP requests</div>

<!-- Rich hint - aria-expanded + aria-details -->
<button interestfor="user-card">Profile</button>
<div id="user-card" popover="auto">Rich user content...</div>
```

### 🔧 Implementation Notes & Polyfill Details

#### **Polyfill Limitations**
- **Touchscreen**: Context menu integration cannot be polyfilled
- **CSS Properties**: `interest-delay-*` properties use fallback delays
- **Pseudo Classes**: `:interest-source` and `:interest-target` require native CSS engine
- **Extended Elements**: Polyfill supports all `HTMLElement` (spec limits to specific elements)

#### **Browser Compatibility**
- **Native Support**: Chrome 120+, Firefox 125+, Safari 17+
- **Polyfill Required**: All other browsers
- **Progressive Enhancement**: Graceful degradation without JavaScript

#### **Performance Considerations**
- **Rate Limiting**: 1000 evaluations/second global limit
- **Caching**: Expression evaluation uses LRU cache
- **Event Debouncing**: Built-in delays prevent excessive triggering

### 🧪 Testing Interest Invokers

#### **Basic Setup**
```typescript
import { applyInterestInvokers } from 'invokers/interest';

describe('Interest Invokers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Reset polyfill state
    delete (window as any).interestForPolyfillInstalled;
    applyInterestInvokers();
  });

  it('should show popover on hover', async () => {
    document.body.innerHTML = `
      <button interestfor="tooltip">Hover me</button>
      <div id="tooltip" popover="hint">Tooltip content</div>
    `;

    const button = document.querySelector('button')!;
    button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

    // Wait for delay + buffer
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check if popover is shown (if Popover API available)
    if (typeof (document.getElementById('tooltip') as any).showPopover === 'function') {
      expect(button.classList.contains('interest-source')).toBe(true);
    }
  });
});
```

#### **Accessibility Testing**
```typescript
it('should set proper ARIA for plain hints', () => {
  document.body.innerHTML = `
    <code interestfor="hint">code</code>
    <div id="hint" popover="hint">Tooltip</div>
  `;

  const code = document.querySelector('code')!;
  code.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

  expect(code.getAttribute('aria-describedby')).toBe('hint');
  expect(code.getAttribute('aria-expanded')).toBe(null); // Plain hints
});

it('should set proper ARIA for rich hints', () => {
  document.body.innerHTML = `
    <button interestfor="card">Profile</button>
    <div id="card" popover="auto">Rich content</div>
  `;

  const button = document.querySelector('button')!;
  button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

  expect(button.getAttribute('aria-details')).toBe('card');
  expect(button.getAttribute('aria-expanded')).toBe('false');
});
```

### 🔄 Integration with Commands

Interest Invokers work seamlessly with Invoker Commands:

```html
<!-- Combined functionality -->
<button interestfor="preview" command="--toggle" commandfor="panel">
  Toggle Panel (with hover preview)
</button>

<div id="preview" popover="hint">Click to toggle the panel below</div>
<div id="panel" hidden>Panel content...</div>
```

### 🌐 Web Standards Alignment

- **W3C Specification**: Based on official OpenUI Interest Invokers proposal
- **Future-Proof**: Designed to work with native browser implementations
- **Progressive Enhancement**: Works without JavaScript, enhanced with JS
- **Accessibility First**: Built-in screen reader and keyboard support

### 📚 Key Specification Links

- **Explainer Document**: https://open-ui.org/components/interest-invokers.explainer/
- **GitHub Issues**: https://github.com/openui/open-ui/issues?q=interestfor
- **CSSWG Discussion**: https://github.com/w3c/csswg-drafts/issues/9236

---

**Interest Invokers vs Commands**: While `commandfor` triggers actions on click, `interestfor` triggers on "interest" (hover/focus). They can be used together on the same element for rich interactions.

## 🔧 Architectural Issues & Improvements

### Current Architecture Analysis

#### Strengths
- **True Modularity**: Four-tier system allows precise bundle size control
- **Progressive Enhancement**: Start minimal, add features as needed
- **Singleton Pattern**: Prevents duplicate registrations and ensures consistency
- **Backward Compatibility**: Compatible layer maintains existing functionality
- **Plugin System**: Extensible middleware architecture
- **Performance Monitoring**: Built-in rate limiting and execution tracking

#### Areas for Improvement

##### 1. **Command Discovery & Auto-Registration**
**Issue**: Commands must be manually imported and registered
**Impact**: Developer experience friction, potential for missing registrations
**Solution**: Consider auto-discovery mechanism or better tooling

##### 2. **Type Safety Across Modules**
**Issue**: Some type definitions duplicated between core and index
**Impact**: Potential for type inconsistencies
**Solution**: Centralize all type definitions in a single types module

##### 3. **Advanced Features Coupling**
**Issue**: `enableAdvancedEvents()` enables both event triggers AND interpolation
**Impact**: Cannot use one without the other
**Solution**: Separate enable functions for granular control

##### 4. **Error Recovery Mechanisms**
**Issue**: Limited automated error recovery
**Impact**: Some errors require manual intervention
**Solution**: Add more intelligent fallback behaviors

##### 5. **Bundle Size Transparency**
**Issue**: Bundle sizes listed in comments but not programmatically tracked
**Impact**: Hard to monitor size impact of changes
**Solution**: Add build-time bundle analysis and size reporting

### Recommended Architectural Enhancements

#### Enhanced Modularity
```typescript
// Future: Granular advanced features
import { enableEventTriggers } from 'invokers/advanced/events';
import { enableInterpolation } from 'invokers/advanced/expressions';

// Instead of monolithic enableAdvancedEvents()
enableEventTriggers();
enableInterpolation();
```

#### Improved Type Safety
```typescript
// Future: Centralized types
import type {
  CommandContext,
  CommandCallback,
  InvokerError
} from 'invokers/types';
```

#### Better Error Recovery
```typescript
// Future: Intelligent fallbacks
const context = {
  onError: 'fallback-command',
  retryCount: 3,
  timeout: 5000
};
```

#### Build-Time Analysis
```json
// Future: pridepack.json with size tracking
{
  "analyze": true,
  "sizeLimits": {
    "core": "30KB",
    "base": "35KB",
    "advanced": "50KB"
  }
}
```

### Migration Path Considerations

#### Phase 1: Immediate Improvements
- Fix type duplications in core.ts vs index.ts
- Add granular advanced feature enabling
- Improve error messages and recovery suggestions

#### Phase 2: Enhanced Developer Experience
- Add command auto-discovery for development
- Implement bundle size monitoring
- Create better debugging tools

#### Phase 3: Advanced Features
- Plugin marketplace/registry system
- Visual command builder/debugger
- Performance profiling tools

### Testing Architecture Notes

#### Modular Testing Strategy
- **Unit Tests**: Test individual commands in isolation
- **Integration Tests**: Test command combinations and chaining
- **E2E Tests**: Test full user workflows
- **Performance Tests**: Monitor bundle sizes and execution times

#### Test Setup Patterns
```typescript
// Recommended: Explicit registration for clarity
describe('Base Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    manager = InvokerManager.getInstance();
    manager.reset();
    registerBaseCommands(manager); // Explicit and clear
  });
});
```

### Future-Proofing Considerations

#### Web Standards Evolution
- Monitor W3C Invoker API progress
- Prepare for native browser implementation
- Design polyfills to gracefully degrade when native support arrives

#### Framework Integration
- Consider React/Vue/Angular integration patterns
- Provide framework-specific adapters
- Maintain vanilla JS compatibility as core

#### Performance Evolution
- Monitor bundle size impact of new features
- Implement lazy loading for large command packs
- Add performance budgets and monitoring

## 📊 Detailed Command Reference

### Core Commands (Always Available)
Native commands (no `--` prefix) that are polyfilled for cross-browser compatibility:
- `show-modal`, `close`, `toggle-popover` - Dialog and popover management
- `play-pause`, `toggle-muted` - Media element controls
- `show-picker` - Form input pickers

### Base Pack Commands (`invokers/commands/base`)
Essential UI manipulation commands:

#### Visibility & Display
- `--toggle` - Show/hide element with ARIA updates
- `--show` - Show element, hide siblings
- `--hide` - Hide element

#### CSS Classes
- `--class:add:name` - Add CSS class
- `--class:remove:name` - Remove CSS class
- `--class:toggle:name` - Toggle CSS class

#### Attributes
- `--attr:set:name:value` - Set attribute value
- `--attr:remove:name` - Remove attribute
- `--attr:toggle:name:value` - Toggle attribute presence

### Form Pack Commands (`invokers/commands/form`)
Form interaction and content manipulation:

#### Text Content
- `--text:set:text` - Set element text content
- `--text:append:text` - Append to text content
- `--text:prepend:text` - Prepend to text content
- `--text:clear` - Clear text content

#### Form Values
- `--value:set:value` - Set input value
- `--value:clear` - Clear input value

#### Form Controls
- `--focus` - Focus element
- `--disabled:toggle/enable/disable` - Control disabled state
- `--form:reset` - Reset form
- `--form:submit` - Submit form
- `--input:step:amount` - Step input value
- `--text:copy` - Copy text to clipboard

### DOM Pack Commands (`invokers/commands/dom`)
Advanced DOM manipulation:

#### Element Operations
- `--dom:remove` - Remove element
- `--dom:replace:content` - Replace element content
- `--dom:swap:selector` - Swap elements
- `--dom:append:content` - Append content
- `--dom:prepend:content` - Prepend content
- `--dom:wrap:tag` - Wrap element
- `--dom:unwrap` - Unwrap element

#### Templates & Data
- `--template:render:template-id` - Render template
- `--template:clone:template-id` - Clone template
- `--data:set:context` - Set data context
- `--data:update:context` - Update data context

### Fetch Pack Commands (`invokers/commands/fetch`)
HTTP request commands:

#### HTTP Methods
- `--fetch:get` - GET request with loading states and response handling
- `--fetch:put` - PUT request with optional body
- `--fetch:patch` - PATCH request with optional body

### WebSocket Pack Commands (`invokers/commands/websocket`)
Real-time WebSocket communication:

#### Connection Management
- `--websocket:connect` - Establish WebSocket connection
- `--websocket:disconnect` - Close WebSocket connection
- `--websocket:status` - Get connection status

#### Messaging
- `--websocket:send` - Send message through WebSocket
- `--websocket:on:message` - Set up message handler

### SSE Pack Commands (`invokers/commands/sse`)
Server-Sent Events for real-time server communication:

#### Connection Management
- `--sse:connect` - Establish SSE connection
- `--sse:disconnect` - Close SSE connection
- `--sse:status` - Get connection status

#### Event Handling
- `--sse:on:message` - Handle all SSE messages
- `--sse:on:event` - Handle specific SSE event types

### Navigation Pack Commands (`invokers/commands/navigation`)
Navigation and flow control commands:

#### Navigation
- `--navigate:to:url` - Navigate to URL using History API

#### Control Flow
- `--command:trigger:command` - Trigger another command on an element
- `--command:delay:ms` - Delay command execution

#### Events & Data Binding
- `--emit:event:detail` - Emit custom events
- `--bind:property` - Create one-way data bindings

### Media Pack Commands (`invokers/commands/media`)
Media and animation controls:

#### Media Controls
- `--media:toggle` - Play/pause media
- `--media:play/pause/mute/seek:position` - Media control

#### UI Components
- `--carousel:nav:next/prev` - Carousel navigation
- `--scroll:to:position` - Scroll to position
- `--clipboard:copy` - Copy to clipboard

### Browser Pack Commands (`invokers/commands/browser`)
Browser API integration:
- `--cookie:set/get/remove:key:value` - Cookie management

### Data Pack Commands (`invokers/commands/data`)
Data manipulation and reactive binding:
- `--data:set/copy:key:value` - Data operations
- `--data:set:array:push/remove/update/sort/filter` - Array operations
- Various reactive data binding commands

## ⚠️ Edge Cases & Gotchas

### Command Execution
- Commands prefixed with `--` are custom; others are native/polyfilled
- Command strings use `:` as delimiter, escaped with `\`
- Empty command strings are ignored
- Invalid commands log warnings but don't throw

### Target Resolution
- `commandfor` attribute takes precedence over `aria-controls`
- Supports CSS selectors: `#id`, `.class`, `tag`, `[attr=value]`
- Contextual selectors: `@closest(.parent)`, `@child(.item)`
- Multiple targets execute commands on all matching elements

### Event Handling
- Advanced events require explicit `enableAdvancedEvents()` call
- `{{interpolation}}` only works when advanced events are enabled
- Expression evaluation is sandboxed (no global access, function calls)
- Invalid expressions return `undefined` and log errors

### JSON in Commands
- When passing JSON to commands (e.g., `--emit:event:{"key":"value"}`), avoid HTML entity encoding
- ❌ Wrong: `command="--emit:notify:{\"message\":\"Hello\"}"`
- ❌ Wrong: `command="--emit:notify:{&quot;message&quot;:&quot;Hello&quot;}"`
- ✅ Correct: `command='--emit:notify:{"message":"Hello"}'` (use single quotes around attribute)

### State Management
- Command states: `active`, `completed`, `disabled`, `once`
- `once` commands execute once then become `completed`
- `disabled` commands are skipped entirely
- State is tracked per command-target combination

### Error Handling
- Commands validate inputs and provide helpful error messages
- Network errors in `--fetch` commands trigger `data-after-error` chains
- Invalid selectors or missing elements log warnings
- Graceful degradation attempts to maintain accessibility

## 🧪 Enhanced Testing Patterns

### Mocking & Fixtures
- Use jsdom for DOM manipulation
- Mock fetch requests with `global.fetch`
- Test command chaining with async/await
- Verify ARIA attribute updates
- Test error conditions and recovery
- Aim for integration tests over excessive mocking

### Testing Advanced Features
```typescript
import { enableAdvancedEvents } from 'invokers/advanced';

beforeEach(() => {
  // Enable advanced features when needed
  enableAdvancedEvents();
});

it('should handle command-on events', async () => {
  document.body.innerHTML = `
    <form command-on="submit.prevent" command="--text:set:Submitted!" commandfor="output">
      <button type="submit">Submit</button>
    </form>
    <div id="output"></div>
  `;

  const form = document.querySelector('form')!;
  const output = document.querySelector('#output')!;

  form.dispatchEvent(new Event('submit'));
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(output.textContent).toBe('Submitted!');
});
```

## 🔧 Development Considerations

### Build Process
- **Clean**: `npm run clean` or `pridepack clean`
- **Build**: `npm run build` or `pridepack build`
- **Watch**: `pridepack watch` for development
- **Type Check**: `pridepack check`
- **Publish**: `npm run prepublishOnly` (builds automatically)

### Code Style
- **TypeScript**: Strict mode enabled
- **Imports**: Use relative imports within src/
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Error Handling**: Use `createInvokerError` for structured errors
- **Comments**: JSDoc for public APIs, inline for complex logic

### Performance
- Commands are cached and sorted by specificity
- Rate limiting prevents abuse (1000 executions/second)
- Expression evaluation uses LRU cache
- Singleton architecture prevents duplicate registrations

### Security
- Input sanitization for command parameters
- HTML sanitization for `--dom` commands
- URL validation for fetch operations
- No eval() or Function() constructors used

## 📁 File Locations & Organization

### Source Structure
```
src/
├── index.ts                    # Core entry point
├── core.ts                     # InvokerManager (empty of commands)
├── polyfill.ts                 # Standards polyfill
├── utils.ts                    # Utility functions
├── target-resolver.ts          # Element selection logic
├── commands/                   # Modular command packs
│   ├── base.ts                # Essential UI commands
│   ├── form.ts                # Form & content commands
│   ├── dom.ts                 # DOM manipulation
│   ├── flow.ts                # Async & flow control
│   ├── media.ts               # Media & animations
│   ├── browser.ts             # Browser APIs
│   ├── data.ts                # Data management
│   ├── device.ts              # Device APIs (vibration, geolocation, etc.)
│   └── accessibility.ts       # Accessibility helpers
├── advanced/                  # Reactive engine
│   ├── index.ts               # Complete advanced features
│   ├── events.ts              # Event triggers only
│   ├── expressions.ts         # Expression engine only
│   ├── event-trigger-manager.ts
│   ├── interpolation.ts
│   └── expression/            # Expression parser
│       ├── index.ts
│       ├── evaluator.ts
│       ├── lexer.ts
│       └── parser.ts
├── interest-invokers.ts       # Interest invokers (Tier 2)
└── demo-commands.ts           # Demo/example commands
```

### Build Outputs
```
dist/
├── esm/production/         # ESM production builds
├── esm/development/        # ESM dev builds with logging
├── cjs/production/         # CommonJS builds
├── cjs/development/        # CommonJS dev builds
└── types/                  # TypeScript declarations
```

### Examples & Documentation
```
examples/                   # Working HTML examples
├── comprehensive-demo.html # Full feature showcase
├── *-demo.html            # Specific feature demos
└── README.md              # Example documentation

docs/                      # Additional documentation
├── array.md               # Array manipulation docs
├── commands.js            # Command reference
├── expression.md          # Expression syntax
└── next.md                # Future features
```

## 📦 Pridepack Configuration

**pridepack.json** defines build targets:
```json
{
  "target": "es2018",
  "entrypoints": {
    ".": "./src/index.ts",
    "./commands/base": "./src/commands/base.ts",
    "./commands/form": "./src/commands/form.ts",
    "./commands/dom": "./src/commands/dom.ts",
    "./commands/flow": "./src/commands/flow.ts",
    "./commands/media": "./src/commands/media.ts",
    "./commands/browser": "./src/commands/browser.ts",
    "./commands/data": "./src/commands/data.ts",
    "./interest": "./src/interest-invokers.ts",
    "./advanced": "./src/advanced/index.ts",
    "./advanced/events": "./src/advanced/events.ts",
    "./advanced/expressions": "./src/advanced/expressions.ts"
  }
}
```

- **Target**: ES2018 for modern browser support
- **Entrypoints**: Multiple exports for selective importing
- **Outputs**: ESM, CJS, and type definitions

## 🌐 Example Requirements

### Content Security Policy (CSP)
Examples must include proper CSP meta tags:
```html
<meta http-equiv="Content-Security-Policy" content="default-src * 'self' blob: data: gap:; style-src * 'self' 'unsafe-inline' blob: data: gap:; script-src * 'self' 'unsafe-eval' 'unsafe-inline' blob: data: gap:; object-src * 'self' blob: data: gap:; img-src * 'self' 'unsafe-inline' blob: data: gap:; connect-src * 'self' 'unsafe-inline' blob: data: gap:; frame-src * 'self' blob: data: gap:;">
```

Without correct CSP, ES modules from esm.sh will be blocked.

### Import Strategy
Import from local `dist/` for examples

### HTML Structure
Examples should demonstrate:
- Semantic HTML with proper accessibility attributes
- Progressive enhancement (works without JS)
- Declarative patterns over imperative code
- Integration with existing frameworks

## 🌐 Web Standards Compatibility

### W3C/WHATWG Proposals
- **Invoker Commands API**: `command` and `commandfor` attributes
- **Interest Invokers**: `interestfor` attribute for hover cards
- **Popover API**: `popover` attribute integration
- **View Transitions**: Automatic support for smooth animations

### Browser Support
- **Modern Browsers**: Full feature support
- **Legacy Browsers**: Graceful degradation via polyfills
- **Mobile**: Touch and gesture support
- **Accessibility**: Screen reader and keyboard navigation

### Future Compatibility
- Designed to work with native browser implementations
- Polyfills automatically disable when native support arrives
- API designed to match future standards exactly

## 🔌 Plugin System

### Architecture
- Middleware hooks at command execution lifecycle points
- Plugin interface with `onRegister`/`onUnregister` callbacks
- Global and command-specific middleware

### Hook Points
- `BEFORE_COMMAND` - Pre-execution validation
- `AFTER_COMMAND` - Post-execution cleanup
- `ON_SUCCESS`/`ON_ERROR` - Conditional logic
- `BEFORE_VALIDATION`/`AFTER_VALIDATION` - Input processing

### Usage
```javascript
const myPlugin = {
  name: 'analytics',
  middleware: {
    BEFORE_COMMAND: (context) => {
      // Track command usage
    }
  }
};

InvokerManager.getInstance().registerPlugin(myPlugin);
```

## 🐛 Debugging & Troubleshooting

### Debug Mode
Enable with `window.Invoker.debug = true` for detailed logging.

### Common Issues
- **Commands not executing**: Check `commandfor` targets exist
- **Advanced events not working**: Ensure `enableAdvancedEvents()` called
- **Interpolation failing**: Verify advanced events enabled and syntax correct
- **CSP errors**: Add proper CSP headers for esm.sh

### Error Messages
- Structured error objects with severity levels
- Recovery suggestions included
- Element and command context provided
- Console logging with grouping for readability

## 🚀 Migration & Compatibility

### Version Changes
- v1.5.0: Plugin system added, modular architecture
- v1.4.0: Singleton pattern, enhanced fetch commands
- v1.3.0: Pipeline functionality
- v1.2.0: Interest Invokers and future commands

### Breaking Changes in v1.5
- **Core is empty by design**: `registerCoreLibraryCommands()` method is now empty
- **Explicit imports required**: Commands must be imported and registered
- **Advanced features opt-in**: `command-on` and `{{...}}` require explicit enabling

### Backward Compatibility
- Old monolithic `invoker-commands.ts` still exists for gradual migration
- Can mix old and new import styles during transition
- All existing HTML attributes and commands work the same way

### Migration Strategy
1. **Phase 1**: Install v1.5, add required imports for existing functionality
2. **Phase 2**: Gradually switch to modular imports
3. **Phase 3**: Remove unused command packs to optimize bundle size

## 🔍 Parsing, Interpolation & Command Syntax

This section provides comprehensive details about how Invokers parses commands, handles interpolation, manages selectors, and processes command chaining. Understanding these core mechanisms is essential for advanced usage and debugging.

### Command Syntax & Parsing

#### Command String Format
Commands use a colon-delimited syntax with the following structure:
```
--command:parameter1:parameter2:parameter3
```

#### Parsing Algorithm
The `parseCommandString` function in `core.ts` handles command parsing with these rules:

1. **Delimiter Handling**: Uses `:` as the primary delimiter
2. **Brace Awareness**: Preserves content within `{{...}}` expressions by tracking brace depth
3. **Escaping**: Supports backslash escaping (`\:`) to include literal colons in parameters
4. **Whitespace Trimming**: Automatically trims whitespace from parsed parts

**Example Parsing:**
```javascript
// Input: "--text:set:Hello {{name}}!"
// Output: ["--text", "set", "Hello {{name}}!"]
parseCommandString("--text:set:Hello {{name}}!");
```

#### Command Prefix Rules
- **Custom Commands**: Must start with `--` (double dash)
- **Native Commands**: No prefix (e.g., `show-modal`, `close`)
- **Automatic Prefixing**: Commands registered without `--` are automatically prefixed

#### Comma-Separated Commands
Multiple commands can be specified in a single `command` attribute, separated by commas:

```html
<!-- Multiple commands on one element -->
<button command="--text:set:First, --text:append: Second" commandfor="output">
  Execute Both Commands
</button>
<div id="output">Initial</div>
```

**Features:**
- **Sequential Execution**: Commands execute in the order specified
- **Shared Target**: All commands in the list target the same element(s)
- **Error Isolation**: Invalid commands are skipped, valid ones continue
- **Whitespace Tolerance**: Extra spaces around commas are ignored

**Escaped Commas:**
Use backslash to include literal commas in command parameters:

```html
<!-- Escaped comma in parameter -->
<button command="--text:set:Hello\, World!, --text:append: Welcome" commandfor="output">
  Greeting
</button>
<!-- Results in: "Hello, World! Welcome" -->
```

**Parsing Rules:**
- Commands are split on unescaped commas
- `\` escapes the following comma: `\,` → `,`
- `\\` produces a literal backslash: `\\` → `\`
- Whitespace around commands and commas is trimmed

### Interpolation Engine (`{{...}}`)

#### Expression Grammar
The interpolation engine uses a custom expression language with the following grammar:

```
expression ::= conditional
conditional ::= logical_or ('?' expression ':' conditional)?
logical_or ::= logical_and ('||' logical_and)*
logical_and ::= equality ('&&' equality)*
equality ::= comparison (('==='|'!=='|'=='|'!=') comparison)*
comparison ::= term (('<'|'>'|'<='|'>=') term)*
term ::= factor (('+'|'-') factor)*
factor ::= unary (('*'|'/'|'%') unary)*
unary ::= ('!'|'-') unary | primary
primary ::= literal | identifier | '(' expression ')' | member_access | array_access | call_expression
```

#### Supported Operators
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Comparison**: `===`, `!==`, `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `&&`, `||`, `!`
- **Ternary**: `condition ? true_value : false_value`

#### Data Types
- **Literals**: Numbers, strings (`'single'` or `"double"`), booleans (`true`/`false`), `null`
- **Arrays**: `[item1, item2, item3]`
- **Objects**: `{key: 'value', nested: {prop: 42}}`

#### Context Variables
Expressions have access to a context object containing:
- **Invoker Properties**: `this.value`, `this.dataset`, `this.checked`, etc.
- **Event Data**: `event.type`, `event.detail`, `event.target`
- **Target Element**: `target.id`, `target.className`, etc.
- **Helper Functions**: Built-in utility functions (see below)

#### Built-in Helper Functions
```javascript
// String helpers
capitalize(str)    // "hello" → "Hello"
truncate(str, len) // "long text" → "long..."
pluralize(count, singular, plural)

// Array helpers
join(arr, sep)     // [1,2,3] → "1,2,3"
filter(arr, pred)  // Filter array by predicate
sort(arr, prop)    // Sort array by property

// Date helpers
formatDate(date, format) // Format dates
timeAgo(date)             // "2 hours ago"

// Number helpers
formatNumber(num, opts)   // Localized number formatting
formatCurrency(amount)    // Currency formatting

// Utility helpers
isEmpty(value)     // Check if value is empty
isNotEmpty(value)  // Check if value is not empty
```

#### Security Features
- **Sandboxing**: No access to `window`, `document`, `eval`, `Function`, etc.
- **Safe Property Access**: Blocked access to `__proto__`, `constructor`, `prototype`
- **Recursion Limits**: Maximum 100 recursion depth
- **Size Limits**: Maximum 10,000 characters per expression, 1,000 tokens
- **Rate Limiting**: Maximum 1,000 evaluations per second

#### Expression Evaluation Process
1. **Lexing**: Tokenize input string using regex patterns
2. **Parsing**: Build Abstract Syntax Tree (AST) using recursive descent
3. **Evaluation**: Traverse AST with context object
4. **Caching**: Parsed expressions cached for performance (LRU cache, max 100 entries)

### Escaping Mechanisms

#### Command Parameter Escaping
- **Colon Escaping**: Use `\:` to include literal colons in parameters
- **Backslash Handling**: `\\` becomes `\`, `\:` becomes `:`

**Example:**
```html
<!-- Without escaping: --text:set:Hello: World -->
<!-- With escaping: --text:set:Hello\: World -->
<button command="--text:set:Hello\: World!" commandfor="output">
```

#### Template Escaping
- **Expression Escaping**: Use `\{\{` to display literal `{{`
- **HTML Escaping**: Automatic in safe contexts

#### Selector Escaping
- **CSS Selector Escaping**: Standard CSS escaping rules apply
- **Contextual Selector Escaping**: Use `\\(` and `\\)` for literal parentheses in `@closest(selector)`

### Target Resolution & Selectors

#### Selector Types

##### 1. ID Selectors (Default)
```html
<button command="--toggle" commandfor="my-element">
<!-- Resolves to: document.getElementById("my-element") -->
```

##### 2. Global CSS Selectors
```html
<button command="--toggle" commandfor=".items">
<!-- Resolves to: document.querySelectorAll(".items") -->
<!-- Executes command on ALL matching elements -->
```

##### 3. Contextual Selectors (Advanced)
```html
<!-- Find closest ancestor -->
<button command="--toggle" commandfor="@closest(.card)">
<!-- Find first child -->
<button command="--toggle" commandfor="@child(.content)">
<!-- Find all children -->
<button command="--toggle" commandfor="@children(input)">
```

#### Resolution Priority
1. **Contextual (`@` prefix)**: Relative to invoker element
2. **ID Pattern**: Simple strings without special chars
3. **Global CSS**: Any valid CSS selector

#### Multiple Target Execution
When selectors match multiple elements:
- Command executes on each target sequentially
- Context includes current target element
- Errors in one target don't stop execution on others

### Command Chaining

#### Chaining Mechanisms

##### 1. `<and-then>` Elements
```html
<button command="--fetch:get" commandfor="data-container">
  <and-then command="--text:set:Loaded!" commandfor="status" data-delay="500"></and-then>
  <and-then command="--class:add:success" commandfor="data-container" data-condition="success"></and-then>
</button>
```

**Features:**
- **Nesting**: Supports nested `<and-then>` chains
- **Conditions**: `data-condition="success|error|always"`
- **Delays**: `data-delay="500"` for timing control
- **State Management**: `data-once` for single execution
- **Context Passing**: Parent result passed to children

##### 2. Attribute-Based Chaining
```html
<button command="--fetch:get"
        data-and-then="--text:set:Loaded!"
        data-then-target="status"
        data-after-success="--class:add:success"
        data-after-error="--class:add:error"
        commandfor="data-container">
```

##### 3. Programmatic Chaining
```javascript
// In command context
context.executeAfter("--next:command", "target-id");
context.executeConditional({
  onSuccess: ["--success:action"],
  onError: ["--error:handler"]
});
```

#### Chaining Execution Flow
1. **Primary Command**: Executes first
2. **Result Capture**: Success/failure result stored
3. **Chain Trigger**: `<and-then>` elements processed
4. **Recursive Execution**: Nested chains execute depth-first
5. **State Updates**: Commands marked as completed/once

#### Chain Safety
- **Depth Limiting**: Maximum 25 nesting levels
- **Infinite Loop Prevention**: State tracking prevents re-execution
- **Error Isolation**: Chain errors don't break parent execution

### Advanced Features

#### Template Processing
```html
<template id="item-template">
  <li data-tpl-attr:id="item-{{__uid}}"
      data-tpl-text="title"
      data-tpl-attr:class="completed ? 'done' : ''">
    <span>{{title}}</span>
    <button command="--toggle" commandfor="@closest(li)">Complete</button>
  </li>
</template>

<button command="--dom:append"
        data-with-json='{"title": "New Item", "completed": false}'
        commandfor="todo-list">
```

**Processing Steps:**
1. **Clone Template**: Create DOM fragment from template
2. **Interpolate JSON**: Process `data-with-json` with `{{...}}`
3. **Inject Data**: Apply `data-tpl-*` attributes
4. **Resolve Selectors**: Convert `@closest` to actual IDs
5. **Insert Fragment**: Add processed content to DOM

#### Event Triggers (`command-on`)
```html
<form command-on="submit.prevent" command="--form:submit" commandfor="result">
  <!-- Triggers on form submit, prevents default -->
</form>

<input command-on="input.debounce.300" command="--search:update">
<!-- Debounced input handling -->
```

**Event Modifiers:**
- `.prevent`: `preventDefault()`
- `.stop`: `stopPropagation()`
- `.once`: Single execution
- `.debounce.ms`: Debounced execution
- `.throttle.ms`: Throttled execution

### Error Handling & Debugging

#### Error Types
- **Parse Errors**: Invalid command syntax
- **Evaluation Errors**: Expression evaluation failures
- **Target Errors**: Selector resolution failures
- **Execution Errors**: Command runtime failures

#### Debug Mode
Enable with `window.Invoker.debug = true` for:
- Command execution logging
- Expression evaluation details
- Selector resolution traces
- Performance metrics

#### Error Recovery
- **Graceful Degradation**: Invalid commands logged but don't crash
- **Fallback Values**: Undefined expressions return empty strings
- **Context Preservation**: Errors include full context for debugging

### Performance Considerations

#### Caching
- **Expression Cache**: Parsed ASTs cached (LRU, 100 entries)
- **Rate Limiting**: 1000 evaluations/second global limit
- **Command Sorting**: Commands sorted by specificity for faster matching

#### Optimization Tips
- **Avoid Deep Nesting**: Limit expression complexity
- **Use Specific Selectors**: Prefer IDs over complex CSS selectors
- **Batch Operations**: Use global selectors for bulk operations
- **Cache Context**: Reuse context objects when possible

### Migration & Compatibility

#### Breaking Changes in v1.5
- **Interpolation Opt-in**: `{{...}}` requires `enableAdvancedEvents()`
- **Command Prefixing**: Automatic `--` prefixing for custom commands
- **Context Changes**: Enhanced context object with more properties

#### Backward Compatibility
- **Legacy Selectors**: Old `commandfor` patterns still work
- **Native Commands**: No prefix required for browser natives
- **Attribute Chaining**: Old `data-and-then` patterns supported

---

## 🛠️ Adding Commands to Invokers

This section provides comprehensive guidance for AI agents on how to add new commands to the Invokers library. Adding commands requires careful consideration of the architecture, testing, and integration with existing features.

### 📋 How to Add Commands

#### 1. **Choose the Right Command Pack**
Commands are organized into modular packs based on functionality:

- **`base.ts`**: Essential UI manipulation (toggle, show/hide, classes, attributes)
- **`form.ts`**: Form interactions and content manipulation
- **`dom.ts`**: Advanced DOM manipulation and templating
- **`flow.ts`**: Async operations, navigation, and control flow
- **`media.ts`**: Media controls and animations
- **`browser.ts`**: Browser API integration (cookies, etc.)
- **`data.ts`**: Data manipulation and reactive binding

**Considerations:**
- Does your command fit existing pack themes?
- Would it create unwanted bundle size for users who don't need it?
- Could it be a separate pack if it's domain-specific?

#### 2. **Command Implementation Pattern**
All commands follow the same structure:

```typescript
// src/commands/example.ts
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, validateElement } from '../index';

const exampleCommands: Record<string, CommandCallback> = {
  '--example:action': ({ invoker, targetElement, params }: CommandContext) => {
    // 1. Input validation
    if (!params[0]) {
      throw createInvokerError(
        'Example action requires a parameter',
        ErrorSeverity.ERROR,
        {
          command: '--example:action',
          element: invoker,
          recovery: 'Use format: --example:action:parameter'
        }
      );
    }

    // 2. Target validation (if needed)
    const validationErrors = validateElement(targetElement, {
      tagName: ['div', 'span'], // Optional tag restrictions
      requiredAttributes: ['data-example'] // Optional attribute requirements
    });

    if (validationErrors.length > 0) {
      throw createInvokerError(
        `Example command failed: ${validationErrors.join(', ')}`,
        ErrorSeverity.ERROR,
        {
          command: '--example:action',
          element: invoker,
          recovery: 'Ensure target element meets requirements'
        }
      );
    }

    // 3. Command logic
    try {
      // Your command implementation here
      targetElement.textContent = `Action: ${params[0]}`;

      // 4. Accessibility updates (if applicable)
      targetElement.setAttribute('aria-label', `Updated with: ${params[0]}`);

    } catch (error) {
      throw createInvokerError(
        'Failed to execute example action',
        ErrorSeverity.ERROR,
        {
          command: '--example:action',
          element: invoker,
          cause: error as Error,
          recovery: 'Check command parameters and target element state'
        }
      );
    }
  }
};

export function registerExampleCommands(manager: InvokerManager): void {
  for (const name in exampleCommands) {
    if (exampleCommands.hasOwnProperty(name)) {
      manager.register(name, exampleCommands[name]);
    }
  }
}
```

#### 3. **Registration and Build Integration**
Add your command pack to the build system:

```json
// pridepack.json - Add entry point
{
  "entrypoints": {
    "./commands/example": "./src/commands/example.ts"
  }
}

// package.json - Add export
{
  "exports": {
    "./commands/example": {
      "types": "./dist/types/commands/example.d.ts",
      "development": {
        "require": "./dist/cjs/development/commands/example.js",
        "import": "./dist/esm/development/commands/example.js"
      },
      "require": "./dist/cjs/production/commands/example.js",
      "import": "./dist/esm/production/commands/example.js"
    }
  }
}
```

### ⚠️ Things to Consider When Adding Commands

#### **Performance Impact**
- **Bundle Size**: Consider the impact on users who import your pack
- **Execution Speed**: Avoid expensive operations in command execution
- **Memory Usage**: Don't create memory leaks (clean up event listeners, etc.)
- **Rate Limiting**: Respect the global 1000 executions/second limit

#### **Security Considerations**
- **Input Sanitization**: Always validate and sanitize user inputs
- **Safe DOM Manipulation**: Use safe methods, avoid `innerHTML` when possible
- **URL Validation**: For navigation/fetch commands, validate URLs
- **Permission Checks**: For sensitive APIs (geolocation, etc.), check availability

#### **Accessibility (A11Y)**
- **ARIA Updates**: Update `aria-*` attributes when changing element state
- **Screen Reader Announcements**: Use `role="status"` or live regions for dynamic content
- **Keyboard Navigation**: Ensure commands work with keyboard-only navigation
- **Focus Management**: Handle focus appropriately for UI changes

#### **Cross-Browser Compatibility**
- **Feature Detection**: Check for API availability before using
- **Polyfills**: Consider if your command needs polyfills
- **Fallbacks**: Provide graceful degradation for unsupported features

#### **Integration with Existing Features**
- **Command Chaining**: Commands should work with `<and-then>` elements
- **Interpolation**: Support `{{expressions}}` in parameters if applicable
- **Event Triggers**: Consider if `command-on` integration makes sense
- **State Management**: Respect command states (`disabled`, `once`, etc.)

### 🧪 Testing Commands

#### **Test Setup Pattern**
```typescript
// test/example-commands.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from 'invokers';
import { registerExampleCommands } from 'invokers/commands/example';

describe('Example Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();

    // IMPORTANT: Register your commands
    registerExampleCommands(manager);
  });

  describe('--example:action command', () => {
    it('should update target element text content', async () => {
      document.body.innerHTML = `
        <button command="--example:action:hello" commandfor="target">Action</button>
        <div id="target" data-example>Content</div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('Action: hello');
    });

    it('should update aria-label for accessibility', async () => {
      // Test accessibility updates
    });

    it('should throw error for missing parameter', async () => {
      document.body.innerHTML = `
        <button command="--example:action" commandfor="target">Action</button>
        <div id="target" data-example>Content</div>
      `;

      const button = document.querySelector('button')!;

      // Note: Command errors are logged, not thrown synchronously
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify error was logged or command didn't execute
      const target = document.querySelector('#target')!;
      expect(target.textContent).toBe('Content'); // Unchanged
    });

    it('should throw error for invalid target element', async () => {
      document.body.innerHTML = `
        <button command="--example:action:hello" commandfor="invalid-target">Action</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Command should fail gracefully
    });
  });
});
```

#### **Test Categories**
1. **Happy Path Tests**: Normal operation with valid inputs
2. **Error Handling Tests**: Invalid parameters, missing elements, etc.
3. **Edge Case Tests**: Empty values, special characters, etc.
4. **Integration Tests**: Command chaining, interpolation, etc.
5. **Accessibility Tests**: ARIA attribute updates, focus management
6. **Performance Tests**: Large datasets, rapid execution

### 🔧 Working Around Test Environment Limitations

#### **DOM API Limitations**
- **Missing APIs**: `AnimationEvent`, `TransitionEvent` may not be available
- **Mock DOM Elements**: Use jsdom-compatible element creation
- **Async Timing**: Use `await new Promise(resolve => setTimeout(resolve, 0))` for command execution

#### **Browser API Mocks**
```typescript
// Mock fetch for network commands
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mocked' })
  })
);

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('mocked text')
  },
  writable: true
});

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success) =>
      success({ coords: { latitude: 0, longitude: 0 } })
    )
  },
  writable: true
});
```

#### **Event Simulation**
```typescript
// Simulate complex events
const event = new Event('input', { bubbles: true });
inputElement.value = 'test';
inputElement.dispatchEvent(event);

// For animation events (if not available)
const animationEvent = new CustomEvent('animationend', {
  detail: { animationName: 'test-animation' }
});
element.dispatchEvent(animationEvent);
```

### 🔍 Checking Edge Cases with Other Features

#### **Command Chaining Integration**
Test commands work with `<and-then>` elements:
```typescript
it('should work with command chaining', async () => {
  document.body.innerHTML = `
    <button command="--example:action:hello" commandfor="target">
      <and-then command="--text:set:Chained!" commandfor="status"></and-then>
    </button>
    <div id="target" data-example>Content</div>
    <div id="status">Status</div>
  `;

  const button = document.querySelector('button')!;
  button.click();
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(document.querySelector('#target')!.textContent).toBe('Action: hello');
  expect(document.querySelector('#status')!.textContent).toBe('Chained!');
});
```

#### **Interpolation Engine Integration**
Test commands handle `{{expressions}}` in parameters:
```typescript
it('should support interpolation in parameters', async () => {
  document.body.innerHTML = `
    <button command="--example:action:{{value}}" commandfor="target" data-value="interpolated">Action</button>
    <div id="target" data-example>Content</div>
  `;

  // Enable advanced features for interpolation
  enableAdvancedEvents();

  const button = document.querySelector('button')!;
  button.click();
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(document.querySelector('#target')!.textContent).toBe('Action: interpolated');
});
```

#### **Event Triggers Integration**
Test commands work with `command-on` attributes:
```typescript
it('should work with event triggers', async () => {
  document.body.innerHTML = `
    <input command-on="input" command="--example:action:{{this.value}}" commandfor="target">
    <div id="target" data-example>Content</div>
  `;

  enableAdvancedEvents();

  const input = document.querySelector('input')!;
  input.value = 'triggered';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  await new Promise(resolve => setTimeout(resolve, 0));

  expect(document.querySelector('#target')!.textContent).toBe('Action: triggered');
});
```

#### **State Management Integration**
Test commands respect execution states:
```typescript
it('should respect once state', async () => {
  document.body.innerHTML = `
    <button command="--example:action:once" commandfor="target" data-state="once">Action</button>
    <div id="target" data-example>Content</div>
  `;

  const button = document.querySelector('button')!;
  const target = document.querySelector('#target')!;

  // First click should work
  button.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(target.textContent).toBe('Action: once');

  // Reset content for second test
  target.textContent = 'Content';

  // Second click should be ignored (once state)
  button.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(target.textContent).toBe('Content'); // Unchanged
});
```

#### **Plugin System Integration**
Test commands work with middleware:
```typescript
it('should work with plugins', async () => {
  const testPlugin = {
    name: 'test-plugin',
    middleware: {
      BEFORE_COMMAND: vi.fn(),
      AFTER_COMMAND: vi.fn()
    }
  };

  manager.registerPlugin(testPlugin);

  document.body.innerHTML = `
    <button command="--example:action:test" commandfor="target">Action</button>
    <div id="target" data-example>Content</div>
  `;

  const button = document.querySelector('button')!;
  button.click();
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(testPlugin.middleware.BEFORE_COMMAND).toHaveBeenCalled();
  expect(testPlugin.middleware.AFTER_COMMAND).toHaveBeenCalled();
});
```

### 🔗 Things Commands Share

#### **Common Patterns**
All commands share these characteristics:

1. **Consistent API**: All receive `CommandContext` with `invoker`, `targetElement`, `params`
2. **Error Handling**: Use `createInvokerError` with structured error information
3. **Async Support**: Commands can be async, return Promises
4. **Target Resolution**: Use `getTargets()` for flexible element selection
5. **State Management**: Respect command execution states

#### **Shared Utilities**
Commands can use these shared utilities:

- **`validateElement()`**: Element validation with tag/attribute checks
- **`createInvokerError()`**: Structured error creation
- **`logInvokerError()`**: Debug logging with context
- **`sanitizeParams()`**: Input sanitization
- **`parseCommandString()`**: Parameter parsing with brace awareness

#### **Performance Characteristics**
- **Rate Limited**: Global 1000 executions/second limit
- **Cached**: Expression evaluation uses LRU cache
- **Sorted**: Commands sorted by specificity for fast matching
- **Isolated**: Command failures don't crash the system

#### **Security Features**
- **Input Validation**: All parameters validated
- **Safe Evaluation**: Expression engine sandboxed
- **DOM Safety**: Safe DOM manipulation methods preferred
- **Permission Checks**: API availability verified

#### **Accessibility Standards**
- **ARIA Updates**: Automatic accessibility attribute management
- **Screen Reader Support**: Live regions and announcements
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling

#### **Debugging Support**
- **Verbose Logging**: Debug mode provides detailed execution logs
- **Error Context**: Errors include full execution context
- **Performance Metrics**: Execution timing and rate limit tracking
- **State Inspection**: Command state tracking and inspection

---

**Debug Mode Notes**: This library has a debug mode enabled via `window.Invoker.debug = true`. All console logging throughout the codebase is now wrapped with debug checks to ensure clean production output while providing verbose logging when debugging.

**Code Editing**: All console logging has been wrapped with debug checks. When adding new logging, always use the pattern:
```typescript
if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
  console.log(...);
}
```

**Platform Support**: Make sure everything supports the latest platform features, view transitions, etc., and integrates seamlessly with the rest of the library.

**Environment**: We are on Windows, use PowerShell.

## 🔄 Command Comparisons: Native vs Custom

Understanding the differences between native browser commands and custom Invokers commands is crucial for effective usage. This section compares commonly confused commands.

### `toggle` (Native) vs `--toggle` (Custom)

The `toggle` and `--toggle` commands serve similar purposes but have fundamentally different implementations and use cases.

#### **Native `toggle` Command**
- **Purpose**: Specifically designed for `<details>` elements
- **Action**: Toggles the `open` attribute on `<details>` elements
- **Scope**: Very narrow - only works with details/summary elements
- **Syntax**: `<button command="toggle" commandfor="details-id">`
- **No Prefix**: Uses bare `toggle` (no `--`)

**Example:**
```html
<details id="faq">
  <summary>What is Invokers?</summary>
  <p>Invokers is a library for declarative UI interactions...</p>
</details>
<button command="toggle" commandfor="faq">Toggle FAQ</button>
```

#### **Custom `--toggle` Command**
- **Purpose**: General-purpose element visibility toggling
- **Action**: Toggles the `hidden` attribute on any HTML element
- **Scope**: Broad - works with any element type
- **Syntax**: `<button command="--toggle" commandfor="any-element-id">`
- **Features**:
  - **ARIA Management**: Automatically updates `aria-expanded` and `aria-pressed` attributes
  - **View Transitions**: Uses `document.startViewTransition()` for smooth animations
  - **Multiple Targets**: Can toggle multiple elements simultaneously
  - **Error Handling**: Comprehensive validation with recovery suggestions
  - **Debug Support**: Detailed logging in debug mode

**Example:**
```html
<div id="panel" hidden>
  <h3>Settings Panel</h3>
  <p>Configuration options...</p>
</div>
<button command="--toggle" commandfor="panel">Toggle Settings</button>
```

#### **Key Differences**

| Aspect | `toggle` (Native) | `--toggle` (Custom) |
|--------|------------------|-------------------|
| **Target Elements** | `<details>` only | Any HTML element |
| **Attribute Modified** | `open` | `hidden` |
| **ARIA Updates** | None | `aria-expanded`, `aria-pressed` |
| **Animations** | None | View Transitions support |
| **Multiple Targets** | Single target | Multiple targets supported |
| **Error Handling** | Basic browser behavior | Comprehensive with recovery |
| **Debug Logging** | None | Detailed debug output |
| **Accessibility** | Basic | Enhanced with ARIA management |

#### **When to Use Each**

- **Use `toggle`**: When working specifically with `<details>` elements for collapsible content
- **Use `--toggle`**: For general show/hide functionality with better accessibility and user experience

#### **Advanced `--toggle` Features**

The `--toggle` command includes sophisticated state management:

```html
<!-- Multiple targets -->
<button command="--toggle" commandfor="panel1,panel2,panel3">Toggle All Panels</button>

<!-- With ARIA state management -->
<button command="--toggle" commandfor="menu" aria-expanded="false">
  Menu
</button>

<!-- Works with view transitions -->
<style>
  .panel {
    transition: opacity 0.3s ease;
  }
  .panel[hidden] {
    opacity: 0;
  }
</style>
```

#### **Migration Guide**

**From native `toggle`:**
```html
<!-- Old: Only works with details -->
<details id="item">
  <summary>Item</summary>
  <div>Content</div>
</details>
<button command="toggle" commandfor="item">Toggle</button>
```

**To custom `--toggle`:**
```html
<!-- New: Works with any element -->
<div id="item-content" hidden>
  <div>Content</div>
</div>
<button command="--toggle" commandfor="item-content" aria-expanded="false">
  Toggle Item
</button>
```

The custom `--toggle` command provides a more robust, accessible, and feature-rich alternative to the native `toggle` command while maintaining backward compatibility.

This guide should provide everything needed to effectively work with the modularized Invokers library. For specific implementation details, refer to the source code and the examples directory.
