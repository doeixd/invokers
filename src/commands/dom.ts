/**
 * @file dom.ts
 * @summary DOM Manipulation Command Pack for the Invokers library.
 * @description
 * This module provides commands for dynamic DOM manipulation including element
 * creation, removal, wrapping, template rendering, and data context management.
 * These commands enable sophisticated UI updates without custom JavaScript.
 * 
 * @example
 * ```javascript
 * import { registerDomCommands } from 'invokers/commands/dom';
 * import { InvokerManager } from 'invokers';
 * 
 * const invokerManager = InvokerManager.getInstance();
 * registerDomCommands(invokerManager);
 * ```
 */

import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity, isInterpolationEnabled } from '../index';
import { interpolateString, setDataContext, getDataContext, updateDataContext } from '../advanced/interpolation';
import { generateUid } from '../utils';

/**
 * DOM manipulation commands for dynamic UI updates.
 * Includes element manipulation, templating, and data context management.
 */
const domCommands: Record<string, CommandCallback> = {

  // --- DOM Manipulation Commands ---

  /**
   * `--dom:remove`: Removes the target element from the DOM.
   * @example `<button command="--dom:remove" commandfor="alert-1">&times;</button>`
   */
  "--dom:remove": ({ targetElement }: CommandContext) => {
    const updateDOM = () => targetElement.remove();
    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:replace`: Replaces the target element with content from a `<template>`.
   * Supports `:outer` (default) to replace the entire element, or `:inner` to replace inner content.
   * Alias for `--dom:swap:outer` and `--dom:swap:inner` respectively.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:replace" commandfor="placeholder" data-template-id="content">Load</button>`
   * @example `<button command="--dom:replace:inner" commandfor="content-area" data-template-id="panel-2">Update Content</button>`
   */
  "--dom:replace": ({ invoker, targetElement, params }: CommandContext) => {
    const style = params[0] || 'outer';
    let fragment = getSourceNode(invoker, 'replace').cloneNode(true) as DocumentFragment;

    // Process the fragment for templating
    fragment = processTemplateFragment(fragment, invoker);

    const updateDOM = () => {
      if (style === 'inner') {
        targetElement.replaceChildren(fragment);
      } else {
        // Default to 'outer'
        targetElement.replaceWith(fragment);
      }
    };

    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:swap`: Swaps content of the target with content from a `<template>`.
   * Supports `:inner` (default) to replace inner content, or `:outer` to replace the entire element.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:swap" commandfor="content-area" data-template-id="panel-2">Load Panel 2</button>`
   * @example `<button command="--dom:swap:outer" commandfor="content-area" data-template-id="panel-2">Replace Element</button>`
   */
  "--dom:swap": ({ invoker, targetElement, params }: CommandContext) => {
    const [swapType = 'inner'] = params;
    let fragment = getSourceNode(invoker, 'swap').cloneNode(true) as DocumentFragment;

    // Interpolate the template content if advanced events are enabled
    if (isInterpolationEnabled()) {
      const context = {
        this: {
          ...invoker,
          dataset: { ...invoker.dataset },
          value: (invoker as any).value || '',
        },
        data: document.body.dataset,
        event: (invoker as any).triggeringEvent,
      };

      // Convert fragment to string, interpolate, then back to fragment
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment.cloneNode(true));
      const html = tempDiv.innerHTML;
      const interpolatedHtml = html.includes('{{') ? interpolateString(html, context) : html;
      tempDiv.innerHTML = interpolatedHtml;
      const interpolatedFragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        interpolatedFragment.appendChild(tempDiv.firstChild);
      }
      fragment = processTemplateFragment(interpolatedFragment, invoker);
    }

    const updateDOM = () => {
      if (swapType === 'outer') {
        targetElement.replaceWith(fragment);
      } else {
        // Default to 'inner' behavior
        targetElement.replaceChildren(fragment);
      }
    };

    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:append`: Appends content from a `<template>` to the target.
   * Supports `:inner` (default) to append as last child, or `:outer` to insert after the target.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:append" commandfor="item-list" data-template-id="new-item">Add</button>`
   * @example `<button command="--dom:append:outer" commandfor="#item-1" data-template-id="item-2">Load Next</button>`
   */
  "--dom:append": async ({ invoker, targetElement, params }: CommandContext) => {
    const style = params[0] || 'inner';
    let fragment = getSourceNode(invoker, 'append').cloneNode(true) as DocumentFragment;

    // Process the fragment for templating
    fragment = processTemplateFragment(fragment, invoker);

    const updateDOM = () => {
      if (style === 'outer') {
        targetElement.after(fragment);
      } else {
        // Default to 'inner'
        targetElement.append(fragment);
      }
    };

    if (document.startViewTransition) {
      await document.startViewTransition(updateDOM).finished;
    } else {
      updateDOM();
    }
  },

  /**
   * `--dom:prepend`: Prepends content from a `<template>` to the target.
   * Supports `:inner` (default) to prepend as first child, or `:outer` to insert before the target.
   * Supports advanced templating with `data-with-json` and `data-tpl-*` attributes when advanced events are enabled.
   * @example `<button command="--dom:prepend" commandfor="log" data-template-id="new-log">Log</button>`
   * @example `<button command="--dom:prepend:outer" commandfor="#item-2" data-template-id="item-1">Insert Before</button>`
   */
  "--dom:prepend": ({ invoker, targetElement, params }: CommandContext) => {
    const style = params[0] || 'inner';
    let fragment = getSourceNode(invoker, 'prepend').cloneNode(true) as DocumentFragment;

    // Process the fragment for templating
    fragment = processTemplateFragment(fragment, invoker);

    const updateDOM = () => {
      if (style === 'outer') {
        targetElement.before(fragment);
      } else {
        // Default to 'inner'
        targetElement.prepend(fragment);
      }
    };

    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:wrap`: Wraps the target element with content from a `<template>` or a simple tag.
   * Supports `--dom:wrap:tagname` for simple wrappers with optional class/id.
   * @example `<button command="--dom:wrap" commandfor="#my-image" data-template-id="figure-tpl">Add Caption</button>`
   * @example `<button command="--dom:wrap:div" commandfor="#content" data-wrapper-class="card">Wrap in Card</button>`
   */
  "--dom:wrap": ({ invoker, targetElement, params }: CommandContext) => {
    const wrapperTag = params[0] || null;
    let wrapperElement: HTMLElement;

    if (wrapperTag) {
      // Simple tag wrapper like --dom:wrap:div
      wrapperElement = document.createElement(wrapperTag);
      const wrapperClass = invoker.dataset.wrapperClass;
      const wrapperId = invoker.dataset.wrapperId;
      if (wrapperClass) wrapperElement.className = wrapperClass;
      if (wrapperId) wrapperElement.id = wrapperId;
    } else {
      // Template-based wrapper
      let fragment = getSourceNode(invoker, 'wrap').cloneNode(true) as DocumentFragment;

      // Process the fragment if advanced templating is enabled
      if (isInterpolationEnabled()) {
        fragment = processTemplateFragment(fragment, invoker);
      }

      // Assume the fragment has a single root element
      const children = Array.from(fragment.children);
      if (children.length !== 1) {
        throw createInvokerError('Wrap template must contain exactly one root element', ErrorSeverity.ERROR, {
          command: '--dom:wrap', element: invoker
        });
      }
      wrapperElement = children[0] as HTMLElement;
    }

    const updateDOM = () => {
      targetElement.replaceWith(wrapperElement);
      wrapperElement.appendChild(targetElement);
    };

    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:unwrap`: Removes the parent of the target element, promoting it up one level in the DOM tree.
   * @example `<button command="--dom:unwrap" commandfor="#content">Remove Wrapper</button>`
   */
  "--dom:unwrap": ({ targetElement }: CommandContext) => {
    const parent = targetElement.parentElement;
    if (!parent) return; // Already at root level

    const updateDOM = () => {
      parent.replaceWith(targetElement);
    };

    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
  },

  /**
   * `--dom:toggle-empty-class`: Adds or removes a class on the target based on whether it has child elements.
   * @example `<button command="--dom:toggle-empty-class:list-is-empty" commandfor="#todo-list">Remove Item</button>`
   */
  "--dom:toggle-empty-class": ({ targetElement, params }: CommandContext) => {
    const className = params[0];
    if (!className) {
      throw createInvokerError('Toggle empty class command requires a class name parameter', ErrorSeverity.ERROR, {
        command: '--dom:toggle-empty-class', element: targetElement
      });
    }

    const hasChildren = targetElement.children.length > 0;
    targetElement.classList.toggle(className, !hasChildren);
  },

  // --- Template Commands ---

  /**
   * `--template:render`: Renders a template with data interpolation and inserts it into the DOM.
   * Processes {{expressions}} using data contexts and element context.
   *
   * @example
   * ```html
   * <template id="user-card">
   *   <div class="card">
   *     <h3>{{user.name}}</h3>
   *     <p>{{user.email}}</p>
   *   </div>
   * </template>
   *
   * <button command="--template:render:user-card"
   *         commandfor="#output"
   *         data-context="user"
   *         data-name="John Doe"
   *         data-email="john@example.com">
   *   Render User Card
   * </button>
   * ```
   */
  "--template:render": ({ invoker, targetElement, params }: CommandContext) => {
    const [templateId] = params;
    if (!templateId) {
      throw createInvokerError('Template render command requires a template ID parameter', ErrorSeverity.ERROR, {
        command: '--template:render', element: invoker, recovery: 'Use format: --template:render:template-id'
      });
    }

    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      throw createInvokerError(`Template element with ID "${templateId}" not found or is not a <template>`, ErrorSeverity.ERROR, {
        command: '--template:render', element: invoker, recovery: `Ensure a <template id="${templateId}"> exists in the document`
      });
    }

    if (!targetElement) {
      throw createInvokerError('Template render command requires a target element', ErrorSeverity.ERROR, {
        command: '--template:render', element: invoker, recovery: 'Use commandfor attribute to specify target element'
      });
    }

    try {
      // Clone the template content
      const fragment = template.content.cloneNode(true) as DocumentFragment;

      // Create context for interpolation
      const context = {
        this: invoker,
        event: (invoker as any).triggeringEvent,
        target: targetElement
      };

      // Add dataset attributes to context
      for (const [key, value] of Object.entries(invoker.dataset)) {
        if (key !== 'context' && !key.startsWith('on') && !key.startsWith('command')) {
          (context as any)[key] = value;
        }
      }

      // If a specific context is requested via dataset.context, use that context
      const contextKey = invoker.dataset.context;
      if (contextKey) {
        // Get the named context data, or create it if it doesn't exist
        let namedContext = getDataContext(contextKey);
        if (!namedContext) {
          namedContext = {};
          setDataContext(contextKey, namedContext);
        }
        (context as any)[contextKey] = namedContext;

        // Also add any additional dataset attributes to the named context
        for (const [key, value] of Object.entries(invoker.dataset)) {
          if (key !== 'context' && !key.startsWith('on') && !key.startsWith('command')) {
            (namedContext as any)[key] = value;
          }
        }
      }

      // Process interpolation in the fragment
      processTemplateWithData(fragment, context);

      // Generate unique IDs for elements that need them
      assignUniqueIds(fragment);

      const updateDOM = () => {
        // Insert method based on invoker's data-insert attribute
        const insertMethod = invoker.dataset.insert || 'replace';
        switch (insertMethod) {
          case 'append':
            targetElement.appendChild(fragment);
            break;
          case 'prepend':
            targetElement.insertBefore(fragment, targetElement.firstChild);
            break;
          case 'before':
            targetElement.parentNode?.insertBefore(fragment, targetElement);
            break;
          case 'after':
            targetElement.parentNode?.insertBefore(fragment, targetElement.nextSibling);
            break;
          case 'replace':
          default:
            targetElement.replaceChildren(fragment);
            break;
        }
      };

      // Use view transitions if available
      if (document.startViewTransition) {
        document.startViewTransition(updateDOM);
      } else {
        updateDOM();
      }
    } catch (error) {
      throw createInvokerError('Failed to render template', ErrorSeverity.ERROR, {
        command: '--template:render', element: invoker, cause: error as Error,
        recovery: 'Check template structure, data context, and target element'
      });
    }
  },

  /**
   * `--template:clone`: Clones a template element and inserts it into the DOM at the target location.
   * Unlike render, this doesn't process data - just clones the template structure.
   *
   * @example
   * ```html
   * <template id="modal-template">
   *   <div class="modal">...</div>
   * </template>
   *
   * <button command="--template:clone:modal-template"
   *         commandfor="body">
   *   Show Modal
   * </button>
   * ```
   */
  "--template:clone": ({ invoker, targetElement, params }: CommandContext) => {
    const [templateId] = params;
    if (!templateId) {
      throw createInvokerError('Template clone command requires a template ID parameter', ErrorSeverity.ERROR, {
        command: '--template:clone', element: invoker, recovery: 'Use format: --template:clone:template-id'
      });
    }

    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      throw createInvokerError(`Template element with ID "${templateId}" not found or is not a <template>`, ErrorSeverity.ERROR, {
        command: '--template:clone', element: invoker, recovery: `Ensure a <template id="${templateId}"> exists in the document`
      });
    }

    if (!targetElement) {
      throw createInvokerError('Template clone command requires a target element', ErrorSeverity.ERROR, {
        command: '--template:clone', element: invoker, recovery: 'Use commandfor attribute to specify target element'
      });
    }

    try {
      const fragment = template.content.cloneNode(true) as DocumentFragment;

      // Generate unique IDs for elements that need them
      assignUniqueIds(fragment);

      const updateDOM = () => {
        // Insert method based on invoker's data-insert attribute
        const insertMethod = invoker.dataset.insert || 'replace';
        switch (insertMethod) {
          case 'append':
            targetElement.appendChild(fragment);
            break;
          case 'prepend':
            targetElement.insertBefore(fragment, targetElement.firstChild);
            break;
          case 'before':
            targetElement.parentNode?.insertBefore(fragment, targetElement);
            break;
          case 'after':
            targetElement.parentNode?.insertBefore(fragment, targetElement.nextSibling);
            break;
          case 'replace':
          default:
            targetElement.replaceChildren(fragment);
            break;
        }
      };

      // Use view transitions if available
      if (document.startViewTransition) {
        document.startViewTransition(updateDOM);
      } else {
        updateDOM();
      }
    } catch (error) {
      throw createInvokerError('Failed to clone template', ErrorSeverity.ERROR, {
        command: '--template:clone', element: invoker, cause: error as Error,
        recovery: 'Check template structure and target element'
      });
    }
  },

  // --- Data Context Commands ---

  /**
   * `--data:set:context`: Sets data in a named context for use in templates and expressions.
   *
   * @example
   * ```html
   * <button command="--data:set:context:userProfile"
   *         data-name="John Doe"
   *         data-email="john@example.com">
   *   Set User Profile
   * </button>
   * ```
   */
  "--data:set:context": ({ invoker, params }: CommandContext) => {
    const [contextKey] = params;
    if (!contextKey) {
      throw createInvokerError('Data set context command requires a context key parameter', ErrorSeverity.ERROR, {
        command: '--data:set:context', element: invoker, recovery: 'Use format: --data:set:context:context-key'
      });
    }

    try {
      const data: Record<string, any> = {};

      // Extract data from invoker's dataset attributes
      for (const [key, value] of Object.entries(invoker.dataset)) {
        if (key !== 'context' && !key.startsWith('on') && !key.startsWith('command')) {
          // Try to parse as JSON, fallback to string
          if (value && (value.startsWith('{') || value.startsWith('['))) {
            try {
              data[key] = JSON.parse(value);
            } catch {
              data[key] = value;
            }
          } else {
            data[key] = value;
          }
        }
      }

      setDataContext(contextKey, data);
    } catch (error) {
      throw createInvokerError('Failed to set data context', ErrorSeverity.ERROR, {
        command: '--data:set:context', element: invoker, cause: error as Error,
        recovery: 'Check data attribute formats and context key'
      });
    }
  },

  /**
   * `--data:update:context`: Updates specific properties in a named data context.
   *
   * @example
   * ```html
   * <input command-on="input:--data:update:userProfile:name" value="{{userProfile.name}}">
   * ```
   */
  "--data:update:context": ({ invoker, params, targetElement }: CommandContext) => {
    const [contextKey, propertyPath] = params;
    if (!contextKey || !propertyPath) {
      throw createInvokerError('Data update context command requires context key and property path', ErrorSeverity.ERROR, {
        command: '--data:update:context', element: invoker,
        recovery: 'Use format: --data:update:context:context-key:property-path'
      });
    }

    try {
      let value: any;

      // Get value from target element if it's a form input
      if (targetElement && 'value' in targetElement) {
        value = (targetElement as HTMLInputElement).value;
      } else {
        // Get value from invoker's data attributes
        value = invoker.dataset.value;
        if (value && (value.startsWith('{') || value.startsWith('['))) {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string
          }
        }
      }

      updateDataContext(contextKey, propertyPath, value);
    } catch (error) {
      throw createInvokerError('Failed to update data context', ErrorSeverity.ERROR, {
        command: '--data:update:context', element: invoker, cause: error as Error,
        recovery: 'Check property path and value format'
      });
    }
  }
};

