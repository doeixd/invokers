# Data Commands Reference

This document provides comprehensive reference for all data manipulation and array operation commands in the Invokers library.

## Overview

Data commands enable sophisticated client-side data manipulation without custom JavaScript. They support array operations, data binding, and reactive data management with automatic UI updates.

## Array Generation Commands

### `--data:generate:array`

Generates arrays with various patterns and stores them in data attributes.

**Syntax:** `--data:generate:array:key`

**Attributes:**
- `data-count`: Number of items to generate (required)
- `data-pattern`: Generation pattern (`index`, `random`, `uuid`, `object`) (default: `index`)
- `data-start`: Starting value for index pattern (default: `0`)

**Examples:**
```html
<!-- Generate array [0, 1, 2, 3, 4] -->
<button command="--data:generate:array:numbers" data-count="5" commandfor="#app">Generate Numbers</button>

<!-- Generate array of random numbers -->
<button command="--data:generate:array:randoms" data-count="10" data-pattern="random" commandfor="#app">Generate Randoms</button>

<!-- Generate array of UUIDs -->
<button command="--data:generate:array:ids" data-count="3" data-pattern="uuid" commandfor="#app">Generate IDs</button>

<!-- Generate array of objects -->
<button command="--data:generate:array:items" data-count="3" data-pattern="object" commandfor="#app">Generate Objects</button>
```

## Array Access Commands

### `--data:index:get`

Retrieves an item at a specific index from an array.

**Syntax:** `--data:index:get:key`

**Attributes:**
- `data-index`: Index to retrieve (required)
- `data-result-key`: Key to store the result (default: `{key}-item`)

**Examples:**
```html
<!-- Get item at index 2 -->
<button command="--data:index:get:items" data-index="2" commandfor="#app">Get Item 2</button>

<!-- Store result in custom key -->
<button command="--data:index:get:items" data-index="1" data-result-key="selected" commandfor="#app">Get Selected</button>
```

### `--data:index:set`

Updates an item at a specific index in an array.

**Syntax:** `--data:index:set:key`

**Attributes:**
- `data-index`: Index to update (required)
- `data-value`: New value as JSON string (required)

**Examples:**
```html
<!-- Update item at index 1 -->
<button command="--data:index:set:items" data-index="1" data-value='{"name": "Updated"}' commandfor="#app">Update Item</button>
```

## Array Manipulation Commands

### `--data:swap`

Swaps two items at specified indices in an array.

**Syntax:** `--data:swap:key`

**Attributes:**
- `data-index-a` / `data-index_a`: First index (required)
- `data-index-b` / `data-index_b`: Second index (required)

**Examples:**
```html
<!-- Swap items at indices 0 and 2 -->
<button command="--data:swap:items" data-index-a="0" data-index-b="2" commandfor="#app">Swap First and Third</button>
```

### `--data:slice`

Creates a slice of an array and stores it in a new key.

**Syntax:** `--data:slice:key`

**Attributes:**
- `data-start`: Starting index (default: `0`)
- `data-end`: Ending index (optional)
- `data-result-key`: Key for sliced array (default: `{key}-slice`)

**Examples:**
```html
<!-- Get first 3 items -->
<button command="--data:slice:items" data-start="0" data-end="3" commandfor="#app">Get First 3</button>

<!-- Get items from index 2 onwards -->
<button command="--data:slice:items" data-start="2" commandfor="#app">Get From Index 2</button>
```

### `--data:map`

Transforms each item in an array (simplified implementation).

**Syntax:** `--data:map:key`

**Attributes:**
- `data-map-function`: Mapping function (currently supports basic property access)
- `data-result-key`: Key for mapped array (default: `{key}-mapped`)

**Note:** Full expression evaluation requires advanced features to be enabled.

**Examples:**
```html
<!-- Basic mapping (placeholder - requires expression engine) -->
<button command="--data:map:items" data-map-function="item.value" data-result-key="values" commandfor="#app">Extract Values</button>
```

### `--data:find`

Finds the first item in an array matching specified criteria.

**Syntax:** `--data:find:key`

**Attributes:**
- `data-find-by`: Property to search by (required)
- `data-find-value`: Value to match (required)
- `data-result-key`: Key for found item (default: `{key}-found`)

**Examples:**
```html
<!-- Find item with id = "123" -->
<button command="--data:find:items" data-find-by="id" data-find-value="123" commandfor="#app">Find by ID</button>

<!-- Find completed items -->
<button command="--data:find:items" data-find-by="completed" data-find-value="true" commandfor="#app">Find Completed</button>
```

### `--data:reduce`

Reduces an array to a single value (simplified implementation).

**Syntax:** `--data:reduce:key`

**Attributes:**
- `data-reduce-function`: Reduction function (currently supports basic operations)
- `data-initial`: Initial value (default: `"0"`)
- `data-result-key`: Key for result (default: `{key}-reduced`)

**Examples:**
```html
<!-- Count items -->
<button command="--data:reduce:items" data-reduce-function="count" data-initial="0" commandfor="#app">Count Items</button>

<!-- Sum values (placeholder) -->
<button command="--data:reduce:items" data-reduce-function="sum + item.value" data-initial="0" commandfor="#app">Sum Values</button>
```

