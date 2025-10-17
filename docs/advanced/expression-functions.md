# Expression Functions Reference

## Overview

Invokers v2.0.0 introduces a powerful expression function system that allows you to call predefined functions within expressions. These functions provide common operations for strings, arrays, math, conditionals, and more, enabling complex reactive computations without custom JavaScript.

## Enabling Expression Functions

Expression functions are automatically available when you enable the expression engine:

```javascript
import { enableExpressionEngine } from 'invokers/advanced/expressions';

enableExpressionEngine(); // Functions are now available in expressions
```

## Function Categories

### String Functions

#### `concat(...values)` → string
Concatenates multiple values into a single string.

```javascript
{{concat("Hello", " ", "World")}} // "Hello World"
{{concat(user.firstName, " ", user.lastName)}} // "John Doe"
```

#### `uppercase(str)` → string
Converts a string to uppercase.

```javascript
{{uppercase("hello")}} // "HELLO"
{{uppercase(user.name)}} // "JOHN"
```

#### `lowercase(str)` → string
Converts a string to lowercase.

```javascript
{{lowercase("HELLO")}} // "hello"
{{lowercase("Mixed Case")}} // "mixed case"
```

#### `trim(str)` → string
Removes whitespace from both ends of a string.

```javascript
{{trim("  hello  ")}} // "hello"
{{trim(userInput)}} // Clean user input
```

#### `replace(str, search, replacement)` → string
Replaces occurrences of a substring.

```javascript
{{replace("hello world", "world", "universe")}} // "hello universe"
{{replace(text, "\n", "<br>")}} // Convert newlines to HTML
```

#### `substring(str, start, end?)` → string
Extracts a portion of a string.

```javascript
{{substring("hello", 1, 3)}} // "el"
{{substring(title, 0, 10)}} // First 10 characters
```

#### `charAt(str, index)` → string
Returns the character at a specified index.

```javascript
{{charAt("hello", 1)}} // "e"
{{charAt(name, 0)}} // First character
```

#### `includes(str, search)` → boolean
Checks if a string contains a substring.

```javascript
{{includes("hello", "ell")}} // true
{{includes(email, "@")}} // Check for valid email format
```

#### `startsWith(str, search)` → boolean
Checks if a string starts with a substring.

```javascript
{{startsWith("hello", "he")}} // true
{{startsWith(url, "https://")}} // Check for secure URL
```

#### `endsWith(str, search)` → boolean
Checks if a string ends with a substring.

```javascript
{{endsWith("file.txt", ".txt")}} // true
{{endsWith(filename, ".pdf")}} // Check file extension
```

### Array Functions

#### `arrayLength(arr)` → number
Returns the length of an array.

```javascript
{{arrayLength([1, 2, 3])}} // 3
{{arrayLength(items)}} // Number of items
```

#### `arrayFirst(arr)` → any
Returns the first element of an array.

```javascript
{{arrayFirst([1, 2, 3])}} // 1
{{arrayFirst(messages)}} // First message
```

#### `arrayLast(arr)` → any
Returns the last element of an array.

```javascript
{{arrayLast([1, 2, 3])}} // 3
{{arrayLast(history)}} // Most recent item
```

#### `arrayIncludes(arr, item)` → boolean
Checks if an array contains a specific item.

```javascript
{{arrayIncludes([1, 2, 3], 2)}} // true
{{arrayIncludes(tags, "urgent")}} // Check for tag
```

#### `arrayIndexOf(arr, item)` → number
Returns the index of an item in an array, or -1 if not found.

```javascript
{{arrayIndexOf([1, 2, 3], 2)}} // 1
{{arrayIndexOf(list, selectedItem)}} // Find position
```

#### `arraySlice(arr, start?, end?)` → array
Returns a portion of an array.

```javascript
{{arraySlice([1, 2, 3, 4], 1, 3)}} // [2, 3]
{{arraySlice(items, 0, 5)}} // First 5 items
```

#### `arrayReverse(arr)` → array
Reverses the order of array elements.