// --- Private Helper Functions ---

function getSourceNode(invoker: HTMLButtonElement, commandName: string): DocumentFragment {
  const templateId = invoker.dataset.templateId;
  if (!templateId) {
    throw createInvokerError(`${commandName} requires data-template-id`, ErrorSeverity.ERROR, {
      command: `--dom:${commandName}`, element: invoker,
      recovery: 'Add data-template-id="template-name" to specify which template to use.'
    });
  }

  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    throw createInvokerError(`Template with ID "${templateId}" not found or is not a <template>`, ErrorSeverity.ERROR, {
      command: `--dom:${commandName}`, element: invoker,
      recovery: `Ensure a <template id="${templateId}"> exists in the document.`
    });
  }

  return template.content.cloneNode(true) as DocumentFragment;
}

function processTemplateFragment(fragment: DocumentFragment, invoker: HTMLElement): DocumentFragment {
  // Get context for template processing
  let context: any = {
    this: {
      ...invoker,
      dataset: { ...invoker.dataset },
      value: (invoker as any).value || '',
    },
    data: document.body.dataset,
    event: (invoker as any).triggeringEvent,
  };

  // Process data-with-json for additional context
  if (invoker.dataset.withJson) {
    try {
      let jsonString = invoker.dataset.withJson;
      
       // Replace {{__uid}} placeholders in JSON with generated UIDs
       const uidMatches = jsonString.match(/\{\{__uid\}\}/g);
       if (uidMatches) {
         for (const match of uidMatches) {
           const uid = generateUid();
           jsonString = jsonString.replace(match, uid);
         }
       }
      
      const jsonData = JSON.parse(jsonString);
      context = { ...context, ...jsonData };
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.error('Invokers: Invalid JSON in data-with-json:', error);
      }
    }
  }

  // Process UID generation
  processUidAndSelectors(fragment);

  // Process advanced templating features
  processAdvancedTemplating(fragment, context);

  // Rewrite @closest selectors to use generated IDs
  processClosestSelectors(fragment);

  // Process interpolation
  processInterpolation(fragment, context);

  // Process data-bind attributes
  processDataBindings(fragment);

  return fragment;
}

