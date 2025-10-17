/**
 * Promise-based chaining infrastructure for Invokers Control module.
 * Provides enhanced command chaining with async support and result context.
 */

import { InvokerManager } from '../../core';

interface ChainContext {
  results: Map<string, any>;
  errors: Map<string, Error>;
  currentIndex: number;
  totalCommands: number;
}

class PromiseChainer {
  private chains: Map<string, ChainDefinition> = new Map();

  /**
   * Enable promise-based chaining by enhancing the command execution system.
   */
  enable(): void {
    // The chaining is integrated into the existing command system
    // This module provides utilities for promise-based command sequences
  }

  /**
   * Execute a chain of commands as promises.
   */
  async executeChain(chainId: string, context?: any): Promise<ChainResult> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error(`Chain "${chainId}" not found`);
    }

    const chainContext: ChainContext = {
      results: new Map(),
      errors: new Map(),
      currentIndex: 0,
      totalCommands: chain.commands.length
    };

    const results: ChainResult = {
      success: true,
      results: new Map(),
      errors: new Map()
    };

    try {
      for (let i = 0; i < chain.commands.length; i++) {
        const command = chain.commands[i];

        try {
          const result = await this.executeCommand(command, chainContext, context);
          chainContext.results.set(command.id || `command_${i}`, result);
          results.results.set(command.id || `command_${i}`, result);
        } catch (error) {
          chainContext.errors.set(command.id || `command_${i}`, error as Error);
          results.errors.set(command.id || `command_${i}`, error as Error);

          if (chain.failFast) {
            results.success = false;
            break;
          }
        }
      }

      results.success = results.errors.size === 0;
    } catch (error) {
      results.success = false;
      results.errors.set('chain_execution', error as Error);
    }

    return results;
  }

  /**
   * Execute a single command in the chain context.
   */
  private async executeCommand(
    command: ChainCommand,
    _chainContext: ChainContext,
    globalContext?: any
  ): Promise<any> {
    const manager = InvokerManager.getInstance();

    // Create a temporary element for command execution if needed
    let tempElement: HTMLElement | null = null;

    if (command.target) {
      tempElement = document.querySelector(command.target) as HTMLElement;
    }

    if (!tempElement) {
      // Create a temporary element for command execution
      tempElement = document.createElement('div');
      tempElement.style.display = 'none';
      document.body.appendChild(tempElement);
    }

    try {
      // Execute the command
      const result = await manager.executeCommand(command.command, tempElement.id || 'temp-element', globalContext);

      // Apply delays if specified
      if (command.delay) {
        await new Promise(resolve => setTimeout(resolve, command.delay));
      }

      return result;
    } finally {
      // Clean up temporary element
      if (tempElement && tempElement.parentNode && !command.target) {
        tempElement.parentNode.removeChild(tempElement);
      }
    }
  }

  /**
   * Define a command chain.
   */
  defineChain(id: string, commands: ChainCommand[], options: ChainOptions = {}): void {
    this.chains.set(id, {
      id,
      commands,
      failFast: options.failFast ?? true,
      timeout: options.timeout
    });
  }

  /**
   * Remove a chain definition.
   */
  removeChain(id: string): void {
    this.chains.delete(id);
  }

  /**
   * Get all defined chains.
   */
  getChains(): string[] {
    return Array.from(this.chains.keys());
  }
}

interface ChainCommand {
  id?: string;
  command: string;
  target?: string;
  delay?: number;
  condition?: (context: ChainContext) => boolean;
}

interface ChainDefinition {
  id: string;
  commands: ChainCommand[];
  failFast: boolean;
  timeout?: number;
}

interface ChainOptions {
  failFast?: boolean;
  timeout?: number;
}

interface ChainResult {
  success: boolean;
  results: Map<string, any>;
  errors: Map<string, Error>;
}

// Global instance
let promiseChainerInstance: PromiseChainer | null = null;

export function enablePromiseChaining(): void {
  if (!promiseChainerInstance) {
    promiseChainerInstance = new PromiseChainer();
  }
  promiseChainerInstance.enable();
}

export function disablePromiseChaining(): void {
  if (promiseChainerInstance) {
    promiseChainerInstance = null;
  }
}

export function getPromiseChainer(): PromiseChainer {
  if (!promiseChainerInstance) {
    promiseChainerInstance = new PromiseChainer();
    promiseChainerInstance.enable();
  }
  return promiseChainerInstance;
}