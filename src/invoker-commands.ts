/**
 * @file invoker-commands.ts
 * @summary An optional collection of powerful, reusable custom commands for the Invokers library.
 * @description
 * This module extends the core Invokers library with a suite of feature-rich commands
 * for common UI patterns like dynamic content fetching, DOM manipulation, media control, and more.
 *
 * To use these commands, import and run the `registerAll()` function after the core
 * Invokers library has been loaded.
 * @example
 * // In your main application script:
 * import 'invokers'; // Core library (loads polyfill and window.Invoker)
 * import { registerAll } from 'invokers/commands';
 *
 * // Make all extended commands available for use in your HTML.
 * registerAll();
 */

import type { CommandContext, CommandCallback } from "./index";
import { createInvokerError, ErrorSeverity, validateElement, sanitizeHTML, isInterpolationEnabled } from "./index";
import { interpolateString, setDataContext, getDataContext, updateDataContext } from "./advanced/interpolation";
import { resolveTargets } from "./target-resolver";
import { generateUid, debugLog, debugWarn, debugError } from './utils';
import { InvokerManager } from './core';

type CommandRegistry = Record<string, CommandCallback>;

/**
 * A collection of useful custom commands to enhance the Invokers library.
 * Each command is designed to be robust, handle common edge cases, and provide
 * excellent developer experience through clear error messaging.
 */