```javascript
{{arrayReverse([1, 2, 3])}} // [3, 2, 1]
{{arrayReverse(timeline)}} // Chronological order
```

#### `arrayMap(arr, mapper)` → array
Transforms each element of an array.

```javascript
{{arrayMap([1, 2, 3], (x) => x * 2)}} // [2, 4, 6]
{{arrayMap(users, (u) => u.name)}} // Extract names
```

#### `arrayFilter(arr, predicate)` → array
Filters elements of an array.

```javascript
{{arrayFilter([1, 2, 3, 4], (x) => x > 2)}} // [3, 4]
{{arrayFilter(products, (p) => p.price < 100)}} // Cheap products
```

#### `arrayGenerate(count, generator?)` → array
Generates an array using a generator function.

```javascript
{{arrayGenerate(3)}} // [0, 1, 2]
{{arrayGenerate(5, (i) => i * 10)}} // [0, 10, 20, 30, 40]
```

#### `randomChoice(arr)` → any
Returns a random element from an array.

```javascript
{{randomChoice([1, 2, 3, 4, 5])}} // Random number 1-5
{{randomChoice(colors)}} // Random color
```

### Math Functions

#### `random()` → number
Returns a random number between 0 and 1.

```javascript
{{random()}} // 0.123456...
```

#### `randomInt(min, max)` → number
Returns a random integer between min and max (inclusive).

```javascript
{{randomInt(1, 10)}} // Random integer 1-10
{{randomInt(0, 100)}} // Random percentage
```

#### `floor(num)` → number
Rounds a number down to the nearest integer.

```javascript
{{floor(3.7)}} // 3
{{floor(price)}} // Integer price
```

#### `ceil(num)` → number
Rounds a number up to the nearest integer.

```javascript
{{ceil(3.1)}} // 4
{{ceil(quantity)}} // Round up for inventory
```

#### `round(num)` → number
Rounds a number to the nearest integer.

```javascript
{{round(3.5)}} // 4
{{round(3.4)}} // 3
```

#### `min(...numbers)` → number
Returns the smallest of the given numbers.

```javascript
{{min(1, 2, 3)}} // 1
{{min(prices)}} // Lowest price
```

#### `max(...numbers)` → number
Returns the largest of the given numbers.

```javascript
{{max(1, 2, 3)}} // 3
{{max(scores)}} // Highest score
```

#### `abs(num)` → number
Returns the absolute value of a number.

```javascript
{{abs(-5)}} // 5
{{abs(difference)}} // Always positive
```

#### `pow(base, exponent)` → number
Returns base raised to the power of exponent.

```javascript
{{pow(2, 3)}} // 8
{{pow(base, exponent)}} // Exponentiation
```

#### `sqrt(num)` → number
Returns the square root of a number.

```javascript
{{sqrt(9)}} // 3
{{sqrt(area)}} // Side length from area
```

#### `clamp(value, min, max)` → number
Clamps a number between min and max values.

```javascript
{{clamp(5, 0, 10)}} // 5
{{clamp(15, 0, 10)}} // 10 (clamped)
{{clamp(-5, 0, 10)}} // 0 (clamped)
```

### Conditional Functions

#### `if(condition, trueValue, falseValue)` → any
Returns one value if condition is true, another if false.

```javascript
{{if(user.isAdmin, "Admin", "User")}} // Role-based display
{{if(isEmpty(items), "No items", "Items found")}} // Conditional message
```

#### `coalesce(...values)` → any
Returns the first non-null, non-empty value.

```javascript
{{coalesce(null, "", "default")}} // "default"
{{coalesce(user.nickname, user.name, "Anonymous")}} // First available name
```

### Type Functions

#### `typeof(value)` → string
Returns the type of a value.

```javascript
{{typeof("hello")}} // "string"
{{typeof([1, 2, 3])}} // "array"
{{typeof(null)}} // "null"
```

#### `isArray(value)` → boolean
Checks if a value is an array.

```javascript
{{isArray([1, 2, 3])}} // true
{{isArray("not array")}} // false
```

#### `isString(value)` → boolean
Checks if a value is a string.

