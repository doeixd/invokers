# Adapter Invokers

Adapters let you opt in to invoker behavior for elements that are not part of the native `command` activation flow. They are intentionally optional so core remains standards-first and lightweight.

## Why Adapters Exist

- The core polyfill only activates on native elements that support `command` (`button`, `input`, `textarea`).
- Adapters let you add invoker behavior to anchors and custom elements without changing the default behavior.
- Everything is opt-in, so bundle size and runtime cost are only paid when you enable adapters.

## Quick Start: Anchor Invokers

```javascript
import { enableAnchorInvokers } from 'invokers/anchors';

enableAnchorInvokers();
```

```html
<a href="/posts?page=2" commandfor="#tbody" data-select="#tbody">
  Next Page
</a>
```

### Anchor Behavior Summary

- `command` is optional. If missing, `--fetch:get` is inferred.
- `data-url` is optional. If missing, `href` is used.
- If both `data-url` and `href` exist, `data-url` wins.
- Hash-only links (`href="#section"`) are ignored so browser navigation still works.
- Modified clicks (cmd/ctrl/shift/alt), `target="_blank"`, and `download` are ignored.

## Adapter API

```ts
type InvokerAdapter = {
  matches(element: Element): boolean;
  getCommand(element: HTMLElement): string | null;
  getCommandFor(element: HTMLElement): string | null;
  shouldHandle(event: Event, element: HTMLElement): boolean;
  onBeforeDispatch?(event: Event, element: HTMLElement): void;
};
```

- `matches`: decides which elements can act as invokers.
- `getCommand`: resolves the command string (can be inferred).
- `getCommandFor`: resolves the target selector.
- `shouldHandle`: decides if the event should be intercepted.
- `onBeforeDispatch`: optional hook to set defaults (for example, infer `data-url`).

## Enabling the Delegated Listener

Adapters only run if the adapter listener is enabled:

```javascript
import { enableAdapterInvokers, registerInvokerAdapter } from 'invokers/anchors';

registerInvokerAdapter(myAdapter);
enableAdapterInvokers();
```

## Example: Custom Element Adapter

```javascript
import { registerInvokerAdapter, enableAdapterInvokers } from 'invokers/anchors';

registerInvokerAdapter({
  matches: (element) => element instanceof HTMLElement && element.tagName === 'MY-CARD',
  getCommand: (element) => element.getAttribute('command') ?? '--fetch:get',
  getCommandFor: (element) => element.getAttribute('commandfor'),
  shouldHandle: (event) => event.type === 'click' && !event.defaultPrevented,
  onBeforeDispatch: (_event, element) => {
    if (!element.dataset.url) {
      element.dataset.url = element.getAttribute('data-url') ?? '';
    }
  }
});

enableAdapterInvokers();
```

```html
<my-card command="--toggle" commandfor="#panel">
  Toggle Panel
</my-card>
```

## Custom Elements with `command-on`

`command-on` is handled by the advanced events module. To enable it, import the event triggers and then apply `command-on` to any element (including custom tags):

```javascript
import { enableEventTriggers } from 'invokers/advanced/events';

enableEventTriggers();
```

```html
<my-button command-on="click" command="--toggle" commandfor="#panel">
  Toggle Panel
</my-button>
```

## Post-Event Behavior

Adapters do not execute commands themselves. They only dispatch `CommandEvent`s; everything after that is handled by the standard Invokers pipeline.

- **Command execution**: `InvokerManager` runs the matched command callbacks.
- **Chaining**: `data-and-then`, `data-after-success`, and `data-after-error` still apply.
- **Error handling**: commands should use `createInvokerError` so errors are logged consistently.
- **Logging**: adapters should avoid logging unless `window.Invoker.debug` is enabled.

## Gotchas & Tips

- **Command registration**: if you infer a command (like `--fetch:get`), make sure the command is registered.
- **Target selection**: `commandfor` accepts selectors; if it resolves to zero targets, the adapter should not prevent default.
- **Anchor safety**: keep the default skip rules for modified clicks and external targets to preserve browser behavior.
- **SSR or non-browser**: adapters no-op if `document` is undefined.
- **Avoid heavy matching**: keep `matches` lightweight and guard early in `shouldHandle` to minimize click overhead.

## Notes

- Adapters are opt-in and do not alter core behavior unless enabled.
- The anchor adapter skips modified clicks and external targets by default.
- `data-url` always takes precedence over `href` when both are set.