export const commands: CommandRegistry = {
  // --- Media Commands ---

  /**
   * `--media:toggle`: Toggles play/pause on a target `<video>` or `<audio>` element.
   * It automatically updates the invoker's text content (from `data-play-text` and
   * `data-pause-text`) and its `aria-pressed` state for accessibility.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--media:toggle"
   *   commandfor="my-video"
   *   data-play-text="Pause Video"
   *   data-pause-text="Play Video"
   * >
   *   Play Video
   * </button>
   * <video id="my-video" src="..."></video>
   * ```
   */
  "--media:toggle": async ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['video', 'audio'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--media:toggle', element: invoker, recovery: 'Ensure commandfor points to a <video> or <audio> element.'
      });
    }

    const media = targetElement as HTMLMediaElement;
    const playText = invoker.dataset.playText || "Pause";
    const pauseText = invoker.dataset.pauseText || "Play";

    try {
      if (media.paused) {
        await media.play();
        invoker.textContent = playText;
        invoker.setAttribute("aria-pressed", "true");
      } else {
        media.pause();
        invoker.textContent = pauseText;
        invoker.setAttribute("aria-pressed", "false");
      }
    } catch (error) {
      throw createInvokerError('Failed to toggle media playback', ErrorSeverity.ERROR, {
        command: '--media:toggle', element: invoker, cause: error as Error,
        recovery: (error as Error).name === 'NotAllowedError'
          ? 'Media autoplay blocked by browser. User interaction may be required.'
          : 'Check that the media element has a valid source and is ready to play.'
      });
    }
  },

  /**
   * `--media:seek`: Seeks a target `<video>` or `<audio>` element forward or backward
   * by a specified number of seconds.
   *
   * @example
   * ```html
   * <button type="button" command="--media:seek:-10" commandfor="my-video">Rewind 10s</button>
   * <button type="button" command="--media:seek:30" commandfor="my-video">Forward 30s</button>
   * ```
   */
  "--media:seek": ({ invoker, targetElement, params }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['video', 'audio'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--media:seek', element: invoker, recovery: 'Ensure commandfor points to a <video> or <audio> element.'
      });
    }
    const media = targetElement as HTMLMediaElement;
    const seekTime = parseFloat(params[0]);

    if (isNaN(seekTime)) {
      throw createInvokerError('Media seek command requires a numeric value for seconds', ErrorSeverity.ERROR, {
        command: '--media:seek', element: invoker, context: { provided: params[0] }, recovery: 'Use format: --media:seek:10 (for 10s) or --media:seek:-5 (for -5s).'
      });
    }

    media.currentTime = Math.max(0, Math.min(media.duration, media.currentTime + seekTime));
  },

  /**
   * `--media:mute`: Toggles the mute state on a target `<video>` or `<audio>` element
   * and updates the invoker's `aria-pressed` state to reflect the current muted status.
   *
   * @example
   * ```html
   * <button type="button" command="--media:mute" commandfor="my-video" aria-pressed="false">Mute</button>
   * ```
   */
  "--media:mute": ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['video', 'audio'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Media command failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--media:mute', element: invoker, recovery: 'Ensure commandfor points to a <video> or <audio> element.'
      });
    }
    const media = targetElement as HTMLMediaElement;
    media.muted = !media.muted;
    invoker.setAttribute("aria-pressed", String(media.muted));
  },

  // --- Carousel / Slider Commands ---

  /**
   * `--carousel:nav`: Navigates a carousel by showing the next or previous item.
   * Assumes items are direct children of the target, with visibility controlled by `hidden`.
   *
   * @example
   * ```html
   * <div id="my-carousel">
   *   <div>Slide 1</div>
   *   <div hidden>Slide 2</div>
   * </div>
   * <button type="button" command="--carousel:nav:prev" commandfor="my-carousel">ΓÇ╣</button>
   * <button type="button" command="--carousel:nav:next" commandfor="my-carousel">ΓÇ║</button>
   * ```
   */
  "--carousel:nav": ({ invoker, targetElement, params }: CommandContext) => {
    const [direction] = params;

    if (direction !== "next" && direction !== "prev") {
      throw createInvokerError('Carousel nav requires a direction parameter of "next" or "prev"', ErrorSeverity.ERROR, {
        command: '--carousel:nav', element: invoker, recovery: 'Use format: --carousel:nav:next or --carousel:nav:prev'
      });
    }

    const slides = Array.from(targetElement.children) as HTMLElement[];
    if (slides.length < 2) return;

    const activeIndex = slides.findIndex((slide) => !slide.hasAttribute("hidden"));
    const currentIndex = activeIndex === -1 ? 0 : activeIndex;
    const nextIndex = (direction === "next" ? currentIndex + 1 : currentIndex - 1 + slides.length) % slides.length;

    const updateDOM = () => {
      slides.forEach((slide, index) => {
        slide.toggleAttribute("hidden", index !== nextIndex);
      });
    };

    document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
    },

    // --- Clipboard and Form Commands ---

  /**
   * `--clipboard:copy`: Copies the text content (or value for inputs) of the target
   * element to the clipboard. Provides visual feedback on the invoker button.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--clipboard:copy"
   *   commandfor="code-snippet"
   *   data-feedback-text="Copied!"
   * >
   *   Copy
   * </button>
   * <pre id="code-snippet">npm install invokers</pre>
   * ```
   */
  "--clipboard:copy": async ({ invoker, targetElement }: CommandContext) => {
    if (!navigator.clipboard) {
      throw createInvokerError("Clipboard API not available", ErrorSeverity.ERROR, {
        command: '--clipboard:copy', element: invoker, recovery: 'This feature requires a secure context (HTTPS).'
      });
    }

    const originalText = invoker.textContent || "";
    const feedbackText = invoker.dataset.feedbackText || "Copied!";
    const errorText = invoker.dataset.errorText || "Error!";
    const textToCopy = targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement ? targetElement.value : targetElement.textContent || "";

    invoker.setAttribute("disabled", "");
    try {
      await navigator.clipboard.writeText(textToCopy);
      invoker.textContent = feedbackText;
    } catch (err) {
      invoker.textContent = errorText;
      throw createInvokerError('Failed to copy text to clipboard', ErrorSeverity.ERROR, {
        command: '--clipboard:copy', element: invoker, cause: err as Error
      });
    } finally {
      setTimeout(() => {
        invoker.textContent = originalText;
        invoker.removeAttribute("disabled");
      }, 2000);
    }
  },

  // --- Text Commands ---

  /**
   * `--text:set`: Sets the text content of the target element.
   * Supports interpolation if advanced events are enabled.
   *
   * @example
   * ```html
   * <button command="--text:set:Hello World" commandfor="message">Set Message</button>
   * <div id="message"></div>
   * ```
   */
  "--text:set": ({ invoker, targetElement, params }: CommandContext) => {
    const [text] = params;
    if (text === undefined) {
      throw createInvokerError('Text set command requires text parameter', ErrorSeverity.ERROR, {
        command: '--text:set', element: invoker,
        recovery: 'Use format: --text:set:text-content'
      });
    }

    try {
      // Interpolate if advanced events are enabled
      const finalText = isInterpolationEnabled() ? interpolateString(text, {}) : text;
      targetElement.textContent = finalText;
    } catch (error) {
      throw createInvokerError('Failed to set text content', ErrorSeverity.ERROR, {
        command: '--text:set', element: invoker, cause: error as Error,
        recovery: 'Check text content and interpolation syntax'
      });
    }
  },

  /**
   * `--text:append`: Appends text to the target element's content.
   *
   * @example
   * ```html
   * <button command="--text:append: more text" commandfor="message">Append</button>
   * <div id="message">Initial text</div>
   * ```
   */
  "--text:append": ({ invoker, targetElement, params }: CommandContext) => {
    const [text] = params;
    if (text === undefined) {
      throw createInvokerError('Text append command requires text parameter', ErrorSeverity.ERROR, {
        command: '--text:append', element: invoker,
        recovery: 'Use format: --text:append:text-content'
      });
    }

    try {
      const finalText = isInterpolationEnabled() ? interpolateString(text, {}) : text;
      targetElement.textContent = (targetElement.textContent || '') + finalText;
    } catch (error) {
      throw createInvokerError('Failed to append text content', ErrorSeverity.ERROR, {
        command: '--text:append', element: invoker, cause: error as Error,
        recovery: 'Check text content and interpolation syntax'
      });
    }
  },

  /**
   * `--text:prepend`: Prepends text to the target element's content.
   *
   * @example
   * ```html
   * <button command="--text:prepend:Prefix: " commandfor="message">Prepend</button>
   * <div id="message">content</div>
   * ```
   */
  "--text:prepend": ({ invoker, targetElement, params }: CommandContext) => {
    const [text] = params;
    if (text === undefined) {
      throw createInvokerError('Text prepend command requires text parameter', ErrorSeverity.ERROR, {
        command: '--text:prepend', element: invoker,
        recovery: 'Use format: --text:prepend:text-content'
      });
    }

    try {
      const finalText = isInterpolationEnabled() ? interpolateString(text, {}) : text;
      targetElement.textContent = finalText + (targetElement.textContent || '');
    } catch (error) {
      throw createInvokerError('Failed to prepend text content', ErrorSeverity.ERROR, {
        command: '--text:prepend', element: invoker, cause: error as Error,
        recovery: 'Check text content and interpolation syntax'
      });
    }
  },

  /**
   * `--text:clear`: Clears the text content of the target element.
   *
   * @example
   * ```html
   * <button command="--text:clear" commandfor="message">Clear</button>
   * <div id="message">Text to clear</div>
   * ```
   */
  "--text:clear": ({ targetElement }: CommandContext) => {
    targetElement.textContent = '';
  },

  /**
   * `--form:reset`: Resets the target `<form>` element.
   * @example `<button command="--form:reset" commandfor="my-form">Reset</button>`
   */
  "--form:reset": ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Form reset failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--form:reset', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    (targetElement as HTMLFormElement).reset();
  },

  /**
   * `--form:submit`: Submits the target `<form>` element.
   * @example `<button command="--form:submit" commandfor="my-form">Submit</button>`
   */
  "--form:submit": ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Form submit failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--form:submit', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    (targetElement as HTMLFormElement).requestSubmit();
  },

  /**
   * `--input:step`: Increments/decrements a target `<input type="number">`.
   *
   * @example
   * ```html
   * <button command="--input:step:-1" commandfor="quantity">-</button>
   * <input type="number" id="quantity" value="1" min="0">
   * <button command="--input:step:1" commandfor="quantity">+</button>
   * ```
   */
  "--input:step": ({ invoker, targetElement, params }: CommandContext) => {
    if (!(targetElement instanceof HTMLInputElement) || targetElement.type !== "number") {
      throw createInvokerError('Input step target must be an <input type="number">', ErrorSeverity.ERROR, {
        command: '--input:step', element: invoker
      });
    }

    const stepAmount = parseFloat(params[0] || "1");
    if (isNaN(stepAmount)) {
      throw createInvokerError('Input step requires a valid numeric parameter', ErrorSeverity.ERROR, {
        command: '--input:step', element: invoker, context: { provided: params[0] }, recovery: 'Use --input:step:1 or --input:step:-1'
      });
    }

    if (stepAmount > 0) targetElement.stepUp(stepAmount);
    else if (stepAmount < 0) targetElement.stepDown(Math.abs(stepAmount));
    targetElement.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  },

  // --- Scroll Commands ---

  /**
   * `--scroll:to`: Smoothly scrolls the viewport to bring the target element into view.
   * @example `<button command="--scroll:to" commandfor="section-2">Go to Section 2</button>`
   */
  "--scroll:to": ({ targetElement }: CommandContext) => {
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // --- DOM Manipulation Commands ---

  /**
   * `--dom:remove`: Removes the target element from the DOM.
   * @example `<button command="--dom:remove" commandfor="alert-1">&times;</button>`
   */
   "--dom:remove": ({ targetElement }: CommandContext) => {
     if (!targetElement.isConnected) return; // Already removed
     const updateDOM = () => targetElement.remove();
     document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
   },

  /**
   * `--dom:clear`: Removes all child nodes from the target element.
   * @example `<button command="--dom:clear" commandfor="list">Clear List</button>`
   */
  "--dom:clear": ({ targetElement }: CommandContext) => {
    if (!targetElement.isConnected) return;
    const updateDOM = () => targetElement.replaceChildren();
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

       // Process the fragment if advanced templating is enabled
       if (isInterpolationEnabled()) {
         fragment = processTemplateFragment(fragment, invoker);
       }

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
          const interpolatedHtml = interpolateString(html, context);
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
    "--dom:append": ({ invoker, targetElement, params }: CommandContext) => {
      const style = params[0] || 'inner';
      let fragment = getSourceNode(invoker, 'append').cloneNode(true) as DocumentFragment;

       // Process the fragment if advanced templating is enabled
       if (isInterpolationEnabled()) {
         fragment = processTemplateFragment(fragment, invoker);
       }

      const updateDOM = () => {
        if (style === 'outer') {
          targetElement.after(fragment);
        } else {
          // Default to 'inner'
          targetElement.append(fragment);
        }
      };

      document.startViewTransition ? document.startViewTransition(updateDOM) : updateDOM();
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

       // Process the fragment if advanced templating is enabled
       if (isInterpolationEnabled()) {
         fragment = processTemplateFragment(fragment, invoker);
       }

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
       if (!targetElement.isConnected) return; // Not in DOM
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
       if (!targetElement.isConnected) return; // Not in DOM
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



    /**
     * `--data:set`: Sets a data attribute on the target element.
     * @example `<button command="--data:set:userId:123" commandfor="#profile">Set User ID</button>`
     */
    "--data:set": ({ invoker, targetElement, params }: CommandContext) => {
      const key = params[0];
      let value = params[1];
      if (!key) {
        throw createInvokerError('Data set command requires a key parameter', ErrorSeverity.ERROR, {
          command: '--data:set', element: invoker
        });
      }

      // Interpolate value if interpolation is enabled
      if (isInterpolationEnabled() && value) {
        const context = {
          this: {
            ...invoker,
            dataset: { ...invoker.dataset },
            value: (invoker as any).value || '',
          },
          data: document.body.dataset,
          event: (invoker as any).triggeringEvent,
        };
        value = interpolateString(value, context);
      }

      targetElement.dataset[key] = value || '';
    },

    /**
     * `--data:copy`: Copies a data attribute from a source element to the target.
     * @example `<button command="--data:copy:userId" commandfor="#edit-form" data-copy-from="#user-profile">Edit User</button>`
     */
    "--data:copy": ({ invoker, targetElement, params }: CommandContext) => {
      const key = params[0];
      if (!key) {
        throw createInvokerError('Data copy command requires a key parameter', ErrorSeverity.ERROR, {
          command: '--data:copy', element: invoker
        });
      }

      const sourceSelector = invoker.dataset.copyFrom;
      let sourceElement: HTMLElement | null = invoker;

      if (sourceSelector) {
        sourceElement = document.querySelector(sourceSelector);
        if (!sourceElement) {
          throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, ErrorSeverity.ERROR, {
            command: '--data:copy', element: invoker
          });
        }
      }

      const value = sourceElement.dataset[key];
      if (value !== undefined) {
        targetElement.dataset[key] = value;
      }
    },

    /**
     * `--data:set:array:push`: Adds an item to the end of an array stored in a data attribute.
     * @example `<button command="--data:set:array:push:todos" data-value='{"title": "New Task"}' commandfor="#app">Add Todo</button>`
     */
    "--data:set:array:push": ({ invoker, targetElement, params }: CommandContext) => {
      const arrayKey = params[0];
      if (!arrayKey) {
        throw createInvokerError('Array push command requires an array key parameter', ErrorSeverity.ERROR, {
          command: '--data:set:array:push', element: invoker
        });
      }

      const valueToAdd = invoker.dataset.value;
      if (!valueToAdd) {
        throw createInvokerError('Array push command requires a data-value attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:push', element: invoker
        });
      }

      let arrayData: any[] = [];
      try {
        const existingData = targetElement.dataset[arrayKey];
        arrayData = existingData ? JSON.parse(existingData) : [];
      } catch (e) {
        arrayData = [];
      }

      try {
        const newItem = JSON.parse(valueToAdd);
        arrayData.push(newItem);
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      } catch (e) {
        throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:push', element: invoker
        });
      }
    },

    /**
     * `--data:set:array:remove`: Removes an item at a specific index from an array stored in a data attribute.
     * @example `<button command="--data:set:array:remove:todos" data-index="2" commandfor="#app">Remove Item</button>`
     */
    "--data:set:array:remove": ({ invoker, targetElement, params }: CommandContext) => {
      const arrayKey = params[0];
      if (!arrayKey) {
        throw createInvokerError('Array remove command requires an array key parameter', ErrorSeverity.ERROR, {
          command: '--data:set:array:remove', element: invoker
        });
      }

      const indexToRemove = parseInt(invoker.dataset.index || '0', 10);
      if (isNaN(indexToRemove)) {
        throw createInvokerError('Array remove command requires a valid data-index attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:remove', element: invoker
        });
      }

      let arrayData: any[] = [];
      try {
        const existingData = targetElement.dataset[arrayKey];
        arrayData = existingData ? JSON.parse(existingData) : [];
      } catch (e) {
        arrayData = [];
      }

      if (indexToRemove >= 0 && indexToRemove < arrayData.length) {
        arrayData.splice(indexToRemove, 1);
        targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
      }
    },

    /**
     * `--data:set:array:update`: Updates an item at a specific index in an array stored in a data attribute.
     * @example `<button command="--data:set:array:update:todos" data-index="1" data-value='{"title": "Updated"}' commandfor="#app">Update Item</button>`
     */
    "--data:set:array:update": ({ invoker, targetElement, params }: CommandContext) => {
      const arrayKey = params[0];
      if (!arrayKey) {
        throw createInvokerError('Array update command requires an array key parameter', ErrorSeverity.ERROR, {
          command: '--data:set:array:update', element: invoker
        });
      }

      const indexToUpdate = parseInt(invoker.dataset.index || '0', 10);
      const valueToUpdate = invoker.dataset.value;

      if (isNaN(indexToUpdate)) {
        throw createInvokerError('Array update command requires a valid data-index attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:update', element: invoker
        });
      }

      if (!valueToUpdate) {
        throw createInvokerError('Array update command requires a data-value attribute', ErrorSeverity.ERROR, {
          command: '--data:set:array:update', element: invoker
        });
      }

      let arrayData: any[] = [];
      try {
        const existingData = targetElement.dataset[arrayKey];
        arrayData = existingData ? JSON.parse(existingData) : [];
      } catch (e) {
        arrayData = [];
      }

      if (indexToUpdate >= 0 && indexToUpdate < arrayData.length) {
        try {
          const updateData = JSON.parse(valueToUpdate);
          arrayData[indexToUpdate] = { ...arrayData[indexToUpdate], ...updateData };
          targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
        } catch (e) {
          throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
            command: '--data:set:array:update', element: invoker
          });
        }
      }
     },

     /**
      * `--data:set:array:insert`: Inserts an item at a specific index in an array stored in a data attribute.
      * @example `<button command="--data:set:array:insert:todos" data-index="1" data-value='{"title": "Inserted Item"}' commandfor="#app">Insert at Position 1</button>`
      */
     "--data:set:array:insert": ({ invoker, targetElement, params }: CommandContext) => {
       const arrayKey = params[0];
       if (!arrayKey) {
         throw createInvokerError('Array insert command requires an array key parameter', ErrorSeverity.ERROR, {
           command: '--data:set:array:insert', element: invoker
         });
       }

       const indexToInsert = parseInt(invoker.dataset.index || '0', 10);
       const valueToInsert = invoker.dataset.value;

       if (isNaN(indexToInsert)) {
         throw createInvokerError('Array insert command requires a valid data-index attribute', ErrorSeverity.ERROR, {
           command: '--data:set:array:insert', element: invoker
         });
       }

       if (!valueToInsert) {
         throw createInvokerError('Array insert command requires a data-value attribute', ErrorSeverity.ERROR, {
           command: '--data:set:array:insert', element: invoker
         });
       }

       let arrayData: any[] = [];
       try {
         const existingData = targetElement.dataset[arrayKey];
         arrayData = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         arrayData = [];
       }

       if (indexToInsert >= 0 && indexToInsert <= arrayData.length) {
         try {
           const newItem = JSON.parse(valueToInsert);
           arrayData.splice(indexToInsert, 0, newItem);
           targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
         } catch (e) {
           throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
             command: '--data:set:array:insert', element: invoker
           });
         }
       }
     },

     /**
      * `--data:set:array:unshift`: Adds an item to the beginning of an array stored in a data attribute.
      * @example `<button command="--data:set:array:unshift:todos" data-value='{"title": "First Item"}' commandfor="#app">Add to Beginning</button>`
      */
     "--data:set:array:unshift": ({ invoker, targetElement, params }: CommandContext) => {
       const arrayKey = params[0];
       if (!arrayKey) {
         throw createInvokerError('Array unshift command requires an array key parameter', ErrorSeverity.ERROR, {
           command: '--data:set:array:unshift', element: invoker
         });
       }

       const valueToAdd = invoker.dataset.value;
       if (!valueToAdd) {
         throw createInvokerError('Array unshift command requires a data-value attribute', ErrorSeverity.ERROR, {
           command: '--data:set:array:unshift', element: invoker
         });
       }

       let arrayData: any[] = [];
       try {
         const existingData = targetElement.dataset[arrayKey];
         arrayData = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         arrayData = [];
       }

       try {
         const newItem = JSON.parse(valueToAdd);
         arrayData.unshift(newItem);
         targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
       } catch (e) {
         throw createInvokerError('Invalid JSON in data-value attribute', ErrorSeverity.ERROR, {
           command: '--data:set:array:unshift', element: invoker
         });
       }
     },

     /**
      * `--data:set:array:clear`: Removes all items from an array stored in a data attribute.
      * @example `<button command="--data:set:array:clear:todos" commandfor="#app">Clear All Todos</button>`
      */
     "--data:set:array:clear": ({ targetElement, params }: CommandContext) => {
       const arrayKey = params[0];
       if (!arrayKey) {
         throw createInvokerError('Array clear command requires an array key parameter', ErrorSeverity.ERROR, {
           command: '--data:set:array:clear', element: targetElement
         });
       }

       targetElement.dataset[arrayKey] = JSON.stringify([]);
     },

     /**
      * `--data:set:array:sort`: Sorts an array stored in a data attribute.
      * @example `<button command="--data:set:array:sort:todos" data-sort-by="priority" data-sort-order="desc" commandfor="#app">Sort by Priority</button>`
      */
     "--data:set:array:sort": ({ invoker, targetElement, params }: CommandContext) => {
       const arrayKey = params[0];
       if (!arrayKey) {
         throw createInvokerError('Array sort command requires an array key parameter', ErrorSeverity.ERROR, {
           command: '--data:set:array:sort', element: invoker
         });
       }

       const sortBy = invoker.dataset.sortBy || invoker.dataset.sort_by;
       const sortOrder = invoker.dataset.sortOrder || invoker.dataset.sort_order || 'asc';

       if (!sortBy) {
         throw createInvokerError('Array sort command requires a data-sort-by attribute', ErrorSeverity.ERROR, {
           command: '--data:set:array:sort', element: invoker
         });
       }

       let arrayData: any[] = [];
       try {
         const existingData = targetElement.dataset[arrayKey];
         arrayData = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         arrayData = [];
       }

       arrayData.sort((a, b) => {
         const aVal = a[sortBy];
         const bVal = b[sortBy];

         let comparison = 0;
         if (aVal < bVal) comparison = -1;
         else if (aVal > bVal) comparison = 1;

         return sortOrder === 'desc' ? -comparison : comparison;
       });

       targetElement.dataset[arrayKey] = JSON.stringify(arrayData);
     },

     /**
      * `--data:set:array:filter`: Filters an array stored in a data attribute and stores the result in a new key.
      * @example `<button command="--data:set:array:filter:todos" data-filter-by="completed" data-filter-value="false" data-result-key="filtered-todos" commandfor="#app">Show Pending</button>`
      */
     "--data:set:array:filter": ({ invoker, targetElement, params }: CommandContext) => {
       const arrayKey = params[0];
       if (!arrayKey) {
         throw createInvokerError('Array filter command requires an array key parameter', ErrorSeverity.ERROR, {
           command: '--data:set:array:filter', element: invoker
         });
       }

       const filterBy = invoker.dataset.filterBy || invoker.dataset.filter_by;
       const filterValue = invoker.dataset.filterValue || invoker.dataset.filter_value;
       const resultKey = invoker.dataset.resultKey || invoker.dataset.result_key || `${arrayKey}-filtered`;

       if (!filterBy) {
         throw createInvokerError('Array filter command requires a data-filter-by attribute', ErrorSeverity.ERROR, {
           command: '--data:set:array:filter', element: invoker
         });
       }

       let arrayData: any[] = [];
       try {
         const existingData = targetElement.dataset[arrayKey];
         arrayData = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         arrayData = [];
       }

       const filteredData = arrayData.filter(item => {
         const itemValue = item[filterBy];
         if (filterValue === 'true') return itemValue === true;
         if (filterValue === 'false') return itemValue === false;
         return String(itemValue) === filterValue;
       });

       targetElement.dataset[resultKey] = JSON.stringify(filteredData);
     },

     /**
      * `--data:set:new-todo`: Adds a new todo item to the todos array.
      * @example `<form command="--data:set:new-todo" data-bind-to="#form-data" data-bind-as="data:new-todo-json">`
      */
      "--data:set:new-todo": ({ invoker, targetElement }: CommandContext) => {
        // Validate that invoker is a form element
        if (!(invoker instanceof HTMLFormElement)) {
          throw createInvokerError('New todo command must be triggered from a form element', ErrorSeverity.ERROR, {
            command: '--data:set:new-todo', element: invoker,
            recovery: 'Use this command on a <form> element'
          });
        }

        // Get the form data
        const formData = getFormData(invoker);

        // Generate unique ID and add metadata
        const newTodo = {
          id: generateUid(),
          title: formData.title || '',
          description: formData.description || '',
          priority: formData.priority || 'medium',
          tags: formData.tags || '',
          completed: false,
          created: new Date().toLocaleDateString()
        };

       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       todos.push(newTodo);
       targetElement.dataset.todos = JSON.stringify(todos);

       // Dispatch event for UI updates
       targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
     },

     /**
      * `--data:set:filter:status`: Sets the status filter for todos.
      * @example `<select command="--data:set:filter:status" data-bind-to="body" data-bind-as="data:filter-status">`
      */
      "--data:set:filter:status": ({ invoker, targetElement }: CommandContext) => {
        if (!(invoker instanceof HTMLSelectElement)) {
          throw createInvokerError('Filter status command must be triggered from a select element', ErrorSeverity.ERROR, {
            command: '--data:set:filter:status', element: invoker,
            recovery: 'Use this command on a <select> element'
          });
        }
        const filterValue = (invoker as HTMLSelectElement).value;
       targetElement.dataset.filterStatus = filterValue;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('filter-changed', { bubbles: true }));
     },

     /**
      * `--data:set:filter:priority`: Sets the priority filter for todos.
      * @example `<select command="--data:set:filter:priority" data-bind-to="body" data-bind-as="data:filter-priority">`
      */
      "--data:set:filter:priority": ({ invoker, targetElement }: CommandContext) => {
        if (!(invoker instanceof HTMLSelectElement)) {
          throw createInvokerError('Filter priority command must be triggered from a select element', ErrorSeverity.ERROR, {
            command: '--data:set:filter:priority', element: invoker,
            recovery: 'Use this command on a <select> element'
          });
        }
        const filterValue = (invoker as HTMLSelectElement).value;
       targetElement.dataset.filterPriority = filterValue;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('filter-changed', { bubbles: true }));
     },

     /**
      * `--data:set:search`: Sets the search term for todos.
      * @example `<input command="--data:set:search" data-bind-to="body" data-bind-as="data:search-term">`
      */
      "--data:set:search": ({ invoker, targetElement }: CommandContext) => {
        if (!(invoker instanceof HTMLInputElement)) {
          throw createInvokerError('Search command must be triggered from an input element', ErrorSeverity.ERROR, {
            command: '--data:set:search', element: invoker,
            recovery: 'Use this command on an <input> element'
          });
        }
        const searchTerm = (invoker as HTMLInputElement).value;
       targetElement.dataset.searchTerm = searchTerm;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('filter-changed', { bubbles: true }));
     },

     /**
      * `--data:set:sort:by`: Sets the sort field for todos.
      * @example `<select command="--data:set:sort:by" data-bind-to="body" data-bind-as="data:sort-by">`
      */
      "--data:set:sort:by": ({ invoker, targetElement }: CommandContext) => {
        if (!(invoker instanceof HTMLSelectElement)) {
          throw createInvokerError('Sort by command must be triggered from a select element', ErrorSeverity.ERROR, {
            command: '--data:set:sort:by', element: invoker,
            recovery: 'Use this command on a <select> element'
          });
        }
        const sortBy = (invoker as HTMLSelectElement).value;
       targetElement.dataset.sortBy = sortBy;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('filter-changed', { bubbles: true }));
     },

     /**
      * `--data:set:sort:order`: Sets the sort order for todos.
      * @example `<select command="--data:set:sort:order" data-bind-to="body" data-bind-as="data:sort-order">`
      */
      "--data:set:sort:order": ({ invoker, targetElement }: CommandContext) => {
        if (!(invoker instanceof HTMLSelectElement)) {
          throw createInvokerError('Sort order command must be triggered from a select element', ErrorSeverity.ERROR, {
            command: '--data:set:sort:order', element: invoker,
            recovery: 'Use this command on a <select> element'
          });
        }
        const sortOrder = (invoker as HTMLSelectElement).value;
       targetElement.dataset.sortOrder = sortOrder;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('filter-changed', { bubbles: true }));
     },

     /**
      * `--data:set:toggle:{id}`: Toggles the completed status of a todo item.
      * @example `<input command="--data:set:toggle:123" data-bind-to="body" data-bind-as="data:toggle-item">`
      */
     "--data:set:toggle": ({ invoker, targetElement, params }: CommandContext) => {
       const todoId = params[0];
       if (!todoId) {
         throw createInvokerError('Toggle command requires a todo ID parameter', ErrorSeverity.ERROR, {
           command: '--data:set:toggle', element: invoker
         });
       }

       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       const todoIndex = todos.findIndex(t => t.id === todoId);
       if (todoIndex !== -1) {
         todos[todoIndex].completed = !todos[todoIndex].completed;
         targetElement.dataset.todos = JSON.stringify(todos);
         // Dispatch event for UI updates
         targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
       }
     },

     /**
      * `--data:set:edit:{id}`: Sets a todo item into edit mode.
      * @example `<button command="--data:set:edit:123" data-bind-to="body" data-bind-as="data:edit-item">`
      */
     "--data:set:edit": ({ invoker, targetElement, params }: CommandContext) => {
       const todoId = params[0];
       if (!todoId) {
         throw createInvokerError('Edit command requires a todo ID parameter', ErrorSeverity.ERROR, {
           command: '--data:set:edit', element: invoker
         });
       }

       targetElement.dataset.editingId = todoId;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('edit-mode-changed', { bubbles: true }));
     },

     /**
      * `--data:set:delete:{id}`: Deletes a todo item.
      * @example `<button command="--data:set:delete:123" data-bind-to="body" data-bind-as="data:delete-item">`
      */
     "--data:set:delete": ({ invoker, targetElement, params }: CommandContext) => {
       const todoId = params[0];
       if (!todoId) {
         throw createInvokerError('Delete command requires a todo ID parameter', ErrorSeverity.ERROR, {
           command: '--data:set:delete', element: invoker
         });
       }

       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       const filteredTodos = todos.filter(t => t.id !== todoId);
       targetElement.dataset.todos = JSON.stringify(filteredTodos);
       // Dispatch event for UI updates
       targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
     },

     /**
      * `--data:set:cancel-edit:{id}`: Cancels edit mode for a todo item.
      * @example `<button command="--data:set:cancel-edit:123" data-bind-to="body" data-bind-as="data:cancel-edit">`
      */
     "--data:set:cancel-edit": ({ invoker, targetElement, params }: CommandContext) => {
       const todoId = params[0];
       if (!todoId) {
         throw createInvokerError('Cancel edit command requires a todo ID parameter', ErrorSeverity.ERROR, {
           command: '--data:set:cancel-edit', element: invoker
         });
       }

       delete targetElement.dataset.editingId;
       // Trigger re-render
       targetElement.dispatchEvent(new CustomEvent('edit-mode-changed', { bubbles: true }));
     },

     /**
      * `--data:set:save-edit:{id}`: Saves changes to a todo item in edit mode.
      * @example `<button command="--data:set:save-edit:123" data-bind-to="#edit-form" data-bind-as="data:save-edit-json">`
      */
      "--data:set:save-edit": ({ invoker, targetElement, params }: CommandContext) => {
        const todoId = params[0];
        if (!todoId) {
          throw createInvokerError('Save edit command requires a todo ID parameter', ErrorSeverity.ERROR, {
            command: '--data:set:save-edit', element: invoker
          });
        }

        const editForm = document.getElementById(`edit-form-${todoId}`);
        if (!editForm) {
          throw createInvokerError(`Edit form for id ${todoId} not found`, ErrorSeverity.ERROR, {
            command: '--data:set:save-edit', element: invoker
          });
        }

        const updateData = {
          title: editForm.dataset.title || '',
          description: editForm.dataset.description || '',
          priority: editForm.dataset.priority || 'medium'
        };

       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       const todoIndex = todos.findIndex(t => t.id === todoId);
       if (todoIndex !== -1) {
         todos[todoIndex] = { ...todos[todoIndex], ...updateData };
         targetElement.dataset.todos = JSON.stringify(todos);
         delete targetElement.dataset.editingId;
         // Dispatch event for UI updates
         targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
       }
      },

      /**
       * `--data:set:bulk-action:complete-all`: Marks all pending todos as completed.
      * @example `<button command="--data:set:bulk-action:complete-all" data-bind-to="body" data-bind-as="data:bulk-action">`
      */
     "--data:set:bulk-action:complete-all": ({ targetElement }: CommandContext) => {
       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       const updatedTodos = todos.map(todo =>
         todo.completed ? todo : { ...todo, completed: true }
       );

       targetElement.dataset.todos = JSON.stringify(updatedTodos);
       // Dispatch event for UI updates
       targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
     },

     /**
      * `--data:set:bulk-action:clear-completed`: Removes all completed todos.
      * @example `<button command="--data:set:bulk-action:clear-completed" data-bind-to="body" data-bind-as="data:bulk-action">`
      */
     "--data:set:bulk-action:clear-completed": ({ targetElement }: CommandContext) => {
       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       const filteredTodos = todos.filter(todo => !todo.completed);
       targetElement.dataset.todos = JSON.stringify(filteredTodos);
       // Dispatch event for UI updates
       targetElement.dispatchEvent(new CustomEvent('todo-updated', { bubbles: true }));
     },

     /**
      * `--data:set:bulk-action:export`: Exports todos as JSON.
      * @example `<button command="--data:set:bulk-action:export" data-bind-to="body" data-bind-as="data:bulk-action">`
      */
     "--data:set:bulk-action:export": ({ targetElement }: CommandContext) => {
       let todos: any[] = [];
       try {
         const existingData = targetElement.dataset.todos;
         todos = existingData ? JSON.parse(existingData) : [];
       } catch (e) {
         todos = [];
       }

       const dataStr = JSON.stringify(todos, null, 2);
       const dataBlob = new Blob([dataStr], { type: 'application/json' });
       const url = URL.createObjectURL(dataBlob);

       const link = document.createElement('a');
       link.href = url;
       link.download = `todos-${new Date().toISOString().split('T')[0]}.json`;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
     },



     /**
      * `--cookie:set`: Sets a browser cookie.
      * @example `<button command="--cookie:set:theme:dark" data-cookie-expires="365">Set Dark Theme</button>`
      */
    "--cookie:set": ({ invoker, params }: CommandContext) => {
      const key = params[0];
      const value = params[1];
      if (!key) {
        throw createInvokerError('Cookie set command requires a key parameter', ErrorSeverity.ERROR, {
          command: '--cookie:set', element: invoker
        });
      }

      let cookieString = `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`;
      const expires = invoker.dataset.cookieExpires;
      if (expires) {
        const days = parseInt(expires, 10);
        if (!isNaN(days)) {
          const date = new Date();
          date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
          cookieString += `; expires=${date.toUTCString()}`;
        }
      }
      cookieString += '; path=/';
      document.cookie = cookieString;
    },

    /**
     * `--cookie:get`: Gets a cookie value and sets it on the target element.
     * @example `<button command="--cookie:get:theme" commandfor="#theme-display">Show Theme</button>`
     */
    "--cookie:get": ({ targetElement, params }: CommandContext) => {
      const key = params[0];
      if (!key) {
        throw createInvokerError('Cookie get command requires a key parameter', ErrorSeverity.ERROR, {
          command: '--cookie:get', element: targetElement
        });
      }

      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieKey, cookieValue] = cookie.trim().split('=');
        if (decodeURIComponent(cookieKey) === key) {
          targetElement.textContent = decodeURIComponent(cookieValue || '');
          return;
        }
      }
      targetElement.textContent = ''; // Not found
    },

    /**
     * `--cookie:remove`: Removes a browser cookie.
     * @example `<button command="--cookie:remove:theme">Clear Theme</button>`
     */
    "--cookie:remove": ({ params }: CommandContext) => {
      const key = params[0];
      if (!key) {
        throw createInvokerError('Cookie remove command requires a key parameter', ErrorSeverity.ERROR, {
          command: '--cookie:remove'
        });
      }

      document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    },

    /**
     * `--command:trigger`: Triggers an event on another element.
     * @example `<button command="--command:trigger:click" commandfor="#save-btn" data-and-then="--command:trigger:click" data-then-target="#close-btn">Save and Close</button>`
     */
    "--command:trigger": ({ targetElement, params }: CommandContext) => {
      const eventType = params[0] || 'click';
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      targetElement.dispatchEvent(event);
    },

    /**
     * `--command:delay`: Waits for a specified number of milliseconds.
     * @example `<button command="--text:set:Saved!" commandfor="#status" data-and-then="--command:delay:2000" data-then-target="#status">Save</button>`
     */
    "--command:delay": ({ params }: CommandContext) => {
      const delay = parseInt(params[0], 10);
      if (isNaN(delay) || delay < 0) {
        throw createInvokerError('Delay command requires a valid positive number of milliseconds', ErrorSeverity.ERROR, {
          command: '--command:delay'
        });
      }
      return new Promise(resolve => setTimeout(resolve, delay));
    },

    /**
     * `--on:interval`: Executes a command repeatedly at a given interval.
     * The interval is cleared when the element is removed from the DOM.
     * @example `<div command-on="load" command="--on:interval:10000" commandfor="#live-data" data-interval-command="--fetch:get" data-url="/api/latest-stats">Loading...</div>`
     */
    "--on:interval": ({ invoker, targetElement, params }: CommandContext) => {
      const intervalMs = parseInt(params[0], 10);
      if (isNaN(intervalMs) || intervalMs <= 0) {
        throw createInvokerError('Interval command requires a valid positive interval in milliseconds', ErrorSeverity.ERROR, {
          command: '--on:interval', element: invoker
        });
      }

      const intervalCommand = invoker.dataset.intervalCommand;
      if (!intervalCommand) {
        throw createInvokerError('Interval command requires data-interval-command attribute', ErrorSeverity.ERROR, {
          command: '--on:interval', element: invoker
        });
      }

      // Clear any existing interval
      const existingIntervalId = (invoker as any)._invokerIntervalId;
      if (existingIntervalId) {
        clearInterval(existingIntervalId);
      }

      // Set up new interval
      const intervalId = setInterval(() => {
        const targetId = targetElement.id || `__invoker-target-${Date.now()}`;
        if (!targetElement.id) targetElement.id = targetId;
        InvokerManager.getInstance().executeCommand(intervalCommand, targetId, invoker);
      }, intervalMs);

      // Store the interval ID
      (invoker as any)._invokerIntervalId = intervalId;

      // Clear interval when element is removed
      const observer = new MutationObserver(() => {
        if (!document.contains(invoker)) {
          clearInterval(intervalId);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * `--bind`: Creates a one-way data binding from the target element to another element.
     * @example `<input command-on="input" command="--bind:value" commandfor="#input" data-bind-to="#output" data-bind-as="text">`
     */
     "--bind": ({ invoker, targetElement, params }: CommandContext) => {
       const sourceProperty = params.join(':');
       if (!sourceProperty) {
         throw createInvokerError('Bind command requires a source property (e.g., value, text, data:name)', ErrorSeverity.ERROR, {
           command: '--bind', element: invoker
         });
       }

       // Get the source value (prefer invoker if it has the property, otherwise targetElement)
       let sourceValue: any;
       const sourceElement = (sourceProperty === 'value' && (invoker instanceof HTMLInputElement || invoker instanceof HTMLTextAreaElement || invoker instanceof HTMLSelectElement)) ? invoker : targetElement;

      if (sourceProperty === 'value' && (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement || sourceElement instanceof HTMLSelectElement)) {
        sourceValue = sourceElement.value;
      } else if (sourceProperty === 'text') {
        sourceValue = sourceElement.textContent;
      } else if (sourceProperty === 'html') {
        sourceValue = sourceElement.innerHTML;
      } else if (sourceProperty.startsWith('attr:')) {
        const attrName = sourceProperty.substring(5);
        sourceValue = sourceElement.getAttribute(attrName);
      } else if (sourceProperty.startsWith('data:')) {
        const dataName = sourceProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        sourceValue = sourceElement.dataset[dataName];
      } else {
        throw createInvokerError(`Invalid source property for --bind: "${sourceProperty}"`, ErrorSeverity.ERROR, {
          command: '--bind', element: invoker
        });
      }

      // Find the destination (either data-bind-to or the targetElement)
      const destinationSelector = invoker.dataset.bindTo;
      const destinations = destinationSelector
        ? resolveTargets(destinationSelector, invoker) as HTMLElement[]
        : [targetElement];

      // Apply to destinations
      const destinationProperty = invoker.dataset.bindAs || 'text';

      destinations.forEach(dest => {
        if (destinationProperty === 'value' && (dest instanceof HTMLInputElement || dest instanceof HTMLTextAreaElement || dest instanceof HTMLSelectElement)) {
          (dest as HTMLInputElement).value = sourceValue || '';
        } else if (destinationProperty === 'text') {
          dest.textContent = sourceValue || '';
        } else if (destinationProperty === 'html') {
          dest.innerHTML = sanitizeHTML(sourceValue || '');
        } else if (destinationProperty.startsWith('attr:')) {
          const attrName = destinationProperty.substring(5);
          if (sourceValue === null || sourceValue === undefined) {
            dest.removeAttribute(attrName);
          } else {
            dest.setAttribute(attrName, sourceValue);
          }
        } else if (destinationProperty.startsWith('data:')) {
          const dataName = destinationProperty.substring(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          if (sourceValue === null || sourceValue === undefined) {
            delete dest.dataset[dataName];
          } else {
            dest.dataset[dataName] = sourceValue;
          }
         } else if (destinationProperty === 'class:add') {
           if (sourceValue) dest.classList.add(sourceValue);
         } else if (destinationProperty === 'class:remove') {
           if (sourceValue) dest.classList.remove(sourceValue);
         }
       });
     },
  
  /**
   * `--text:copy`: Copies the `textContent` from one element to another.
   * The source element is specified via a CSS selector in `data-copy-from` on the invoker.
   * If `data-copy-from` is omitted, it copies the invoker's own `textContent`.
   */
   "--text:copy": (context: CommandContext) => {
       const { invoker, targetElement } = context;
       const sourceSelector = invoker.dataset.copyFrom;
       let sourceElement: HTMLElement | null = invoker;

       if (sourceSelector) {
           sourceElement = document.querySelector(sourceSelector);
           if (!sourceElement) {
               throw createInvokerError(`Source element with selector "${sourceSelector}" not found`, ErrorSeverity.ERROR, {
                   command: '--text:copy', element: invoker
               });
           }
       }

       const textToCopy = (sourceElement instanceof HTMLInputElement || sourceElement instanceof HTMLTextAreaElement)
           ? sourceElement.value
           : sourceElement.textContent || '';

       targetElement.textContent = textToCopy;
   },



   /**
    * `--attr:set`: Sets an attribute on the target element.
    * @example `<button command="--attr:set:disabled:true" commandfor="button">Disable</button>`
    */
   "--attr:set": ({ targetElement, params }: CommandContext) => {
       const attr = params[0];
       const value = params.slice(1).join(':');
       targetElement.setAttribute(attr, value);
   },

   /**
    * `--attr:remove`: Removes an attribute from the target element.
    * @example `<button command="--attr:remove:hidden" commandfor="toast">Show</button>`
    */
   "--attr:remove": ({ targetElement, params }: CommandContext) => {
       const attr = params[0];
       targetElement.removeAttribute(attr);
   },


  // --- Fetch and Navigation Commands ---

  /**
   * `--fetch:get`: Performs a GET request and swaps the response HTML into the target.
   * Supports loading/error states via templates.
   *
   * @example
   * ```html
   * <button type="button"
   *   command="--fetch:get"
   *   data-url="/api/content"
   *   commandfor="content-area"
   *   data-loading-template="spinner-template"
   *   data-after-error="--class:add:load-error"
   * >
   *   Load Content
   * </button>
   * ```
   */
  "--fetch:get": async ({ invoker, targetElement }: CommandContext) => {
    let url = invoker.dataset.url;
    if (!url) {
      throw createInvokerError('Fetch GET command requires a data-url attribute', ErrorSeverity.ERROR, {
        command: '--fetch:get', element: invoker, recovery: 'Add data-url="/your/endpoint" to the button.'
      });
    }

    // Interpolate the URL
    const context = {
      this: {
        ...invoker,
        value: (invoker as any).value || '',
      },
      event: (invoker as any).triggeringEvent,
    };
    url = interpolateString(url, context);

    // Dispatch fetch:before event for interceptors
    const fetchEvent = new CustomEvent('fetch:before', { detail: { url, invoker }, cancelable: true });
    window.dispatchEvent(fetchEvent);
    if (fetchEvent.defaultPrevented) {
      // Fetch was intercepted, skip actual fetch
      setBusyState(invoker, false);
      return;
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, targetElement, "data-loading-template");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: "GET", headers: { Accept: "text/html", ...getHeadersFromAttributes(invoker) }, signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw createInvokerError(`HTTP Error: ${response.status} ${response.statusText}`, ErrorSeverity.ERROR, {
          command: '--fetch:get', element: invoker, context: { url, status: response.status }
        });
      }

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => targetElement.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, targetElement, "data-error-template");
      // Re-throw the error (either the one we created or a new wrapped one)
      // to allow the core manager to handle it for conditional chaining.
      if (error instanceof Error && 'severity' in error) throw error;
      throw createInvokerError('Fetch GET failed', ErrorSeverity.ERROR, {
        command: '--fetch:get', element: invoker, cause: error as Error, context: { url },
        recovery: 'Check the URL, network connection, and server response.'
      });
    } finally {
      setBusyState(invoker, false);
    }
  },

  /**
   * `--fetch:send`: Submits the target `<form>` via a POST/PUT/DELETE request.
   * The response is swapped into the element from `data-response-target`, or the form itself.
   *
   * @example
   * ```html
   * <form id="my-form" action="/api/submit" method="post"></form>
   * <button type="button"
   *   command="--fetch:send"
   *   commandfor="my-form"
   *   data-response-target="#response-area"
   * >
   *   Submit via Fetch
   * </button>
   * ```
   */
  "--fetch:send": async ({ invoker, targetElement }: CommandContext) => {
    const validationErrors = validateElement(targetElement, { tagName: ['form'] });
    if (validationErrors.length > 0) {
      throw createInvokerError(`Fetch send failed: ${validationErrors.join(', ')}`, ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker, recovery: 'Ensure commandfor points to a <form> element.'
      });
    }
    const form = targetElement as HTMLFormElement;

    const responseSelector = invoker.dataset.responseTarget;
    const responseTarget = responseSelector ? document.querySelector<HTMLElement>(responseSelector) : form;
    if (!responseTarget) {
      throw createInvokerError(`Response target "${responseSelector}" not found`, ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker
      });
    }

    setBusyState(invoker, true);
    showFeedbackState(invoker, responseTarget, "data-loading-template");

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST", body: new FormData(form), headers: getHeadersFromAttributes(invoker),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const html = await response.text();
      const newContent = parseHTML(html);
      const updateDOM = () => responseTarget.replaceChildren(newContent);
      await (document.startViewTransition ? document.startViewTransition(updateDOM).finished : Promise.resolve(updateDOM()));
    } catch (error) {
      showFeedbackState(invoker, responseTarget, "data-error-template");
      throw createInvokerError('Fetch send failed', ErrorSeverity.ERROR, {
        command: '--fetch:send', element: invoker, cause: error as Error,
        recovery: 'Check the form action, network connection, and server response.'
      });
    } finally {
      setBusyState(invoker, false);
    }
  },



  /**
   * `--navigate:to`: Navigates to a new URL using the History API.
   *
   * @example
   * ```html
   * <button type="button" command="--navigate:to:/about">Go to About Page</button>
   * ```
   */
  "--navigate:to": (context: CommandContext) => {
    const url = context.params.join(':'); // Rejoin params in case URL contains colons
    if (!url) {
      throw createInvokerError('Navigate command requires a URL parameter', ErrorSeverity.ERROR, {
        command: '--navigate:to', element: context.invoker, recovery: 'Use format: --navigate:to:/your/path'
      });
    }

    if (window.history?.pushState) {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    } else {
      window.location.href = url;
    }
  },

  /**
   * `--emit`: Dispatches custom events for advanced interactions.
   * The first parameter is the event type, remaining parameters form the event detail.
   *
   * @example
   * ```html
   * <button type="button" command="--emit:user-action:save-form">
   *   Emit Save Event
   * </button>
   * ```
   */
  "--emit": ({ params, targetElement }: CommandContext) => {
    const [eventType, ...detailParts] = params;
    if (!eventType) {
      throw createInvokerError('Emit command requires an event type parameter', ErrorSeverity.ERROR, {
        command: '--emit', recovery: 'Use format: --emit:event-type or --emit:event-type:detail'
      });
    }

    let detail = detailParts.length > 0 ? detailParts.join(':') : undefined;
    // Try to parse as JSON if it looks like JSON
    if (typeof detail === 'string' && (detail.startsWith('{') || detail.startsWith('['))) {
      try {
        detail = JSON.parse(detail);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }
    const event = new CustomEvent(eventType, {
      bubbles: true,
      composed: true,
      detail
    });

    // Dispatch to targetElement if available, otherwise to document.body
    (targetElement || document.body).dispatchEvent(event);
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
   },

  // --- Template Commands ---




};

