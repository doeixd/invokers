import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InvokerManager, InvokerPlugin, HookPoint, MiddlewareFunction } from '../src/compatible';

// Mock DOM elements for testing
let mockButton: HTMLButtonElement;
let mockTarget: HTMLElement;

describe('Plugin System', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    // Clean up any existing test elements
    const existingButton = document.getElementById('test-button');
    const existingTarget = document.getElementById('test-target');
    if (existingButton) existingButton.remove();
    if (existingTarget) existingTarget.remove();

    // Create mock DOM elements
    mockButton = document.createElement('button');
    mockButton.id = 'test-button';
    mockTarget = document.createElement('div');
    mockTarget.id = 'test-target';
    mockButton.setAttribute('commandfor', 'test-target');

    // Reset target content
    mockTarget.textContent = '';

    // Add elements to document first
    document.body.appendChild(mockButton);
    document.body.appendChild(mockTarget);

    // Get singleton InvokerManager instance
    invokerManager = InvokerManager.getInstance();

    // Clear any existing plugins and middleware
    (invokerManager as any).plugins.clear();
    (invokerManager as any).middleware.clear();

    if (typeof window !== 'undefined') {
      window.Invoker = window.Invoker || {};
      window.Invoker.debug = true;
    }
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  describe('Plugin Registration and Unregistration', () => {
    it('should register a plugin successfully', () => {
      const testPlugin: InvokerPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin'
      };

      invokerManager.registerPlugin(testPlugin);

      expect((invokerManager as any).plugins.has('test-plugin')).toBe(true);
      expect((invokerManager as any).plugins.get('test-plugin')).toBe(testPlugin);
    });

    it('should not register a plugin with duplicate name', () => {
      const testPlugin1: InvokerPlugin = {
        name: 'duplicate-plugin',
        version: '1.0.0'
      };

      const testPlugin2: InvokerPlugin = {
        name: 'duplicate-plugin',
        version: '2.0.0'
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      invokerManager.registerPlugin(testPlugin1);
      invokerManager.registerPlugin(testPlugin2);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invokers: Plugin "duplicate-plugin" is already registered');
      expect((invokerManager as any).plugins.get('duplicate-plugin')).toBe(testPlugin1);

      consoleWarnSpy.mockRestore();
    });

    it('should unregister a plugin successfully', () => {
      const testPlugin: InvokerPlugin = {
        name: 'test-plugin'
      };

      invokerManager.registerPlugin(testPlugin);
      expect((invokerManager as any).plugins.has('test-plugin')).toBe(true);

      invokerManager.unregisterPlugin('test-plugin');
      expect((invokerManager as any).plugins.has('test-plugin')).toBe(false);
    });

    it('should warn when unregistering non-existent plugin', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      invokerManager.unregisterPlugin('non-existent-plugin');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invokers: Plugin "non-existent-plugin" is not registered');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Plugin Lifecycle Hooks', () => {
    it('should call onRegister hook when plugin is registered', () => {
      const onRegisterSpy = vi.fn();
      const testPlugin: InvokerPlugin = {
        name: 'lifecycle-plugin',
        onRegister: onRegisterSpy
      };

      invokerManager.registerPlugin(testPlugin);

      expect(onRegisterSpy).toHaveBeenCalledWith(invokerManager);
    });

    it('should call onUnregister hook when plugin is unregistered', () => {
      const onUnregisterSpy = vi.fn();
      const testPlugin: InvokerPlugin = {
        name: 'lifecycle-plugin',
        onUnregister: onUnregisterSpy
      };

      invokerManager.registerPlugin(testPlugin);
      invokerManager.unregisterPlugin('lifecycle-plugin');

      expect(onUnregisterSpy).toHaveBeenCalledWith(invokerManager);
    });

    it('should handle errors in onRegister hook', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onRegisterSpy = vi.fn(() => {
        throw new Error('Registration failed');
      });

      const testPlugin: InvokerPlugin = {
        name: 'error-plugin',
        onRegister: onRegisterSpy
      };

      invokerManager.registerPlugin(testPlugin);

      expect(onRegisterSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invokers: Error in plugin "error-plugin" onRegister:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Middleware Registration and Unregistration', () => {
    it('should register middleware for a hook point', () => {
      const middlewareFn: MiddlewareFunction = vi.fn();

      invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, middlewareFn);

      expect((invokerManager as any).middleware.has(HookPoint.BEFORE_COMMAND)).toBe(true);
      expect((invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND)).toContain(middlewareFn);
    });

    it('should register multiple middleware for the same hook point', () => {
      const middlewareFn1: MiddlewareFunction = vi.fn();
      const middlewareFn2: MiddlewareFunction = vi.fn();

      invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, middlewareFn1);
      invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, middlewareFn2);

      const middlewareList = (invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND);
      expect(middlewareList).toContain(middlewareFn1);
      expect(middlewareList).toContain(middlewareFn2);
      expect(middlewareList).toHaveLength(2);
    });

    it('should unregister middleware from a hook point', () => {
      const middlewareFn: MiddlewareFunction = vi.fn();

      invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, middlewareFn);
      expect((invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND)).toContain(middlewareFn);

      invokerManager.unregisterMiddleware(HookPoint.BEFORE_COMMAND, middlewareFn);
      expect((invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND)).not.toContain(middlewareFn);
    });
  });

  describe('Plugin with Middleware', () => {
    it('should register plugin middleware automatically', () => {
      const middlewareFn: MiddlewareFunction = vi.fn();
      const testPlugin: InvokerPlugin = {
        name: 'middleware-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: middlewareFn
        }
      };

      invokerManager.registerPlugin(testPlugin);

      expect((invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND)).toContain(middlewareFn);
    });

    it('should unregister plugin middleware automatically', () => {
      const middlewareFn: MiddlewareFunction = vi.fn();
      const testPlugin: InvokerPlugin = {
        name: 'middleware-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: middlewareFn
        }
      };

      invokerManager.registerPlugin(testPlugin);
      expect((invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND)).toContain(middlewareFn);

      invokerManager.unregisterPlugin('middleware-plugin');
      expect((invokerManager as any).middleware.get(HookPoint.BEFORE_COMMAND)).not.toContain(middlewareFn);
    });
  });

  describe('Middleware Execution', () => {
    it('should execute middleware at BEFORE_COMMAND hook point', async () => {
      const middlewareSpy = vi.fn();
      const testCommand = '--test-middleware';

      invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, middlewareSpy);
      invokerManager.register(testCommand, vi.fn());

      const mockCommandEvent = {
        command: testCommand,
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      try {
        await (invokerManager as any).handleCommand(mockCommandEvent);
      } catch (error) {
        void error;
      }

      expect(middlewareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fullCommand: testCommand,
          invoker: mockButton,
          targetElement: mockTarget
        }),
        HookPoint.BEFORE_COMMAND
      );
    });

    it('should execute middleware at ON_SUCCESS hook point for successful commands', async () => {
      const middlewareSpy = vi.fn();
      const testCommand = '--test-success';

      invokerManager.registerMiddleware(HookPoint.ON_SUCCESS, middlewareSpy);
      invokerManager.register(testCommand, vi.fn());

      const mockCommandEvent = {
        command: testCommand,
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(mockCommandEvent);

      expect(middlewareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fullCommand: testCommand,
          result: expect.objectContaining({ success: true })
        }),
        HookPoint.ON_SUCCESS
      );
    });

    it('should execute middleware at ON_ERROR hook point for failed commands', async () => {
      const middlewareSpy = vi.fn();
      const testCommand = '--test-error';

      invokerManager.registerMiddleware(HookPoint.ON_ERROR, middlewareSpy);
      invokerManager.register(testCommand, () => {
        throw new Error('Test error');
      });

      const mockCommandEvent = {
        command: testCommand,
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      try {
        await (invokerManager as any).handleCommand(mockCommandEvent);
      } catch (error) {
        void error;
      }

      expect(middlewareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fullCommand: testCommand,
          result: expect.objectContaining({
            success: false,
            error: expect.any(Error)
          })
        }),
        HookPoint.ON_ERROR
      );
    });
  });
});
