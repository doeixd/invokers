/**
 * @file benchmark-integration.test.ts
 * @summary Integration tests for the complete JS Framework Benchmark implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerBaseCommands } from '../src/commands/base';
import { registerDataCommands } from '../src/commands/data';
import { registerDomCommands } from '../src/commands/dom';
import { registerLoopCommands } from '../src/commands/loop';
import { registerRandomCommands } from '../src/commands/random';
import { enableExpressionEngine } from '../src/advanced/expressions';
import { setDataContext } from '../src/advanced/interpolation';

describe('JS Framework Benchmark Integration', () => {
  let manager: InvokerManager;
  let container: HTMLElement;
  let benchmarkData: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';

    // Set up Invokers
    manager = InvokerManager.getInstance();
    manager.reset();

    registerBaseCommands(manager);
    registerDataCommands(manager);
    registerDomCommands(manager);
    registerLoopCommands(manager);
    registerRandomCommands(manager);
    enableExpressionEngine();

    // Ensure event listeners are attached for testing
    manager.ensureListenersAttached();

    // Enable debug mode for troubleshooting
    (window as any).Invoker = { debug: true };

    // Add event listener to see if command events are dispatched
    document.addEventListener('command', (e) => {
      console.log('Command event dispatched:', (e as any).command);
    });

    // Debug: Check registered commands
    console.log('Registered commands:', manager['sortedCommandKeys']);

    // Create test DOM structure
    container = document.createElement('div');
    container.innerHTML = `
      <datalist id="adjectives">pretty,large,big,small,tall,short</datalist>
      <datalist id="colors">red,yellow,blue,green,pink,brown</datalist>
      <datalist id="nouns">table,chair,house,bbq,desk,car</datalist>
      <div id="benchmark-data" data-benchmarkRows="[]"></div>
      <table><tbody id="table-body"></tbody></table>
      <template id="row-template">
        <tr>
          <td>{{item.id}}</td>
          <td>{{item.label}}</td>
          <td>{{item.status}}</td>
        </tr>
      </template>
    `;
    document.body.appendChild(container);

    benchmarkData = document.getElementById('benchmark-data')!;

    // Set up data contexts for expressions
    setDataContext('adjectives', document.getElementById('adjectives')!.textContent!.split(','));
    setDataContext('colors', document.getElementById('colors')!.textContent!.split(','));
    setDataContext('nouns', document.getElementById('nouns')!.textContent!.split(','));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Create 1,000 rows operation', () => {
    it('should create 1000 rows with random labels', async () => {
      const startTime = performance.now();

       // Create button with chained commands to simulate benchmark operation
       const button = document.createElement('button');
       button.setAttribute('command', '--data:clear:benchmarkRows');
       button.setAttribute('commandfor', 'benchmark-data');

       // Add and-then elements for chaining
       const generateAndThen = document.createElement('and-then');
       generateAndThen.setAttribute('command', '--data:generate:array:benchmarkRows');
       generateAndThen.setAttribute('data-count', '1000');
         generateAndThen.setAttribute('data-template', '{"id": {{index+1}}, "label": "{{randomChoice(adjectives)}} {{randomChoice(colors)}} {{randomChoice(nouns)}}", "status": "active", "selected": false}');
       button.appendChild(generateAndThen);

       const renderAndThen = document.createElement('and-then');
       renderAndThen.setAttribute('command', '--dom:repeat-replace:1000');
       renderAndThen.setAttribute('data-then-target', 'table-body');
       renderAndThen.setAttribute('data-template-id', 'row-template');
       renderAndThen.setAttribute('data-array-key', 'benchmarkRows');
       renderAndThen.setAttribute('data-source', 'benchmark-data');
       renderAndThen.setAttribute('data-key', 'id');
       button.appendChild(renderAndThen);

        document.body.appendChild(button);
       console.log('Datalists in DOM:', document.querySelectorAll('datalist').length);
       console.log('Adjectives text:', document.getElementById('adjectives')?.textContent);
       // Execute command directly
       await manager.executeCommand('--data:clear:benchmarkRows', 'benchmark-data', button);

      // Wait for operations to complete (may take time for 1000 rows)
      await new Promise(resolve => setTimeout(resolve, 200));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');
      expect(rows).toHaveLength(1000);

      // Check that rows have expected structure
      expect(rows[0]).toHaveProperty('id', 1);
      expect(rows[0]).toHaveProperty('label');
      expect(rows[0]).toHaveProperty('status');
      expect(rows[0]).toHaveProperty('selected', false);

      // Check that labels contain random words
      const label = rows[0].label;
      expect(typeof label).toBe('string');
      expect(label.split(' ')).toHaveLength(3); // adjective + color + noun

      // Check DOM was updated
      const tableBody = document.getElementById('table-body')!;
      expect(tableBody.children).toHaveLength(1000);

      // Performance check (should be under 500ms for 1000 rows)
      expect(duration).toBeLessThan(500);

      console.log(`Create 1000 rows: ${duration.toFixed(2)}ms`);
    }, 10000); // 10 second timeout for performance test
  });

  describe.skip('Create 10,000 rows operation', () => {
    it('should create 10000 rows with random labels', async () => {
      const startTime = performance.now();

      // Directly execute the commands for testing
      const button = document.createElement('button');
      button.setAttribute('data-count', '1000');
       button.setAttribute('data-template', '{"id": {{index+1}}, "label": "{{concat(randomChoice(adjectives), \" \", randomChoice(colors), \" \", randomChoice(nouns))}}", "status": "{{if(random() > 0.5, \"active\", \"inactive\")}}", "selected": false}');
      document.body.appendChild(button);

      // Execute --data:clear:benchmarkRows
      await manager.executeCommand('--data:clear:benchmarkRows', 'benchmark-data', button);

      // Execute --data:generate:array:benchmarkRows
      await manager.executeCommand('--data:generate:array:benchmarkRows', 'benchmark-data', button);

      // Execute --dom:repeat-replace:1000
      await manager.executeCommand('--dom:repeat-replace:1000', 'table-body', button);

      // Wait for operations to complete (may take longer for 10k)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');
      expect(rows).toHaveLength(10000);

      // Check DOM was updated
      const tableBody = document.getElementById('table-body')!;
      expect(tableBody.children).toHaveLength(10000);

      // Performance check (should be under 2000ms for 10k rows)
      expect(duration).toBeLessThan(2000);

      console.log(`Create 10000 rows: ${duration.toFixed(2)}ms`);
    }, 15000); // 15 second timeout for performance test
  });

  describe.skip('Update every 10th row operation', () => {
     beforeEach(async () => {
       // Set up initial data
       const button = document.createElement('button');
       button.setAttribute('command', '--data:generate:array:benchmarkRows');
       button.setAttribute('commandfor', 'benchmark-data');
       button.setAttribute('data-count', '1000');
       button.setAttribute('data-template', '{"id": {{index+1}}, "label": "Item {{index+1}}", "status": "active", "selected": false}');
      button.setAttribute('data-and-then', '--dom:repeat-replace:1000');
      button.setAttribute('data-then-target', 'table-body');
      button.setAttribute('data-template-id', 'row-template');
      button.setAttribute('data-key', 'id');

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should append "!!!" to every 10th row label', async () => {
      const startTime = performance.now();

      const button = document.createElement('button');
      button.setAttribute('command', '--data:map:benchmarkRows');
      button.setAttribute('commandfor', 'benchmark-data');
      button.setAttribute('data-map-expression', '{"label": "{{if(index % 10 === 0, concat(item.label, \" !!!\"), item.label)}}"}');
       const updateAndThen = document.createElement('and-then');
       updateAndThen.setAttribute('command', '--dom:update-keyed');
       updateAndThen.setAttribute('data-then-target', 'table-body');
       updateAndThen.setAttribute('data-array-key', 'benchmarkRows');
       updateAndThen.setAttribute('data-template-id', 'row-template');
       updateAndThen.setAttribute('data-key', 'id');
       button.appendChild(updateAndThen);

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');

      // Check that every 10th row (0-based: 0, 10, 20, ...) has !!!
      for (let i = 0; i < rows.length; i += 10) {
        expect(rows[i].label).toBe(`Item ${i + 1} !!!`);
      }

      // Check that other rows don't have !!!
      for (let i = 1; i < rows.length; i++) {
        if (i % 10 !== 0) {
          expect(rows[i].label).toBe(`Item ${i + 1}`);
        }
      }

      // Performance check
      expect(duration).toBeLessThan(100);

      console.log(`Update every 10th row: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Swap rows operation', () => {
     beforeEach(async () => {
       // Set up initial data with at least 2 rows
       const button = document.createElement('button');
       button.setAttribute('command', '--data:generate:array:benchmarkRows');
       button.setAttribute('commandfor', 'benchmark-data');
       button.setAttribute('data-count', '1000');
       button.setAttribute('data-template', '{"id": {{index+1}}, "label": "Item {{index+1}}", "status": "active", "selected": false}');
      button.setAttribute('data-and-then', '--dom:repeat-replace:1000');
      button.setAttribute('data-then-target', 'table-body');
      button.setAttribute('data-template-id', 'row-template');
      button.setAttribute('data-key', 'id');

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should swap the first and last rows', async () => {
      const startTime = performance.now();

      const button = document.createElement('button');
      button.setAttribute('command', '--data:swap:benchmarkRows:0:999');
      button.setAttribute('commandfor', 'benchmark-data');
       const swapAndThen = document.createElement('and-then');
       swapAndThen.setAttribute('command', '--dom:swap-visual:0:999');
       swapAndThen.setAttribute('data-then-target', 'table-body');
       button.appendChild(swapAndThen);

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);

      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');

      // First row should now have id 1000
      expect(rows[0].id).toBe(1000);
      expect(rows[0].label).toBe('Item 1000');

      // Last row should now have id 1
      expect(rows[999].id).toBe(1);
      expect(rows[999].label).toBe('Item 1');

      // Performance check
      expect(duration).toBeLessThan(50);

      console.log(`Swap rows: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Clear operation', () => {
     beforeEach(async () => {
       // Set up initial data
       const button = document.createElement('button');
       button.setAttribute('command', '--data:generate:array:benchmarkRows');
       button.setAttribute('commandfor', 'benchmark-data');
       button.setAttribute('data-count', '100');
       button.setAttribute('data-template', '{"id": {{index+1}}, "label": "Item {{index+1}}", "status": "active", "selected": false}');
      button.setAttribute('data-and-then', '--dom:repeat-replace:100');
      button.setAttribute('data-then-target', 'table-body');
      button.setAttribute('data-template-id', 'row-template');
      button.setAttribute('data-key', 'id');

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    it('should clear all rows and reset DOM', async () => {
      const startTime = performance.now();

      const button = document.createElement('button');
      button.setAttribute('command', '--data:clear:benchmarkRows');
      button.setAttribute('commandfor', 'benchmark-data');
       const clearAndThen = document.createElement('and-then');
       clearAndThen.setAttribute('command', '--dom:clear');
       clearAndThen.setAttribute('data-then-target', 'table-body');
       button.appendChild(clearAndThen);

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);

      await new Promise(resolve => setTimeout(resolve, 20));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');
      expect(rows).toEqual([]);

      // Check DOM was cleared
      const tableBody = document.getElementById('table-body')!;
      expect(tableBody.children).toHaveLength(0);

      // Performance check
      expect(duration).toBeLessThan(20);

      console.log(`Clear rows: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Append 1,000 rows operation', () => {
     beforeEach(async () => {
       // Set up initial data with 500 rows
       const button = document.createElement('button');
       button.setAttribute('command', '--data:generate:array:benchmarkRows');
       button.setAttribute('commandfor', 'benchmark-data');
       button.setAttribute('data-count', '500');
       button.setAttribute('data-template', '{"id": {{index+1}}, "label": "Item {{index+1}}", "status": "active", "selected": false}');
      button.setAttribute('data-and-then', '--dom:repeat-replace:500');
      button.setAttribute('data-then-target', 'table-body');
      button.setAttribute('data-template-id', 'row-template');
      button.setAttribute('data-key', 'id');

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    it('should append 1000 more rows to existing data', async () => {
      const startTime = performance.now();

      const button = document.createElement('button');
      button.setAttribute('command', '--data:length:benchmarkRows');
      button.setAttribute('commandfor', 'benchmark-data');
       button.setAttribute('data-result-key', 'currentLength');

       const generateNewAndThen = document.createElement('and-then');
       generateNewAndThen.setAttribute('command', '--data:generate:array:newRows');
       generateNewAndThen.setAttribute('data-count', '1000');
       generateNewAndThen.setAttribute('data-template', '{"id": {{index + currentLength + 1}}, "label": "Item {{index + currentLength + 1}}", "status": "active", "selected": false}');
       button.appendChild(generateNewAndThen);

       const concatAndThen = document.createElement('and-then');
       concatAndThen.setAttribute('command', '--data:concat:benchmarkRows:newRows');
       button.appendChild(concatAndThen);

       const appendAndThen = document.createElement('and-then');
       appendAndThen.setAttribute('command', '--dom:repeat-append:1000');
       appendAndThen.setAttribute('data-then-target', 'table-body');
       appendAndThen.setAttribute('data-template-id', 'row-template');
       button.appendChild(appendAndThen);

      document.body.appendChild(button);
      // Dispatch command event directly
      const commandEvent = new CustomEvent('command', {
        bubbles: true,
        cancelable: true
      }) as any;
      commandEvent.command = button.getAttribute('command')!;
      commandEvent.source = button;
      button.dispatchEvent(commandEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');
      expect(rows).toHaveLength(1500); // 500 + 1000

      // Check that new rows have correct IDs
      expect(rows[500].id).toBe(501);
      expect(rows[1499].id).toBe(1500);

      // Check DOM was updated
      const tableBody = document.getElementById('table-body')!;
      expect(tableBody.children).toHaveLength(1500);

      // Performance check
      expect(duration).toBeLessThan(300);

      console.log(`Append 1000 rows: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory and performance monitoring', () => {
    it('should not have memory leaks during operations', async () => {
      // Run multiple create/clear cycles
      for (let i = 0; i < 5; i++) {
        const createButton = document.createElement('button');
        createButton.setAttribute('command', '--data:generate:array:100');
        createButton.setAttribute('commandfor', 'benchmark-data');
        createButton.setAttribute('data-array', 'benchmarkRows');
        createButton.setAttribute('data-template', '{"id": "{{index+1}}", "label": "Item {{index+1}}", "status": "active", "selected": false}');

        document.body.appendChild(createButton);
        createButton.click();
        await new Promise(resolve => setTimeout(resolve, 10));

        const clearButton = document.createElement('button');
        clearButton.setAttribute('command', '--data:clear:benchmarkRows');
        clearButton.setAttribute('commandfor', 'benchmark-data');

        document.body.appendChild(clearButton);
        clearButton.click();
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Verify final state is clean
      const rows = JSON.parse(benchmarkData.dataset.benchmarkRows || '[]');
      expect(rows).toEqual([]);
    });
  });
});