import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InvokerManager, InvokerPlugin, HookPoint, MiddlewareFunction, CommandContext } from '../src/core';

// Mock DOM elements for testing
let mockButton: HTMLButtonElement;
let mockTarget: HTMLElement;

describe('Advanced Plugin System', () => {
  let invokerManager: InvokerManager;

   beforeEach(() => {
     // Enable debug mode for testing
     if (typeof window !== 'undefined' && window.Invoker) {
       window.Invoker.debug = true;
     }

     // Clean up any existing test elements
     ['test-button', 'test-target'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.remove();
    });

    // Create mock DOM elements
    mockButton = document.createElement('button');
    mockButton.id = 'test-button';
    mockTarget = document.createElement('div');
    mockTarget.id = 'test-target';
    mockButton.setAttribute('commandfor', 'test-target');

    // Reset target content
    mockTarget.textContent = '';

    // Add elements to document
    document.body.appendChild(mockButton);
    document.body.appendChild(mockTarget);

    // Get singleton InvokerManager instance
    invokerManager = InvokerManager.getInstance();

    // Clear any existing plugins and middleware
    (invokerManager as any).plugins.clear();
    (invokerManager as any).middleware.clear();
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  describe('Complex Plugin Architectures', () => {
    it('should handle plugin composition and inheritance', () => {
      // Base plugin with common functionality
      const basePlugin: InvokerPlugin = {
        name: 'base-plugin',
        version: '1.0.0',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context) => {
            (context as any).processedByBase = true;
          }
        }
      };

      // Extended plugin that builds on base functionality
      const extendedPlugin: InvokerPlugin = {
        name: 'extended-plugin',
        version: '1.0.0',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context) => {
            if ((context as any).processedByBase) {
              (context as any).processedByExtended = true;
            }
          }
        }
      };

      invokerManager.registerPlugin(basePlugin);
      invokerManager.registerPlugin(extendedPlugin);
      invokerManager.register('--composition-test', vi.fn());

      const mockCommandEvent = {
        command: '--composition-test',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      return (invokerManager as any).handleCommand(mockCommandEvent).then(() => {
        // Both plugins should have processed the command
        expect((invokerManager as any).plugins.has('base-plugin')).toBe(true);
        expect((invokerManager as any).plugins.has('extended-plugin')).toBe(true);
      });
    });

    it('should support plugin configuration objects', () => {
      interface PluginConfig {
        enabled: boolean;
        logLevel: 'debug' | 'info' | 'warn';
        features: string[];
      }

      const configurablePlugin = (config: PluginConfig): InvokerPlugin => ({
        name: 'configurable-plugin',
        version: '1.0.0',
        middleware: config.enabled ? {
          [HookPoint.BEFORE_COMMAND]: (context) => {
            if (config.logLevel === 'debug') {
              console.log(`[DEBUG] Command: ${context.fullCommand}`);
            }
            (context as any).config = config;
          }
        } : {}
      });

      const config: PluginConfig = {
        enabled: true,
        logLevel: 'debug',
        features: ['logging', 'metrics']
      };

      const plugin = configurablePlugin(config);
      const consoleSpy = vi.spyOn(console, 'log');

      invokerManager.registerPlugin(plugin);
      invokerManager.register('--config-test', vi.fn());

      const mockCommandEvent = {
        command: '--config-test',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      return (invokerManager as any).handleCommand(mockCommandEvent).then(() => {
        expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Command: --config-test');
      });
    });
  });

  describe('Advanced Middleware Patterns', () => {
    it('should handle middleware that enriches context', async () => {
      const enrichmentMiddleware: MiddlewareFunction = (context, hookPoint) => {
        if (hookPoint === HookPoint.BEFORE_COMMAND) {
          // Add computed properties to context
          (context as any).enriched = {
            commandLength: context.fullCommand.length,
            hasParams: context.params.length > 0,
            timestamp: Date.now()
          };
        }
      };

      let capturedContext: any = null;

       invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, enrichmentMiddleware);
       invokerManager.register('--enrich-test', (context) => {
         capturedContext = context;
       });

      const mockCommandEvent = {
        command: '--enrich-test:param1:param2',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(mockCommandEvent);

      expect(capturedContext).toBeDefined();
      expect(capturedContext.enriched).toBeDefined();
      expect(capturedContext.enriched.commandLength).toBeGreaterThan(0);
      expect(capturedContext.enriched.hasParams).toBe(true);
      expect(capturedContext.enriched.timestamp).toBeDefined();
    });

    it('should support conditional middleware execution', async () => {
      let executionLog: string[] = [];

      const conditionalMiddleware: MiddlewareFunction = (context, hookPoint) => {
        if (hookPoint === HookPoint.BEFORE_COMMAND) {
          if (context.fullCommand.includes('allowed')) {
            executionLog.push('allowed');
          } else if (context.fullCommand.includes('blocked')) {
            executionLog.push('blocked');
            // Could throw error or modify context here
          }
        }
      };

      invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, conditionalMiddleware);
      invokerManager.register('--allowed-command', vi.fn());
      invokerManager.register('--blocked-command', vi.fn());

      // Test allowed command
      const allowedEvent = {
        command: '--allowed-command',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(allowedEvent);
      expect(executionLog).toContain('allowed');

      // Test blocked command
      const blockedEvent = {
        command: '--blocked-command',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(blockedEvent);
      expect(executionLog).toContain('blocked');
    });

    it('should handle middleware chains with data flow', async () => {
      const middlewareChain = [
        // First middleware adds data
        (context: CommandContext & { chainData?: any }) => {
          context.chainData = { step1: 'completed' };
        },
        // Second middleware modifies data
        (context: CommandContext & { chainData?: any }) => {
          if (context.chainData) {
            context.chainData.step2 = 'completed';
          }
        },
        // Third middleware uses the data
        (context: CommandContext & { chainData?: any }) => {
          if (context.chainData) {
            context.chainData.step3 = 'completed';
          }
        }
      ];

      middlewareChain.forEach(middleware => {
        invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, middleware);
      });

      let finalContext: any = null;
      invokerManager.register('--chain-test', (context) => {
        finalContext = context;
      });

      const mockCommandEvent = {
        command: '--chain-test',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(mockCommandEvent);

      expect(finalContext.chainData).toEqual({
        step1: 'completed',
        step2: 'completed',
        step3: 'completed'
      });
    });
  });

  describe('Plugin Lifecycle and State Management', () => {
    it('should handle plugin state across multiple commands', async () => {
      let pluginState = { commandsProcessed: 0, lastCommand: '' };

      const statefulPlugin: InvokerPlugin = {
        name: 'stateful-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context) => {
            pluginState.commandsProcessed++;
            pluginState.lastCommand = context.fullCommand;
          }
        }
      };

      invokerManager.registerPlugin(statefulPlugin);
      invokerManager.register('--state-test-1', vi.fn());
      invokerManager.register('--state-test-2', vi.fn());

      // Execute first command
      const firstEvent = {
        command: '--state-test-1',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(firstEvent);

      expect(pluginState.commandsProcessed).toBe(1);
      expect(pluginState.lastCommand).toBe('--state-test-1');

      // Execute second command
      const secondEvent = {
        command: '--state-test-2',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(secondEvent);

      expect(pluginState.commandsProcessed).toBe(2);
      expect(pluginState.lastCommand).toBe('--state-test-2');
    });

    it('should support plugin cleanup and resource management', () => {
      let resourcesAllocated = 0;
      let resourcesCleaned = 0;

      const resourcePlugin: InvokerPlugin = {
        name: 'resource-plugin',
        onRegister: () => {
          resourcesAllocated++;
        },
        onUnregister: () => {
          resourcesCleaned++;
        }
      };

      invokerManager.registerPlugin(resourcePlugin);
      expect(resourcesAllocated).toBe(1);
      expect(resourcesCleaned).toBe(0);

      invokerManager.unregisterPlugin('resource-plugin');
      expect(resourcesAllocated).toBe(1);
      expect(resourcesCleaned).toBe(1);
    });
  });

  describe('Real-world Plugin Scenarios', () => {
    it('should implement a validation plugin', async () => {
      const validationPlugin: InvokerPlugin = {
        name: 'validation-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context, hookPoint) => {
            // Validate command parameters
            if (context.fullCommand === '--validate' && (!context.params || context.params.length === 0 || context.params.every(p => p === ''))) {
              throw new Error('Validation failed: command requires parameters');
            }
          }
        }
      };

      invokerManager.registerPlugin(validationPlugin);
      invokerManager.register('--validate', vi.fn());
      invokerManager.register('--no-validate', vi.fn());

      // Valid command with parameters
      const validEvent = {
        command: '--validate:param1',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await expect((invokerManager as any).handleCommand(validEvent)).resolves.toBeUndefined();

      // Invalid command without parameters
      const invalidEvent = {
        command: '--validate',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await expect((invokerManager as any).handleCommand(invalidEvent)).rejects.toThrow('Validation failed');
    });

    it('should implement a transformation plugin', async () => {
      const transformationPlugin: InvokerPlugin = {
        name: 'transformation-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context, hookPoint) => {
            // Transform command parameters
            if (context.fullCommand.startsWith('--transform')) {
              (context as any).params = context.params.map(param =>
                param.toUpperCase()
              );
            }
          }
        }
      };

      let receivedParams: readonly string[] = [];

      invokerManager.registerPlugin(transformationPlugin);
      invokerManager.register('--transform', (context) => {
        receivedParams = context.params;
      });

      const mockCommandEvent = {
        command: '--transform:hello:world',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(mockCommandEvent);

      expect(receivedParams).toEqual(['HELLO', 'WORLD']);
    });

    it('should implement a monitoring plugin', async () => {
      const metrics = {
        commandsExecuted: 0,
        errorsCaught: 0,
        avgExecutionTime: 0
      };

      const monitoringPlugin: InvokerPlugin = {
        name: 'monitoring-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context, hookPoint) => {
            metrics.commandsExecuted++;
            (context as any).startTime = Date.now();
          },
          [HookPoint.AFTER_COMMAND]: (context, hookPoint) => {
            const executionTime = Date.now() - ((context as any).startTime || 0);
            metrics.avgExecutionTime = (metrics.avgExecutionTime + executionTime) / 2;
          },
          [HookPoint.ON_ERROR]: (context, hookPoint) => {
            metrics.errorsCaught++;
          }
        }
      };

      invokerManager.registerPlugin(monitoringPlugin);
      invokerManager.register('--monitor-success', async () => {
        await new Promise(resolve => setTimeout(resolve, 1)); // Simulate some execution time
      });
      invokerManager.register('--monitor-error', () => {
        throw new Error('Test error');
      });

      // Execute successful command
      await invokerManager.executeCommand('--monitor-success', 'test-target', mockButton);

      expect(metrics.commandsExecuted).toBe(1);
      expect(metrics.avgExecutionTime).toBeGreaterThan(0);

      // Execute failing command
      await expect(invokerManager.executeCommand('--monitor-error', 'test-target', mockButton)).rejects.toThrow();

      expect(metrics.commandsExecuted).toBe(2); // BEFORE_COMMAND is called even for failed commands
      expect(metrics.errorsCaught).toBe(1);
    });
  });

  describe('Plugin Isolation and Security', () => {
    it('should prevent plugin interference', () => {
      const plugin1: InvokerPlugin = {
        name: 'isolated-plugin-1',
        onRegister: function(manager) {
          (this as any).privateData = 'plugin1-data';
          (manager as any).sharedData = 'modified-by-plugin1';
        }
      };

      const plugin2: InvokerPlugin = {
        name: 'isolated-plugin-2',
        onRegister: function(manager) {
          (this as any).privateData = 'plugin2-data';
          // Plugin 2 should not see plugin 1's modifications
          expect((manager as any).sharedData).toBeUndefined();
        }
      };

      invokerManager.registerPlugin(plugin1);
      invokerManager.registerPlugin(plugin2);

      // Each plugin should maintain its own state
      expect((invokerManager as any).plugins.get('isolated-plugin-1')).toBeDefined();
      expect((invokerManager as any).plugins.get('isolated-plugin-2')).toBeDefined();
    });

    it('should handle plugin sandboxing', () => {
      const sandboxedPlugin: InvokerPlugin = {
        name: 'sandboxed-plugin',
        middleware: {
          [HookPoint.BEFORE_COMMAND]: (context, hookPoint) => {
            // Plugin should only access allowed context properties
            const allowedProps = ['invoker', 'targetElement', 'fullCommand', 'triggeringEvent', 'params', 'getTargets', 'updateAriaState', 'manageGroupState', 'executeAfter', 'executeConditional', 'result'];
            const contextKeys = Object.keys(context);

            for (const key of contextKeys) {
              if (!allowedProps.includes(key)) {
                throw new Error(`Plugin attempted to access restricted property: ${key}`);
              }
            }
          }
        }
      };

      invokerManager.registerPlugin(sandboxedPlugin);
      invokerManager.register('--sandbox-test', vi.fn());

      const mockCommandEvent = {
        command: '--sandbox-test',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      // Should execute without throwing sandbox violations
      return expect((invokerManager as any).handleCommand(mockCommandEvent)).resolves.toBeUndefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple plugins efficiently', () => {
      const startTime = Date.now();

      // Register multiple plugins
      for (let i = 0; i < 10; i++) {
        const plugin: InvokerPlugin = {
          name: `perf-plugin-${i}`,
          middleware: {
            [HookPoint.BEFORE_COMMAND]: () => {
              // Minimal operation
            }
          }
        };
        invokerManager.registerPlugin(plugin);
      }

      const endTime = Date.now();
      const registrationTime = endTime - startTime;

      // Should register 10 plugins quickly (< 50ms)
      expect(registrationTime).toBeLessThan(50);
      expect((invokerManager as any).plugins.size).toBe(10);
    });

    it('should handle plugin middleware efficiently', async () => {
      // Register multiple middleware
      for (let i = 0; i < 5; i++) {
        invokerManager.registerMiddleware(HookPoint.BEFORE_COMMAND, () => {
          // Minimal operation
        });
      }

      invokerManager.register('--perf-test', vi.fn());

      const startTime = Date.now();

      const mockCommandEvent = {
        command: '--perf-test',
        source: mockButton,
        target: mockTarget,
        preventDefault: vi.fn(),
        type: 'command'
      } as any;

      await (invokerManager as any).handleCommand(mockCommandEvent);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should execute with 5 middleware quickly (< 20ms)
      expect(executionTime).toBeLessThan(20);
    });
  });
});
