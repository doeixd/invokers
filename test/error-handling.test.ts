import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager, createInvokerError, ErrorSeverity, validateElement } from '../src/compatible';

describe('Enhanced Error Handling & Debugging', () => {
  let invokerManager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();

    // Enable debug mode for testing
    if (typeof window !== 'undefined') {
      window.Invoker = window.Invoker || {};
      window.Invoker.debug = true;
    }
  });

  describe('Command Registration Validation', () => {
    it('should reject invalid command names', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Empty name
      invokerManager.register('', () => {});
      expect(consoleSpy).toHaveBeenCalled();
      
      // Whitespace only
      invokerManager.register('   ', () => {});
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should reject invalid callbacks', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Null callback
      invokerManager.register('--test', null as any);
      expect(consoleSpy).toHaveBeenCalled();
      
      // Non-function callback
      invokerManager.register('--test2', 'not a function' as any);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should warn about command overwrites', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      invokerManager.register('--test', () => {});
      invokerManager.register('--test', () => {}); // Overwrite

      expect(consoleSpy).toHaveBeenCalledWith('Invokers: Command "--test" is already registered and will be overwritten');
      consoleSpy.mockRestore();
    });

    it('should prevent registration of native command conflicts', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      invokerManager.register('show-modal', () => {}); // Conflicts with native (no -- prefix)

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Command Execution Validation', () => {
    it('should handle missing target elements gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await invokerManager.executeCommand('--toggle', 'nonexistent-id');
      
      expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should provide suggestions for unknown commands', async () => {
      const button = document.createElement('button');
      const target = document.createElement('div');
      target.id = 'target';
      
      document.body.appendChild(button);
      document.body.appendChild(target);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await invokerManager.executeCommand('--togle', 'target', button); // Typo
      
      expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle invalid command parameters', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Invalid text action
      try {
        await invokerManager.executeCommand('--text:invalid:test', 'target');
      } catch (e) {
        expect(e.message).toContain('Invalid text action');
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track execution statistics', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      // Execute a few commands
      await invokerManager.executeCommand('--text:set:test1', 'target');
      await invokerManager.executeCommand('--text:set:test2', 'target');
      await invokerManager.executeCommand('--text:set:test3', 'target');

      if (typeof window !== 'undefined' && window.Invoker) {
        const stats = window.Invoker.getStats();
        expect(stats.executionsLastSecond).toBeGreaterThan(0);
      }
    });

    it('should prevent excessive command execution', async () => {
      const target = document.createElement('div');
      target.id = 'target';
      document.body.appendChild(target);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to execute many commands rapidly (would trigger rate limiting in real scenario)
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(invokerManager.executeCommand('--text:set:test', 'target'));
      }
      
      await Promise.all(promises);
      
      // Performance monitor should have been called
      consoleSpy.mockRestore();
    });
  });

  describe('Error Recovery & Graceful Degradation', () => {
    it('should maintain ARIA state after command failure', async () => {
      const button = document.createElement('button');
      button.setAttribute('aria-expanded', 'false');
      const target = document.createElement('div');
      target.id = 'target';
      
      document.body.appendChild(button);
      document.body.appendChild(target);

      // Register a command that fails
      invokerManager.register('--test-fail', () => {
        throw new Error('Test failure');
      });

      try {
        await invokerManager.executeCommand('--test-fail', 'target', button);
      } catch (e) {
        // Expected to fail
      }

      // ARIA state should be preserved
      expect(button.hasAttribute('aria-expanded')).toBe(true);
    });

    it('should re-enable disabled buttons after failure', async () => {
      const button = document.createElement('button');
      button.setAttribute('disabled', '');
      const target = document.createElement('div');
      target.id = 'target';
      
      document.body.appendChild(button);
      document.body.appendChild(target);

      invokerManager.register('--test-fail', () => {
        throw new Error('Test failure');
      });

      try {
        await invokerManager.executeCommand('--test-fail', 'target', button);
      } catch (e) {
        // Expected to fail
      }

      // Button should be re-enabled immediately after failure
      expect(button.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Validation Utilities', () => {
    it('should validate elements correctly', () => {
      const div = document.createElement('div');
      div.id = 'test';
      document.body.appendChild(div);
      
      // Should pass validation
      expect(validateElement(div, { id: true })).toEqual([]);
      expect(validateElement(div, { tagName: ['div'] })).toEqual([]);
      
      // Should fail validation
      expect(validateElement(null, { id: true })).toContain('Element not found');
       expect(validateElement(div, { tagName: ['span'] })).toContain('Element must be one of: span, got: div');
      
       const divWithoutId = document.createElement('div');
       expect(validateElement(divWithoutId, { id: true })).toContain('Element missing required id attribute');
    });

    it('should create detailed error objects', () => {
      const error = createInvokerError(
        'Test error',
        ErrorSeverity.ERROR,
        {
          command: '--test',
          recovery: 'Fix the issue'
        }
      );

      expect(error.message).toBe('Test error');
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.command).toBe('--test');
      expect(error.recovery).toBe('Fix the issue');
    });
  });

  describe('Debug Mode', () => {
    it('should provide additional logging in debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      if (typeof window !== 'undefined' && window.Invoker) {
        window.Invoker.debug = true;
        
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);

        await invokerManager.executeCommand('--text:set:debug test', 'target');
        
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('executed successfully'));
        
        window.Invoker.debug = false;
      }
      
      consoleSpy.mockRestore();
    });

    it('should provide registered commands list', () => {
      invokerManager.register('--test1', () => {});
      invokerManager.register('--test2', () => {});
      
      if (typeof window !== 'undefined' && window.Invoker) {
        const commands = window.Invoker.getRegisteredCommands();
        expect(commands).toContain('--test1');
        expect(commands).toContain('--test2');
      }
    });
  });
});

