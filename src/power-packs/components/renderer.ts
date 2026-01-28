/**
 * Component renderer for Invokers Components module.
 * Provides component templates with props and content projection via slots.
 */

interface ComponentDefinition {
  name: string;
  template: string;
  props?: string[];
  slots?: string[];
}

interface ComponentInstance {
  element: HTMLElement;
  definition: ComponentDefinition;
  props: Record<string, any>;
  slots: Map<string, HTMLElement[]>;
}

class ComponentRenderer {
  private components: Map<string, ComponentDefinition> = new Map();
  private instances: ComponentInstance[] = [];

  /**
   * Enable component rendering by scanning for component definitions and usages.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForComponentDefinitions();
    this.scanForComponentUsages();
  }

  /**
   * Scan for component definitions in <template data-component> elements.
   */
  private scanForComponentDefinitions(): void {
    const templates = document.querySelectorAll('template[data-component]');
    templates.forEach(template => {
      const name = template.getAttribute('data-component');
      if (!name) return;

      const propsAttr = template.getAttribute('data-props');
      const slotsAttr = template.getAttribute('data-slots');

      const definition: ComponentDefinition = {
        name,
        template: template.innerHTML,
        props: propsAttr ? propsAttr.split(',').map(p => p.trim()) : [],
        slots: slotsAttr ? slotsAttr.split(',').map(s => s.trim()) : ['default']
      };

      this.components.set(name, definition);
    });
  }

  /**
   * Scan for component usages and render them.
   */
  private scanForComponentUsages(): void {
    // Find elements that match component names
    this.components.forEach((definition, name) => {
      const usages = document.querySelectorAll(name);
      usages.forEach(usage => {
        this.renderComponent(usage as HTMLElement, definition);
      });
    });
  }

  /**
   * Render a component instance.
   */
  private renderComponent(element: HTMLElement, definition: ComponentDefinition): void {
    // Extract props from attributes
    const props: Record<string, any> = {};
    definition.props?.forEach(prop => {
      const value = element.getAttribute(prop) || element.getAttribute(`data-${prop}`);
      if (value !== null) {
        props[prop] = this.parsePropValue(value);
      }
    });

    // Extract slots
    const slots = this.extractSlots(element);

    // Create instance
    const instance: ComponentInstance = {
      element,
      definition,
      props,
      slots
    };

    this.instances.push(instance);

    // Render the component
    this.renderInstance(instance);
  }

  /**
   * Extract slots from component children.
   */
  private extractSlots(element: HTMLElement): Map<string, HTMLElement[]> {
    const slots = new Map<string, HTMLElement[]>();

    Array.from(element.children).forEach(child => {
      const slotName = (child as HTMLElement).getAttribute('data-slot') || 'default';
      if (!slots.has(slotName)) {
        slots.set(slotName, []);
      }
      slots.get(slotName)!.push(child as HTMLElement);
    });

    return slots;
  }

  /**
   * Render a component instance.
   */
  private renderInstance(instance: ComponentInstance): void {
    let html = instance.definition.template;

    // Replace prop placeholders
    Object.entries(instance.props).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*prop\\.${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex, String(value));
    });

    // Replace slot placeholders
    instance.definition.slots?.forEach(slotName => {
      const slotContent = instance.slots.get(slotName) || [];
      const slotHtml = slotContent.map(el => el.outerHTML).join('');

      const regex = new RegExp(`<slot[^>]*name="${slotName}"[^>]*></slot>|<slot[^>]*></slot>`, 'g');
      html = html.replace(regex, slotHtml);
    });

    // Clear the element and set the rendered HTML
    instance.element.innerHTML = html;
  }

  /**
   * Parse a prop value (simple JSON parsing).
   */
  private parsePropValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Fall back to string
      return value;
    }
  }

  /**
   * Re-render all component instances.
   */
  rerenderAll(): void {
    this.instances.forEach(instance => this.renderInstance(instance));
  }

  /**
   * Get all defined components.
   */
  getComponents(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all component instances.
   */
  getInstances(): ComponentInstance[] {
    return [...this.instances];
  }
}

// Global instance
let componentRendererInstance: ComponentRenderer | null = null;
let componentsEnabled = false;

export function enableComponentRenderer(): void {
  componentsEnabled = true;
  if (!componentRendererInstance) {
    componentRendererInstance = new ComponentRenderer();
  }
  componentRendererInstance.enable();
}

export function disableComponentRenderer(): void {
  componentsEnabled = false;
  if (componentRendererInstance) {
    componentRendererInstance = null;
  }
}

export function getComponentRenderer(): ComponentRenderer {
  if (!componentsEnabled) {
    throw new Error('Components module not enabled. Call enableComponents() first.');
  }
  if (!componentRendererInstance) {
    componentRendererInstance = new ComponentRenderer();
    componentRendererInstance.enable();
  }
  return componentRendererInstance;
}
