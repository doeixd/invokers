# Invokers

[![npm version](https://badge.fury.io/js/invokers.svg)](https://www.npmjs.com/package/invokers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/doeixd/invokers)

Invokers is a platform-first JavaScript library for declarative HTML interactions.
It polyfills the emerging HTML `command` / `commandfor` model and adds opt-in
command packs for common UI behavior such as show/hide, forms, fetch, media,
storage, accessibility, and workflow chaining.

The core package is intentionally small. Custom commands that start with `--`
must be registered from a command pack unless you use the compatibility build.

## Choose Your Import

| If you want... | Use... |
| --- | --- |
| Standards polyfill only | `import "invokers"` |
| Fast demo or legacy migration | `import "invokers/compatible"` |
| Small production bundle | `invokers` plus explicit command packs |
| Hovercards and tooltips | `import "invokers/interest"` |
| Larger declarative app features | `invokers/state`, `invokers/control`, `invokers/components`, `invokers/forms` |

## Install

```bash
npm install invokers
```

## Quick Start

Use the compatibility build when you want the easiest browser copy-paste path for
common commands:

```html
<!doctype html>
<html>
  <head>
    <script type="module" src="https://esm.sh/invokers/compatible"></script>
  </head>
  <body>
    <button type="button" command="--toggle" commandfor="menu" aria-expanded="false">
      Menu
    </button>

    <nav id="menu" hidden>
      <a href="/home">Home</a>
      <a href="/about">About</a>
      <button type="button" command="--hide" commandfor="menu">Close</button>
    </nav>
  </body>
</html>
```

For production bundles, prefer explicit imports:

```js
import invokers from "invokers";
import { registerBaseCommands } from "invokers/commands/base";
import { registerFormCommands } from "invokers/commands/form";

registerBaseCommands(invokers);
registerFormCommands(invokers);
```

```html
<button type="button" command="--toggle" commandfor="panel">Toggle</button>
<section id="panel" hidden>Panel content</section>

<button type="button" command="--text:set:Saved" commandfor="status">Save</button>
<p id="status"></p>
```

`commandfor` can point to an element ID such as `panel`. Invokers also supports
selector-style targets such as `#panel` in its command resolution.

## Native-Style Commands vs Extension Commands

Native-style commands do not use a `--` prefix:

```html
<button type="button" command="toggle-popover" commandfor="menu">Menu</button>
<div id="menu" popover>Menu content</div>

<button type="button" command="show-modal" commandfor="dialog">Open</button>
<dialog id="dialog">Hello</dialog>
```

Invokers extension commands use a `--` prefix and are provided by command packs:

```html
<button type="button" command="--class:toggle:active" commandfor="card">
  Toggle active
</button>
<article id="card">Card</article>
```

## Package Structure

| Area | Import | What it provides |
| --- | --- | --- |
| Core polyfill | `invokers` | `CommandEvent`, `command`, `commandfor`, `InvokerManager`, native-style command handling |
| Compatibility build | `invokers/compatible` | Core plus the common command packs and advanced events for legacy or demo use |
| Interest Invokers | `invokers/interest` | `interestfor` hover/focus/long-press popover behavior |
| Anchor adapters | `invokers/anchors` | Optional anchor/custom-element invoker adapters |
| Advanced events | `invokers/advanced` | `command-on` plus expression interpolation |
| State module | `invokers/state` | Reactive state store, state commands, computed values, data binding |
| Control module | `invokers/control` | Conditional rendering, switch/case, loops, async command flow |
| Components module | `invokers/components` | Template components, props, slots, scoped styles |
| Forms module | `invokers/forms` | Validation, form state, submission handling, form commands |

`invokers/compatible` registers `base`, `form`, `dom`, `fetch`, `websocket`,
`sse`, `navigation`, `media`, `browser`, `data`, `device`, `accessibility`, and
`storage`, and enables advanced events. It does not load Interest Invokers,
anchor adapters, random commands, loop commands, or the `state` / `control` /
`components` / `forms` app modules. Import those directly when you use them.

## Command Packs

Register only the packs your app needs:

| Import | Registration function | Common commands |
| --- | --- | --- |
| `invokers/commands/base` | `registerBaseCommands(manager)` | `--toggle`, `--show`, `--hide`, `--class:*`, `--attr:*` |
| `invokers/commands/form` | `registerFormCommands(manager)` | `--text:*`, `--value:*`, `--focus`, `--disabled:*`, `--form:*`, `--input:step` |
| `invokers/commands/dom` | `registerDomCommands(manager)` | `--dom:*`, `--template:*` |
| `invokers/commands/fetch` | `registerFetchCommands(manager)` | `--fetch:get`, `--fetch:post`, `--fetch:put`, `--fetch:patch`, `--fetch:delete`, `--fetch:head`, `--fetch:options` |
| `invokers/commands/navigation` | `registerNavigationCommands(manager)` | `--navigate:to`, `--emit`, `--bind`, `--command:trigger`, `--command:delay`, `--pipeline:execute` |
| `invokers/commands/websocket` | `registerWebSocketCommands(manager)` | `--websocket:*` |
| `invokers/commands/sse` | `registerSSECommands(manager)` | `--sse:*` |
| `invokers/commands/media` | `registerMediaCommands(manager)` | `--media:*`, `--carousel:*`, `--scroll:*`, `--clipboard:*`, `--animate:*` |
| `invokers/commands/browser` | `registerBrowserCommands(manager)` | `--cookie:*`, `--url:*`, `--history:*` |
| `invokers/commands/data` | `registerDataCommands(manager)` | `--data:*` and array/data helpers |
| `invokers/commands/device` | `registerDeviceCommands(manager)` | `--device:vibrate`, `--device:share`, geolocation, battery, clipboard, wake lock |
| `invokers/commands/accessibility` | `registerAccessibilityCommands(manager)` | `--a11y:*` |
| `invokers/commands/storage` | `registerStorageCommands(manager)` | `--storage:*` |
| `invokers/commands/random` | `registerRandomCommands(manager)` | `--random:*` |
| `invokers/commands/loop` | `registerLoopCommands(manager)` | `--dom:repeat-append`, `--dom:repeat-replace`, `--dom:repeat-prepend`, `--dom:repeat-update` |
| `invokers/commands/flow` | `registerFlowCommands(manager)` | Compatibility pack for fetch, WebSocket, SSE, and navigation commands |

Example:

```js
import invokers from "invokers";
import { registerFetchCommands } from "invokers/commands/fetch";
import { registerNavigationCommands } from "invokers/commands/navigation";

registerFetchCommands(invokers);
registerNavigationCommands(invokers);
```

```html
<button
  type="button"
  command="--fetch:get"
  commandfor="results"
  data-url="/api/items"
  data-response-type="html"
  data-replace-strategy="innerHTML"
>
  Load items
</button>

<div id="results"></div>
```

## Advanced Events and Expressions

Enable advanced events when commands should run from events other than click, or
when command parameters need `{{...}}` interpolation:

```js
import invokers from "invokers";
import { enableAdvancedEvents } from "invokers/advanced";
import { registerFormCommands } from "invokers/commands/form";

registerFormCommands(invokers);
enableAdvancedEvents();
```

```html
<input
  command-on="input"
  command="--text:set:Hello {{this.value}}"
  commandfor="preview"
>
<p id="preview"></p>
```

Smaller advanced imports are available:

```js
import { enableEventTriggers } from "invokers/advanced/events";
import { enableExpressionEngine } from "invokers/advanced/expressions";
```

## Interest Invokers

Interest Invokers are loaded separately from command packs:

```js
import "invokers/interest";
```

```html
<a href="/profile" interestfor="profile-card">@username</a>

<div id="profile-card" popover="hint">
  Profile preview
</div>
```

Use this for tooltips, hovercards, and preview popovers. See
`examples/interest-invokers-demo.html` for a fuller demo.

## Anchor Invokers

Anchor adapters let `href` drive declarative fetch/navigation behavior without
making anchors part of the core activation path:

```js
import { enableAnchorInvokers } from "invokers/anchors";
import { registerFetchCommands } from "invokers/commands/fetch";
import invokers from "invokers";

registerFetchCommands(invokers);
enableAnchorInvokers();
```

```html
<a href="/posts?page=2" commandfor="#posts" data-select="#posts">
  Next page
</a>

<div id="posts"></div>
```

See `docs/adapters.md` for custom adapter support.

## App Modules

The app modules are opt-in higher-level features:

```js
import "invokers";
import { enableState } from "invokers/state";
import { enableControl } from "invokers/control";
import { enableComponents } from "invokers/components";
import { enableForms } from "invokers/forms";

enableState();
enableControl();
enableComponents();
enableForms();
```

These modules are intended for larger declarative applications. Import them
directly instead of relying on the compatibility build.

## Testing

Tests should register the exact command packs they exercise:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import invokers, { InvokerManager } from "invokers";
import { registerBaseCommands } from "invokers/commands/base";

describe("base commands", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    InvokerManager.getInstance().reset();
    registerBaseCommands(invokers);
  });

  it("toggles hidden", async () => {
    document.body.innerHTML = `
      <button command="--toggle" commandfor="panel">Toggle</button>
      <div id="panel" hidden>Content</div>
    `;

    document.querySelector("button")!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.querySelector("#panel")!.hasAttribute("hidden")).toBe(false);
  });
});
```

Use `invokers/compatible` in tests only when the test is intentionally covering
legacy all-in behavior.

## Development

Requires Node.js 16 or newer.

```bash
npm install
npm run build
npm run test
npm run type-check
```

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Build all package entry points |
| `npm run test` | Run the Vitest suite |
| `npm run type-check` | Type-check with Pridepack |
| `npm run clean` | Remove build output |
| `npm run dev` | Start development mode |
| `npm run serve-examples` | Build and serve the examples |

## Documentation and Examples

- `docs/adapters.md`: anchor and custom-element adapter usage
- `docs/new-features.md`: newer feature notes and examples
- `docs/performance-guide.md`: performance guidance
- `examples/`: browser demos for command packs, advanced events, forms, fetch, and Interest Invokers
- `README.old.md`: archived long-form README retained for reference while docs are reorganized

## Browser Support

Invokers targets modern browsers and polyfills emerging command behavior where
needed. Native support for command-related platform features is still evolving,
so treat the library as the stable integration layer and consult current browser
compatibility data for native-only deployments.

## License

MIT