function processTemplateWithData(fragment: DocumentFragment, context: Record<string, any>): void {
  // Process interpolation
  processInterpolation(fragment, context);

  // Process data-bind attributes
  processDataBindings(fragment);
}

/**
 * Processes advanced templating features like data-tpl-* attributes and {{__uid}}
 */
function processAdvancedTemplating(fragment: DocumentFragment, context: Record<string, any>): void {

  const elements = fragment.querySelectorAll('[data-tpl-attr], [data-tpl-text], [data-tpl-class], [data-tpl-value]');
  
  for (const element of elements) {
    // Process data-tpl-attr (e.g., data-tpl-attr="id:id,class:status")
    const tplAttr = element.getAttribute('data-tpl-attr');
    if (tplAttr) {
      const attrMappings = tplAttr.split(',');
      for (const mapping of attrMappings) {
        const [attrName, contextKey] = mapping.split(':').map(s => s.trim());
        if (attrName && contextKey && context[contextKey]) {
          element.setAttribute(attrName, String(context[contextKey]));
        }
      }
      element.removeAttribute('data-tpl-attr');
    }

    // Process data-tpl-text
    const tplText = element.getAttribute('data-tpl-text');
    if (tplText && context[tplText]) {
      element.textContent = String(context[tplText]);
      element.removeAttribute('data-tpl-text');
    }

    // Process data-tpl-class
    const tplClass = element.getAttribute('data-tpl-class');
    if (tplClass && context[tplClass]) {
      element.className = String(context[tplClass]);
      element.removeAttribute('data-tpl-class');
    }

    // Process data-tpl-value
    const tplValue = element.getAttribute('data-tpl-value');
    if (tplValue && context[tplValue]) {
      (element as HTMLInputElement).value = String(context[tplValue]);
      element.removeAttribute('data-tpl-value');
    }
  }

   // Process {{__uid}} placeholders
   processUidAndSelectors(fragment);

   // Rewrite @closest selectors
   processClosestSelectors(fragment);
}

