import { describe, it, expect, beforeEach } from 'vitest';
import { InvokerManager } from '../src/compatible';

describe('Extended Commands', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    // Extended commands are registered automatically by InvokerManager
  });

  describe('DOM Commands', () => {
    describe('--dom:swap', () => {
      it('should swap inner content by default', async () => {
        // Create target element with initial content
        const target = document.createElement('div');
        target.id = 'target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create template
        const template = document.createElement('template');
        template.id = 'test-template';
        template.innerHTML = '<span>New content</span>';
        document.body.appendChild(template);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-template-id', 'test-template');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--dom:swap', '#target', button);

        // Check that inner content was replaced
        expect(target.innerHTML).toBe('<span>New content</span>');
        expect(document.body.contains(target)).toBe(true); // Element should still exist
      });

      it('should swap inner content with explicit :inner parameter', async () => {
        // Create target element with initial content
        const target = document.createElement('div');
        target.id = 'target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create template
        const template = document.createElement('template');
        template.id = 'test-template';
        template.innerHTML = '<span>New content</span>';
        document.body.appendChild(template);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-template-id', 'test-template');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--dom:swap:inner', '#target', button);

        // Check that inner content was replaced
        expect(target.innerHTML).toBe('<span>New content</span>');
        expect(document.body.contains(target)).toBe(true); // Element should still exist
      });

      it('should swap outer content with :outer parameter', async () => {
        // Create target element with initial content
        const target = document.createElement('div');
        target.id = 'target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create template
        const template = document.createElement('template');
        template.id = 'test-template';
        template.innerHTML = '<section><h1>New content</h1></section>';
        document.body.appendChild(template);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-template-id', 'test-template');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--dom:swap:outer', '#target', button);

        // Check that the entire element was replaced
        expect(document.getElementById('target')).toBeNull(); // Original element should be gone
        const newElement = document.querySelector('section');
        expect(newElement).not.toBeNull();
        expect(newElement!.innerHTML).toBe('<h1>New content</h1>');
      });
    });

    describe('--bind', () => {
      it('should bind input value to text content', async () => {
        // Create input element
        const input = document.createElement('input');
        input.id = 'bind-input';
        input.type = 'text';
        input.value = 'Hello World';
        document.body.appendChild(input);

        // Create output element
        const output = document.createElement('div');
        output.id = 'bind-output';
        document.body.appendChild(output);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-bind-to', '#bind-output');
        button.setAttribute('data-bind-as', 'text');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--bind:value', '#bind-input', button);

        // Check that the value was bound
        expect(output.textContent).toBe('Hello World');
      });

      it('should bind to data attributes', async () => {
        // Create input element
        const input = document.createElement('input');
        input.id = 'data-input';
        input.type = 'text';
        input.value = 'test-value';
        document.body.appendChild(input);

        // Create target element
        const target = document.createElement('div');
        target.id = 'data-target';
        document.body.appendChild(target);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-bind-to', '#data-target');
        button.setAttribute('data-bind-as', 'data:test');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--bind:value', '#data-input', button);

        // Check that the data attribute was set
        expect(target.dataset.test).toBe('test-value');
      });

      it('should bind using @closest selector', async () => {
        // Create container with form
        const container = document.createElement('div');
        container.className = 'edit-form';
        container.id = 'test-container';
        document.body.appendChild(container);

        // Create input inside container
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'test title';
        input.setAttribute('data-bind-as', 'data:title');
        container.appendChild(input);

        // Test with @closest selector
        await invokerManager.executeCommand('--bind:value', '@closest(.edit-form)', input);

        // Check that the data attribute was set
        expect(container.dataset.title).toBe('test title');
      });
    });
  });

  describe('Fetch Commands', () => {
    // Mock fetch globally for all tests
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    describe('--fetch:get command', () => {
      it('should use innerHTML replace strategy by default', async () => {
        // Mock successful fetch response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<p>New content</p>')
        });

        // Create target element
        const target = document.createElement('div');
        target.id = 'fetch-target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create invoker button
        const button = document.createElement('button');
        button.setAttribute('data-url', '/api/test');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--fetch:get', '#fetch-target', button);

        // Check that inner content was replaced (default innerHTML strategy)
        expect(target.innerHTML).toBe('<p>New content</p>');
        expect(document.body.contains(target)).toBe(true); // Element should still exist
      });

      it('should support outerHTML replace strategy', async () => {
        // Mock successful fetch response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<div id="new-element"><span>Replaced content</span></div>')
        });

        // Create target element
        const target = document.createElement('div');
        target.id = 'fetch-target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create invoker button with outerHTML strategy
        const button = document.createElement('button');
        button.setAttribute('data-url', '/api/test');
        button.setAttribute('data-replace-strategy', 'outerHTML');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--fetch:get', '#fetch-target', button);

        // Check that entire element was replaced
        const newElement = document.getElementById('new-element');
        expect(newElement).toBeTruthy();
        expect(newElement?.textContent).toBe('Replaced content');
        expect(document.getElementById('fetch-target')).toBeFalsy(); // Original element should be gone
      });

      it('should support beforebegin insert strategy', async () => {
        // Mock successful fetch response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<div id="inserted-before"><em>Inserted before</em></div>')
        });

        // Create target element
        const target = document.createElement('div');
        target.id = 'fetch-target';
        target.innerHTML = '<p>Target content</p>';
        document.body.appendChild(target);

        // Create invoker button with beforebegin strategy
        const button = document.createElement('button');
        button.setAttribute('data-url', '/api/test');
        button.setAttribute('data-replace-strategy', 'beforebegin');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--fetch:get', '#fetch-target', button);

        // Check that content was inserted before target
        const insertedElement = document.getElementById('inserted-before');
        expect(insertedElement).toBeTruthy();
        expect(insertedElement?.nextElementSibling).toBe(target); // Should be right before target
        expect(target.innerHTML).toBe('<p>Target content</p>'); // Target should be unchanged
      });

      it('should support afterend insert strategy', async () => {
        // Mock successful fetch response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<div id="inserted-after"><strong>Inserted after</strong></div>')
        });

        // Create target element
        const target = document.createElement('div');
        target.id = 'fetch-target';
        target.innerHTML = '<p>Target content</p>';
        document.body.appendChild(target);

        // Create invoker button with afterend strategy
        const button = document.createElement('button');
        button.setAttribute('data-url', '/api/test');
        button.setAttribute('data-replace-strategy', 'afterend');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--fetch:get', '#fetch-target', button);

        // Check that content was inserted after target
        const insertedElement = document.getElementById('inserted-after');
        expect(insertedElement).toBeTruthy();
        expect(target.nextElementSibling).toBe(insertedElement); // Should be right after target
        expect(target.innerHTML).toBe('<p>Target content</p>'); // Target should be unchanged
      });

      it('should handle invalid replace strategy gracefully', async () => {
        // Mock successful fetch response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<p>Content</p>')
        });

        // Create target element
        const target = document.createElement('div');
        target.id = 'fetch-target';
        target.innerHTML = '<p>Original content</p>';
        document.body.appendChild(target);

        // Create invoker button with invalid strategy
        const button = document.createElement('button');
        button.setAttribute('data-url', '/api/test');
        button.setAttribute('data-replace-strategy', 'invalid-strategy');
        document.body.appendChild(button);

        // Execute command - should complete without throwing but content should remain unchanged
        await invokerManager.executeCommand('--fetch:get', '#fetch-target', button);

        // Content should remain unchanged due to error
        expect(target.innerHTML).toBe('<p>Original content</p>');
      });
    });

    describe('--fetch:send command', () => {
      it('should support custom replace strategy for form submission', async () => {
        // Mock successful fetch response
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<div id="response-content"><h3>Success!</h3></div>')
        });

        // Create form
        const form = document.createElement('form');
        form.id = 'test-form';
        form.action = '/api/submit';
        form.method = 'post';
        document.body.appendChild(form);

        // Create response target
        const responseTarget = document.createElement('div');
        responseTarget.id = 'response-target';
        responseTarget.innerHTML = '<p>Loading...</p>';
        document.body.appendChild(responseTarget);

        // Create invoker button with outerHTML strategy
        const button = document.createElement('button');
        button.setAttribute('data-url', '/api/submit');
        button.setAttribute('data-response-target', '#response-target');
        button.setAttribute('data-replace-strategy', 'outerHTML');
        button.setAttribute('data-body-from', '#test-form');
        document.body.appendChild(button);

        // Execute command
        await invokerManager.executeCommand('--fetch:post', '#test-form', button);

        // Check that response target was replaced entirely
        const newResponse = document.getElementById('response-content');
        expect(newResponse).toBeTruthy();
        expect(newResponse?.textContent).toBe('Success!');
        expect(document.getElementById('response-target')).toBeFalsy(); // Original should be gone
      });
    });
  });
});