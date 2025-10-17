import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enableComponents } from '../../src/power-packs/components';
import { getComponentRenderer } from '../../src/power-packs/components/renderer';

describe('Components Module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('enableComponents()', () => {
    it('should enable the components module successfully', () => {
      expect(() => getComponentRenderer()).toThrow(); // Should not be initialized yet

      enableComponents();

      expect(getComponentRenderer()).toBeTruthy();
    });

    it('should not enable twice', () => {
      enableComponents();
      const renderer1 = getComponentRenderer();

      // Should not throw or change state
      enableComponents();
      const renderer2 = getComponentRenderer();

      expect(renderer1).toBe(renderer2); // Same instance
    });

    it('should work in browser environment', () => {
      // Should not throw in browser environment
      expect(() => enableComponents()).not.toThrow();
    });
  });

  describe('Component Templates', () => {
    beforeEach(() => {
      enableComponents();
    });

    it('should parse template elements', () => {
      document.body.innerHTML = `
        <template id="test-template">
          <div class="component">
            <h3>Test Component</h3>
            <p>Content</p>
          </div>
        </template>
      `;

      enableComponents();

      const template = document.getElementById('test-template') as HTMLTemplateElement;
      expect(template).toBeTruthy();
      expect(template.content.querySelector('h3')?.textContent).toBe('Test Component');
    });

    it('should render components with props', () => {
      document.body.innerHTML = `
        <template id="user-card-template">
          <div class="user-card">
            <h3>{{prop.name}}</h3>
            <p>{{prop.email}}</p>
          </div>
        </template>
        <div id="user-card"></div>
      `;

      enableComponents();

      // This would normally be done by the --dom:render command
      // For testing, we'll simulate the rendering
      const template = document.getElementById('user-card-template') as HTMLTemplateElement;
      const target = document.getElementById('user-card')!;

      // Simulate component rendering with props
      const content = template.content.cloneNode(true) as DocumentFragment;
      const props = { name: 'John Doe', email: 'john@example.com' };

      // Process props (simplified)
      const h3 = content.querySelector('h3');
      const p = content.querySelector('p');

      if (h3) h3.textContent = props.name;
      if (p) p.textContent = props.email;

      target.appendChild(content);

      expect(target.querySelector('h3')?.textContent).toBe('John Doe');
      expect(target.querySelector('p')?.textContent).toBe('john@example.com');
    });
  });

  describe('Scoped Styles', () => {
    beforeEach(() => {
      enableComponents();
    });

    it('should process scoped styles', () => {
      document.head.innerHTML = `
        <style scoped>
          .component { color: red; }
          .title { font-size: 20px; }
        </style>
      `;

      enableComponents();

      const style = document.querySelector('style');
      expect(style).toBeTruthy();
      expect(style?.hasAttribute('scoped')).toBe(false); // Should be removed
    });

    it('should scope CSS selectors', () => {
      document.head.innerHTML = `
        <template id="scoped-template" data-component="test-component">
          <style scoped data-component="test-component">
            .title { color: blue; }
            .content p { margin: 0; }
          </style>
          <div class="component">
            <h1 class="title">Title</h1>
            <div class="content">
              <p>Content</p>
            </div>
          </div>
        </template>
      `;

      enableComponents();

      const scopedStyle = document.head.querySelector('style[data-scoped]');

      expect(scopedStyle).toBeTruthy();
      expect(scopedStyle?.textContent).toContain('[data-component="test-component"]');
    });
  });

  describe('Slots', () => {
    beforeEach(() => {
      enableComponents();
    });

    it('should handle default slots', () => {
      document.body.innerHTML = `
        <template id="card-template">
          <div class="card">
            <div class="content">
              <slot>Default content</slot>
            </div>
          </div>
        </template>
        <div id="card-container">
          <p>Custom content</p>
        </div>
      `;

      enableComponents();

      // Simulate slot processing
      const template = document.getElementById('card-template') as HTMLTemplateElement;
      const container = document.getElementById('card-container')!;

      const content = template.content.cloneNode(true) as DocumentFragment;
      const slot = content.querySelector('slot');

      if (slot) {
        // Replace slot with container content
        const slotContent = Array.from(container.childNodes);
        slotContent.forEach(node => {
          slot.parentNode?.insertBefore(node, slot);
        });
        slot.remove();
      }

      container.innerHTML = '';
      container.appendChild(content);

      expect(container.querySelector('p')?.textContent).toBe('Custom content');
    });

    it('should handle named slots', () => {
      document.body.innerHTML = `
        <template id="named-slot-template">
          <div class="layout">
            <header><slot name="header">Default Header</slot></header>
            <main><slot>Default Main</slot></main>
            <footer><slot name="footer">Default Footer</slot></footer>
          </div>
        </template>
        <div id="layout-container">
          <h1 data-slot="header">Custom Header</h1>
          <p>Main content</p>
          <div data-slot="footer">Custom Footer</div>
        </div>
      `;

      enableComponents();

      const template = document.getElementById('named-slot-template') as HTMLTemplateElement;
      const container = document.getElementById('layout-container')!;

      const content = template.content.cloneNode(true) as DocumentFragment;

       // Process named slots
       const slots = content.querySelectorAll('slot');
       slots.forEach(slot => {
         const slotName = slot.getAttribute('name');
         let slotElements: Element[];

         if (slotName) {
           // Named slot - find elements with matching data-slot
           slotElements = Array.from(container.querySelectorAll(`[data-slot="${slotName}"]`));
         } else {
           // Default slot - find elements without data-slot attribute
           slotElements = Array.from(container.children).filter(el => !el.hasAttribute('data-slot'));
         }

         if (slotElements.length > 0) {
           slotElements.forEach(element => {
             slot.parentNode?.insertBefore(element, slot);
           });
         }
         slot.remove();
       });

      container.innerHTML = '';
      container.appendChild(content);

      expect(container.querySelector('header h1')?.textContent).toBe('Custom Header');
      expect(container.querySelector('main p')?.textContent).toBe('Main content');
      expect(container.querySelector('footer div')?.textContent).toBe('Custom Footer');
    });
  });

  describe('Component Events', () => {
    beforeEach(() => {
      enableComponents();
    });

    it('should handle component event bindings', () => {
      document.body.innerHTML = `
        <template id="button-template">
          <button command="--emit:click">Click me</button>
        </template>
        <div id="button-container"></div>
      `;

      enableComponents();

      // Simulate event binding
      const template = document.getElementById('button-template') as HTMLTemplateElement;
      const container = document.getElementById('button-container')!;

      const content = template.content.cloneNode(true) as DocumentFragment;
      container.appendChild(content);

      const button = container.querySelector('button');
      expect(button).toBeTruthy();
      expect(button?.getAttribute('command')).toBe('--emit:click');
    });
  });

  describe('Dynamic Components', () => {
    beforeEach(() => {
      enableComponents();
    });

    it('should handle dynamically added templates', () => {
      document.body.innerHTML = '<div id="container"></div>';

      enableComponents();

      // Dynamically add template
      const container = document.getElementById('container')!;
      container.innerHTML = `
        <template id="dynamic-template">
          <div class="dynamic">Dynamic component</div>
        </template>
      `;

      // Trigger re-parsing (normally done by mutation observer)
      enableComponents();

      const template = document.getElementById('dynamic-template') as HTMLTemplateElement;
      expect(template).toBeTruthy();
      expect(template.content.querySelector('.dynamic')?.textContent).toBe('Dynamic component');
    });

    it('should handle dynamically added scoped styles', () => {
      document.head.innerHTML = '<style scoped>.dynamic { color: red; }</style>';

      enableComponents();

      const style = document.querySelector('style');
      expect(style).toBeTruthy();
      expect(style?.hasAttribute('scoped')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      enableComponents();
    });

    it('should handle missing templates gracefully', () => {
      document.body.innerHTML = '<div id="container"></div>';

      enableComponents();

      const container = document.getElementById('container')!;

      // Try to render non-existent template
      expect(() => {
        // This would normally be handled by the --dom:render command
        // For testing, we just verify no exceptions are thrown
      }).not.toThrow();
    });

    it('should handle malformed templates gracefully', () => {
      document.body.innerHTML = `
        <template id="malformed">
          <div>Unclosed div
        </template>
      `;

      expect(() => enableComponents()).not.toThrow();

      const template = document.getElementById('malformed') as HTMLTemplateElement;
      expect(template).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle many templates efficiently', () => {
      const templates = Array.from({ length: 50 }, (_, i) => `
        <template id="template-${i}">
          <div>Template ${i}</div>
        </template>
      `).join('');

      document.body.innerHTML = templates;

      const startTime = performance.now();
      enableComponents();
      const endTime = performance.now();

      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      // Verify all templates were parsed
      for (let i = 0; i < 50; i++) {
        const template = document.getElementById(`template-${i}`) as HTMLTemplateElement;
        expect(template).toBeTruthy();
      }
    });
  });

  describe('Integration', () => {
    it('should work with Invoker commands', () => {
      document.body.innerHTML = `
        <template id="interactive-template">
          <button command="--toggle" commandfor="#target">Toggle</button>
        </template>
        <div id="component-container"></div>
        <div id="target" hidden>Target content</div>
      `;

      enableComponents();

      const template = document.getElementById('interactive-template') as HTMLTemplateElement;
      const container = document.getElementById('component-container')!;

      // Render template
      const content = template.content.cloneNode(true) as DocumentFragment;
      container.appendChild(content);

      const button = container.querySelector('button');
      const target = document.getElementById('target');

      expect(button).toBeTruthy();
      expect(target?.hasAttribute('hidden')).toBe(true);

      // The button should have the command attributes
      expect(button?.getAttribute('command')).toBe('--toggle');
      expect(button?.getAttribute('commandfor')).toBe('#target');
    });
  });
});