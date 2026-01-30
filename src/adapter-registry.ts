export type InvokerAdapter = {
  matches(element: Element): boolean;
  getCommand(element: HTMLElement): string | null;
  getCommandFor(element: HTMLElement): string | null;
  shouldHandle(event: Event, element: HTMLElement): boolean;
  onBeforeDispatch?(event: Event, element: HTMLElement): void;
};

const adapterRegistry: InvokerAdapter[] = [];

export function registerInvokerAdapter(adapter: InvokerAdapter): void {
  if (!adapterRegistry.includes(adapter)) {
    adapterRegistry.push(adapter);
  }
}

export function getInvokerAdapters(): ReadonlyArray<InvokerAdapter> {
  return adapterRegistry;
}
