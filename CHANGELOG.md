# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.1.1](https://github.com/doeixd/invokers/compare/v2.1.0...v2.1.1) (2026-01-29)


### Bug Fixes

* **ci:** correct workflow indentation ([f46a640](https://github.com/doeixd/invokers/commit/f46a640221cd4b33b85e62b363c468605bf917aa))

## [2.1.0](https://github.com/doeixd/invokers/compare/v1.8.0...v2.1.0) (2026-01-29)


### Features

* Add advanced modules for state management, control flow, components, and forms ([fb7b715](https://github.com/doeixd/invokers/commit/fb7b715e7f08c2121decd09b12ba5324e13e0b84))


### Bug Fixes

* **event-trigger:** dedupe command-on/data-on-event listeners and propagate resolved targets ([d2d6d65](https://github.com/doeixd/invokers/commit/d2d6d65ce551d9661fc7c4136eae00d3ab7a17a5))

## [2.0.0](https://github.com/doeixd/invokers/compare/v1.9.0...v2.0.0) (2025-10-14)

### 🚀 Major Features

* **Expression Functions Engine**: Complete reactive computation system with 40+ built-in functions
  - String functions: `concat`, `uppercase`, `lowercase`, `trim`, `replace`, `substring`, `charAt`, `includes`, `startsWith`, `endsWith`
  - Array functions: `join`, `filter`, `sort`, `randomChoice`, `arrayGenerate`, `arrayMap`, `arrayFilter`, `arraySlice`, `arrayLength`, `arrayFirst`, `arrayLast`, `arrayReverse`, `arraySort`, `arrayReduce`
  - Math functions: `random`, `randomInt`, `floor`, `ceil`, `round`, `min`, `max`, `abs`, `pow`, `sqrt`, `clamp`
  - Date functions: `now`, `formatDate`, `timeAgo`
  - Utility functions: `isEmpty`, `isNotEmpty`, `if`, `coalesce`, `nullish`, `typeof`, `isArray`, `isObject`, `isString`, `isNumber`, `isBoolean`, `isNull`, `isUndefined`
  - Object functions: `keys`, `values`, `entries`, `hasProperty`, `getProperty`, `setProperty`
  - Advanced functions: `range`, `repeat`, `pad`, `parseJSON`, `stringify`, `sanitize`

* **Loop Commands Pack**: Declarative iteration and batch DOM operations
  - `--dom:repeat-append`: Append template N times with loop variables
  - `--dom:repeat-replace`: Replace content with N repetitions
  - `--dom:repeat-prepend`: Prepend template N times
  - `--dom:repeat-update`: Update every Nth element
  - Batch processing for performance with large datasets
  - Loop context variables: `index`, `index1`, `count`, `isFirst`, `isLast`, `isEven`, `isOdd`

* **Random Commands Pack**: Declarative random data generation
  - `--random:choice`: Pick random item from datalist/template
  - `--random:concat`: Concatenate random choices
  - `--random:number`: Generate random integers
  - `--random:seed`: Set seed for reproducible randomness
  - `--random:uuid`: Generate UUID v4
  - `--random:store`: Store random choice in dataset

* **Enhanced Data Commands**: Advanced array operations and reactive data binding
  - `--data:render`: Render arrays using templates with interpolation
  - `--data:array:toggle-selected`: Toggle selection state of array items
  - `--data:array:remove-item`: Remove items from arrays by ID
  - `--data:array:concat`: Concatenate multiple arrays
  - `--data:array:clear`: Clear array data
  - Template-based rendering with performance optimizations

* **JS Framework Benchmark Implementation**: Complete declarative implementation
  - Create 1,000/10,000 rows using random data generation
  - Update every 10th row with expression functions
  - Swap rows with array operations
  - Clear table with data commands
  - Select random rows with array manipulation
  - Pure HTML implementation with competitive performance

### 🎯 Performance Improvements

* **Batch DOM Operations**: Optimized rendering for large datasets with chunked processing
* **Expression Caching**: LRU cache for parsed expressions (100 entries)
* **Rate Limiting**: 10,000 evaluations/second for expression engine
* **Memory Management**: Efficient DOM fragment usage and cleanup
* **Tree Shaking**: Modular architecture enables precise bundle size control

### 🔧 Developer Experience

* **Expression Function Registry**: Extensible system for custom functions
* **Template Interpolation**: Seamless integration with existing interpolation system
* **Error Handling**: Comprehensive error messages with recovery suggestions
* **Debug Support**: Enhanced logging for expression evaluation and command execution
* **Type Safety**: Full TypeScript support for all new features

### 📚 Documentation

* **Expression Functions Guide**: Complete reference for all 40+ built-in functions
* **Loop Commands Tutorial**: Declarative iteration patterns and best practices
* **Benchmark Implementation**: Step-by-step guide to the JS Framework Benchmark
* **Performance Guide**: Optimization techniques and performance comparisons
* **Migration Guide**: Upgrading from v1.x to v2.0.0

### 🧪 Testing

* **Expression Functions Tests**: Comprehensive test suite for all built-in functions
* **Loop Commands Tests**: Performance and correctness tests for iteration
* **Random Commands Tests**: Deterministic testing with seeded randomness
* **Data Commands Tests**: Array operations and template rendering tests
* **Benchmark Tests**: Automated performance regression testing

### 🔄 Breaking Changes

* **Advanced Features Opt-in**: Expression interpolation `{{...}}` now requires explicit `enableAdvancedEvents()` call
* **Command Dependencies**: New commands require importing additional command packs
* **Template Requirements**: Data rendering commands require explicit template elements

### 📦 Bundle Size Impact

* **Expression Engine**: ~26 kB (advanced/expressions)
* **Loop Commands**: ~14 kB (commands/loop)
* **Random Commands**: ~13 kB (commands/random)
* **Data Commands**: ~16 kB (commands/data)
* **Total v2.0.0**: ~69 kB (modular) vs ~330 kB (compatible)

## [1.9.0](https://github.com/doeixd/invokers/compare/v1.8.0...v1.9.0) (2025-10-14)

### Features

* **Modular Architecture**: Split the monolithic flow command pack into four focused modules for better bundle size optimization:
  - `invokers/commands/fetch` (~15 kB) - HTTP fetch operations
  - `invokers/commands/websocket` (~12 kB) - WebSocket real-time communication
  - `invokers/commands/sse` (~10 kB) - Server-Sent Events
  - `invokers/commands/navigation` (~8 kB) - Navigation and flow control
* **Backward Compatibility**: The original `invokers/commands/flow` entry point remains as a compatibility layer that imports all four new modules
* **Improved Tree Shaking**: Developers can now import only the specific networking functionality they need, reducing bundle sizes

### Breaking Changes

* **Flow Module Split**: The `invokers/commands/flow` module now acts as a compatibility layer. For optimal bundle sizes, import the specific command packs directly.

## [1.8.0](https://github.com/doeixd/invokers/compare/v1.7.0...v1.8.0) (2025-10-02)


### Features

* Add replace strategy support to --fetch:get command ([cb55dc8](https://github.com/doeixd/invokers/commit/cb55dc882c5dd6b82d0b24646af0c80f3c207be0))

## [1.7.0](https://github.com/doeixd/invokers/compare/v1.6.0...v1.7.0) (2025-10-02)


### Features

* Add native browser command support and comprehensive demo ([62cdeab](https://github.com/doeixd/invokers/commit/62cdeabfadf8ab0c54049a59383f80d6a4780e11))

## [1.6.0](https://github.com/doeixd/invokers/compare/v1.5.2...v1.6.0) (2025-10-02)


### Features

* allow strategies on --fetch:send ([3abe548](https://github.com/doeixd/invokers/commit/3abe5482995499494e43b4eff543a7c751a6adfe))

### [1.5.2](https://github.com/doeixd/invokers/compare/v1.5.1...v1.5.2) (2025-09-25)


### Bug Fixes

* resolve repeating Step 3 issue in <and-then> chaining ([e899af7](https://github.com/doeixd/invokers/commit/e899af7146d801f2432994f0b5e9d996ce42df62))

### [1.5.1](https://github.com/doeixd/invokers/compare/v1.5.0...v1.5.1) (2025-09-23)

## [1.5.0](https://github.com/doeixd/invokers/compare/v1.4.0...v1.5.0) (2025-09-22)


### Features

* plugin system ([7e3a613](https://github.com/doeixd/invokers/commit/7e3a613671f702170ef25fd690ec03a9cb70d5e4))


### Bug Fixes

* small changes ([1cbef23](https://github.com/doeixd/invokers/commit/1cbef2340d822920d8d88784578e6fce4ef4779f))

## [1.4.0](https://github.com/doeixd/invokers/compare/v1.3.2...v1.4.0) (2025-09-22)


### Features

* Implement singleton pattern and enhance fetch commands ([1dd4aef](https://github.com/doeixd/invokers/commit/1dd4aefcf85052a5cd17d1bc835ad594eccbbfc4))

### [1.3.2](https://github.com/doeixd/invokers/compare/v1.3.1...v1.3.2) (2025-09-22)

### [1.3.1](https://github.com/doeixd/invokers/compare/v1.3.0...v1.3.1) (2025-09-22)

## [1.3.0](https://github.com/doeixd/invokers/compare/v1.2.0...v1.3.0) (2025-09-22)


### Features

* Add pipeline functionality ([c1a8e27](https://github.com/doeixd/invokers/commit/c1a8e27381f3a01b4a5c0687991a1c9974367fa1))

## [1.2.0](https://github.com/doeixd/invokers/compare/v0.0.5...v1.2.0) (2025-09-22)


### Features

* Add comprehensive Interest Invokers and Future Commands support ([a7f45b1](https://github.com/doeixd/invokers/commit/a7f45b10d514eeb8f8d30e0e16e8088dc415580e))

### [0.0.5](https://github.com/doeixd/invokers/compare/v0.0.4...v0.0.5) (2025-09-18)

### [0.0.4](https://github.com/doeixd/invokers/compare/v0.0.3...v0.0.4) (2025-09-18)

### [0.0.3](https://github.com/doeixd/invokers/compare/v0.0.2...v0.0.3) (2025-09-18)

### [0.0.2](https://github.com/doeixd/invokers/compare/v0.0.1...v0.0.2) (2025-09-18)

### 0.0.1 (2025-09-18)