/**
 * Processes {{__uid}} placeholders and rewrites @closest selectors
 */
function processUidAndSelectors(fragment: DocumentFragment): void {
  const elementsWithUid = fragment.querySelectorAll('*');

  for (const element of elementsWithUid) {
    // Check if element has __uid placeholder in content or attributes
    const hasUidInContent = element.textContent?.includes('{{__uid}}');
    const hasUidInAttrs = Array.from(element.attributes).some(attr => attr.value.includes('{{__uid}}'));
    
    if (hasUidInContent || hasUidInAttrs) {
      const uid = `item-invoker-${generateId()}`;
      
      // Replace {{__uid}} in text content
      if (hasUidInContent) {
        element.textContent = element.textContent!.replace(/\{\{__uid\}\}/g, uid);
      }
      
      // Replace {{__uid}} in attributes
      for (const attr of Array.from(element.attributes)) {
        if (attr.value.includes('{{__uid}}')) {
          element.setAttribute(attr.name, attr.value.replace(/\{\{__uid\}\}/g, uid));
        }
      }
    }
  }


}

function processClosestSelectors(fragment: DocumentFragment): void {
  // Rewrite @closest selectors to use the ID of the closest matching element
  const elementsWithCommandfor = fragment.querySelectorAll('[commandfor]');
  for (const element of elementsWithCommandfor) {
    const commandfor = element.getAttribute('commandfor');
    if (commandfor?.startsWith('@closest(')) {
      const match = commandfor.match(/^@closest\(([^)]+)\)$/);
      if (match) {
        const selector = match[1];
        const closest = element.closest(selector);
        if (closest && closest.id) {
          element.setAttribute('commandfor', `#${closest.id}`);
        }
      }
    }
  }
}

