// src/event-trigger-manager.ts
import { debugLog, debugWarn } from '../utils';
import { _dispatchCommandEvent } from '../index';
import { parseCommaSeparatedCommands } from '../core';
import { interpolateString } from './interpolation';
import { resolveTargets } from '../target-resolver';

// Event modifiers that have special handling
const MODIFIERS: Record<string, (e: Event) => void> = {
  'prevent': (e: Event) => e.preventDefault(),
  'stop': (e: Event) => e.stopPropagation(),
  'once': (_e: Event) => { /* handled in attachListeners */ },
  // Add other modifiers like `self`, `capture`, `passive`, `debounce.<ms>`, `throttle.<ms>` etc. as needed
};

// Key aliases for keyboard events
const KEY_ALIASES: Record<string, string> = {
  'enter': 'Enter',
  'escape': 'Escape',
  'tab': 'Tab',
  'space': ' ',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
};

type TriggerSource = 'command-on' | 'data-on-event';

// Handles any DOM event that triggers a command (from command-on or data-on-event)
function handleTrigger(this: HTMLElement, event: Event, triggerSource: TriggerSource = 'command-on') {
   if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
     debugLog('Invokers: handleTrigger called for event:', event.type, 'on element:', this);
   }
   const source = this;
   const hasCommandOn = source.hasAttribute('command-on');
   const hasDataOnEvent = source.hasAttribute('data-on-event');
   const dataOnEvent = source.getAttribute('data-on-event') || source.dataset.onEvent;
   const isDataOnEventTrigger = triggerSource === 'data-on-event'
     || Boolean(hasDataOnEvent && dataOnEvent && dataOnEvent === event.type);

   if (!hasCommandOn && !hasDataOnEvent) {
     return;
   }

   const dataOnEventCommand = source.getAttribute('data-on-event-command') ?? source.dataset.onEventCommand ?? null;
   const dataOnEventCommandfor = source.getAttribute('data-on-event-commandfor') ?? source.dataset.onEventCommandfor ?? null;

   let commandAttribute: string | null = null;
   let commandforAttribute: string | null = null;

   if (triggerSource === 'data-on-event') {
     const preferDataOverrides = hasCommandOn;
     commandAttribute = preferDataOverrides
       ? (dataOnEventCommand || source.getAttribute('command'))
       : (source.getAttribute('command') || dataOnEventCommand);
     commandforAttribute = preferDataOverrides
       ? (dataOnEventCommandfor || source.getAttribute('commandfor'))
       : (source.getAttribute('commandfor') || dataOnEventCommandfor);
   } else {
     commandAttribute = source.getAttribute('command');
     commandforAttribute = source.getAttribute('commandfor');
   }

   if (!isDataOnEventTrigger && event.type === 'click' && source.hasAttribute('command')) {
     event.preventDefault();
   }

  if (!commandAttribute || !commandforAttribute) {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugWarn("Invokers: Missing 'command' or 'commandfor' attribute on event triggered element:", source);
    }
    return;
  }

   // Handle modifiers like .prevent and .stop
   const triggerAttr = isDataOnEventTrigger
     ? (dataOnEvent || '')
     : (source.getAttribute('command-on') || '');
   const allModifiers = triggerAttr.split('.').slice(1);
    const modifiers = allModifiers.filter((m: string) => m !== 'window'); // Remove 'window' since it's handled in attach
    const hasWindowModifier = allModifiers.includes('window');

     // Check key-specific modifiers for keyboard events
     if (event.type === 'keydown' || event.type === 'keyup') {
       const keyboardEvent = event as KeyboardEvent;
        const keyModifier = modifiers.find((mod: string) => {
          const unescaped = mod.replace(/\\(.)/g, '$1');
          return mod.startsWith('key-') || KEY_ALIASES[unescaped] || unescaped.length === 1;
        });
       if (keyModifier) {
         let expectedKey = KEY_ALIASES[keyModifier] || keyModifier.replace('key-', '');
         // Unescape backslash-escaped characters (e.g., \/ -> /)
         expectedKey = expectedKey.replace(/\\(.)/g, '$1');
         if (keyboardEvent.key !== expectedKey) {
           return; // Key doesn't match, don't trigger
         }
       }
     }

  // Apply other modifiers
  for (const mod of modifiers) {
    if (mod !== 'once' && MODIFIERS[mod]) {
      MODIFIERS[mod](event);
    }
  }

      // Resolve the target using the target resolver
      const targets = resolveTargets(commandforAttribute, source);
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog(`Invokers: Resolved targets for "${commandforAttribute}":`, targets);
      }
      if (targets.length === 0) {
        if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugWarn(`Invokers: No target found for selector "${commandforAttribute}"`, source);
       }
        return;
      }

      // Use the first target (most commands expect a single target)
      const targetElement = targets[0];

      // Create interpolation context for this specific event trigger
      let sourceDataContext: Record<string, any> = {};
      const sourceContextRaw = source.dataset.context || source.getAttribute('data-context') || '';
      if (sourceContextRaw) {
        try {
          sourceDataContext = JSON.parse(sourceContextRaw);
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn('Invokers: Failed to parse data-context:', error);
          }
        }
      }

      let targetDataContext: Record<string, any> = {};
      const targetDataset = (targetElement as HTMLElement).dataset;
      const targetContextRaw = targetDataset?.context || (targetElement as HTMLElement).getAttribute('data-context') || '';
      if (targetContextRaw) {
        try {
          targetDataContext = JSON.parse(targetContextRaw);
        } catch (error) {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn('Invokers: Failed to parse data-context:', error);
          }
        }
      }

      const interpolationContext = {
        ...sourceDataContext, // Include data-context from source element
        ...targetDataContext, // Include data-context from target element
        event: event,
        this: source,
        target: targetElement,
        detail: (event as CustomEvent)?.detail,
      };

      const rawCommands = parseCommaSeparatedCommands(commandAttribute);
      const commandsToDispatch = rawCommands.length > 0 ? rawCommands : [commandAttribute];

      for (const rawCommand of commandsToDispatch) {
        if (!rawCommand) continue;
        const interpolatedCommand = interpolateString(rawCommand, interpolationContext);
        if (!interpolatedCommand) continue;
        (source as any).__invokersResolvedTargets = targets as HTMLElement[];
        _dispatchCommandEvent(source, interpolatedCommand, targetElement as HTMLElement, event, targets as HTMLElement[]);
        delete (source as any).__invokersResolvedTargets;
      }

  // Handle 'once' modifier by removing the listener
  if (modifiers.includes('once')) {
    const listener = (source as any).commandOnListener;
    const target = hasWindowModifier ? window : source;
    if (listener) {
      target.removeEventListener(event.type, listener);
    } else {
      source.removeEventListener(event.type, handleTrigger);
    }
  }
}

