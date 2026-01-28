import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager, _dispatchCommandEvent } from '../src/compatible';

describe('Native CommandEvent compatibility', () => {
  let originalCommandEvent: typeof window.CommandEvent | undefined;

  beforeEach(() => {
    originalCommandEvent = (window as any).CommandEvent;

    class FakeCommandEvent extends Event {
      public command: string;
      public source: HTMLElement | null;
      public targetElement: HTMLElement | null;

      constructor(type: string, init: { command?: string; source?: HTMLElement; target?: HTMLElement } = {}) {
        super(type, { bubbles: true, cancelable: true, composed: true });
        this.command = init.command || '';
        this.source = init.source || null;
        this.targetElement = init.target || null;
      }
    }

    (window as any).CommandEvent = FakeCommandEvent as any;
  });

  afterEach(() => {
    (window as any).CommandEvent = originalCommandEvent;
  });

  it('should dispatch commands using an existing CommandEvent implementation', async () => {
    document.body.innerHTML = `
      <button id="native-button" command="--text:set:Native" commandfor="native-output">Go</button>
      <div id="native-output"></div>
    `;

    const manager = InvokerManager.getInstance();
    manager.ensureListenersAttached();

    const button = document.getElementById('native-button') as HTMLButtonElement;
    const output = document.getElementById('native-output') as HTMLDivElement;

    _dispatchCommandEvent(button, '--text:set:Native', output);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(output.textContent).toBe('Native');
  });
});
