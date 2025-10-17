/**
 * Test for the emit command demo functionality
 * Tests that --emit commands dispatch events to document.body
 * and that listeners on window can catch them
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../src/compatible';
import { registerNavigationCommands } from '../src/commands/navigation';

describe('--emit command demo functionality', () => {
  let manager: InvokerManager;
  let eventLog: string[] = [];
  let listeners: { [key: string]: EventListener } = {};

   beforeEach(() => {
     // Enable debug mode for testing
     if (typeof window !== 'undefined' && window.Invoker) {
       window.Invoker.debug = true;
     }
    document.body.innerHTML = '';

    // Reset manager
    manager = InvokerManager.getInstance();
    // NOTE: Don't call reset() when using compatible module as it clears pre-registered commands
    // manager.reset();

    // Commands are already registered in compatible module, no need to re-register
    // registerFlowCommands(manager);

    // Clear event log
    eventLog = [];

    // Set up listeners on window (as in the demo)
    const userActionListener = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('user-action listener called with event type:', e.type, 'detail:', customEvent.detail);
      eventLog.push(`user-action: ${JSON.stringify(customEvent.detail)}`);
    };

    const navigationListener = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('navigation listener called with event type:', e.type, 'detail:', customEvent.detail);
      eventLog.push(`navigation: ${JSON.stringify(customEvent.detail)}`);
    };

    window.addEventListener('user-action', userActionListener);
    window.addEventListener('navigation', navigationListener);

    // Store listeners for cleanup
    listeners['user-action'] = userActionListener;
    listeners['navigation'] = navigationListener;
  });

  afterEach(() => {
    // Clean up listeners
    Object.entries(listeners).forEach(([eventType, listener]) => {
      window.removeEventListener(eventType, listener);
    });
    listeners = {};
  });

  it('should dispatch user-action event to document.body and catch it on window', async () => {
    // Set up the button with commandfor="body" (as in the fixed demo)
    document.body.innerHTML = `
      <button id="emit-btn" type="button" command="--emit:user-action:save-form" commandfor="body">
        Emit Save Event
      </button>
    `;

    const button = document.getElementById('emit-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();

    // Click the button
    button.click();

    // Wait for command execution
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify the event was caught
    expect(eventLog).toContain('user-action: "save-form"');
  });

  it('should dispatch navigation event to document.body and catch it on window', async () => {
    // Set up the button with commandfor="body" (as in the fixed demo)
    document.body.innerHTML = `
      <button id="emit-btn" type="button" command="--emit:navigation:next-page" commandfor="body">
        Emit Navigation Event
      </button>
    `;

    const button = document.getElementById('emit-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();

    // Click the button
    button.click();

    // Wait for command execution
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify the event was caught
    expect(eventLog).toContain('navigation: "next-page"');
  });

  it('should dispatch events with complex detail objects', async () => {
    // Test with JSON detail (though the demo uses simple strings)
    document.body.innerHTML = `
      <button id="emit-btn" type="button" command='--emit:test-event:{"message":"hello world","type":"demo"}' commandfor="body">
        Emit Complex Event
      </button>
    `;

    // Add a listener for this test event
    const testListener = (e: Event) => {
      const customEvent = e as CustomEvent;
      eventLog.push(`test-event: ${JSON.stringify(customEvent.detail)}`);
    };
    window.addEventListener('test-event', testListener);
    listeners['test-event'] = testListener;

    const button = document.getElementById('emit-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();

    // Click the button
    button.click();

    // Wait for command execution
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify the event was caught with correct detail
    expect(eventLog).toContain('test-event: {"message":"hello world","type":"demo"}');
  });

  it('should work without commandfor (fallback to document.body)', async () => {
    // Test the original behavior without commandfor
    // The emit command should still dispatch to document.body when targetElement is undefined
    document.body.innerHTML = `
      <button id="emit-btn" type="button" command="--emit:user-action:fallback-test">
        Emit Without CommandFor
      </button>
    `;

    const button = document.getElementById('emit-btn') as HTMLButtonElement;
    expect(button).toBeTruthy();

    // Click the button
    button.click();

    // Wait for command execution
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify the event was caught (should still work due to fallback)
    expect(eventLog).toContain('user-action: "fallback-test"');
  });

  it('should handle multiple events in sequence', async () => {
    document.body.innerHTML = `
      <button id="emit-btn1" type="button" command="--emit:user-action:first" commandfor="body">
        Emit First
      </button>
      <button id="emit-btn2" type="button" command="--emit:navigation:second" commandfor="body">
        Emit Second
      </button>
    `;

    const button1 = document.getElementById('emit-btn1') as HTMLButtonElement;
    const button2 = document.getElementById('emit-btn2') as HTMLButtonElement;

    // Click both buttons
    button1.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    button2.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify both events were caught
    expect(eventLog).toContain('user-action: "first"');
    expect(eventLog).toContain('navigation: "second"');
    expect(eventLog.length).toBe(2);
  });
});