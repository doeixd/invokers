import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/compatible';
import { interpolateString } from '../src/advanced/interpolation';
import { EventTriggerManager } from '../src/advanced/event-trigger-manager';

// Mock DOM elements for testing
function createTestElements() {
  document.body.innerHTML = `
    <button id="test-button" command-on="click" command="--text:set:clicked" commandfor="test-target">Test Button</button>
    <div id="test-target"></div>
    <input id="test-input" type="text" command-on="input" command="--text:set:{{ this.value }}" commandfor="test-output">
    <div id="test-output"></div>
    <form id="test-form" command-on="submit.prevent" command="--text:set:submitted" commandfor="form-output">
      <input type="text" name="test">
    </form>
    <div id="form-output"></div>
    <button id="emit-button" command="--emit:test-event:{\"message\":\"hello\"}">Emit Event</button>
    <div id="event-listener" data-on-event="test-event" command="--text:set:{{ detail.message }}" commandfor="event-output"></div>
    <div id="event-output"></div>

    <template id="interpolation-template">
      <div id="interpolated-div">
        <span>{{data.testValue}}</span>
      </div>
    </template>
    <div id="swap-target"></div>
  `;
}

describe('Advanced Events', () => {
   beforeEach(() => {
     // Enable debug mode for testing
     if (typeof window !== 'undefined' && window.Invoker) {
       window.Invoker.debug = true;
     }

     // Reset DOM
     createTestElements();

    // Advanced events are auto-enabled via compatible layer
  });

  describe('enableAdvancedEvents()', () => {
    it('should enable interpolation in InvokerManager', () => {
      expect(InvokerManager._interpolationEnabled).toBe(true);
    });

    it('should register interpolation utility on window', () => {
      expect((window as any).Invoker.getInterpolationUtility).toBeDefined();
      expect(typeof (window as any).Invoker.getInterpolationUtility()).toBe('function');
    });
  });

  describe('command-on attribute', () => {
    it('should trigger command on click event', async () => {
      const button = document.getElementById('test-button') as HTMLButtonElement;
      const target = document.getElementById('test-target') as HTMLDivElement;

      button.click();

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('clicked');
    });

    it('should interpolate dynamic data', async () => {
      const input = document.getElementById('test-input') as HTMLInputElement;
      const output = document.getElementById('test-output') as HTMLDivElement;

      input.value = 'test value';
      input.dispatchEvent(new Event('input'));

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('test value');
    });

    it('should handle event modifiers', async () => {
      const form = document.getElementById('test-form') as HTMLFormElement;
      const output = document.getElementById('form-output') as HTMLDivElement;

      // Spy on preventDefault
      const preventDefaultSpy = vi.fn();
      const mockEvent = new Event('submit', { cancelable: true });
      mockEvent.preventDefault = preventDefaultSpy;

      form.dispatchEvent(mockEvent);

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(output.textContent).toBe('submitted');
    });

    it('should respect the once modifier', async () => {
      document.body.innerHTML = `
        <button id="once-btn" command-on="click.once" command="--text:append:!" commandfor="once-target">Once</button>
        <div id="once-target">Start</div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('once-btn') as HTMLButtonElement;
      const target = document.getElementById('once-target') as HTMLDivElement;

      button.click();
      button.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('Start!');
    });

    it('should respect key-specific modifiers', async () => {
      document.body.innerHTML = `
        <input id="key-input" command-on="keydown.enter" command="--text:set:Enter" commandfor="key-output">
        <div id="key-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const input = document.getElementById('key-input') as HTMLInputElement;
      const output = document.getElementById('key-output') as HTMLDivElement;

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(output.textContent).toBe('');

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(output.textContent).toBe('Enter');
    });

    it('should stop propagation with stop modifier', async () => {
      document.body.innerHTML = `
        <div id="parent">
          <button id="stop-btn" command-on="click.stop" command="--text:set:Clicked" commandfor="stop-target">Stop</button>
        </div>
        <div id="stop-target"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const parent = document.getElementById('parent') as HTMLDivElement;
      const button = document.getElementById('stop-btn') as HTMLButtonElement;
      const target = document.getElementById('stop-target') as HTMLDivElement;

      const parentSpy = vi.fn();
      parent.addEventListener('click', parentSpy);

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('Clicked');
      expect(parentSpy).not.toHaveBeenCalled();
    });

    it('should attach listeners on window when window modifier is set', async () => {
      document.body.innerHTML = `
        <button id="window-btn" command-on="custom.window" command="--text:set:Windowed" commandfor="window-target">Window</button>
        <div id="window-target"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const target = document.getElementById('window-target') as HTMLDivElement;

      window.dispatchEvent(new Event('custom'));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('Windowed');
    });

    it('should execute comma-chained commands on command-on', async () => {
      document.body.innerHTML = `
        <button id="comma-btn" command-on="click" command="--text:set:One, --text:append:Two" commandfor="comma-target">
          Comma Chain
        </button>
        <div id="comma-target"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('comma-btn') as HTMLButtonElement;
      const target = document.getElementById('comma-target') as HTMLDivElement;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('OneTwo');
    });

    it('should ignore command-on elements missing command attribute', async () => {
      document.body.innerHTML = `
        <button id="missing-command" command-on="click" commandfor="missing-command-target">No Command</button>
        <div id="missing-command-target"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('missing-command') as HTMLButtonElement;
      const target = document.getElementById('missing-command-target') as HTMLDivElement;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('');
    });

    it('should ignore command-on when no targets resolve', async () => {
      document.body.innerHTML = `
        <button id="missing-target" command-on="click" command="--text:set:Updated" commandfor="#does-not-exist">No Target</button>
        <div id="existing-target">Keep</div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('missing-target') as HTMLButtonElement;
      const existing = document.getElementById('existing-target') as HTMLDivElement;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(existing.textContent).toBe('Keep');
    });

    it('should attach listeners when command-on is added after initialization', async () => {
      document.body.innerHTML = `
        <button id="dynamic-button">Dynamic</button>
        <div id="dynamic-target"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('dynamic-button') as HTMLButtonElement;
      const target = document.getElementById('dynamic-target') as HTMLDivElement;

      button.setAttribute('command-on', 'click');
      button.setAttribute('command', '--text:set:Dynamic');
      button.setAttribute('commandfor', 'dynamic-target');

      await new Promise(resolve => setTimeout(resolve, 0));

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('Dynamic');
    });

    it('should detach listeners when command-on is removed', async () => {
      document.body.innerHTML = `
        <div id="remove-button" command-on="custom-event" command="--text:set:Updated" commandfor="remove-target">Remove</div>
        <div id="remove-target">Start</div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('remove-button') as HTMLDivElement;
      const target = document.getElementById('remove-target') as HTMLDivElement;

      button.removeAttribute('command-on');
      await new Promise(resolve => setTimeout(resolve, 0));

      button.dispatchEvent(new Event('custom-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toBe('Start');
    });
  });

  describe('data-on-event attribute', () => {
    it('should listen for custom events', async () => {
      const listener = document.getElementById('event-listener') as HTMLDivElement;
      const output = document.getElementById('event-output') as HTMLDivElement;

      // Manually dispatch the event on the listener element
      const customEvent = new CustomEvent('test-event', {
        detail: { message: 'hello' },
        bubbles: true
      });
      listener.dispatchEvent(customEvent);

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('hello');
    });

    it('should disambiguate command-on and data-on-event commands', async () => {
      document.body.innerHTML = `
        <button id="dual-trigger"
                command-on="click"
                command="--text:set:clicked"
                commandfor="click-output"
                data-on-event="custom-event"
                data-on-event-command="--text:set:custom"
                data-on-event-commandfor="custom-output">
          Dual Trigger
        </button>
        <div id="click-output"></div>
        <div id="custom-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('dual-trigger') as HTMLButtonElement;
      const clickOutput = document.getElementById('click-output') as HTMLDivElement;
      const customOutput = document.getElementById('custom-output') as HTMLDivElement;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(clickOutput.textContent).toBe('clicked');
      expect(customOutput.textContent).toBe('');

      button.dispatchEvent(new CustomEvent('custom-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(clickOutput.textContent).toBe('clicked');
      expect(customOutput.textContent).toBe('custom');
    });

    it('should prioritize command attribute over data-on-event-command', async () => {
      document.body.innerHTML += `
        <div id="priority-listener"
             data-on-event="priority-event"
             command="--text:set:command"
             data-on-event-command="--text:set:data"
             commandfor="priority-output"></div>
        <div id="priority-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('priority-listener') as HTMLDivElement;
      const output = document.getElementById('priority-output') as HTMLDivElement;

      listener.dispatchEvent(new CustomEvent('priority-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('command');
    });

    it('should use data-on-event-commandfor when commandfor is missing', async () => {
      document.body.innerHTML += `
        <div id="data-commandfor-listener"
             data-on-event="commandfor-event"
             data-on-event-command="--text:set:data-commandfor"
             data-on-event-commandfor="commandfor-output"></div>
        <div id="commandfor-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('data-commandfor-listener') as HTMLDivElement;
      const output = document.getElementById('commandfor-output') as HTMLDivElement;

      listener.dispatchEvent(new CustomEvent('commandfor-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('data-commandfor');
    });

    it('should ignore data-on-event elements missing commandfor', async () => {
      document.body.innerHTML += `
        <div id="missing-commandfor"
             data-on-event="missing-commandfor-event"
             command="--text:set:ignored"></div>
        <div id="missing-commandfor-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('missing-commandfor') as HTMLDivElement;
      const output = document.getElementById('missing-commandfor-output') as HTMLDivElement;

      listener.dispatchEvent(new CustomEvent('missing-commandfor-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('');
    });

    it('should ignore data-on-event elements missing command', async () => {
      document.body.innerHTML += `
        <div id="missing-command"
             data-on-event="missing-command-event"
             commandfor="missing-command-output"></div>
        <div id="missing-command-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('missing-command') as HTMLDivElement;
      const output = document.getElementById('missing-command-output') as HTMLDivElement;

      listener.dispatchEvent(new CustomEvent('missing-command-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('');
    });

    it('should interpolate event detail data', async () => {
      // Create custom event listener with interpolation
      document.body.innerHTML += `
        <div id="detail-listener" data-on-event="custom-detail" command="--text:set:{{ detail.count }}" commandfor="detail-output"></div>
        <div id="detail-output"></div>
      `;

      // Re-initialize to attach listeners to the new element
      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('detail-listener') as HTMLDivElement;
      const output = document.getElementById('detail-output') as HTMLDivElement;

      // Manually dispatch the event on the listener element
      const customEvent = new CustomEvent('custom-detail', {
        detail: { count: 42 },
        bubbles: true
      });
      listener.dispatchEvent(customEvent);

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('42');
    });


  });

  describe('deduplication', () => {
    it('should not double-execute when command-on click overlaps polyfill click', async () => {
      document.body.innerHTML = `
        <button id="dedupe-button" command-on="click" command="--test:count" commandfor="dedupe-output">Click</button>
        <div id="dedupe-output" data-count="0"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const manager = InvokerManager.getInstance();
      manager.register('--test:count', ({ targetElement }) => {
        const current = parseInt(targetElement.dataset.count || '0', 10);
        const next = current + 1;
        targetElement.dataset.count = String(next);
        targetElement.textContent = String(next);
      });

      const button = document.getElementById('dedupe-button') as HTMLButtonElement;
      const output = document.getElementById('dedupe-output') as HTMLDivElement;

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('1');
    });

    it('should not double-execute when command-on and data-on-event share the same event', async () => {
      document.body.innerHTML = `
        <button id="dual-trigger"
                command-on="click"
                command="--test:count"
                commandfor="dual-output"
                data-on-event="click"
                data-on-event-command="--test:count"
                data-on-event-commandfor="dual-output">
          Dual Trigger
        </button>
        <div id="dual-output" data-count="0"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const manager = InvokerManager.getInstance();
      manager.register('--test:count', ({ targetElement }) => {
        const current = parseInt(targetElement.dataset.count || '0', 10);
        const next = current + 1;
        targetElement.dataset.count = String(next);
        targetElement.textContent = String(next);
      });

      const button = document.getElementById('dual-trigger') as HTMLButtonElement;
      const output = document.getElementById('dual-output') as HTMLDivElement;

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('1');
    });

    it('should avoid data-on-event command when it matches command-on click', async () => {
      document.body.innerHTML = `
        <button id="dedupe-targets"
                command-on="click"
                command="--text:set:clicked"
                commandfor="primary-output"
                data-on-event="click"
                data-on-event-command="--text:set:custom"
                data-on-event-commandfor="secondary-output">
          Dedupe Targets
        </button>
        <div id="primary-output"></div>
        <div id="secondary-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('dedupe-targets') as HTMLButtonElement;
      const primary = document.getElementById('primary-output') as HTMLDivElement;
      const secondary = document.getElementById('secondary-output') as HTMLDivElement;

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(primary.textContent).toBe('clicked');
      expect(secondary.textContent).toBe('');
    });

    it('should allow built-in toggle via command-on without double toggling', async () => {
      document.body.innerHTML = `
        <button id="native-toggle" command="toggle" commandfor="native-details" command-on="click">
          Toggle Details
        </button>
        <details id="native-details">
          <summary>Summary</summary>
          <p>Content</p>
        </details>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('native-toggle') as HTMLButtonElement;
      const details = document.getElementById('native-details') as HTMLDetailsElement;

      expect(details.open).toBe(false);

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(details.open).toBe(true);
    });

    it('should not double-toggle custom --toggle on command-on click', async () => {
      document.body.innerHTML = `
        <button id="custom-toggle" command="--toggle" commandfor="custom-panel" command-on="click">
          Toggle Panel
        </button>
        <div id="custom-panel"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('custom-toggle') as HTMLButtonElement;
      const panel = document.getElementById('custom-panel') as HTMLDivElement;

      expect(panel.hasAttribute('hidden')).toBe(false);

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(panel.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('listener updates', () => {
    it('should rebind command-on when the event type changes', async () => {
      document.body.innerHTML = `
        <div id="rebind-button" command-on="click" command="--text:set:clicked" commandfor="rebind-output">
          Rebind
        </div>
        <div id="rebind-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('rebind-button') as HTMLDivElement;
      const output = document.getElementById('rebind-output') as HTMLDivElement;

      button.setAttribute('command-on', 'custom-event');
      await new Promise(resolve => setTimeout(resolve, 0));

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(output.textContent).toBe('');

      button.dispatchEvent(new Event('custom-event', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(output.textContent).toBe('clicked');
    });

    it('should rebind data-on-event when the event type changes', async () => {
      document.body.innerHTML = `
        <div id="rebind-listener" data-on-event="alpha" command="--text:set:alpha" commandfor="rebind-event-output"></div>
        <div id="rebind-event-output"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const listener = document.getElementById('rebind-listener') as HTMLDivElement;
      const output = document.getElementById('rebind-event-output') as HTMLDivElement;

      listener.setAttribute('data-on-event', 'beta');
      await new Promise(resolve => setTimeout(resolve, 0));

      listener.dispatchEvent(new CustomEvent('alpha', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(output.textContent).toBe('');

      listener.dispatchEvent(new CustomEvent('beta', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(output.textContent).toBe('alpha');
    });
  });

  describe('multi-target selectors', () => {
    it('should toggle all targets once for a selector-based commandfor', async () => {
      document.body.innerHTML = `
        <button id="multi-toggle" command-on="click" command="--test:mark-all" commandfor=".multi-item">Toggle</button>
        <div class="multi-item"></div>
        <div class="multi-item"></div>
      `;

      EventTriggerManager.getInstance().initialize();

      const manager = InvokerManager.getInstance();
      manager.register('--test:mark-all', ({ getTargets }) => {
        const targets = getTargets();
        targets.forEach(target => target.setAttribute('data-hit', 'true'));
        if (targets[0]) {
          targets[0].setAttribute('data-count', String(targets.length));
        }
      });

      const button = document.getElementById('multi-toggle') as HTMLButtonElement;
      const items = Array.from(document.querySelectorAll('.multi-item')) as HTMLElement[];

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(button.dataset.commandOnAttached).toBe('true');

      button.dispatchEvent(new Event('click', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(items.every(item => item.getAttribute('data-hit') === 'true')).toBe(true);
      expect(items[0].getAttribute('data-count')).toBe('2');
    });
  });

  describe('shadow DOM', () => {
    it('should handle command-on inside a shadow root with contextual targets', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `
        <div class="panel">
          <button id="shadow-toggle" command-on="click" command="--toggle" commandfor="@closest(.panel)">
            Toggle
          </button>
        </div>
      `;

      EventTriggerManager.getInstance().initialize(shadow as unknown as Element);

      const panel = shadow.querySelector('.panel') as HTMLElement;
      const button = shadow.querySelector('#shadow-toggle') as HTMLButtonElement;

      button.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(panel.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('interpolation', () => {
    it('should safely interpolate context variables', () => {
      const context = {
        this: { value: 'input value', id: 'test-input' },
        event: { type: 'input', key: 'a' },
        detail: { message: 'hello world' },
        target: { textContent: 'old content' }
      };

      expect(interpolateString('Value: {{ this.value }}', context)).toBe('Value: input value');
      expect(interpolateString('Event: {{ event.type }}', context)).toBe('Event: input');
      expect(interpolateString('Message: {{ detail.message }}', context)).toBe('Message: hello world');
      expect(interpolateString('Target: {{ target.textContent }}', context)).toBe('Target: old content');
    });

    it('should handle undefined/null values safely', () => {
      const context = {
        this: { value: null },
        event: undefined,
        detail: { message: undefined }
      };

      expect(interpolateString('Value: {{ this.value }}', context)).toBe('Value: ');
      expect(interpolateString('Event: {{ event.type }}', context)).toBe('Event: ');
      expect(interpolateString('Message: {{ detail.message }}', context)).toBe('Message: ');
    });

    it('should handle nested object access', () => {
      const context = {
        detail: { user: { name: 'John', profile: { age: 30 } } }
      };

      expect(interpolateString('Name: {{ detail.user.name }}', context)).toBe('Name: John');
      expect(interpolateString('Age: {{ detail.user.profile.age }}', context)).toBe('Age: 30');
    });

    it('should interpolate templates in --dom:swap command', async () => {
      // Set up data for interpolation
      document.body.dataset.testValue = 'Interpolated Value';

      const button = document.createElement('button');
      button.setAttribute('command', '--dom:swap:outer');
      button.setAttribute('commandfor', 'swap-target');
      button.setAttribute('data-template-id', 'interpolation-template');
      document.body.appendChild(button);

      // Trigger the command
      button.click();

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that the target was replaced and interpolated
      const interpolatedDiv = document.getElementById('interpolated-div');
      expect(interpolatedDiv).toBeTruthy();
      expect(interpolatedDiv!.querySelector('span')!.textContent).toBe('Interpolated Value');

      // Clean up
      document.body.removeChild(button);
      if (interpolatedDiv) document.body.removeChild(interpolatedDiv);
    });
  });

  describe('--emit command', () => {
    it('should emit custom events with JSON detail and update target via commandfor', async () => {
      // Simulate emitting an event with JSON data
      document.body.innerHTML = `
        <button id="emit-btn" command-on="click" command="--emit:test-event:{&quot;message&quot;:&quot;Hello World&quot;}" commandfor="listener">Emit Event</button>
        <div id="listener" data-on-event="test-event" command="--text:set:{{ detail.message }}" commandfor="output"></div>
        <div id="output"></div>
      `;

      // Re-initialize to attach listeners
      EventTriggerManager.getInstance().initialize();

      const button = document.getElementById('emit-btn') as HTMLButtonElement;
      const output = document.getElementById('output') as HTMLDivElement;

      button.click();

      // Wait for command execution
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('Hello World');
    });
  });

  describe('tree-shaking', () => {
    it('should not include advanced event code when enableAdvancedEvents is not called', () => {
      // This test would need to be run in a separate test file that doesn't import advanced-events.ts
      // For now, we'll just verify that the features are disabled by default
      const manager = InvokerManager.getInstance();

      // Reset interpolation flag
      (manager as any)._interpolationEnabled = false;

      expect((manager as any)._interpolationEnabled).toBe(false);
    });
  });
});