// --- Scanning and Observing DOM for Event Triggers ---

function attachListeners(element: HTMLElement) {
    // command-on (any DOM event)
    if (element.hasAttribute('command-on') && !element.dataset.commandOnAttached) {
     const triggerAttr = element.getAttribute('command-on')!;
     const parts = triggerAttr.split('.');
     const eventName = parts[0];
     const modifiers = parts.slice(1);
     const target = modifiers.includes('window') ? window : element;
     const listener = (event: Event) => handleTrigger.call(element, event, 'command-on');
     target.addEventListener(eventName, listener);
     element.dataset.commandOnAttached = 'true';
     (element as any).originalTriggerAttr = triggerAttr;
     (element as any).commandOnListener = listener;
   }

  // data-on-event (custom events)
  if (element.hasAttribute('data-on-event') && !element.dataset.onEventAttached) {
    const eventName = element.getAttribute('data-on-event') || element.dataset.onEvent || '';
    const commandOnAttr = element.getAttribute('command-on');
    const commandOnEvent = commandOnAttr ? commandOnAttr.split('.')[0] : '';
    if (eventName && commandOnEvent && eventName === commandOnEvent) {
      return;
    }
    // For data-on-event, the `command` and `commandfor` attributes are implied
    // to be present on the same element, or can be specified as `data-on-event-command`
    // and `data-on-event-commandfor` to avoid conflicts.
    if (!element.hasAttribute('command') && !element.hasAttribute('data-on-event-command')) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(`Invokers: Element with 'data-on-event="${eventName}"' must also have a 'command' or 'data-on-event-command' attribute.`, element);
      }
      return;
    }
    if (!element.hasAttribute('commandfor') && !element.hasAttribute('data-on-event-commandfor')) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugWarn(`Invokers: Element with 'data-on-event="${eventName}"' must also have a 'commandfor' or 'data-on-event-commandfor' attribute.`, element);
      }
      return;
    }

    const listener = (event: Event) => handleTrigger.call(element, event, 'data-on-event');
    element.addEventListener(eventName, listener);
    (element as any).onEventListener = listener;
    element.dataset.onEventAttached = 'true';
    (element as any).originalOnEventAttr = eventName;
  }
}