/**
 * Processes {{expression}} interpolation in a document fragment
 */
function processInterpolation(fragment: DocumentFragment, context: Record<string, any>): void {
  if (!isInterpolationEnabled()) return;

  // Process text content recursively
  function processTextNodes(element: Element): void {
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        if (textContent.includes('{{')) {
          try {
            const interpolated = interpolateString(textContent, context);
            node.textContent = interpolated;
          } catch (error) {
            if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
              console.warn('Invokers: Interpolation error in template:', error);
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        processTextNodes(node as Element);
      }
    }
  }

  processTextNodes(fragment as any);

  // Process attributes
  const allElements = fragment.querySelectorAll('*');
  for (const element of allElements) {
    for (const attr of Array.from(element.attributes)) {
      if (attr.value.includes('{{')) {
        try {
          const interpolated = interpolateString(attr.value, context);
          element.setAttribute(attr.name, interpolated);
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            console.warn('Invokers: Attribute interpolation error:', error);
          }
        }
      }
    }
  }
}

/**
 * Processes data-bind attributes for reactive data binding
 */
function processDataBindings(root: Element | DocumentFragment): void {
  const elements = root.querySelectorAll('[data-bind]');
  for (const element of elements) {
    const bindAttr = element.getAttribute('data-bind');
    if (!bindAttr) continue;

    try {
      // Parse binding expression (e.g., "user.name" or "user")
      const contextKey = bindAttr.split('.')[0];
      const propertyPath = bindAttr.split('.').slice(1).join('.');

      const dataContext = getDataContext(contextKey);
      if (dataContext && Object.keys(dataContext).length > 0) {
        const value = propertyPath
          ? getNestedProperty(dataContext, propertyPath)
          : dataContext;

        // Bind to appropriate element property
        if ('value' in element) {
          (element as HTMLInputElement).value = String(value || '');
        } else if ('textContent' in element) {
          element.textContent = String(value || '');
        }
      }
    } catch (error) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.warn('Invokers: Data binding error:', error);
      }
    }
  }
}

/**
 * Gets a nested property from an object using dot notation
 */
function getNestedProperty(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Assigns unique IDs to elements that need them for command targeting
 */
function assignUniqueIds(fragment: DocumentFragment): void {
  const elementsNeedingIds = fragment.querySelectorAll('[commandfor]');
  for (const element of elementsNeedingIds) {
    if (!element.id) {
      element.id = `invoker-${generateId()}`;
    }
  }
}

/**
 * Generates a unique ID for elements
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Registers all DOM manipulation and templating commands with the InvokerManager.
 * This includes element manipulation, template rendering, and data context management.
 * 
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerDomCommands } from 'invokers/commands/dom';
 * import invokerManager from 'invokers';
 * 
 * registerDomCommands(invokerManager);
 * ```
 */
export function registerDomCommands(manager: InvokerManager): void {
  for (const name in domCommands) {
    if (domCommands.hasOwnProperty(name)) {
      manager.register(name, domCommands[name]);
    }
  }
}
