import { _dispatchCommandEvent, getInvokerAdapters, registerInvokerAdapter } from './index';
import type { InvokerAdapter } from './adapter-registry';
import { resolveTargets } from './target-resolver';
import { debugLog } from './utils';

export interface AdapterInvokerOptions {
  capture?: boolean;
}

const anchorAdapter: InvokerAdapter = {
  matches(element: Element): boolean {
    return element instanceof HTMLAnchorElement && element.hasAttribute('commandfor');
  },
  getCommand(element: HTMLElement): string | null {
    const command = element.getAttribute('command');
    if (command && command.trim()) {
      return command.trim();
    }
    return '--fetch:get';
  },
  getCommandFor(element: HTMLElement): string | null {
    const commandfor = element.getAttribute('commandfor');
    return commandfor && commandfor.trim() ? commandfor.trim() : null;
  },
  shouldHandle(event: Event, element: HTMLElement): boolean {
    if (!(event instanceof MouseEvent)) {
      return false;
    }
    if (event.type !== 'click' || event.defaultPrevented) {
      return false;
    }
    if (event.button !== 0) {
      return false;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return false;
    }
    if (!element.isConnected) {
      return false;
    }

    const anchor = element as HTMLAnchorElement;
    if (anchor.hasAttribute('download')) {
      return false;
    }

    const target = anchor.getAttribute('target');
    if (target && target.toLowerCase() !== '_self') {
      return false;
    }

    if (anchor.dataset.url) {
      return true;
    }

    const href = getAnchorHref(anchor);
    if (!href || isHashOnly(href) || isUnsupportedScheme(href)) {
      return false;
    }

    return true;
  },
  onBeforeDispatch(_event: Event, element: HTMLElement): void {
    if (element.dataset.url) {
      return;
    }

    const anchor = element as HTMLAnchorElement;
    const href = getAnchorHref(anchor);
    if (href && !isHashOnly(href) && !isUnsupportedScheme(href)) {
      anchor.dataset.url = href;
    }
  }
};

let listenerAttached = false;
let adapterRegistered = false;

export function enableAdapterInvokers(options: AdapterInvokerOptions = {}): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (listenerAttached) {
    return;
  }

  const capture = options.capture ?? true;
  document.addEventListener('click', handleAdapterClick, capture);
  listenerAttached = true;

  if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
    debugLog('Invokers: Invoker adapter listener attached');
  }
}

export function enableAnchorInvokers(options: AdapterInvokerOptions = {}): void {
  if (!adapterRegistered) {
    registerInvokerAdapter(anchorAdapter);
    adapterRegistered = true;
  }

  enableAdapterInvokers(options);
}

function handleAdapterClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  for (const adapter of getInvokerAdapters()) {
    const match = findAdapterMatch(target, adapter);
    if (!match) {
      continue;
    }

    if (!adapter.shouldHandle(event, match)) {
      return;
    }

    adapter.onBeforeDispatch?.(event, match);

    const command = adapter.getCommand(match);
    const commandfor = adapter.getCommandFor(match);
    if (!command || !commandfor) {
      return;
    }

    const targets = resolveTargets(commandfor, match) as HTMLElement[];
    if (targets.length === 0) {
      return;
    }

    targets.forEach((resolvedTarget) => {
      _dispatchCommandEvent(match, command, resolvedTarget, event, targets);
    });

    event.preventDefault();
    return;
  }
}

function findAdapterMatch(start: Element, adapter: InvokerAdapter): HTMLElement | null {
  let current: Element | null = start;
  while (current) {
    if (adapter.matches(current)) {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
}

function getAnchorHref(anchor: HTMLAnchorElement): string | null {
  const href = anchor.getAttribute('href');
  if (!href) {
    return null;
  }
  const trimmed = href.trim();
  return trimmed ? trimmed : null;
}

function isHashOnly(href: string): boolean {
  return href.startsWith('#');
}

function isUnsupportedScheme(href: string): boolean {
  const normalized = href.toLowerCase();
  return normalized.startsWith('mailto:') || normalized.startsWith('tel:') || normalized.startsWith('javascript:') || normalized.startsWith('data:');
}
