import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/compatible';
import { enableAdvancedEvents, rescanCommandOnElements } from '../src/advanced/index';

describe('Bind Command with command-on', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    // Compatible layer pre-registers commands.
    void manager;
    enableAdvancedEvents();
  });

  it('binds input value when command-on is on the input', async () => {
    document.body.innerHTML = `
      <input id="source-input"
             command-on="input"
             command="--bind:value"
             commandfor="source-input"
             data-bind-to="#output"
             value="Start">
      <div id="output"></div>
    `;

    rescanCommandOnElements();

    const input = document.getElementById('source-input') as HTMLInputElement;
    const output = document.getElementById('output') as HTMLDivElement;

    input.value = 'Updated';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.textContent).toBe('Updated');
  });

  it('binds from invoker input to commandfor output without data-bind-to', async () => {
    document.body.innerHTML = `
      <input id="source-input"
             command-on="input"
             command="--bind:value"
             commandfor="output"
             value="Direct">
      <div id="output"></div>
    `;

    rescanCommandOnElements();

    const input = document.getElementById('source-input') as HTMLInputElement;
    const output = document.getElementById('output') as HTMLDivElement;

    input.value = 'Direct update';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.textContent).toBe('Direct update');
  });

  it('binds when command-on is on a wrapper and commandfor targets a child input', async () => {
    document.body.innerHTML = `
      <div id="wrapper"
           command-on="input"
           command="--bind:value"
           commandfor="@child(input)"
           data-bind-to="#output">
        <input id="source-input" value="Wrapped">
      </div>
      <div id="output"></div>
    `;

    rescanCommandOnElements();

    const input = document.getElementById('source-input') as HTMLInputElement;
    const output = document.getElementById('output') as HTMLDivElement;

    input.value = 'Wrapped update';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.textContent).toBe('Wrapped update');
  });
});
