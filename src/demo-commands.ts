/**
 * @file demo-commands.ts
 * @summary Demo commands for the Invokers comprehensive demo.
 * @description
 * This module contains demo-specific commands used only for testing and demonstration
 * purposes in the comprehensive demo. These commands are not included in the main
 * Invokers library and should be imported separately when needed.
 *
 * To use these commands, import and run the `registerDemoCommands()` function
 * after the core Invokers library has been loaded.
 * @example
 * // In your demo page:
 * import 'invokers'; // Core library (loads polyfill and window.Invoker)
 * import { registerDemoCommands } from './demo-commands';
 *
 * // Make demo commands available for testing
 * registerDemoCommands();
 */
import { debugWarn, debugError } from './utils';
import type { CommandContext } from "./index";
import { createInvokerError, ErrorSeverity } from "./index";

type CommandRegistry = Record<string, (context: CommandContext) => void | Promise<void>>;

/**
 * Demo-specific commands for testing and demonstration purposes.
 * These commands are not part of the core Invokers library.
 */
export const demoCommands: CommandRegistry = {
  /**
   * `--demo:echo`: Demo command for echoing input data.
   * @example `<input command-on="input" command="--demo:echo" commandfor="display">`
   */
  "--demo:echo": ({ targetElement }: CommandContext) => {
    // Demo command - in real implementation this would handle the echo logic
    targetElement.textContent = `Echo: ${new Date().toISOString()}`;
  },

  /**
   * `--demo:counter:increment`: Demo counter increment command.
   * @example `<button command="--demo:counter:increment" data-max-count="10">`
   */
  "--demo:counter:increment": ({ invoker, targetElement }: CommandContext) => {
    const maxCount = parseInt(invoker.dataset.maxCount || '100', 10);
    let currentCount = parseInt(document.body.dataset.counter || '0', 10);

    if (currentCount < maxCount) {
      currentCount++;
      document.body.dataset.counter = currentCount.toString();
      targetElement.textContent = currentCount.toString();

      // Dispatch custom event
      targetElement.dispatchEvent(new CustomEvent('counter-updated', {
        bubbles: true,
        detail: { count: currentCount }
      }));
    }
  },

  /**
   * `--demo:counter:reset`: Demo counter reset command.
   * @example `<button command="--demo:counter:reset">`
   */
  "--demo:counter:reset": ({ targetElement }: CommandContext) => {
    document.body.dataset.counter = '0';
    targetElement.textContent = '0';

    // Reset progress bar
    const progressBar = document.getElementById('progress-fill');
    if (progressBar) progressBar.style.width = '0%';
  },

  /**
   * `--demo:fetch:api`: Demo API fetch command.
   * @example `<button command="--demo:fetch:api" data-url="https://api.example.com">`
   */
  "--demo:fetch:api": async ({ invoker, targetElement }: CommandContext) => {
    const url = invoker.dataset.url || 'https://jsonplaceholder.typicode.com/posts/1';

    targetElement.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="status-indicator status-loading pulse"></div>Loading...</div>';

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      targetElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      targetElement.innerHTML = `<div style="color: #e53e3e; padding: 20px;"><div class="status-indicator status-error"></div>Error: ${errorMessage}</div>`;
    }
  },

  /**
   * `--demo:fetch:simulate-error`: Demo error simulation command.
   * @example `<button command="--demo:fetch:simulate-error">`
   */
  "--demo:fetch:simulate-error": async ({ targetElement }: CommandContext) => {
    targetElement.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="status-indicator status-loading pulse"></div>Loading...</div>';

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    targetElement.innerHTML = '<div style="color: #e53e3e; padding: 20px;"><div class="status-indicator status-error"></div>Simulated network error</div>';
  },

  /**
   * `--demo:chain:start`: Demo command chaining start.
   * @example `<button command="--demo:chain:start" data-and-then="--demo:chain:step2">`
   */
  "--demo:chain:start": async ({ targetElement }: CommandContext) => {
    targetElement.textContent = 'Step 1: Starting chain...\n';
    await new Promise(resolve => setTimeout(resolve, 500));
    targetElement.textContent += 'Step 1: Completed\n';
  },

  /**
   * `--demo:event:publish`: Demo custom event publishing.
   * @example `<button command="--demo:event:publish" data-event-type="user-action">`
   */
  "--demo:event:publish": ({ invoker, targetElement }: CommandContext) => {
    const eventType = invoker.dataset.eventType || 'demo-event';
    const eventData = invoker.dataset.eventData ? JSON.parse(invoker.dataset.eventData) : {};

    targetElement.textContent += `Published event: ${eventType}\n`;
    targetElement.textContent += `Data: ${JSON.stringify(eventData)}\n`;

    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('demo-notification', {
      detail: {
        type: 'info',
        title: 'Event Published',
        message: `Event "${eventType}" was published successfully`
      }
    }));
  },

  /**
   * `--demo:chart:add-point`: Demo Chart.js integration.
   * @example `<button command="--demo:chart:add-point" data-value-from="input-id">`
   */
  "--demo:chart:add-point": ({ invoker, targetElement }: CommandContext) => {
    const valueSource = invoker.dataset.valueFrom;
    let value = Math.random() * 100;

    if (valueSource) {
      const input = document.getElementById(valueSource) as HTMLInputElement;
      if (input && input.value) {
        value = parseFloat(input.value) || value;
      }
    }

    // In a real implementation, this would update the Chart.js instance
    const demoChart = (window as any).demoChart;
    if (demoChart) {
      demoChart.data.labels.push(new Date().toLocaleTimeString());
      demoChart.data.datasets[0].data.push(value);

      // Keep only last 10 points
      if (demoChart.data.labels.length > 10) {
        demoChart.data.labels.shift();
        demoChart.data.datasets[0].data.shift();
      }

      demoChart.update();
    }

    targetElement.textContent = `Added point: ${value.toFixed(2)}`;
  },

  /**
   * `--demo:chart:clear`: Demo chart clearing command.
   * @example `<button command="--demo:chart:clear">`
   */
  "--demo:chart:clear": ({ targetElement }: CommandContext) => {
    const demoChart = (window as any).demoChart;
    if (demoChart) {
      demoChart.data.labels = [];
      demoChart.data.datasets[0].data = [];
      demoChart.update();
    }

    targetElement.textContent = 'Chart cleared';
  },

  /**
   * `--demo:api:github-user`: Demo GitHub API integration.
   * @example `<button command="--demo:api:github-user" data-username="octocat">`
   */
  "--demo:api:github-user": async ({ invoker, targetElement }: CommandContext) => {
    const username = invoker.dataset.username || 'octocat';

    targetElement.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="status-indicator status-loading pulse"></div>Loading GitHub user...</div>';

    try {
      const response = await fetch(`https://api.github.com/users/${username}`);
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

      const user = await response.json();
      targetElement.innerHTML = `
        <div style="text-align: center;">
          <img src="${user.avatar_url}" alt="${user.login}" style="width: 100px; height: 100px; border-radius: 50%;">
          <h3>${user.name || user.login}</h3>
          <p>${user.bio || 'No bio available'}</p>
          <p>Followers: ${user.followers} | Following: ${user.following}</p>
          <p>Public repos: ${user.public_repos}</p>
        </div>
      `;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      targetElement.innerHTML = `<div style="color: #e53e3e; padding: 20px;"><div class="status-indicator status-error"></div>Error loading GitHub user: ${errorMessage}</div>`;
    }
  },

  /**
   * `--demo:template:load-list`: Demo template rendering.
   * @example `<button command="--demo:template:load-list">`
   */
  "--demo:template:load-list": ({ targetElement }: CommandContext) => {
    const sampleData = [
      { id: 1, title: 'Learn Invokers', completed: true, priority: 'high' },
      { id: 2, title: 'Build Amazing UI', completed: false, priority: 'medium' },
      { id: 3, title: 'Master JavaScript', completed: false, priority: 'low' }
    ];

    let html = '<div style="max-height: 300px; overflow-y: auto;">';
    sampleData.forEach(item => {
      const completedClass = item.completed ? 'completed' : '';
      html += `
        <div class="todo-item ${completedClass}" style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.title}</strong>
          <span style="float: right; color: ${item.priority === 'high' ? '#e53e3e' : item.priority === 'medium' ? '#d69e2e' : '#38a169'};">${item.priority}</span>
          ${item.completed ? '<span style="color: #38a169;">Γ£ô</span>' : ''}
        </div>
      `;
    });
    html += '</div>';

    targetElement.innerHTML = html;
  },

  /**
   * `--demo:condition:update`: Demo conditional rendering.
   * @example `<select command="--demo:condition:update">`
   */
  "--demo:condition:update": ({ invoker, targetElement }: CommandContext) => {
    const condition = (invoker as unknown as HTMLSelectElement).value;

    let content = '';
    switch (condition) {
      case 'loading':
        content = '<div style="text-align: center; padding: 20px;"><div class="status-indicator status-loading pulse"></div>Loading content...</div>';
        break;
      case 'success':
        content = '<div style="text-align: center; padding: 20px; color: #38a169;"><div class="status-indicator status-success"></div>Content loaded successfully!</div>';
        break;
      case 'error':
        content = '<div style="text-align: center; padding: 20px; color: #e53e3e;"><div class="status-indicator status-error"></div>Error loading content</div>';
        break;
    }

    targetElement.innerHTML = content;
  },

  /**
   * `--demo:programmatic`: Demo programmatic command execution.
   * @example `window.Invoker.executeCommand('--demo:programmatic', 'target')`
   */
  "--demo:programmatic": ({ targetElement }: CommandContext) => {
    targetElement.textContent += `Programmatic execution at ${new Date().toLocaleTimeString()}\n`;
  },

  /**
   * `--demo:delayed`: Demo delayed command execution.
   * @example `setTimeout(() => window.Invoker.executeCommand('--demo:delayed'), 2000)`
   */
  "--demo:delayed": ({ targetElement }: CommandContext) => {
    targetElement.textContent += `Delayed execution completed at ${new Date().toLocaleTimeString()}\n`;
  },

  /**
   * `--demo:queue:start`: Demo command queuing.
   * @example `<button command="--demo:queue:start">`
   */
  "--demo:queue:start": async ({ targetElement }: CommandContext) => {
    targetElement.textContent = 'Starting command queue...\n';

    const steps = ['Initializing...', 'Processing data...', 'Validating...', 'Completing...'];

    for (const step of steps) {
      targetElement.textContent += `${step}\n`;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    targetElement.textContent += 'Queue execution completed!\n';
  },

  /**
   * `--demo:error:network`: Demo network error handling.
   * @example `<button command="--demo:error:network">`
   */
  "--demo:error:network": (_: CommandContext) => {
    throw createInvokerError('Network connection failed', ErrorSeverity.ERROR, {
      command: '--demo:error:network',
      recovery: 'Check your internet connection and try again.'
    });
  },

  /**
   * `--demo:error:validation`: Demo validation error handling.
   * @example `<button command="--demo:error:validation">`
   */
  "--demo:error:validation": (_: CommandContext) => {
    throw createInvokerError('Invalid input data provided', ErrorSeverity.ERROR, {
      command: '--demo:error:validation',
      recovery: 'Please check your input and ensure all required fields are filled.'
    });
  },

  /**
   * `--demo:error:timeout`: Demo timeout error handling.
   * @example `<button command="--demo:error:timeout">`
   */
  "--demo:error:timeout": (_: CommandContext) => {
    throw createInvokerError('Operation timed out', ErrorSeverity.ERROR, {
      command: '--demo:error:timeout',
      recovery: 'The operation took too long to complete. Please try again.'
    });
  },

  /**
   * `--demo:debug:toggle`: Demo debug mode toggling.
   * @example `<button command="--demo:debug:toggle">`
   */
  "--demo:debug:toggle": ({ targetElement }: CommandContext) => {
    const currentMode = document.body.dataset.debugMode === 'true';
    const newMode = !currentMode;

    document.body.dataset.debugMode = newMode.toString();

    targetElement.textContent = `Debug mode: ${newMode ? 'ENABLED' : 'DISABLED'}\n`;
    targetElement.textContent += newMode ?
      'Enable window.Invoker.debug for detailed command execution logs.\n' :
      'Debug logging disabled.\n';
  },

  /**
   * `--demo:debug:execute`: Demo command execution with debug info.
   * @example `<button command="--demo:debug:execute">`
   */
  "--demo:debug:execute": ({ targetElement }: CommandContext) => {
    const timestamp = new Date().toISOString();
    const debugInfo = {
      command: '--demo:debug:execute',
      timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href,
      debugMode: document.body.dataset.debugMode === 'true'
    };

    targetElement.innerHTML = `<pre>${JSON.stringify(debugInfo, null, 2)}</pre>`;
  },

  /**
   * `--demo:clear`: Demo content clearing command.
   * @example `<button command="--demo:clear" commandfor="target">`
   */
  "--demo:clear": ({ targetElement }: CommandContext) => {
    targetElement.textContent = '';
  },
};

/**
 * Registers demo commands with the global `Invoker` instance.
 * These commands are only for testing and demonstration purposes.
 *
 * @param specificCommands An optional array of command names to register. If omitted, all demo commands are registered.
 * @example
 * registerDemoCommands(); // Registers all demo commands
 * registerDemoCommands(['--demo:echo', '--demo:counter:increment']); // Registers specific demo commands
 */
export function registerDemoCommands(specificCommands?: string[]): void {
  if (!window.Invoker?.register) {
    debugError("Invokers: Core library not found. Ensure it is loaded before the demo commands module.");
    return;
  }

  const commandsToRegister = specificCommands || Object.keys(demoCommands);

  for (const name of commandsToRegister) {
    // Normalize the name the user might have passed in (e.g., 'demo:echo' vs '--demo:echo')
    const normalizedName = name.startsWith('--') ? name : `--${name}`;

    if (demoCommands[normalizedName]) {
      window.Invoker?.register?.(normalizedName, demoCommands[normalizedName]);
    } else {
      debugWarn(`Invokers: Demo command "${name}" was requested but not found. Skipping registration.`);
    }
  }
}
