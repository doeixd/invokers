/**
 * @file integration-demo.test.ts
 * @summary Integration tests for demo functionality
 * @description
 * Comprehensive integration tests that verify demo pages work correctly,
 * including bind commands, interpolation, template rendering, and complex workflows.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../src/compatible';
import { registerBaseCommands } from '../src/commands/base';
import { registerFormCommands } from '../src/commands/form';
import { registerDomCommands } from '../src/commands/dom';
import { registerNavigationCommands } from '../src/commands/navigation';
import { registerDataCommands } from '../src/commands/data';
import { enableAdvancedEvents, rescanCommandOnElements } from '../src/advanced/index';

describe('Demo Integration Tests', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    // NOTE: Don't call reset() when using compatible module as it clears pre-registered commands
    // manager.reset();

    // Commands are already registered in compatible module, no need to re-register
    // registerBaseCommands(manager);
    // registerFormCommands(manager);
    // registerDomCommands(manager);
    // registerFlowCommands(manager);
    // registerDataCommands(manager);

    // Enable advanced features
    enableAdvancedEvents();
  });

  // Helper to set up DOM and rescan for command-on elements
  function setupDOM(html: string) {
    document.body.innerHTML = html;
    rescanCommandOnElements();
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Bind Command Demo', () => {
    it('should handle basic value binding', async () => {
      setupDOM(`
        <input type="text" id="basic-input"
               command-on="input"
               command="--bind:value"
               commandfor="basic-input"
               data-bind-to="#basic-output"
               data-bind-as="text"
               value="test value">
        <div id="basic-output"></div>
      `);

      const input = document.getElementById('basic-input') as HTMLInputElement;
      const output = document.getElementById('basic-output')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('test value');
    });

    it('should handle data attribute binding', async () => {
      setupDOM(`
        <input type="text" id="data-input"
               command-on="input"
               command="--bind:value"
               commandfor="data-input"
               data-bind-to="body"
               data-bind-as="data:test-value"
               value="test data">
      `);

      const input = document.getElementById('data-input') as HTMLInputElement;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(document.body.dataset.testValue).toBe('test data');
    });

    it('should handle class binding', async () => {
      setupDOM(`
        <input type="text" id="class-input"
               command-on="input"
               command="--bind:value"
               commandfor="class-input"
               data-bind-to="#class-target"
               data-bind-as="class:add"
               value="highlight">
        <div id="class-target"></div>
      `);

      const input = document.getElementById('class-input') as HTMLInputElement;
      const target = document.getElementById('class-target')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.classList.contains('highlight')).toBe(true);
    });

    it('should handle multiple target binding', async () => {
      setupDOM(`
        <input type="text" id="multi-input"
               command-on="input"
               command="--bind:value"
               commandfor="multi-input"
               data-bind-to=".multi-target"
               value="shared value">
        <div class="multi-target" id="target1"></div>
        <div class="multi-target" id="target2"></div>
        <div class="multi-target" id="target3"></div>
      `);

      const input = document.getElementById('multi-input') as HTMLInputElement;
      const targets = document.querySelectorAll('.multi-target');

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      targets.forEach(target => {
        expect(target.textContent).toBe('shared value');
      });
    });

    it('should handle @closest selector binding', async () => {
      setupDOM(`
        <form id="test-form">
          <input type="text" id="closest-input"
                 command-on="input"
                 command="--bind:value"
                 commandfor="closest-input"
                 data-bind-to="@closest(form)"
                 data-bind-as="data:test-input"
                 value="form data">
        </form>
      `);

      const input = document.getElementById('closest-input') as HTMLInputElement;
      const form = document.getElementById('test-form')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(form.dataset.testInput).toBe('form data');
    });
  });

  describe('Template Interpolation', () => {
    it('should interpolate data context in templates', async () => {
      // Set up data context
      document.body.dataset.userName = 'Alice';
      document.body.dataset.userRole = 'Developer';

      setupDOM(`
        <template id="user-template">
          <div class="user-card">
            <h3>{{data.userName}}</h3>
            <p>Role: {{data.userRole}}</p>
          </div>
        </template>
        <div id="target"></div>
        <button id="render-btn"
                command="--dom:swap"
                commandfor="target"
                data-template-id="user-template">
          Render
        </button>
      `);

      const button = document.getElementById('render-btn')!;
      const target = document.getElementById('target')!;

      // Click to render template
      button.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.innerHTML).toContain('<h3>Alice</h3>');
      expect(target.innerHTML).toContain('<p>Role: Developer</p>');
    });

    it('should handle conditional interpolation', async () => {
      document.body.dataset.isAdmin = 'true';
      document.body.dataset.isGuest = 'false';

      setupDOM(`
        <template id="conditional-template">
          <div>
            {{data.isAdmin === 'true' ? 'Admin Panel' : 'User Panel'}}
            {{data.isGuest === 'true' ? '(Guest)' : '(Member)'}}
          </div>
        </template>
        <div id="conditional-target"></div>
        <button id="conditional-btn"
                command="--dom:swap"
                commandfor="conditional-target"
                data-template-id="conditional-template">
          Render
        </button>
      `);

      const button = document.getElementById('conditional-btn')!;
      const target = document.getElementById('conditional-target')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.textContent).toContain('Admin Panel');
      expect(target.textContent).toContain('(Member)');
    });
  });

  describe('Complex Workflows', () => {
    it('should handle command chaining with bind and dom commands', async () => {
      setupDOM(`
        <input type="text" id="workflow-input" value="test workflow">
        <div id="workflow-output"></div>
         <button id="workflow-btn"
                 command="--bind:value"
                 commandfor="workflow-input"
                 data-bind-to="#workflow-output"
                 data-bind-as="text">
           <and-then command="--class:add:updated"
                     commandfor="workflow-output">
           </and-then>
         </button>
      `);

      const button = document.getElementById('workflow-btn')!;
      const input = document.getElementById('workflow-input') as HTMLInputElement;
      const output = document.getElementById('workflow-output')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('test workflow');
      expect(output.classList.contains('updated')).toBe(true);
    });

    it('should handle edit-in-place workflow', async () => {
      // Set up initial data
      document.body.dataset.profileName = 'John Doe';
      document.body.dataset.profileRole = 'Developer';

      setupDOM(`
        <div id="profile-container">
          <div id="profile-view" data-name="John Doe" data-role="Developer">
            <h3>Profile</h3>
            <p>Name: <span class="name-display">John Doe</span></p>
            <p>Role: <span class="role-display">Developer</span></p>
             <button id="edit-btn"
                     command="--dom:swap:outer"
                     commandfor="profile-view"
                     data-template-id="edit-template">
               <and-then command="--bind:data:profileName"
                         commandfor="body"
                         data-bind-to="#edit-name"
                         data-bind-as="value">
                 <and-then command="--bind:data:profileRole"
                           commandfor="body"
                           data-bind-to="#edit-role"
                           data-bind-as="value">
                 </and-then>
               </and-then>
             </button>
          </div>
        </div>

        <template id="edit-template">
          <div id="profile-edit">
            <h3>Edit Profile</h3>
            <input id="edit-name" type="text">
            <input id="edit-role" type="text">
            <button id="save-btn"
                    command="--bind:value"
                    commandfor="edit-name"
                    data-bind-to="body"
                    data-bind-as="data:profileName">
              <and-then command="--bind:value"
                        commandfor="edit-role"
                        data-bind-to="body"
                        data-bind-as="data:profileRole">
                <and-then command="--dom:swap:outer"
                          commandfor="profile-edit"
                          data-template-id="view-template">
                </and-then>
              </and-then>
            </button>
          </div>
        </template>

        <template id="view-template">
          <div id="profile-view" data-name="{{data.profileName}}" data-role="{{data.profileRole}}">
            <h3>Profile</h3>
            <p>Name: <span class="name-display">{{data.profileName}}</span></p>
            <p>Role: <span class="role-display">{{data.profileRole}}</span></p>
            <button id="edit-btn"
                    command="--bind:data:name"
                    commandfor="profile-view"
                    data-bind-to="#edit-name"
                    data-bind-as="value">
              Edit Profile
            </button>
          </div>
        </template>
      `);

      const editBtn = document.getElementById('edit-btn')!;
      const container = document.getElementById('profile-container')!;

      // Click edit button
      editBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should switch to edit mode
      expect(container.querySelector('#profile-edit')).not.toBeNull();

      const nameInput = document.getElementById('edit-name') as HTMLInputElement;
      const roleInput = document.getElementById('edit-role') as HTMLInputElement;
      const saveBtn = document.getElementById('save-btn')!;

      // Inputs should be pre-filled
      expect(nameInput.value).toBe('John Doe');
      expect(roleInput.value).toBe('Developer');

      // Update values
      nameInput.value = 'Jane Smith';
      roleInput.value = 'Designer';

      // Click save
      saveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should switch back to view mode with updated data
      expect(container.querySelector('#profile-view')).not.toBeNull();
      expect(document.body.dataset.profileName).toBe('Jane Smith');
      expect(document.body.dataset.profileRole).toBe('Designer');

      const nameDisplay = container.querySelector('.name-display')!;
      const roleDisplay = container.querySelector('.role-display')!;

      expect(nameDisplay.textContent).toBe('Jane Smith');
      expect(roleDisplay.textContent).toBe('Designer');
    });
  });

  describe('Form Integration', () => {
    it('should handle form data binding', async () => {
      setupDOM(`
        <form id="test-form">
          <input type="text" id="form-input"
                 command-on="input"
                 command="--bind:value"
                 commandfor="form-input"
                 data-bind-to="@closest(form)"
                 data-bind-as="data:form-value"
                 value="form data">
        </form>
      `);

      const input = document.getElementById('form-input') as HTMLInputElement;
      const form = document.getElementById('test-form')!;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(form.dataset.formValue).toBe('form data');
    });

    it('should handle form submission with data binding', async () => {
      setupDOM(`
        <form id="submit-form">
          <input type="text" id="submit-input" value="submit test">
          <button type="submit" id="submit-btn"
                  command-on="click"
                  command="--bind:value"
                  commandfor="submit-input"
                  data-bind-to="body"
                  data-bind-as="data:last-submit">
            Submit
          </button>
        </form>
      `);

      const button = document.getElementById('submit-btn')!;
      const input = document.getElementById('submit-input') as HTMLInputElement;

      // Prevent actual form submission
      const form = document.getElementById('submit-form') as HTMLFormElement;
      form.addEventListener('submit', (e) => e.preventDefault());

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(document.body.dataset.lastSubmit).toBe('submit test');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid bind targets gracefully', async () => {
      setupDOM(`
        <input type="text" id="error-input"
               command-on="input"
               command="--bind:value"
               commandfor="error-input"
               data-bind-to="#nonexistent-target"
               value="error test">
      `);

      const input = document.getElementById('error-input') as HTMLInputElement;

      // Should not throw error for missing target
      expect(() => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }).not.toThrow();
    });

    it('should handle invalid bind properties gracefully', async () => {
      setupDOM(`
        <div id="invalid-source"
             command-on="click"
             command="--bind:invalid-property"
             commandfor="invalid-source"
             data-bind-to="#target">
        </div>
        <div id="target"></div>
      `);

      const div = document.getElementById('invalid-source')!;

      // Should handle invalid property gracefully (may log warning)
      expect(() => {
        div.click();
      }).not.toThrow();
    });
  });
});