```javascript
{{isString("hello")}} // true
{{isString(123)}} // false
```

#### `isNumber(value)` → boolean
Checks if a value is a number (and not NaN).

```javascript
{{isNumber(42)}} // true
{{isNumber("42")}} // false
{{isNumber(NaN)}} // false
```

#### `isBoolean(value)` → boolean
Checks if a value is a boolean.

```javascript
{{isBoolean(true)}} // true
{{isBoolean(false)}} // true
{{isBoolean(1)}} // false
```

#### `isNull(value)` → boolean
Checks if a value is null.

```javascript
{{isNull(null)}} // true
{{isNull(undefined)}} // false
```

#### `isUndefined(value)` → boolean
Checks if a value is undefined.

```javascript
{{isUndefined(undefined)}} // true
{{isUndefined(null)}} // false
```

### Object Functions

#### `keys(obj)` → array
Returns an array of object property names.

```javascript
{{keys({a: 1, b: 2})}} // ["a", "b"]
{{keys(user)}} // ["name", "email", "age"]
```

#### `values(obj)` → array
Returns an array of object property values.

```javascript
{{values({a: 1, b: 2})}} // [1, 2]
{{values(settings)}} // [true, "dark", 14]
```

#### `entries(obj)` → array
Returns an array of [key, value] pairs.

```javascript
{{entries({a: 1, b: 2})}} // [["a", 1], ["b", 2]]
```

#### `hasProperty(obj, prop)` → boolean
Checks if an object has a property.

```javascript
{{hasProperty(user, "email")}} // true
{{hasProperty(settings, "theme")}} // Check if setting exists
```

#### `getProperty(obj, prop, defaultValue?)` → any
Gets a property value with optional default.

```javascript
{{getProperty(user, "name", "Anonymous")}} // User name or "Anonymous"
{{getProperty(config, "timeout", 5000)}} // Config value or default
```

#### `setProperty(obj, prop, value)` → object
Sets a property on an object (returns the modified object).

```javascript
{{setProperty(settings, "theme", "dark")}} // Modify object
```

### Utility Functions

#### `range(start, end, step?)` → array
Creates an array of numbers in a range.

```javascript
{{range(1, 5)}} // [1, 2, 3, 4]
{{range(10, 0, -2)}} // [10, 8, 6, 4, 2]
```

#### `repeat(value, count)` → array
Creates an array with a value repeated.

```javascript
{{repeat("hello", 3)}} // ["hello", "hello", "hello"]
{{repeat(0, 5)}} // [0, 0, 0, 0, 0]
```

#### `pad(str, length, char?)` → string
Pads a string to a certain length.

```javascript
{{pad("hi", 5, "*")}} // "hi***"
{{pad("5", 3, "0")}} // "005"
```

#### `parseJSON(str)` → any
Parses a JSON string into an object.

```javascript
{{parseJSON('{"name": "John"}')}} // {name: "John"}
{{parseJSON(brokenJson)}} // null (safe parsing)
```

#### `stringify(value, indent?)` → string
Converts a value to a JSON string.

```javascript
{{stringify({a: 1})}} // "{"a":1}"
{{stringify(data, 2)}} // Pretty-printed JSON
```

#### `sanitize(str)` → string
Removes potentially dangerous HTML characters.

```javascript
{{sanitize("<script>alert('xss')</script>")}} // "scriptalert('xss')/script"
```

#### `isEmpty(value)` → boolean
Checks if a value is empty (null, undefined, empty string, empty array, empty object).

```javascript
{{isEmpty("")}} // true
{{isEmpty([])}} // true
{{isEmpty({})}} // true
{{isEmpty("hello")}} // false
```

#### `isNotEmpty(value)` → boolean
Checks if a value is not empty.

```javascript
{{isNotEmpty(items)}} // true if items exist
```

### Date Functions

#### `now()` → Date
Returns the current date and time.

```javascript
{{now()}} // Current Date object
```

#### `formatDate(date, format?)` → string
Formats a date using a simple format string.

```javascript
{{formatDate(now(), "MM/dd/yyyy")}} // "12/25/2023"
{{formatDate(user.birthday)}} // Formatted birthday
```

