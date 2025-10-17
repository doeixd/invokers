/**
 * @file bind-command-demo.test.ts
 * @summary Integration tests for the bind-command-demo.html functionality
 * @description
 * Tests all binding scenarios from the demo including:
 * - Basic value binding
 * - Text content binding
 * - HTML binding
 * - Attribute and data binding
 * - Advanced selectors
 * - Command chaining
 * - Real-world edit-in-place pattern
 * - Template interpolation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InvokerManager } from '../src/compatible';
import { enableAdvancedEvents, rescanCommandOnElements } from '../src/advanced/index';
import { registerBaseCommands } from '../src/commands/base';
import { registerNavigationCommands } from '../src/commands/navigation';
import { registerDomCommands } from '../src/commands/dom';

describe('Bind Command Demo Integration Tests', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    // NOTE: Don't call reset() when using compatible module as it clears pre-registered commands
    // manager.reset();

    // Commands are already registered in compatible module, no need to re-register
    // registerBaseCommands(manager);
    // registerFlowCommands(manager);
    // registerDomCommands(manager);

    // Enable advanced events for interpolation
    enableAdvancedEvents();
  });

  describe('Basic Value Binding', () => {
    it('should bind input value to output element', async () => {
      document.body.innerHTML = `
        <input type="text" id="basic-input" value="Hello World">
        <button command="--bind:value"
                commandfor="basic-input"
                data-bind-to="#basic-output"
                data-bind-as="text">Bind</button>
        <div id="basic-output"></div>
      `;

      const button = document.querySelector('button')!;
      const output = document.getElementById('basic-output')!;

      // Click button to trigger binding
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('Hello World');
    });

    it('should update binding when input changes', async () => {
      document.body.innerHTML = `
        <input type="text" id="basic-input"
               command-on="input"
               command="--bind:value"
               commandfor="basic-input"
               data-bind-to="#basic-output">
        <div id="basic-output"></div>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('basic-input') as HTMLInputElement;
      const output = document.getElementById('basic-output')!;

      // Change input value and trigger event
      input.value = 'Updated text';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('Updated text');
    });
  });

  describe('Different Property Types', () => {
    it('should bind text content', async () => {
      document.body.innerHTML = `
        <div id="text-input"
             contenteditable="true"
             command-on="input"
             command="--bind:text"
             commandfor="text-input"
             data-bind-to="#text-output">Initial content</div>
        <div id="text-output"></div>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('text-input')!;
      const output = document.getElementById('text-output')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.textContent).toBe('Initial content');
    });

    it('should bind HTML content with sanitization', async () => {
      document.body.innerHTML = `
        <input type="text" id="html-input"
               command-on="input"
               command="--bind:value"
               commandfor="html-input"
               data-bind-to="#html-output"
               data-bind-as="html"
               value="&lt;strong&gt;bold&lt;/strong&gt;">
        <div id="html-output"></div>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('html-input') as HTMLInputElement;
      const output = document.getElementById('html-output')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(output.innerHTML).toBe('<strong>bold</strong>');
    });
  });

  describe('Attribute and Data Binding', () => {
    it('should bind to data attributes on body', async () => {
      document.body.innerHTML = `
        <select id="attr-input"
                command-on="change"
                command="--bind:value"
                commandfor="attr-input"
                data-bind-to="body"
                data-bind-as="data:theme">
          <option value="">Default</option>
          <option value="dark">Dark Theme</option>
        </select>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const select = document.getElementById('attr-input') as HTMLSelectElement;

      // Change selection and trigger event
      select.value = 'dark';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(document.body.dataset.theme).toBe('dark');
    });

    it('should add CSS classes dynamically', async () => {
      document.body.innerHTML = `
        <input type="text" id="class-input"
               command-on="input"
               command="--bind:value"
               commandfor="class-input"
               data-bind-to="#class-demo"
               data-bind-as="class:add"
               value="highlight">
        <div id="class-demo"></div>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('class-input') as HTMLInputElement;
      const target = document.getElementById('class-demo')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.classList.contains('highlight')).toBe(true);
    });

    it('should remove CSS classes', async () => {
      document.body.innerHTML = `
        <div id="class-demo" class="highlight old-class"></div>
        <button id="remove-btn"
                command="--bind:value"
                commandfor="class-input"
                data-bind-to="#class-demo"
                data-bind-as="class:remove">Remove Class</button>
        <input type="text" id="class-input" value="old-class">
      `;

      const button = document.getElementById('remove-btn')!;
      const target = document.getElementById('class-demo')!;

      // Click button to trigger binding
      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(target.classList.contains('old-class')).toBe(false);
      expect(target.classList.contains('highlight')).toBe(true);
    });
  });

  describe('Advanced Selectors', () => {
    it('should bind to closest ancestor', async () => {
      document.body.innerHTML = `
        <form id="form-container">
          <input type="text" id="closest-input"
                 command-on="input"
                 command="--bind:value"
                 commandfor="closest-input"
                 data-bind-to="@closest(form)"
                 data-bind-as="data:user-input"
                 value="test input">
        </form>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('closest-input') as HTMLInputElement;
      const form = document.getElementById('form-container')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(form.dataset.userInput).toBe('test input');
    });

    it('should bind to multiple targets', async () => {
      document.body.innerHTML = `
        <input type="text" id="multi-target-input"
               command-on="input"
               command="--bind:value"
               commandfor="multi-target-input"
               data-bind-to=".multi-target"
               value="shared value">
        <div class="multi-target" id="target1"></div>
        <div class="multi-target" id="target2"></div>
        <div class="multi-target" id="target3"></div>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('multi-target-input') as HTMLInputElement;
      const targets = document.querySelectorAll('.multi-target');

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      targets.forEach(target => {
        expect(target.textContent).toBe('shared value');
      });
    });
  });

  describe('Command Chaining', () => {
    it('should chain bind with class toggle', async () => {
      document.body.innerHTML = `
        <div command-on="input"
              command="--bind:value"
              commandfor="chain-input"
              data-bind-to="#search-preview">
          <input type="text" id="chain-input" value="search query">
          <and-then command="--class:ternary:has-content:empty:has-content" commandfor="search-preview"></and-then>
        </div>
        <div id="search-preview"></div>
      `;

      // Rescan for command-on elements after setting HTML
      rescanCommandOnElements();

      const input = document.getElementById('chain-input') as HTMLInputElement;
      const preview = document.getElementById('search-preview')!;

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(preview.textContent).toBe('search query');
      expect(preview.classList.contains('has-content')).toBe(true);
      expect(preview.classList.contains('empty')).toBe(false);
    });
  });

  describe('Real-World Edit-in-Place Pattern', () => {
    it('should switch to edit mode and populate form fields', async () => {
      document.body.innerHTML = `
        <div id="data-source" style="display:none;"></div>
        <div id="profile-view" data-name="John Doe" data-role="Developer">
          <h3>Profile View</h3>
          <p><strong>Name:</strong> <span class="name">John Doe</span></p>
          <p><strong>Role:</strong> <span class="role">Developer</span></p>
          <button id="edit-btn"
                  command="--dom:swap:outer"
                  commandfor="profile-view"
                  data-template-id="edit-profile-template">
            Edit Profile
             <and-then command="--bind:data:name"
                       commandfor="#data-source"
                       data-bind-to="#edit-name-input"
                       data-bind-as="value">
               <and-then command="--bind:data:role"
                         commandfor="#data-source"
                         data-bind-to="#edit-role-input"
                         data-bind-as="value">
               </and-then>
             </and-then>
          </button>
        </div>

        <template id="edit-profile-template">
          <div id="profile-edit">
            <h3>Edit Profile</h3>
            <div class="input-group">
              <label>Name:</label>
              <input id="edit-name-input" type="text">
            </div>
            <div class="input-group">
              <label>Role:</label>
              <input id="edit-role-input" type="text">
            </div>
            <button id="save-btn">Save</button>
            <button id="cancel-btn">Cancel</button>
          </div>
        </template>
       `;

      // Set data on data-source after setting HTML
      const dataSource = document.getElementById('data-source')!;
      dataSource.dataset.name = "John Doe";
      dataSource.dataset.role = "Developer";

      const editBtn = document.getElementById('edit-btn')!;

      // Click edit button
      editBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that template was swapped
      const profileEdit = document.getElementById('profile-edit');
      expect(profileEdit).toBeTruthy();

      // Check that form fields were populated
      const nameInput = document.getElementById('edit-name-input') as HTMLInputElement;
      const roleInput = document.getElementById('edit-role-input') as HTMLInputElement;

      expect(nameInput).toBeTruthy();
      expect(roleInput).toBeTruthy();
      expect(nameInput.value).toBe('John Doe');
      expect(roleInput.value).toBe('Developer');
    });

    it('should save changes and switch back to view mode', async () => {
      // Set up initial state
      document.body.dataset.name = "John Doe";
      document.body.dataset.role = "Developer";

      document.body.innerHTML = `
        <div id="profile-edit">
          <h3>Edit Profile</h3>
          <input id="edit-name-input" type="text" value="Jane Smith">
          <input id="edit-role-input" type="text" value="Manager">
          <button id="save-btn"
                  command="--bind:value"
                  commandfor="edit-name-input"
                  data-bind-to="body"
                  data-bind-as="data:name">
            Save
            <and-then command="--bind:value"
                      commandfor="edit-role-input"
                      data-bind-to="body"
                      data-bind-as="data:role">
              <and-then command="--dom:swap:outer"
                        commandfor="profile-edit"
                        data-template-id="profile-view-template">
              </and-then>
            </and-then>
          </button>
        </div>

        <template id="profile-view-template">
          <div id="profile-view" data-name="{{data.name}}" data-role="{{data.role}}">
            <h3>Profile View</h3>
            <p><strong>Name:</strong> <span class="name">{{data.name}}</span></p>
            <p><strong>Role:</strong> <span class="role">{{data.role}}</span></p>
            <button>Edit Profile</button>
          </div>
        </template>
      `;

      const saveBtn = document.getElementById('save-btn')!;

      // Click save button
      saveBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check that data was updated on body
      expect(document.body.dataset.name).toBe('Jane Smith');
      expect(document.body.dataset.role).toBe('Manager');

      // Check that template was swapped and interpolated
      const profileView = document.getElementById('profile-view');
      expect(profileView).toBeTruthy();

      const nameSpan = profileView!.querySelector('.name')!;
      const roleSpan = profileView!.querySelector('.role')!;

      expect(nameSpan.textContent).toBe('Jane Smith');
      expect(roleSpan.textContent).toBe('Manager');
    });
  });

  describe('Template Interpolation', () => {
    it('should interpolate data attributes in templates', async () => {
      // Set up data context
      document.body.dataset.name = "Alice";
      document.body.dataset.role = "Designer";

      document.body.innerHTML = `
        <template id="test-template">
          <div id="interpolated-content">
            <p>Name: {{data.name}}</p>
            <p>Role: {{data.role}}</p>
            <p>Combined: {{data.name}} is a {{data.role}}</p>
          </div>
        </template>

        <button id="render-btn"
                command="--dom:swap:outer"
                commandfor="placeholder"
                data-template-id="test-template">
          Render Template
        </button>

        <div id="placeholder">Placeholder</div>
      `;

      const renderBtn = document.getElementById('render-btn')!;

      // Click render button
      renderBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Check interpolation
      const content = document.getElementById('interpolated-content')!;
      expect(content).toBeTruthy();

      const paragraphs = content.querySelectorAll('p');
      expect(paragraphs[0].textContent).toBe('Name: Alice');
      expect(paragraphs[1].textContent).toBe('Role: Designer');
      expect(paragraphs[2].textContent).toBe('Combined: Alice is a Designer');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid bind properties gracefully', async () => {
      document.body.innerHTML = `
        <input type="text" id="invalid-input"
               command-on="input"
               command="--bind:invalid-property"
               commandfor="invalid-input"
               data-bind-to="#output">
        <div id="output"></div>
      `;

      const input = document.getElementById('invalid-input') as HTMLInputElement;

      // This should not throw, just log an error
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Command should fail gracefully without crashing
      const output = document.getElementById('output')!;
      expect(output.textContent).toBe(''); // Should remain empty
    });

    it('should handle missing target elements gracefully', async () => {
      document.body.innerHTML = `
        <input type="text" id="missing-target-input"
               command-on="input"
               command="--bind:value"
               commandfor="missing-target-input"
               data-bind-to="#nonexistent-element"
               value="test">
      `;

      const input = document.getElementById('missing-target-input') as HTMLInputElement;

      // This should not throw
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should complete without error
    });
  });
});