/**
 * Registers commands from this module with the global `Invoker` instance.
 * This function is now simpler and more robust, ensuring all commands are found.
 *
 * @param specificCommands An optional array of command names to register. If omitted, all commands are registered.
 * @example
 * registerAll(); // Registers all commands
 * registerAll(['--media:toggle', '--scroll:to']); // Registers specific commands
 */
export function registerAll(specificCommands?: string[]): void {
  if (!window.Invoker?.register) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugError("Invokers: Core library not found. Ensure it is loaded before the commands module.");
    }
    return;
  }
  const commandsToRegister = specificCommands || Object.keys(commands);

  for (const name of commandsToRegister) {
    // Normalize the name the user might have passed in (e.g., 'dom:swap' vs '--dom:swap')
    const normalizedName = name.startsWith('--') ? name : `--${name}`;

    if (commands[normalizedName]) {
      // Always pass the key from our `commands` object and its callback.
      // The core `register` method will handle everything else.
      window.Invoker.register!(normalizedName, commands[normalizedName]);
    } else {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(`Invokers: Command "${name}" was requested but not found in the commands module. Skipping registration.`);
      }
    }
  }
}

// --- Private Helper Functions ---

function getSourceNode(invoker: HTMLButtonElement, commandName: string): DocumentFragment {
  const templateId = invoker.dataset.templateId;
  if (templateId) {
    const template = document.getElementById(templateId);
    if (!(template instanceof HTMLTemplateElement)) {
      throw createInvokerError(`Source <template> with ID "${templateId}" not found`, ErrorSeverity.ERROR, {
        command: `--dom:${commandName}`, element: invoker
      });
    }
    return template.content;
  }
  throw createInvokerError(`DOM command --dom:${commandName} requires a data-template-id attribute`, ErrorSeverity.ERROR, {
    command: `--dom:${commandName}`, element: invoker
  });
}