#### `timeAgo(date)` → string
Returns a human-readable time difference.

```javascript
{{timeAgo(post.createdAt)}} // "2 hours ago"
{{timeAgo(now())}} // "just now"
```

## Usage Examples

### Complex Expressions

```javascript
<!-- Random greeting -->
{{concat(randomChoice(["Hello", "Hi", "Hey"]), " ", user.name, "!")}}

<!-- Conditional formatting -->
{{if(user.score > 90, "Excellent", if(user.score > 70, "Good", "Needs improvement"))}}

<!-- Array operations -->
{{arrayLength(arrayFilter(products, (p) => p.price < 100))}}

<!-- String manipulation -->
{{uppercase(substring(user.name, 0, 1))}}{{substring(user.name, 1)}}

<!-- Safe property access -->
{{getProperty(user, "avatar", "/default-avatar.png")}}

<!-- Complex calculations -->
{{clamp(round(average * 1.1), 0, 100)}}
```

### In Command Parameters

```html
<!-- Random data generation -->
<button command="--text:set:{{randomChoice(['Apple', 'Banana', 'Orange'])}}" commandfor="fruit">
  Random Fruit
</button>

<!-- Conditional commands -->
<button command="--class:{{if(isDarkMode, 'add', 'remove')}}:dark-theme" commandfor="body">
  Toggle Theme
</button>

<!-- Dynamic calculations -->
<input command-on="input" command="--text:set:{{round(this.value * 1.1)}}" commandfor="result">
```

### In Templates

```html
<template id="user-card">
  <div class="user-card">
    <h3>{{concat(user.firstName, " ", user.lastName)}}</h3>
    <p>{{if(user.isOnline, "Online", "Offline")}}</p>
    <span>{{timeAgo(user.lastSeen)}}</span>
  </div>
</template>
```

## Performance & Caching

Expression functions include intelligent caching to improve performance:

- **Pure functions** (like `concat`, `uppercase`, `arrayLength`) are cached based on their arguments
- **Random functions** (like `random`, `randomInt`, `randomChoice`) are never cached
- **Cache size** is limited to prevent memory leaks
- **LRU eviction** removes least-recently-used cache entries when the limit is reached

## Error Handling

Functions include comprehensive error handling:

- **Type validation**: Functions validate input types and provide helpful error messages
- **Safe fallbacks**: Invalid inputs return sensible defaults rather than crashing
- **Detailed errors**: Error messages include function signatures and recovery suggestions

## Custom Functions

You can register your own expression functions:

```javascript
import { registerExpressionFunction } from 'invokers/advanced/expressions';

registerExpressionFunction({
  name: 'double',
  description: 'Doubles a number',
  parameters: [
    { name: 'value', type: 'number', description: 'Number to double', required: true }
  ],
  returnType: 'number',
  examples: ['double(5) // returns 10'],
  implementation: (value: number) => value * 2
});

// Now use in expressions: {{double(5)}}
```

## Security

Expression functions are designed with security in mind:

- **Sandboxed execution**: No access to dangerous globals
- **Input validation**: All inputs are validated and sanitized
- **Safe property access**: Prevents prototype pollution and unsafe property access
- **Rate limiting**: Built-in rate limiting prevents abuse

## Migration from v1.x

If you were using custom helper functions in expressions, you can now register them as expression functions for better performance and type safety:

```javascript
// Old way (still works)
const context = {
  double: (x) => x * 2,
  formatPrice: (price) => `$${price.toFixed(2)}`
};
evaluateExpression('double(this.value)', context);

// New way (recommended)
registerExpressionFunction({
  name: 'double',
  parameters: [{ name: 'value', type: 'number', required: true }],
  returnType: 'number',
  implementation: (value) => value * 2
});

registerExpressionFunction({
  name: 'formatPrice',
  parameters: [{ name: 'price', type: 'number', required: true }],
  returnType: 'string',
  implementation: (price) => `$${price.toFixed(2)}`
});

// Use in expressions: {{double(this.value)}}
```