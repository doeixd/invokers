/**
 * @file interest-invokers.ts
 * @summary Interest Invokers polyfill and TypeScript support for the Invokers library
 * @description
 * This module provides comprehensive support for Interest Invokers as specified in:
 * https://open-ui.org/components/interest-invokers.explainer/
 * 
 * Based on the official polyfill by Mason Freed with TypeScript adaptation
 * and integration with the existing Invokers library patterns.
 * 
 * @author Mason Freed (original polyfill), Patrick Glenn (TypeScript adaptation)
 * @license MIT / BSD (compatible with original polyfill license)
 */

import { debugLog, debugWarn, debugError } from './utils';
// --- TypeScript Interfaces and Types ---

/**
 * Represents an InterestEvent as defined in the Interest Invokers specification
 */
export interface InterestEventInit extends EventInit {
  source?: Element;
}

export interface InterestEvent extends Event {
  readonly source: Element | null;
}

export interface InterestInvokerElement {
  interestForElement: Element | null;
}

// Global type declarations
declare global {
  interface InterestEventInit extends EventInit {
    source?: Element;
  }
  
  interface InterestEvent extends Event {
    readonly source: Element | null;
  }

  interface HTMLButtonElement extends InterestInvokerElement {}
  interface HTMLAnchorElement extends InterestInvokerElement {}
  interface HTMLAreaElement extends InterestInvokerElement {}
  
  // SVG support
  interface SVGAElement extends InterestInvokerElement {}

  interface Window {
    interestForPolyfillInstalled?: boolean;
    interestForUsePolyfillAlways?: boolean;
  }
}

// --- Interest Invokers Polyfill Implementation ---

/**
 * Feature detection function to check if Interest Invokers are natively supported
 */
export function isInterestInvokersSupported(): boolean {
  // Check for native support by looking for the actual descriptor, not just TypeScript declarations
  try {
    if (typeof HTMLButtonElement === "undefined") return false;
    
    const descriptor = Object.getOwnPropertyDescriptor(HTMLButtonElement.prototype, 'interestForElement');
    // Only consider it native support if there's an actual getter/setter implementation
    return descriptor !== undefined && 
           (typeof descriptor.get === 'function' || typeof descriptor.set === 'function');
  } catch {
    return false;
  }
}

/**
 * Main Interest Invokers polyfill class
 * Adapted from Mason Freed's official polyfill with TypeScript support
 */
class InterestInvokersPolyfill {
  private static instance: InterestInvokersPolyfill | null = null;
  private initialized = false;

  // Constants
  private readonly attributeName = "interestfor";
  private readonly interestEventName = "interest";
  private readonly loseInterestEventName = "loseinterest";
  private readonly interestDelayStartProp = "--interest-delay-start";
  private readonly interestDelayEndProp = "--interest-delay-end";
  private readonly interestDelayProp = "--interest-delay";
  private readonly dataField = "__interestForData";
  private readonly targetDataField = "__interestForTargetData";

  // State tracking
  private readonly invokersWithInterest = new Set<HTMLElement>();
  private touchInProgress = false;

  // State enum
  private readonly InterestState = {
    NoInterest: "none",
    FullInterest: "full",
  } as const;

  // Source enum
  private readonly Source = {
    Hover: "hover",
    DeHover: "dehover",
    Focus: "focus",
    Blur: "blur",
    Touch: "touch",
  } as const;

  private constructor() {}

  static getInstance(): InterestInvokersPolyfill {
    if (!InterestInvokersPolyfill.instance) {
      InterestInvokersPolyfill.instance = new InterestInvokersPolyfill();
    }
    return InterestInvokersPolyfill.instance;
  }

  /**
   * Initialize the Interest Invokers polyfill
   */
  public apply(): void {
     if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
       debugLog('Interest Invokers: apply() called, readyState:', document.readyState);
     }

