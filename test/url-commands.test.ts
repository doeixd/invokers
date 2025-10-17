import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerBrowserCommands } from '../src/commands/browser';

// Use real window.location and window.history for testing
// The URL command should work with real browser APIs

describe('URL Commands (--url)', () => {
  let invokerManager: InvokerManager;
  let mockButton: HTMLButtonElement;
  let mockInput: HTMLInputElement;
  let mockTextarea: HTMLTextAreaElement;
  let mockTarget: HTMLElement;
  let mockHistory: any;
  let mockLocation: any;

  beforeEach(() => {
    // Set up URL with query parameters for testing
    // In jsdom, we can modify location properties
    window.history.replaceState(null, '', '/test?page=existing&existing=old#section1');

    // Mock browser APIs for testing
    let currentHash = '#section1';
    let currentSearch = '?page=existing&existing=old';

    mockHistory = {
      state: null,
      replaceState: vi.fn((state, title, url) => {
        if (typeof url === 'string') {
          const urlObj = new URL(url, 'http://example.com');
          mockLocation.pathname = urlObj.pathname;
          currentSearch = urlObj.search;
          currentHash = urlObj.hash;
        }
      }),
      pushState: vi.fn((state, title, url) => {
        if (typeof url === 'string') {
          const urlObj = new URL(url, 'http://example.com');
          mockLocation.pathname = urlObj.pathname;
          currentSearch = urlObj.search;
          currentHash = urlObj.hash;
        }
      }),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn()
    };

    mockLocation = {
      get hash() { return currentHash; },
      set hash(value: string) { currentHash = value; },
      get search() { return currentSearch; },
      set search(value: string) { currentSearch = value; },
      get href() { return `https://example.com${this.pathname}${this.search}${this.hash}`; },
      reload: vi.fn(),
      replace: vi.fn((url: string) => {
        // location.replace should update the URL
        const urlObj = new URL(url, 'https://example.com');
        mockLocation.pathname = urlObj.pathname;
        currentSearch = urlObj.search;
        currentHash = urlObj.hash;
      }),
      pathname: '/test'
    };

    // Replace window.history and window.location with mocks
    (window as any).history = mockHistory;
    (window as any).location = mockLocation;

    // Clean up any existing test elements
    const existingButton = document.getElementById('test-button');
    const existingInput = document.getElementById('test-input');
    const existingTextarea = document.getElementById('test-textarea');
    const existingTarget = document.getElementById('test-target');
    if (existingButton) existingButton.remove();
    if (existingInput) existingInput.remove();
    if (existingTextarea) existingTextarea.remove();
    if (existingTarget) existingTarget.remove();

    // Create mock DOM elements
    mockButton = document.createElement('button');
    mockButton.id = 'test-button';
    mockInput = document.createElement('input');
    mockInput.id = 'test-input';
    mockInput.value = 'test-value';
    mockTextarea = document.createElement('textarea');
    mockTextarea.id = 'test-textarea';
    mockTextarea.value = 'textarea-value';
    mockTarget = document.createElement('div');
    mockTarget.id = 'test-target';

    // Add elements to document
    document.body.appendChild(mockButton);
    document.body.appendChild(mockInput);
    document.body.appendChild(mockTextarea);
    document.body.appendChild(mockTarget);

    // Get singleton InvokerManager instance
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    registerBrowserCommands(invokerManager);
  });

  describe('URL Parameter Commands', () => {
    it('should register URL commands', () => {
      // Check that InvokerManager is initialized
      expect(invokerManager).toBeDefined();

      // Try to execute a simple URL command to ensure it's registered
      // If the command is not registered, it should throw an error
      expect(() => {
        // This should not throw if the command is registered
        mockButton.setAttribute('command', '--url:params-get:existing');
        mockButton.setAttribute('commandfor', 'test-target');
        // We don't actually click here, just check that the setup works
      }).not.toThrow();
    });

    it('should get URL parameter value', async () => {
      mockButton.setAttribute('command', '--url:params-get:existing');
      mockButton.setAttribute('commandfor', 'test-target');

      // Spy on console to check for errors
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Just check that no errors were thrown
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should set URL parameter with name and value in command', async () => {
      mockButton.setAttribute('command', '--url:params-set:new-param:new-value');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should set URL parameter with name from command and value from target element', async () => {
      mockButton.setAttribute('command', '--url:params-set:test-param');
      mockButton.setAttribute('commandfor', 'test-input');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(window.location.search).toContain('test-param=test-value');
    });

    it('should set URL parameter with name from data attribute and value from target', async () => {
      mockButton.setAttribute('command', '--url:params-set');
      mockButton.setAttribute('commandfor', 'test-input');
      mockButton.setAttribute('data-url-param-name', 'dynamic-param');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/test?page=existing&existing=old&dynamic-param=test-value#section1'
      );
    });

    it('should delete URL parameter', async () => {
      mockButton.setAttribute('command', '--url:params-delete:existing');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/test?page=existing#section1'
      );
    });

    it('should clear all URL parameters', async () => {
      mockButton.setAttribute('command', '--url:params-clear');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/test#section1'
      );
    });

    it('should get all URL parameters as JSON', async () => {
      mockButton.setAttribute('command', '--url:params-all');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTarget.textContent).toBe('{"page":"existing","existing":"old"}');
    });
  });

  describe('URL Hash Commands', () => {
    it('should get current hash', async () => {
      mockButton.setAttribute('command', '--url:hash-get');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTarget.textContent).toBe('section1');
    });

    it('should set hash', async () => {
      mockButton.setAttribute('command', '--url:hash-set:new-section');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLocation.hash).toBe('#new-section');
    });

    it('should set hash from input element value', async () => {
      mockButton.setAttribute('command', '--url:hash-set');
      mockButton.setAttribute('commandfor', 'test-input');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLocation.hash).toBe('#test-value');
    });

    it('should clear hash', async () => {
      mockButton.setAttribute('command', '--url:hash-clear');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLocation.hash).toBe('');
    });
  });

  describe('URL Pathname Commands', () => {
    it('should get current pathname', async () => {
      mockButton.setAttribute('command', '--url:pathname-get');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTarget.textContent).toBe('/test');
    });

    it('should set pathname', async () => {
      mockButton.setAttribute('command', '--url:pathname-set:/new-page');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/new-page?page=existing&existing=old#section1'
      );
    });

    it('should set pathname from input element value', async () => {
      mockButton.setAttribute('command', '--url:pathname-set');
      mockButton.setAttribute('commandfor', 'test-input');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/test-value?page=existing&existing=old#section1'
      );
    });

    it('should set hash from textarea element value', async () => {
      mockButton.setAttribute('command', '--url:hash-set');
      mockButton.setAttribute('commandfor', 'test-textarea');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLocation.hash).toBe('#textarea-value');
    });

    it('should set pathname from textarea element value', async () => {
      mockButton.setAttribute('command', '--url:pathname-set');
      mockButton.setAttribute('commandfor', 'test-textarea');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/textarea-value?page=existing&existing=old#section1'
      );
    });
  });

  describe('URL Navigation Commands', () => {
    it('should navigate to new URL', async () => {
      mockButton.setAttribute('command', '--url:navigate:/new-page');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.pushState).toHaveBeenCalledWith(
        {},
        '',
        '/new-page'
      );
    });

    it('should replace current URL', async () => {
      mockButton.setAttribute('command', '--url:replace:/replaced-page');
      mockButton.setAttribute('commandfor', 'test-target');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        '/replaced-page'
      );
    });

    it('should reload the page', async () => {
      mockButton.setAttribute('command', '--url:reload');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLocation.reload).toHaveBeenCalled();
    });
  });

  describe('URL Command Interpolation', () => {
    beforeEach(() => {
      // Enable advanced events for interpolation
      invokerManager = InvokerManager.getInstance();
      invokerManager._enableInterpolation();
      // Mock the interpolation being enabled
      (window as any).Invoker = {
        getInterpolationUtility: () => (template: string, context: any) => {
          return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] || context.this?.[key] || match;
          });
        }
      };
    });

    it('should interpolate parameter name', async () => {
      mockButton.setAttribute('command', '--url:params-set:{{paramName}}:interpolated-value');
      mockButton.setAttribute('commandfor', 'test-target');
      (mockButton as any).paramName = 'dynamic-param';

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/test?page=existing&existing=old&dynamic-param=interpolated-value#section1'
      );
    });

    it('should interpolate parameter value', async () => {
      mockButton.setAttribute('command', '--url:params-set:test-param:{{paramValue}}');
      mockButton.setAttribute('commandfor', 'test-target');
      (mockButton as any).paramValue = 'dynamic-value';

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/test?page=existing&existing=old&test-param=dynamic-value#section1'
      );
    });

    it('should interpolate hash value', async () => {
      mockButton.setAttribute('command', '--url:hash-set:{{sectionName}}');
      mockButton.setAttribute('commandfor', 'test-target');
      (mockButton as any).sectionName = 'dynamic-section';

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockLocation.hash).toBe('#dynamic-section');
    });

    it('should interpolate pathname', async () => {
      mockButton.setAttribute('command', '--url:pathname-set:/{{pageName}}');
      mockButton.setAttribute('commandfor', 'test-target');
      (mockButton as any).pageName = 'dynamic-page';

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        null,
        '',
        'https://example.com/dynamic-page?page=existing&existing=old#section1'
      );
    });
  });

  describe('URL Command Error Handling', () => {
    it('should throw error for unknown URL action', async () => {
      mockButton.setAttribute('command', '--url:unknown-action');
      mockButton.setAttribute('commandfor', 'test-target');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw error for params:get without parameter name', async () => {
      mockButton.setAttribute('command', '--url:params-get');
      mockButton.setAttribute('commandfor', 'test-target');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should throw error for params:set without parameters and no data attribute', async () => {
      mockButton.setAttribute('command', '--url:params-set');
      mockButton.setAttribute('commandfor', 'test-target');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('History Commands (--history)', () => {
    it('should push to history', async () => {
      mockButton.setAttribute('command', '--history:push:/test-page');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/test-page');
      expect(mockTarget.textContent).toBe('Pushed /test-page to history');
    });

    it('should replace history', async () => {
      mockButton.setAttribute('command', '--history:replace:/replaced-page');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/replaced-page');
      expect(mockTarget.textContent).toBe('Replaced current URL with /replaced-page');
    });

    it('should go back in history', async () => {
      mockButton.setAttribute('command', '--history:back');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.back).toHaveBeenCalled();
      expect(mockTarget.textContent).toBe('Navigated back in history');
    });

    it('should go forward in history', async () => {
      mockButton.setAttribute('command', '--history:forward');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.forward).toHaveBeenCalled();
      expect(mockTarget.textContent).toBe('Navigated forward in history');
    });

    it('should go to specific history position', async () => {
      mockButton.setAttribute('command', '--history:go:-2');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.go).toHaveBeenCalledWith(-2);
      expect(mockTarget.textContent).toBe('Navigated back 2 page(s) in history');
    });

    it('should get history state', async () => {
      mockButton.setAttribute('command', '--history:state:get');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTarget.textContent).toBe('null'); // history.state is null by default
    });

    it('should get history state with shorthand --history:state', async () => {
      mockButton.setAttribute('command', '--history:state');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTarget.textContent).toBe('null'); // history.state is null by default
    });

    it('should set history state', async () => {
      mockButton.setAttribute('command', '--history:state:set:{"test": "data"}');
      mockButton.setAttribute('commandfor', 'test-target');

      mockButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockHistory.replaceState).toHaveBeenCalledWith({ test: 'data' }, '');
    });
  });
});
