
/**
 * Scoped CSS for Invokers Components module.
 * Provides CSS encapsulation for component styles.
 */

interface ScopedStyle {
  componentName: string;
  css: string;
  styleElement: HTMLStyleElement;
}

class ScopedStylesManager {
  private scopedStyles: Map<string, ScopedStyle> = new Map();

  /**
   * Enable scoped styles by processing <style scoped> elements.
   */
  enable(): void {
    if (typeof document === 'undefined') return;

    this.scanForScopedStyles();
    this.applyScopedStyles();
  }

  /**
   * Scan for <style scoped> elements and associate them with components.
   */
  private scanForScopedStyles(): void {
    // Scan for scoped styles in the document
    const scopedStyles = document.querySelectorAll('style[scoped]');
    scopedStyles.forEach(style => {
      this.processScopedStyle(style as HTMLStyleElement);
    });

    // Also scan for scoped styles inside template elements
    const templates = document.querySelectorAll('template');
    templates.forEach(template => {
      const templateStyles = template.content.querySelectorAll('style[scoped]');
      templateStyles.forEach(style => {
        this.processScopedStyle(style as HTMLStyleElement);
      });
    });
  }

  /**
   * Process a single scoped style element.
   */
  private processScopedStyle(style: HTMLStyleElement): void {
    const componentName = style.getAttribute('data-component') ||
                          this.inferComponentFromContext(style) ||
                          'global'; // Use 'global' for styles without component context

    const scopedStyle: ScopedStyle = {
      componentName,
      css: style.textContent || '',
      styleElement: style
    };

    this.scopedStyles.set(componentName, scopedStyle);
  }

  /**
   * Infer component name from context (parent template or element).
   */
  private inferComponentFromContext(style: HTMLStyleElement): string | null {
    // Check if inside a template with data-component
    let parent: Node | null = style.parentNode;
    while (parent) {
      if (parent.nodeType === Node.ELEMENT_NODE && (parent as Element).tagName === 'TEMPLATE' && (parent as Element).hasAttribute('data-component')) {
        return (parent as Element).getAttribute('data-component');
      }
      parent = parent.parentNode;
    }

    // Check for data-component attribute on style element
    return style.getAttribute('data-component');
  }

  /**
   * Apply scoped styles by transforming CSS selectors.
   */
  private applyScopedStyles(): void {
    this.scopedStyles.forEach((scopedStyle, componentName) => {
      if (componentName === 'global') {
        // For global scoped styles, just remove the scoped attribute
        scopedStyle.styleElement.removeAttribute('scoped');
        scopedStyle.styleElement.style.display = 'none';
      } else {
        const scopedCss = this.scopeCss(scopedStyle.css, componentName);
        this.injectScopedCss(scopedCss, scopedStyle.styleElement);
      }
    });
  }

  /**
   * Scope CSS by adding component-specific attributes to selectors.
   */
  private scopeCss(css: string, componentName: string): string {
    // Simple CSS scoping by adding data-component attribute
    const scopedAttribute = `[data-component="${componentName}"]`;

    // Split CSS into rules
    const rules = css.split('}').filter(rule => rule.trim());

    const scopedRules = rules.map(rule => {
      const parts = rule.split('{');
      if (parts.length !== 2) return rule;

      const selectors = parts[0].trim();
      const declarations = parts[1].trim();

      // Scope selectors by prefixing with component attribute
      const scopedSelectors = selectors.split(',').map(selector => {
        const trimmed = selector.trim();
        // For root component selectors (like the component name itself), add the attribute
        if (trimmed === `.${componentName}` || trimmed === componentName) {
          return `${trimmed}${scopedAttribute}`;
        }
        // For all other selectors, prefix with the component attribute for scoping
        return `${scopedAttribute} ${trimmed}`;
      }).join(', ');

      return `${scopedSelectors} { ${declarations} }`;
    });

    return scopedRules.join(' ');
  }

  /**
   * Inject scoped CSS into the document.
   */
  private injectScopedCss(css: string, originalStyle: HTMLStyleElement): void {
    // Create a new style element with scoped CSS
    const scopedStyle = document.createElement('style');
    scopedStyle.textContent = css;
    scopedStyle.setAttribute('data-scoped', 'true');
    scopedStyle.setAttribute('data-component', originalStyle.getAttribute('data-component') || '');

    // Insert into document head
    document.head.appendChild(scopedStyle);

    // Remove the scoped attribute and hide the original style
    originalStyle.removeAttribute('scoped');
    originalStyle.style.display = 'none';
  }

  /**
   * Apply component attribute to rendered component elements.
   */
  applyComponentAttribute(element: HTMLElement, componentName: string): void {
    element.setAttribute('data-component', componentName);

    // Apply to all descendants
    const descendants = element.querySelectorAll('*');
    descendants.forEach(descendant => {
      if (!descendant.hasAttribute('data-component')) {
        descendant.setAttribute('data-component', componentName);
      }
    });
  }

  /**
   * Get scoped CSS for a component.
   */
  getScopedCss(componentName: string): string | null {
    const scopedStyle = this.scopedStyles.get(componentName);
    return scopedStyle ? scopedStyle.css : null;
  }

  /**
   * Get all scoped component names.
   */
  getScopedComponents(): string[] {
    return Array.from(this.scopedStyles.keys());
  }
}

// Global instance
let scopedStylesInstance: ScopedStylesManager | null = null;

export function enableScopedStyles(): void {
  if (!scopedStylesInstance) {
    scopedStylesInstance = new ScopedStylesManager();
  }
  scopedStylesInstance.enable();
}

export function disableScopedStyles(): void {
  if (scopedStylesInstance) {
    scopedStylesInstance = null;
  }
}

export function getScopedStylesManager(): ScopedStylesManager {
  if (!scopedStylesInstance) {
    scopedStylesInstance = new ScopedStylesManager();
    scopedStylesInstance.enable();
  }
  return scopedStylesInstance;
}