### `--data:reverse`

Reverses the order of items in an array.

**Syntax:** `--data:reverse:key`

**Examples:**
```html
<!-- Reverse array order -->
<button command="--data:reverse:items" commandfor="#app">Reverse Order</button>
```

### `--data:concat`

Concatenates multiple arrays stored in data attributes.

**Syntax:** `--data:concat:result-key`

**Attributes:**
- `data-source-arrays`: Comma-separated list of array keys to concatenate

**Examples:**
```html
<!-- Concatenate two arrays -->
<button command="--data:concat:combined" data-source-arrays="array1,array2" commandfor="#app">Concatenate Arrays</button>
```

### `--data:clear`

Clears an array stored in a data attribute.

**Syntax:** `--data:clear:key`

**Examples:**
```html
<!-- Clear the array -->
<button command="--data:clear:items" commandfor="#app">Clear Array</button>
```

## DOM Integration Commands

### `--dom:swap-visual`

Visually swaps two elements with smooth animation using View Transitions API.

**Syntax:** `--dom:swap-visual`

**Attributes:**
- `data-swap-with`: Selector of element to swap with (required)

**Examples:**
```html
<div id="container">
  <div id="item1" class="item">First</div>
  <div id="item2" class="item">Second</div>
</div>
<button command="--dom:swap-visual" commandfor="item1" data-swap-with="item2">Swap Elements</button>
```

### `--dom:update-keyed`

Updates a list of elements using keyed updates for efficient DOM manipulation.

**Syntax:** `--dom:update-keyed`

**Attributes:**
- `data-template-id`: ID of template to use for new elements (required)
- `data-data-source`: Key of data array in dataset (required)
- `data-key-prop`: Property to use as key (default: `"id"`)

**Examples:**
```html
<template id="item-template">
  <div data-tpl-attr="id:item-{{id}}" data-tpl-text="name">{{name}}</div>
</template>

<div id="list">
  <!-- Items will be inserted here -->
</div>

<button command="--dom:update-keyed" commandfor="list"
        data-template-id="item-template" data-data-source="items" data-key-prop="id">
  Update List
</button>
```

## Error Handling

All data commands include comprehensive error handling:

- **Validation**: Input parameters are validated with descriptive error messages
- **Recovery**: Error messages include suggested fixes
- **Graceful Degradation**: Invalid operations are logged but don't crash the application
- **Type Safety**: JSON parsing includes error handling for malformed data

## Performance Considerations

- **Large Arrays**: Commands handle arrays of any size efficiently
- **Memory Management**: No memory leaks from repeated operations
- **Batch Processing**: Large operations use optimized batching
- **Caching**: Expression evaluation includes caching for performance

## Integration with Advanced Features

Data commands work seamlessly with:

- **Expression Engine**: Use `{{expressions}}` in command parameters
- **Event Triggers**: Combine with `command-on` for reactive updates
- **Templating**: Integrate with `data-tpl-*` attributes
- **Data Binding**: Automatic UI updates through data context

## Examples

### Complete CRUD Application

```html
<div id="app">
  <!-- Data storage -->
  <div id="data-store"></div>

  <!-- Controls -->
  <button command="--data:generate:array:items" data-count="3" data-pattern="object" commandfor="data-store">
    Generate Sample Data
  </button>

  <button command="--data:index:get:items" data-index="0" commandfor="data-store">
    Get First Item
  </button>

  <button command="--data:index:set:items" data-index="0" data-value='{"name": "Updated"}' commandfor="data-store">
    Update First Item
  </button>

  <button command="--data:swap:items" data-index-a="0" data-index-b="1" commandfor="data-store">
    Swap First Two
  </button>

  <button command="--data:reverse:items" commandfor="data-store">
    Reverse Order
  </button>

  <!-- Display -->
  <pre data-bind="items">{{JSON.stringify(items, null, 2)}}</pre>
</div>
```

### Reactive List Management

```html
<template id="todo-template">
  <div class="todo-item" data-tpl-attr="id:todo-{{id}}" data-tpl-text="title">
    <span>{{title}}</span>
    <button command="--data:set:toggle:{{id}}" commandfor="data-store">Toggle</button>
    <button command="--data:set:delete:{{id}}" commandfor="data-store">Delete</button>
  </div>
</template>

<div id="todo-list">
  <!-- Todos rendered here -->
</div>

<div id="data-store">
  <!-- Todo data stored here -->
</div>

<button command="--dom:update-keyed" commandfor="todo-list"
        data-template-id="todo-template" data-data-source="todos">
  Refresh List
</button>
```

## Migration from Custom JavaScript

Data commands replace common JavaScript patterns:

```javascript
// Before: Manual array operations
const items = JSON.parse(element.dataset.items);
items.push(newItem);
element.dataset.items = JSON.stringify(items);

// After: Declarative commands
<button command="--data:set:array:push:items" data-value='{"name": "New Item"}' commandfor="#data-store">
```

This approach provides better maintainability, automatic error handling, and seamless integration with the rest of the Invokers ecosystem.
