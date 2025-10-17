# Loop Commands

Declarative iteration commands for creating large numbers of DOM elements efficiently.

## Commands

### `--dom:repeat-append:count`

Appends a template N times to a target element.

```html
<template id="row-template">
  <div>Item {{index}}</div>
</template>

<button command="--dom:repeat-append:1000"
        commandfor="container"
        data-template-id="row-template">
  Create 1,000 items
</button>

<div id="container"></div>
```

### `--dom:repeat-replace:count`

Replaces the content of a target element with N repetitions of a template.

```html
<button command="--dom:repeat-replace:500"
        commandfor="list"
        data-template-id="item-template">
  Replace with 500 items
</button>
```

### `--dom:repeat-prepend:count`

Prepends N repetitions of a template to a target element.

```html
<button command="--dom:repeat-prepend:10"
        commandfor="log"
        data-template-id="entry-template">
  Add 10 log entries
</button>
```

### `--dom:repeat-update:step`

Updates every Nth element matching a selector.

```html
<button command="--dom:repeat-update:10"
        commandfor="rows"
        data-class-add="highlight">
  Highlight every 10th row
</button>
```

## Loop Variables

Available in template expressions during iteration:

- `{{index}}` - 0-based iteration index
- `{{index1}}` - 1-based iteration index
- `{{count}}` - Total number of iterations
- `{{isFirst}}` - True for first iteration
- `{{isLast}}` - True for last iteration
- `{{isEven}}` - True for even index
- `{{isOdd}}` - True for odd index

## Advanced Attributes

### `data-start-index`

Sets the starting index for iteration.

```html
<button command="--dom:repeat-append:5"
        data-start-index="100"
        data-template-id="item">
  Items 100-104
</button>
```

### `data-step`

Sets the increment between iterations.

```html
<button command="--dom:repeat-append:3"
        data-start-index="10"
        data-step="5"
        data-template-id="item">
  Items 10, 15, 20
</button>
```

### `data-reverse`

Reverses the iteration order.

```html
<button command="--dom:repeat-append:3"
        data-reverse="true"
        data-template-id="item">
  Items 2, 1, 0
</button>
```

## Batching

Large operations (>100 items) are automatically batched using `requestAnimationFrame` for better performance.

### Manual Batching

```html
<button command="--dom:batch:start" commandfor="container">Start Batch</button>
<!-- Multiple operations... -->
<button command="--dom:batch:end" commandfor="container">Commit Batch</button>
```

### Auto Batching

```html
<button command="--dom:batch:auto"
        commandfor="container"
        data-and-then="--dom:repeat-append:1000"
        data-template-id="item">
  Auto-batched operation
</button>
```

## Performance

- Automatic batching for operations >100 items
- `requestAnimationFrame` scheduling
- Memory-efficient fragment-based DOM updates
- Maximum iteration limit: 50,000 (configurable)

## Integration

Works seamlessly with:
- Expression interpolation (`{{...}}`)
- Command chaining (`<and-then>`)
- View Transitions API
- Template processing</content>
</xai:function_call"> 

<xai:function_call name="todowrite">
<parameter name="todos">[{"content":"Create docs/commands/loop.md with examples and performance guide","status":"completed","priority":"medium","id":"create-loop-docs"}]