function setBusyState(invoker: HTMLButtonElement, isBusy: boolean): void {
  invoker.toggleAttribute("disabled", isBusy);
  invoker.setAttribute("aria-busy", String(isBusy));
}

function showFeedbackState(invoker: HTMLButtonElement, target: HTMLElement, templateAttr: "data-loading-template" | "data-error-template"): void {
  const templateKey = templateAttr.replace('data-', '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const templateId = invoker.dataset[templateKey];

  if (!templateId || !target) return;

  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) {
    // This is a non-critical warning, so we log instead of throwing.
    const error = createInvokerError(`Feedback template "#${templateId}" not found or is not a <template>`, ErrorSeverity.WARNING, { element: invoker });
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugError(error);
    }
    return;
  }

  target.replaceChildren(template.content.cloneNode(true));
}

function getFormData(form: HTMLFormElement): Record<string, string> {
  const data: Record<string, string> = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    data[key] = value as string;
  }
  return data;
}



function parseHTML(html: string): DocumentFragment {
  const sanitizedHTML = sanitizeHTML(html);
  const doc = new DOMParser().parseFromString(sanitizedHTML, "text/html");
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(doc.body.childNodes));
  return fragment;
}

/**
 * Processes a template fragment with data injection and contextual selector rewriting.
 * This is used by DOM commands when advanced templating features are enabled.
 */
