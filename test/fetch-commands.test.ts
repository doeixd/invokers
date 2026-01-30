import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerFetchCommands } from '../src/commands/fetch';

describe('Fetch Commands - All HTTP Verbs', () => {
  let invokerManager: InvokerManager;
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    registerFetchCommands(invokerManager);
    invokerManager.ensureListenersAttached();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('--fetch:get', () => {
    it('should perform GET request with HTML response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'text/html']]),
        text: () => Promise.resolve('<p>GET response</p>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/data', expect.objectContaining({
        method: 'GET'
      }));
      expect(target.innerHTML).toBe('<p>GET response</p>');
    });

    it('should handle JSON response type', async () => {
      const mockData = { name: 'John', age: 30 };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockData)
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/users/1');
      button.setAttribute('data-response-type', 'json');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(target.dataset.response).toBe(JSON.stringify(mockData));
      expect(target.textContent).toBe(JSON.stringify(mockData, null, 2));
    });

    it('should handle text response type', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map([['content-type', 'text/plain']]),
        text: () => Promise.resolve('Plain text response')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/text');
      button.setAttribute('data-response-type', 'text');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(target.textContent).toBe('Plain text response');
    });

    it('should send custom headers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Authorized</p>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/protected');
      button.setAttribute('data-header-authorization', 'Bearer token123');
      button.setAttribute('data-header-x-custom', 'custom-value');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/protected', expect.objectContaining({
        headers: expect.objectContaining({
          'authorization': 'Bearer token123',
          'x-custom': 'custom-value'
        })
      }));
    });

    it('should use response target instead of command target', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Response</p>')
      });

      const commandTarget = document.createElement('div');
      commandTarget.id = 'command-target';
      document.body.appendChild(commandTarget);

      const responseTarget = document.createElement('div');
      responseTarget.id = 'response-target';
      document.body.appendChild(responseTarget);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      button.setAttribute('data-response-target', '#response-target');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#command-target', button);

      expect(responseTarget.innerHTML).toBe('<p>Response</p>');
      expect(commandTarget.innerHTML).toBe(''); // Should remain empty
    });
  });

  describe('--fetch:post', () => {
    it('should perform POST request with JSON body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Created</p>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/users');
      button.setAttribute('data-body', '{"name":"John","email":"john@example.com"}');
      button.setAttribute('data-header-content-type', 'application/json');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:post', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'POST',
        body: '{"name":"John","email":"john@example.com"}'
      }));
      expect(target.innerHTML).toBe('<p>Created</p>');
    });

    it('should get body from form element', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Submitted</p>')
      });

      const form = document.createElement('form');
      form.id = 'user-form';
      const input = document.createElement('input');
      input.name = 'username';
      input.value = 'johndoe';
      form.appendChild(input);
      document.body.appendChild(form);

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/submit');
      button.setAttribute('data-body-from', '#user-form');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:post', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/submit', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }));
    });

    it('should get body from input element', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Saved</p>')
      });

      const input = document.createElement('textarea');
      input.id = 'json-input';
      input.value = '{"title":"New Post"}';
      document.body.appendChild(input);

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/posts');
      button.setAttribute('data-body-from', '#json-input');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:post', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
        method: 'POST',
        body: '{"title":"New Post"}'
      }));
    });
  });

  describe('--fetch:put', () => {
    it('should perform PUT request with JSON body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Updated</p>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/users/123');
      button.setAttribute('data-body', '{"name":"Jane","email":"jane@example.com"}');
      button.setAttribute('data-header-content-type', 'application/json');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:put', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/users/123', expect.objectContaining({
        method: 'PUT',
        body: '{"name":"Jane","email":"jane@example.com"}'
      }));
    });
  });

  describe('--fetch:patch', () => {
    it('should perform PATCH request with JSON body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Patched</p>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/users/123');
      button.setAttribute('data-body', '{"email":"newemail@example.com"}');
      button.setAttribute('data-header-content-type', 'application/json');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:patch', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/users/123', expect.objectContaining({
        method: 'PATCH',
        body: '{"email":"newemail@example.com"}'
      }));
    });
  });

  describe('--fetch:delete', () => {
    it('should perform DELETE request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/users/123');
      button.setAttribute('data-header-authorization', 'Bearer token123');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:delete', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/users/123', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  describe('--fetch:head', () => {
    it('should perform HEAD request and store headers', async () => {
      const mockHeaders = new Map([
        ['content-length', '1234'],
        ['last-modified', 'Mon, 01 Jan 2024 00:00:00 GMT']
      ]);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/resource');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:head', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/resource', expect.objectContaining({
        method: 'HEAD'
      }));

      const storedHeaders = JSON.parse(target.dataset.responseHeaders || '{}');
      expect(storedHeaders['content-length']).toBe('1234');
      expect(storedHeaders['last-modified']).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
      expect(target.dataset.responseStatus).toBe('200');
    });
  });

  describe('--fetch:options', () => {
    it('should perform OPTIONS request and store headers', async () => {
      const mockHeaders = new Map([
        ['allow', 'GET, POST, PUT, DELETE'],
        ['access-control-allow-methods', 'GET, POST, PUT, DELETE']
      ]);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/users');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:options', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'OPTIONS'
      }));

      const storedHeaders = JSON.parse(target.dataset.responseHeaders || '{}');
      expect(storedHeaders['allow']).toBe('GET, POST, PUT, DELETE');
    });
  });

  describe('CORS and credentials', () => {
    it('should support credentials option', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<p>Success</p>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', 'https://api.example.com/data');
      button.setAttribute('data-credentials', 'include');
      button.setAttribute('data-mode', 'cors');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', expect.objectContaining({
        credentials: 'include',
        mode: 'cors'
      }));
    });
  });

  describe('Replace strategies', () => {
    it('should support beforebegin strategy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<div id="new">Before</div>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      target.innerHTML = '<p>Original</p>';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      button.setAttribute('data-replace-strategy', 'beforebegin');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      const inserted = document.getElementById('new');
      expect(inserted).toBeTruthy();
      expect(inserted?.nextElementSibling).toBe(target);
    });

    it('should support afterend strategy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<div id="new">After</div>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      target.innerHTML = '<p>Original</p>';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      button.setAttribute('data-replace-strategy', 'afterend');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      const inserted = document.getElementById('new');
      expect(inserted).toBeTruthy();
      expect(target.nextElementSibling).toBe(inserted);
    });

    it('should support outerHTML strategy', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<section id="replacement">New element</section>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      button.setAttribute('data-replace-strategy', 'outerHTML');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(document.getElementById('target')).toBeNull();
      expect(document.getElementById('replacement')).toBeTruthy();
    });
  });

  describe('HTML selection', () => {
    it('should replace with selected element content', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<table><tbody id="tbody"><tr><td>Row</td></tr></tbody></table>')
      });

      const target = document.createElement('tbody');
      target.id = 'tbody';
      target.innerHTML = '<tr><td>Old</td></tr>';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      button.setAttribute('data-select', '#tbody');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#tbody', button);

      expect(target.innerHTML).toBe('<tr><td>Row</td></tr>');
    });

    it('should replace outerHTML using selected elements', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        text: () => Promise.resolve('<div class="row">A</div><div class="row">B</div>')
      });

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      button.setAttribute('data-select-all', '.row');
      button.setAttribute('data-replace-strategy', 'outerHTML');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(document.getElementById('target')).toBeNull();
      expect(document.querySelectorAll('.row')).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should handle HTTP errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const target = document.createElement('div');
      target.id = 'target';
      target.innerHTML = '<p>Original</p>';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/notfound');
      document.body.appendChild(button);

      // Should not throw, but handle error internally
      await invokerManager.executeCommand('--fetch:get', '#target', button);

      // Content should remain unchanged
      expect(target.innerHTML).toBe('<p>Original</p>');
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const target = document.createElement('div');
      target.id = 'target';
      target.innerHTML = '<p>Original</p>';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/data');
      document.body.appendChild(button);

      // Should not throw, but handle error internally
      await invokerManager.executeCommand('--fetch:get', '#target', button);

      // Content should remain unchanged
      expect(target.innerHTML).toBe('<p>Original</p>');
    });
  });

  describe('Custom timeout', () => {
    it('should respect custom timeout value', async () => {
      // Mock a slow response
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              headers: new Map(),
              text: () => Promise.resolve('<p>Slow response</p>')
            });
          }, 100);
        })
      );

      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/slow');
      button.setAttribute('data-timeout', '5000'); // 5 second timeout
      document.body.appendChild(button);

      await invokerManager.executeCommand('--fetch:get', '#target', button);

      expect(target.innerHTML).toBe('<p>Slow response</p>');
    });
  });
});