function disconnectListeners(element: HTMLElement) {
   if (element.dataset.commandOnAttached) {
     const triggerAttr = (element as any).originalTriggerAttr;
     if (triggerAttr) {
       const parts = triggerAttr.split('.');
       const eventName = parts[0];
       const modifiers = parts.slice(1);
       const target = modifiers.includes('window') ? window : element;
       const listener = (element as any).commandOnListener;
       if (listener) {
         target.removeEventListener(eventName, listener);
       }
     }
     delete element.dataset.commandOnAttached;
     delete (element as any).originalTriggerAttr;
     delete (element as any).commandOnListener;
   }
  if (element.dataset.onEventAttached) {
    const eventName = (element as any).originalOnEventAttr
      || element.getAttribute('data-on-event')
      || element.dataset.onEvent
      || '';
    const listener = (element as any).onEventListener;
    if (eventName && listener) {
      element.removeEventListener(eventName, listener);
    } else if (eventName) {
      element.removeEventListener(eventName, handleTrigger as any);
    }
    delete element.dataset.onEventAttached;
    delete (element as any).onEventListener;
    delete (element as any).originalOnEventAttr;
  }
}

// MutationObserver to attach/detach listeners for dynamically added/removed elements
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const element = node as HTMLElement;
          if (element.hasAttribute('command-on') || element.hasAttribute('data-on-event')) {
            attachListeners(element);
          }
          element.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
        }
      });
      mutation.removedNodes.forEach(node => {
        if (node.nodeType === 1) { // Node.ELEMENT_NODE
          const element = node as HTMLElement;
          disconnectListeners(element);
          element.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(disconnectListeners);
        }
      });
    } else if (mutation.type === 'attributes') {
      const element = mutation.target as HTMLElement;
      // If command-on or data-on-event attribute changes/is added/removed, re-evaluate
      if (
        (mutation.attributeName === 'command-on' && element.hasAttribute('command-on') && !element.dataset.commandOnAttached) ||
        (mutation.attributeName === 'data-on-event' && element.hasAttribute('data-on-event') && !element.dataset.onEventAttached)
      ) {
        attachListeners(element);
      } else if (
        (mutation.attributeName === 'command-on' && !element.hasAttribute('command-on') && element.dataset.commandOnAttached) ||
        (mutation.attributeName === 'data-on-event' && !element.hasAttribute('data-on-event') && element.dataset.onEventAttached)
      ) {
        disconnectListeners(element);
      } else if (mutation.attributeName === 'command-on' && element.dataset.commandOnAttached) {
        const current = element.getAttribute('command-on') || '';
        const original = (element as any).originalTriggerAttr || '';
        if (current && current !== original) {
          disconnectListeners(element);
          attachListeners(element);
        }
      } else if (mutation.attributeName === 'data-on-event' && element.dataset.onEventAttached) {
        const current = element.getAttribute('data-on-event') || '';
        const original = (element as any).originalOnEventAttr || '';
        if (current && current !== original) {
          disconnectListeners(element);
          attachListeners(element);
        }
      }
    }
  }
});

export class EventTriggerManager {
  private static instance: EventTriggerManager;
  private isInitialized = false;

  public static getInstance(): EventTriggerManager {
    if (!EventTriggerManager.instance) {
      EventTriggerManager.instance = new EventTriggerManager();
    }
    return EventTriggerManager.instance;
  }

  public get initialized(): boolean {
    return this.isInitialized;
  }

  public initialize(root: Element = document.body) {
    if (this.isInitialized) {
      // Already initialized, just rescan for any new elements
      this.rescanCommandOnElements(root);
      return;
    }

    // Scan existing DOM
    root.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
    // Observe future changes
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['command-on', 'data-on-event']
    });
    this.isInitialized = true;
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers EventTriggerManager initialized.');
    }
  }

  public shutdown() {
    observer.disconnect();
    document.querySelectorAll<HTMLElement>('[command-on][data-command-on-attached], [data-on-event][data-on-event-attached]').forEach(disconnectListeners);
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers EventTriggerManager shut down.');
    }
  }

  public rescanCommandOnElements(root: Element = document.body) {
    // Scan existing DOM for new elements
    root.querySelectorAll<HTMLElement>('[command-on], [data-on-event]').forEach(attachListeners);
  }
}