function processTemplateFragment(fragment: DocumentFragment, invoker: HTMLButtonElement): DocumentFragment {
  const jsonData = invoker.dataset.withJson;
  if (!jsonData) return fragment; // If no data, return the raw fragment

  // Interpolate the JSON string itself first, to resolve {{...}} and {{__uid}}
  const textInput = document.getElementById('text-input') as HTMLInputElement | null;
  const context = {
    this: {
      ...invoker,
      value: textInput?.value || '',
    },
    event: (invoker as any).triggeringEvent,
  };

  let interpolatedJson: string;
  try {
    interpolatedJson = interpolateString(jsonData, context);
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugError("Invokers: Failed to interpolate data-with-json:", error);
    }
    return fragment; // Return raw fragment on interpolation error
  }

  let dataContext: Record<string, any>;
  try {
    dataContext = JSON.parse(interpolatedJson);
  } catch (error) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugError("Invokers: Invalid JSON in data-with-json attribute:", error);
    }
    return fragment; // Return raw fragment on JSON parse error
  }

  // 1. Inject data into the template clone
  // Process data-tpl-text attributes
  fragment.querySelectorAll('[data-tpl-text]').forEach(el => {
    const key = el.getAttribute('data-tpl-text');
    if (key && dataContext.hasOwnProperty(key)) {
      const value = String(dataContext[key]);
      if (el.children.length === 0) {
        el.textContent = value;
      } else {
        // Insert the text as the first child
        const textNode = document.createTextNode(value);
        el.insertBefore(textNode, el.firstChild);
      }
    }
  });

  // Process data-tpl-attr attributes (format: data-tpl-attr="id:id,class:cssClass")
  fragment.querySelectorAll('[data-tpl-attr]').forEach(el => {
    const attrMapping = el.getAttribute('data-tpl-attr');
    if (attrMapping) {
      attrMapping.split(',').forEach(mapping => {
        const [attrName, key] = mapping.split(':').map(s => s.trim());
        if (attrName && key && dataContext.hasOwnProperty(key)) {
          el.setAttribute(attrName, String(dataContext[key]));
        }
      });
    }
  });

  // Process data-tpl-value attributes
  fragment.querySelectorAll('[data-tpl-value]').forEach(el => {
    const key = el.getAttribute('data-tpl-value');
    if (key && dataContext.hasOwnProperty(key) && 'value' in el) {
      (el as HTMLInputElement).value = String(dataContext[key]);
    }
  });

  // 2. Resolve contextual `commandfor` selectors within the fragment
  // This is the crucial wiring step for advanced selectors
  const firstElement = fragment.firstElementChild as HTMLElement;
  if (firstElement?.id) {
    // Rewrite @closest selectors to use the newly-set unique ID
    fragment.querySelectorAll('[commandfor^="@"]').forEach(childInvoker => {
      const originalSelector = childInvoker.getAttribute('commandfor');
      if (originalSelector?.startsWith('@closest(')) {
        // Extract the inner selector from @closest(selector)
        const match = originalSelector.match(/^@closest\(([^)]+)\)$/);
        if (match) {
          const innerSelector = match[1];
          // Check if the inner selector matches the first element
          if (firstElement.matches(innerSelector)) {
            childInvoker.setAttribute('commandfor', firstElement.id);
          }
        }
      }
      // Add logic for other @ selectors if needed
    });
  }

  return fragment;
}

function getHeadersFromAttributes(invoker: HTMLButtonElement): HeadersInit {
  const headers: Record<string, string> = {};
  for (const attr in invoker.dataset) {
    if (attr.startsWith("header")) {
      const headerName = attr.substring(6).replace(/([A-Z])/g, "-$1").toLowerCase();
      if (headerName) headers[headerName] = invoker.dataset[attr]!;
    }
  }
  return headers;
}



// --- Template Processing with Data ---

/**
 * Processes a template fragment with data interpolation and binding
 */
function processTemplateWithData(fragment: DocumentFragment, context: Record<string, any>): DocumentFragment {
  // Process interpolation in text content and attributes
  processInterpolation(fragment, context);

  // Process data-bind attributes
  processDataBindings(fragment);

  return fragment;
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
              debugWarn('Invokers: Interpolation error in template:', error);
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
            debugWarn('Invokers: Attribute interpolation error:', error);
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
        debugWarn('Invokers: Data binding error:', error);
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
      element.id = `invoker-${generateUid()}`;
    }
  }
}