    // Feature detection and early return
    if (window.interestForPolyfillInstalled) {
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog('Interest Invokers: already installed, skipping');
       }
      return;
    }
    const nativeSupported = isInterestInvokersSupported();

     if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
       debugLog(`Interest Invokers: native support detected: ${nativeSupported}`);
     }

    if (nativeSupported && !window.interestForUsePolyfillAlways) {
       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog('Interest Invokers: native support available, not applying polyfill');
       }
      return;
    }

    if (nativeSupported) {
      this.disableNativeSupport();
    }

    this.setupPolyfill();
    this.initialized = true;
    window.interestForPolyfillInstalled = true;

     if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
       debugLog(`Interest Invokers polyfill installed successfully.`);
     }
  }

  /**
   * Disable native support if present to allow polyfill to take effect
   */
  private disableNativeSupport(): void {
    const cancel = (e: Event) => {
      if (e.isTrusted) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    document.body.addEventListener(this.interestEventName, cancel, { capture: true });
    document.body.addEventListener(this.loseInterestEventName, cancel, { capture: true });
  }

   /**
    * Setup the complete polyfill
    */
   private setupPolyfill(): void {
     this.registerCustomProperties();
     this.addEventHandlers();
     this.setupElementMixins();
     this.setupInitialAccessibility();
   }

  /**
   * Register CSS custom properties for interest delays
   */
  private registerCustomProperties(): void {
    const style = document.createElement("style");
    style.textContent = `
      @property ${this.interestDelayStartProp} {
        syntax: "normal | <time>";
        inherits: false;
        initial-value: normal;
      }
      @property ${this.interestDelayEndProp} {
        syntax: "normal | <time>";
        inherits: false;
        initial-value: normal;
      }
      @property ${this.interestDelayProp} {
        syntax: "[ normal | <time> ]{1,2}";
        inherits: false;
        initial-value: normal;
      }
    `;
    document.head.appendChild(style);
    (document as any)[this.dataField] = { globalPropsStyle: style };
  }

  /**
   * Setup element mixins for supported elements
   */
  private setupElementMixins(): void {
    // Button support
    this.applyInterestInvokerMixin(HTMLButtonElement);

    // Anchor support
    this.applyInterestInvokerMixin(HTMLAnchorElement);

    // Area support
    this.applyInterestInvokerMixin(HTMLAreaElement);

    // Code elements (for documentation tooltips)
    this.applyInterestInvokerMixin(HTMLElement); // Generic HTMLElement support for any element with interestfor

    // SVG Anchor support (if available)
    if (typeof SVGAElement !== 'undefined') {
      this.applyInterestInvokerMixin(SVGAElement as any);
    }
  }

   /**
    * Apply the interestForElement property to supported elements
    */
   private applyInterestInvokerMixin(ElementClass: any): void {
     Object.defineProperty(ElementClass.prototype, 'interestForElement', {
       enumerable: true,
       configurable: true,
       get(this: HTMLElement): Element | null {
         const id = this.getAttribute('interestfor');
         return id ? document.getElementById(id) : null;
       },
       set(this: HTMLElement, value: Element | null) {
         if (value === null) {
           this.removeAttribute('interestfor');
         } else if (value && typeof value === 'object' && 'id' in value) {
           this.setAttribute('interestfor', value.id || '');
         } else {
           throw new TypeError('interestForElement must be an element or null');
         }
       }
     });
   }

   /**
    * Setup initial accessibility attributes for all interest invokers on the page
    */
   private setupInitialAccessibility(): void {
     // Run synchronously to ensure accessibility is set up immediately
     const selectors = [
       'button[interestfor]',
       'a[interestfor]',
       'area[interestfor]',
       '[interestfor]' // Generic elements
     ];

     const invokers = document.querySelectorAll(selectors.join(', '));
     invokers.forEach(invoker => {
       const target = this.getInterestForTarget(invoker as HTMLElement);
       if (target) {
         this.setupAccessibility(invoker as HTMLElement, target);
       }
     });
   }

  /**
   * Add all event handlers for interest detection
   */
  private addEventHandlers(): void {
    // Mouse events
    document.body.addEventListener("mouseover", (e) => 
      this.handleInterestHoverOrFocus(e.target as HTMLElement, this.Source.Hover)
    );
    document.body.addEventListener("mouseout", (e) => 
      this.handleInterestHoverOrFocus(e.target as HTMLElement, this.Source.DeHover)
    );

    // Keyboard events
    document.body.addEventListener("focusin", (e) => 
      this.handleInterestHoverOrFocus(e.target as HTMLElement, this.Source.Focus)
    );
    document.body.addEventListener("focusout", (e) => 
      this.handleInterestHoverOrFocus(e.target as HTMLElement, this.Source.Blur)
    );

    // Escape key to clear all interest
    document.body.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.invokersWithInterest.forEach((invoker) => {
          this.clearState(invoker);
        });
      }
    });

    // Touch events
    this.setupTouchHandlers();
  }

  /**
   * Setup touch event handlers for long press support
   */
  private setupTouchHandlers(): void {
    const longPressTime = 500;

    document.body.addEventListener("touchstart", (e) => {
      this.touchInProgress = true;
      const invoker = (e.target as HTMLElement).closest("button[interestfor]") as HTMLElement;
      if (invoker) {
        this.initializeDataField(invoker);
        const data = (invoker as any)[this.dataField];
        data.longPressTimer = setTimeout(() => {
          this.gainOrLoseInterest(
            invoker, 
            this.getInterestForTarget(invoker), 
            this.InterestState.FullInterest
          );
          data.longPressTimer = null;
        }, longPressTime);
      }
    });

    const cancelLongPress = (e: Event) => {
      const invoker = (e.target as HTMLElement).closest("button[interestfor]") as HTMLElement;
      if (invoker) {
        const data = (invoker as any)[this.dataField];
        if (data?.longPressTimer) {
          clearTimeout(data.longPressTimer);
          data.longPressTimer = null;
        }
      }
    };

    document.body.addEventListener("touchend", (e) => {
      cancelLongPress(e);
      this.touchInProgress = false;
    });
    document.body.addEventListener("touchmove", cancelLongPress);
  }

  /**
   * Handle interest changes from hover or focus events
   */
  private handleInterestHoverOrFocus(
    el: HTMLElement, 
    source: string
  ): void {
    if (this.touchInProgress) return;
    if (!el.isConnected) return;

    const target = this.getInterestForTarget(el);
    if (!target) {
      this.handleUpstreamInterest(el, source);
      return;
    }

    // Safety check: don't interfere if element is disabled
    if (el instanceof HTMLButtonElement && el.disabled) {
      return;
    }

    this.initializeDataField(el);
    const data = (el as any)[this.dataField];
    const upstreamInvoker = this.getInterestInvoker(el);

    if (source === this.Source.Hover || source === this.Source.Focus) {
      data.clearLostTask?.();
      (upstreamInvoker as any)?.[this.dataField]?.clearLostTask?.();
      this.scheduleInterestGainedTask(el, this.InterestState.FullInterest);
    } else {
      data.clearGainedTask?.();
      if (data.state !== this.InterestState.NoInterest) {
        this.scheduleInterestLostTask(el);
      }
      if (upstreamInvoker) {
        (upstreamInvoker as any)[this.dataField]?.clearGainedTask?.();
        if (source === this.Source.Blur || !el.matches(":hover")) {
          this.scheduleInterestLostTask(upstreamInvoker);
        }
      }
    }
  }

  /**
   * Handle upstream interest for elements without direct targets
   */
  private handleUpstreamInterest(el: HTMLElement, source: string): void {
    const containingTarget = el.closest(".interest-target") as HTMLElement;
    if (containingTarget) {
      const upstreamInvoker = this.getInterestInvoker(containingTarget);
      if (upstreamInvoker) {
        const data = (upstreamInvoker as any)[this.dataField];
        if (source === this.Source.Hover || source === this.Source.Focus) {
          data?.clearLostTask?.();
        } else {
          if (source === this.Source.Blur || !el.matches(":hover")) {
            this.scheduleInterestLostTask(upstreamInvoker);
          }
        }
      }
    }
  }

  /**
   * Gain or lose interest in an element
   */
  private gainOrLoseInterest(
    invoker: HTMLElement, 
    target: HTMLElement | null, 
    newState: string
  ): boolean {
    if (!invoker || !target) return false;

    if (!invoker.isConnected || 
        this.getInterestForTarget(invoker) !== target ||
        (newState === this.InterestState.NoInterest && 
         this.getInterestInvoker(target) !== invoker)) {
      return false;
    }

    if (newState !== this.InterestState.NoInterest) {
      const existing = this.getInterestInvoker(target);
      if (existing) {
        if (existing === invoker) {
          (existing as any)[this.dataField]?.clearLostTask?.();
          return false;
        } else {
          if (!this.gainOrLoseInterest(existing, target, this.InterestState.NoInterest)) {
            return false;
          }
          if (!invoker.isConnected || this.getInterestForTarget(invoker) !== target) {
            return false;
          }
        }
      }
      return this.applyState(invoker, newState);
    }

    this.clearState(invoker);
    return true;
  }

  /**
   * Apply interest state to an invoker
   */
  private applyState(invoker: HTMLElement, newState: string): boolean {
    const data = (invoker as any)[this.dataField];
    const target = this.getInterestForTarget(invoker);
    if (!target) return false;

    switch (newState) {
      case this.InterestState.FullInterest:
        if (data.state !== this.InterestState.NoInterest) {
          throw new Error("Invalid state");
        }

        // Dispatch interest event
        const interestEvent = new CustomEvent(this.interestEventName, {
          bubbles: true, // Allow bubbling for integration with command system
          cancelable: true
        });
        Object.defineProperty(interestEvent, 'source', { 
          value: invoker, 
          writable: false 
        });
        target.dispatchEvent(interestEvent);
        
        // Also dispatch on the invoker for potential command chaining
        invoker.dispatchEvent(new CustomEvent('interest:shown', {
          bubbles: true,
          detail: { target, source: invoker }
        }));

        // Show popover if applicable
        try {
          if (target.hasAttribute('popover')) {
            if (typeof (target as any).showPopover === 'function') {
              // Pre-position for smooth animation if anchor positioning not supported
              if (!this.supportsAnchorPositioning()) {
                this.positionPopover(invoker, target);
              }
              (target as any).showPopover();
            } else {
              // Fallback for browsers without Popover API
              this.positionPopover(invoker, target);
              (target as HTMLElement).style.display = 'block';
              (target as HTMLElement).classList.add('interest-fallback');
              // Trigger animation
              requestAnimationFrame(() => {
                (target as HTMLElement).classList.add('show');
              });
            }
          }
        } catch {}

        // Update state
        data.state = this.InterestState.FullInterest;
        if (!(target as any)[this.targetDataField]) {
          (target as any)[this.targetDataField] = {};
        }
        (target as any)[this.targetDataField].invoker = invoker;

        // Setup popover toggle listener if popover
        if (target.hasAttribute('popover')) {
          const toggleListener = this.createPopoverToggleListener();
          (target as any)[this.targetDataField].toggleListener = toggleListener;
          target.addEventListener('toggle', toggleListener);
        }

        // Update classes and ARIA
        this.invokersWithInterest.add(invoker);
        invoker.classList.add("interest-source");
        target.classList.add("interest-target");

        if (!this.isPlainHint(target)) {
          invoker.setAttribute("aria-expanded", "true");
        }

        // Setup anchor positioning
        this.setupAnchorPositioning(invoker, target, data);
        break;

      default:
        throw new Error("Invalid state");
    }
    return true;
  }

  /**
   * Clear interest state from an invoker
   */
  private clearState(invoker: HTMLElement): void {
    const data = (invoker as any)[this.dataField];
    if (!data) return;

    clearTimeout(data.gainedTimer);
    clearTimeout(data.lostTimer);

    if (data.state !== this.InterestState.NoInterest) {
      const target = this.getInterestForTarget(invoker);
      if (target) {
        // Dispatch loseinterest event
        const loseInterestEvent = new CustomEvent(this.loseInterestEventName, {
          bubbles: true, // Allow bubbling for integration with command system
          cancelable: true
        });
        Object.defineProperty(loseInterestEvent, 'source', { 
          value: invoker, 
          writable: false 
        });
        target.dispatchEvent(loseInterestEvent);
        
        // Also dispatch on the invoker for potential command chaining
        invoker.dispatchEvent(new CustomEvent('interest:lost', {
          bubbles: true,
          detail: { target, source: invoker }
        }));

        // Hide popover
        try {
          if (typeof (target as any).hidePopover === 'function') {
            (target as any).hidePopover();
          } else if (target.hasAttribute('popover')) {
            // Fallback for browsers without Popover API
            (target as HTMLElement).classList.remove('show');
            // Wait for animation to complete before hiding
            setTimeout(() => {
              (target as HTMLElement).style.display = 'none';
              (target as HTMLElement).classList.remove('interest-fallback');
            }, 200);
          }
        } catch {}

        // Cleanup listeners
        const targetData = (target as any)[this.targetDataField];
        if (targetData?.toggleListener) {
          target.removeEventListener('toggle', targetData.toggleListener);
        }
        (target as any)[this.targetDataField] = null;

        // Update classes and ARIA
        this.invokersWithInterest.delete(invoker);
        invoker.classList.remove("interest-source");
        target.classList.remove("interest-target");

        if (!this.isPlainHint(target)) {
          invoker.setAttribute("aria-expanded", "false");
        }

        // Cleanup anchor positioning
        this.cleanupAnchorPositioning(invoker, target, data);
      }
      
      data.state = this.InterestState.NoInterest;
    }
  }

  /**
   * Check if anchor positioning is supported
   */
   private supportsAnchorPositioning(): boolean {
     return 'anchorName' in document.body.style;
   }

  /**
   * Setup anchor positioning between invoker and target
   */
   private setupAnchorPositioning(
     invoker: HTMLElement,
     target: HTMLElement,
     data: any
   ): void {
     const anchorName = `--interest-anchor-${Math.random().toString(36).substring(2)}`;
     (invoker.style as any).anchorName = anchorName;
     (target.style as any).positionAnchor = anchorName;
     data.anchorName = anchorName;

  if (this.supportsAnchorPositioning()) {
    // Add CSS for anchor positioning using position-area for automatic fallbacks
    const className = `interest-anchored-${Math.random().toString(36).substring(2)}`;
    const style = document.createElement('style');
    style.textContent = `
      .${className} {
        margin: 0;
        top: calc(anchor(${anchorName} bottom) - 4px);
        left: anchor(${anchorName});
        justify-self: center;
      }
    `;
    document.head.appendChild(style);
    target.classList.add(className);
    data.styleElement = style;
    data.className = className;
  }
   }



  /**
   * Cleanup anchor positioning
   */
   private cleanupAnchorPositioning(
     invoker: HTMLElement,
     target: HTMLElement,
     data: any
   ): void {
     if (data.anchorName) {
       (invoker.style as any).anchorName = "";
       (target.style as any).positionAnchor = "";
       data.anchorName = null;
     }
     // Cleanup style element
     if (data.styleElement) {
       data.styleElement.remove();
       data.styleElement = null;
     }
     // Cleanup class
     if (data.className) {
       target.classList.remove(data.className);
       data.className = null;
     }
      // Cleanup manual positioning
      (target as HTMLElement).style.position = "";
      (target as HTMLElement).style.top = "";
      (target as HTMLElement).style.left = "";
      (target as HTMLElement).style.zIndex = "";
      (target as HTMLElement).style.margin = "";
      (target as HTMLElement).style.transformOrigin = "";
   }

  /**
   * Position popover relative to invoker since top-layer popovers are centered by default
   * Prefers positioning below (GitHub-style), then above if not enough space
   */
  private positionPopover(invoker: HTMLElement, target: HTMLElement): void {
    const invokerRect = invoker.getBoundingClientRect();

    // Get target dimensions more reliably - temporarily show it if hidden
    let targetRect: DOMRect;
    const wasHidden = target.style.display === 'none';
    if (wasHidden) {
      // Temporarily show to get accurate dimensions
      const originalDisplay = target.style.display;
      const originalVisibility = target.style.visibility;
      const originalPosition = target.style.position;

      target.style.display = 'block';
      target.style.visibility = 'hidden';
      target.style.position = 'absolute';
      target.style.top = '-9999px';
      target.style.left = '-9999px';

      targetRect = target.getBoundingClientRect();

      // Restore
      target.style.display = originalDisplay;
      target.style.visibility = originalVisibility;
      target.style.position = originalPosition;
      target.style.top = '';
      target.style.left = '';
    } else {
      targetRect = target.getBoundingClientRect();
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top: number;
    let left: number;

    // Position centered horizontally on the invoker
    left = invokerRect.left + (invokerRect.width / 2) - (targetRect.width / 2);

    // Try positioning below first (GitHub-style)
    top = invokerRect.bottom + 4;

    // Check if it fits below
    if (top + targetRect.height > viewportHeight - 8) {
      // Try positioning above
      top = invokerRect.top - targetRect.height - 4;
      if (top < 8) {
        // If above also doesn't fit, position below anyway
        top = invokerRect.bottom + 4;
      }
    }

    // Ensure it doesn't go off-screen with final adjustments
    const adjustedLeft = Math.max(8, Math.min(left, viewportWidth - targetRect.width - 8));
    const adjustedTop = Math.max(8, Math.min(top, viewportHeight - targetRect.height - 8));

    // For fallback positioning, set position and coordinates
    (target as HTMLElement).style.position = 'fixed';
    (target as HTMLElement).style.top = `${adjustedTop}px`;
    (target as HTMLElement).style.left = `${adjustedLeft}px`;
    (target as HTMLElement).style.zIndex = '9999';
    (target as HTMLElement).style.margin = '0';
    (target as HTMLElement).style.transformOrigin = 'top center';
  }



  /**
   * Create popover toggle event listener
   */
  private createPopoverToggleListener() {
    return (e: Event) => {
      const popover = e.target as HTMLElement;
      const toggleEvent = e as any; // ToggleEvent
      if (toggleEvent.newState === 'closed') {
        const targetData = (popover as any)[this.targetDataField];
        const invoker = targetData?.invoker;
        if (invoker) {
          this.gainOrLoseInterest(invoker, popover, this.InterestState.NoInterest);
        }
      }
    };
  }

  /**
   * Schedule task to gain interest after delay
   */
  private scheduleInterestGainedTask(invoker: HTMLElement, newState: string): void {
    const delay = this.getDelaySeconds(invoker, this.interestDelayStartProp) * 1000;
    if (!isFinite(delay) || delay < 0) return;

    const data = (invoker as any)[this.dataField];
    data.clearGainedTask?.();
    data.gainedTimer = setTimeout(() => {
      this.gainOrLoseInterest(invoker, this.getInterestForTarget(invoker), newState);
    }, delay);
  }

  /**
   * Schedule task to lose interest after delay
   */
  private scheduleInterestLostTask(invoker: HTMLElement): void {
    const delay = this.getDelaySeconds(invoker, this.interestDelayEndProp) * 1000;
    if (!isFinite(delay) || delay < 0) return;

    const data = (invoker as any)[this.dataField];
    data.clearLostTask?.();
    data.lostTimer = setTimeout(() => {
      this.gainOrLoseInterest(
        invoker, 
        this.getInterestForTarget(invoker), 
        this.InterestState.NoInterest
      );
    }, delay);
  }

  /**
   * Get delay in seconds for a CSS property
   */
  private getDelaySeconds(el: HTMLElement, prop: string): number {
    const style = getComputedStyle(el);
    const longhandValue = style.getPropertyValue(prop).trim();

    // Longhand has priority
    if (longhandValue.toLowerCase() !== 'normal') {
      return this.parseTimeValue(longhandValue);
    }

    // Check shorthand
    const shorthand = style.getPropertyValue(this.interestDelayProp).trim();
    if (shorthand && shorthand.toLowerCase() !== 'normal') {
      const parts = shorthand.split(/\s+/).filter((s) => s.length > 0);
      if (parts.length > 0) {
        const firstValue = parts[0];
        const secondValue = parts.length > 1 ? parts[1] : firstValue;
        const valueFromShorthand = prop === this.interestDelayStartProp 
          ? firstValue 
          : secondValue;

        if (valueFromShorthand.toLowerCase() !== 'normal') {
          return this.parseTimeValue(valueFromShorthand);
        }
      }
    }

    // Default values
    return prop === this.interestDelayStartProp ? 0.5 : 0.25;
  }

  /**
   * Parse time value from CSS
   */
  private parseTimeValue(val: string): number {
    const s = String(val).trim();
    const m_s = s.match(/^([\d.]+)s$/);
    if (m_s) {
      return parseFloat(m_s[1]);
    }
    const m_ms = s.match(/^([\d.]+)ms$/);
    if (m_ms) {
      return parseFloat(m_ms[1]) / 1000;
    }
    return parseFloat(s) || 0;
  }

  /**
   * Initialize data field for an element
   */
  private initializeDataField(el: HTMLElement): void {
    if ((el as any)[this.dataField]) return;

    (el as any)[this.dataField] = {
      state: this.InterestState.NoInterest,
      gainedTimer: null,
      lostTimer: null,
      longPressTimer: null,
      anchorName: null,
      clearGainedTask() {
        clearTimeout(this.gainedTimer);
      },
      clearLostTask() {
        clearTimeout(this.lostTimer);
      },
    };

    const target = this.getInterestForTarget(el);
    if (target) {
      this.setupAccessibility(el, target);
    }
  }

  /**
   * Setup accessibility attributes
   */
  private setupAccessibility(invoker: HTMLElement, target: HTMLElement): void {
    if (this.isPlainHint(target)) {
      invoker.setAttribute("aria-describedby", target.id);
    } else {
      // Rich hint
      invoker.setAttribute("aria-details", target.id);
      invoker.setAttribute("aria-expanded", "false");
      if (!target.hasAttribute("role")) {
        target.setAttribute("role", "tooltip");
      }
    }
  }

  /**
   * Check if target is a plain hint (simple tooltip)
   */
  private isPlainHint(target: HTMLElement): boolean {
    if (target.getAttribute("popover")?.toLowerCase() !== "hint") {
      return false;
    }

    // Check for focusable elements
    const focusableSelector = [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "object",
      "embed",
      "[contenteditable]",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    if (target.querySelector(focusableSelector)) {
      return false;
    }

    // Check for structural elements
    const structuralSelector = [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "table", "nav", 
      "header", "footer", "main", "aside",
      "article", "section", "form", "blockquote",
      "details", "summary", "dialog"
    ].join(",");

    if (target.querySelector(structuralSelector)) {
      return false;
    }

    // Check ARIA roles
    const elementsWithRoles = target.querySelectorAll("[role]");
    for (let i = 0; i < elementsWithRoles.length; i++) {
      const el = elementsWithRoles[i];
      const role = el.getAttribute("role")?.toLowerCase();
      if (role && !["presentation", "none", "generic", "image"].includes(role)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get interest target for an element
   */
  private getInterestForTarget(el: HTMLElement): HTMLElement | null {
    const id = el.getAttribute(this.attributeName);
    return id ? document.getElementById(id) : null;
  }

  /**
   * Get interest invoker for a target element
   */
  private getInterestInvoker(target: HTMLElement): HTMLElement | null {
    const targetData = (target as any)[this.targetDataField];
    const inv = targetData?.invoker || null;
    return inv && (inv as any)[this.dataField]?.state !== this.InterestState.NoInterest
      ? inv
      : null;
  }

  /**
   * Check if polyfill is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Setup accessibility for all current interest invokers (public method for testing)
   */
  public setupAccessibilityForAll(): void {
    this.setupInitialAccessibility();
  }
}

// --- Export Functions ---

/**
 * Apply the Interest Invokers polyfill
 */
export function applyInterestInvokers(): void {
  const polyfill = InterestInvokersPolyfill.getInstance();

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => polyfill.apply());
  } else if (document.readyState === "interactive" || document.readyState === "complete") {
    // DOM is ready, but ensure body exists
    if (document.body) {
      polyfill.apply();
    } else {
      // Wait a bit more
      setTimeout(() => polyfill.apply(), 0);
    }
  } else {
    // Fallback
    window.addEventListener("load", () => polyfill.apply());
  }
}

/**
 * Create an InterestEvent
 */
export function createInterestEvent(
  type: "interest" | "loseinterest", 
  source?: Element
): InterestEvent {
  const event = new CustomEvent(type, {
    bubbles: false,
    cancelable: false
  }) as any;

  // Define source property
  Object.defineProperty(event, 'source', {
    value: source || null,
    writable: false,
    enumerable: true
  });

  return event as InterestEvent;

  return event;
}

// Auto-apply the polyfill when this module is imported
applyInterestInvokers();
