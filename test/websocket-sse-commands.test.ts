import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvokerManager } from '../src/core';
import { registerWebSocketCommands } from '../src/commands/websocket';
import { registerSSECommands } from '../src/commands/sse';

describe('WebSocket and Server-Sent Events Commands', () => {
  let invokerManager: InvokerManager;
  let mockWebSocketConstructor: any;
  let mockEventSourceConstructor: any;
  const originalWebSocket = (globalThis as any).WebSocket;
  const originalEventSource = (globalThis as any).EventSource;

  beforeEach(() => {
    document.body.innerHTML = '';
    invokerManager = InvokerManager.getInstance();
    invokerManager.reset();
    registerWebSocketCommands(invokerManager);
    registerSSECommands(invokerManager);
    invokerManager.ensureListenersAttached();

    // Mock WebSocket
    mockWebSocketConstructor = vi.fn();
    class MockWebSocket {
      CONNECTING = 0;
      OPEN = 1;
      CLOSING = 2;
      CLOSED = 3;
      readyState = 0; // CONNECTING
      send = vi.fn();
      close = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onclose: any = null;
      onerror: any = null;
      url: string;
      protocols?: string[];

      constructor(url: string, protocols?: string[]) {
        mockWebSocketConstructor(url, protocols);
        this.url = url;
        this.protocols = protocols;
        (globalThis as any).lastWebSocketInstance = this;

        // Simulate connection opening
        this.triggerOpen = this.triggerOpen.bind(this);
        this.triggerMessage = this.triggerMessage.bind(this);
        this.triggerClose = this.triggerClose.bind(this);
        this.triggerError = this.triggerError.bind(this);
      }

      // Simulate connection opening
      triggerOpen() {
        this.readyState = 1; // OPEN
        if (this.onopen) {
          setTimeout(() => this.onopen(), 0);
        }
      }

      // Simulate receiving a message
      triggerMessage(data: any) {
        if (this.onmessage) this.onmessage({ data });
      }

      // Simulate connection closing
      triggerClose() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose();
      }

      // Simulate error
      triggerError(error: any) {
        if (this.onerror) this.onerror(error);
      }
    }

    (globalThis as any).WebSocket = MockWebSocket;
    if (typeof window !== 'undefined') {
      (window as any).WebSocket = MockWebSocket;
    }

    // Ensure WebSocket constants are available
    if (!(globalThis as any).WebSocket.CONNECTING) {
      (globalThis as any).WebSocket.CONNECTING = 0;
      (globalThis as any).WebSocket.OPEN = 1;
      (globalThis as any).WebSocket.CLOSING = 2;
      (globalThis as any).WebSocket.CLOSED = 3;
    }

    // Mock EventSource
    mockEventSourceConstructor = vi.fn();
    class MockEventSource {
      CONNECTING = 0;
      OPEN = 1;
      CLOSED = 2;
      readyState = 0; // CONNECTING
      close = vi.fn();
      addEventListener = vi.fn();
      onopen: any = null;
      onmessage: any = null;
      onerror: any = null;
      url: string;

      constructor(url: string) {
        mockEventSourceConstructor(url);
        this.url = url;
        (globalThis as any).lastEventSourceInstance = this;

        // Simulate connection opening
        this.triggerOpen = this.triggerOpen.bind(this);
        this.triggerMessage = this.triggerMessage.bind(this);
      }

      // Simulate connection opening
      triggerOpen() {
        this.readyState = 1; // OPEN
        if (this.onopen) {
          setTimeout(() => this.onopen(), 0);
        }
      }

      // Simulate receiving a message
      triggerMessage(data: any, eventType?: string) {
        if (this.onmessage) this.onmessage({ data, type: eventType || 'message' });
      }
    }

    (globalThis as any).EventSource = MockEventSource;
    if (typeof window !== 'undefined') {
      (window as any).EventSource = MockEventSource;
    }

    // Ensure EventSource constants are available
    if (!(globalThis as any).EventSource.CONNECTING) {
      (globalThis as any).EventSource.CONNECTING = 0;
      (globalThis as any).EventSource.OPEN = 1;
      (globalThis as any).EventSource.CLOSED = 2;
    }
  });

  afterEach(() => {
    (globalThis as any).WebSocket = originalWebSocket;
    (globalThis as any).EventSource = originalEventSource;
    if (typeof window !== 'undefined') {
      (window as any).WebSocket = originalWebSocket;
      (window as any).EventSource = originalEventSource;
    }
  });

  describe('--websocket:connect', () => {
    it('should establish WebSocket connection with valid URL', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', 'wss://echo.websocket.org');
      document.body.appendChild(button);

      const connectPromise = invokerManager.executeCommand('--websocket:connect', '#websocket-target', button);

      // Simulate successful connection
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations to complete
      const mockWs = (globalThis as any).lastWebSocketInstance;
      mockWs.triggerOpen();

      await connectPromise;

      expect(mockWebSocketConstructor).toHaveBeenCalledWith('wss://echo.websocket.org', []);
      expect(target.dataset.websocketStatus).toBe('connected');
      expect((target as any)._websocketConnection).toBe(mockWs);
    });

    it('should throw error without data-url', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      document.body.appendChild(button);

      await expect(
        invokerManager.executeCommand('--websocket:connect', '#websocket-target', button)
      ).rejects.toThrow();
    });

    it('should handle connection errors', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', 'wss://invalid.url');
      document.body.appendChild(button);

      const connectPromise = invokerManager.executeCommand('--websocket:connect', '#websocket-target', button);

      // Simulate connection error
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations to complete
      const mockWs = (globalThis as any).lastWebSocketInstance;
      const error = new Error('Connection failed');
      mockWs.triggerError(error);

      await expect(connectPromise).rejects.toThrow('WebSocket connection failed');
      expect(target.dataset.websocketStatus).toBe('error');
    });

    it('should clean up existing connection before creating new one', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      // Set up existing connection
      const existingWs = { readyState: WebSocket.OPEN, close: vi.fn() };
      (target as any)._websocketConnection = existingWs;

      const button = document.createElement('button');
      button.setAttribute('data-url', 'wss://new.url');
      document.body.appendChild(button);

      const connectPromise = invokerManager.executeCommand('--websocket:connect', '#websocket-target', button);

      // Simulate successful connection
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations to complete
      const mockWs = (globalThis as any).lastWebSocketInstance;
      mockWs.triggerOpen();

      await connectPromise;

      expect(existingWs.close).toHaveBeenCalled();
    });
  });

  describe('--websocket:disconnect', () => {
    it('should close WebSocket connection', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = { readyState: WebSocket.OPEN, close: vi.fn() };
      (target as any)._websocketConnection = mockWs;

      await invokerManager.executeCommand('--websocket:disconnect', '#websocket-target');

      expect(mockWs.close).toHaveBeenCalled();
      expect(target.dataset.websocketStatus).toBe('disconnected');
    });

    it('should handle non-existent connection gracefully', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      // No connection exists
      await expect(
        invokerManager.executeCommand('--websocket:disconnect', '#websocket-target')
      ).resolves.toBeUndefined();
    });
  });

  describe('--websocket:send', () => {
    it('should send message through WebSocket connection', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = {
        readyState: WebSocket.OPEN,
        send: vi.fn()
      };
      (target as any)._websocketConnection = mockWs;

      const button = document.createElement('button');
      button.setAttribute('data-message', 'Hello WebSocket!');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--websocket:send', '#websocket-target', button);

      expect(mockWs.send).toHaveBeenCalledWith('Hello WebSocket!');
    });

    it('should send message from button text content', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = {
        readyState: WebSocket.OPEN,
        send: vi.fn()
      };
      (target as any)._websocketConnection = mockWs;

      const button = document.createElement('button');
      button.textContent = 'Message from text content';
      document.body.appendChild(button);

      await invokerManager.executeCommand('--websocket:send', '#websocket-target', button);

      expect(mockWs.send).toHaveBeenCalledWith('Message from text content');
    });

    it('should throw error when WebSocket is not connected', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

       const mockWs = {
         readyState: WebSocket.CLOSED || 3,
         send: vi.fn()
       };
      (target as any)._websocketConnection = mockWs;

      const button = document.createElement('button');
      button.setAttribute('data-message', 'test');
      document.body.appendChild(button);

      await expect(
        invokerManager.executeCommand('--websocket:send', '#websocket-target', button)
      ).rejects.toThrow('WebSocket is not connected');
    });

    it('should throw error without message', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = {
        readyState: WebSocket.OPEN,
        send: vi.fn()
      };
      (target as any)._websocketConnection = mockWs;

      const button = document.createElement('button');
      document.body.appendChild(button);

      await expect(
        invokerManager.executeCommand('--websocket:send', '#websocket-target', button)
      ).rejects.toThrow('--websocket:send requires a message');
    });

    it('should stringify JSON objects', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = {
        readyState: WebSocket.OPEN,
        send: vi.fn()
      };
      (target as any)._websocketConnection = mockWs;

      const button = document.createElement('button');
      button.setAttribute('data-message', '{"type":"test","data":"value"}');
      document.body.appendChild(button);

      await invokerManager.executeCommand('--websocket:send', '#websocket-target', button);

      expect(mockWs.send).toHaveBeenCalledWith('{"type":"test","data":"value"}');
    });
  });

  describe('--websocket:status', () => {
    it('should show connected status', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = { readyState: 1 }; // WebSocket.OPEN
      (target as any)._websocketConnection = mockWs;

      await invokerManager.executeCommand('--websocket:status', '#websocket-target');

      expect(target.dataset.websocketStatus).toBe('connected');
      expect(target.textContent).toBe('WebSocket: connected');
    });

    it('should show disconnected status', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = { readyState: 3 }; // WebSocket.CLOSED
      (target as any)._websocketConnection = mockWs;

      await invokerManager.executeCommand('--websocket:status', '#websocket-target');

      expect(target.dataset.websocketStatus).toBe('disconnected');
      expect(target.textContent).toBe('WebSocket: disconnected');
    });

    it('should show disconnected status when no connection exists', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      await invokerManager.executeCommand('--websocket:status', '#websocket-target');

      expect(target.dataset.websocketStatus).toBe('disconnected');
      expect(target.textContent).toBe('WebSocket: disconnected');
    });
  });

  describe('--websocket:on:message', () => {
    it('should set up message handler', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = {
        readyState: WebSocket.OPEN,
        onmessage: null
      };
      (target as any)._websocketConnection = mockWs;

      const handler = document.createElement('div');
      handler.setAttribute('data-message-command', '--text:append');
      document.body.appendChild(handler);

      await invokerManager.executeCommand('--websocket:on:message', '#websocket-target', handler);

      expect(typeof mockWs.onmessage).toBe('function');

      // Simulate message
      const messageEvent = { data: 'test message' };
      mockWs.onmessage(messageEvent);

      // Handler should have executed the command
      expect(handler.textContent).toBe('test message');
    });

    it('should throw error without data-message-command', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = { readyState: WebSocket.OPEN };
      (target as any)._websocketConnection = mockWs;

      const handler = document.createElement('div');
      document.body.appendChild(handler);

      await expect(
        invokerManager.executeCommand('--websocket:on:message', '#websocket-target', handler)
      ).rejects.toThrow('--websocket:on:message requires data-message-command attribute');
    });
  });

  describe('--sse:connect', () => {
    it('should establish SSE connection with valid URL', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/events');
      document.body.appendChild(button);

      const connectPromise = invokerManager.executeCommand('--sse:connect', '#sse-target', button);

      // Simulate successful connection
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations to complete
      const mockEs = (globalThis as any).lastEventSourceInstance;
      mockEs.triggerOpen();

      await connectPromise;

      expect(mockEventSourceConstructor).toHaveBeenCalledWith('/api/events');
      expect(target.dataset.sseStatus).toBe('connected');
      expect((target as any)._sseConnection).toBe(mockEs);
    });

    it('should throw error without data-url', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      document.body.appendChild(button);

      await expect(
        invokerManager.executeCommand('--sse:connect', '#sse-target', button)
      ).rejects.toThrow('--sse:connect requires a data-url attribute');
    });
  });

  describe('--sse:disconnect', () => {
    it('should close SSE connection', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const mockEs = { readyState: 1, close: vi.fn() }; // EventSource.OPEN
      (target as any)._sseConnection = mockEs;

      await invokerManager.executeCommand('--sse:disconnect', '#sse-target');

      expect(mockEs.close).toHaveBeenCalled();
      expect(target.dataset.sseStatus).toBe('disconnected');
    });
  });

  describe('--sse:status', () => {
    it('should show connected status', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const mockEs = { readyState: 1 }; // EventSource.OPEN
      (target as any)._sseConnection = mockEs;

      await invokerManager.executeCommand('--sse:status', '#sse-target');

      expect(target.dataset.sseStatus).toBe('connected');
      expect(target.textContent).toBe('SSE: connected');
    });
  });

  describe('--sse:on:message', () => {
    it('should set up message handler', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const mockEs = {
        readyState: EventSource.OPEN,
        onmessage: null
      };
      (target as any)._sseConnection = mockEs;

      const handler = document.createElement('div');
      handler.setAttribute('data-message-command', '--text:append');
      document.body.appendChild(handler);

      await invokerManager.executeCommand('--sse:on:message', '#sse-target', handler);

      expect(typeof mockEs.onmessage).toBe('function');

      // Simulate message
      const messageEvent = { data: 'SSE message', type: 'message' };
      mockEs.onmessage(messageEvent);

      expect(handler.textContent).toBe('SSE message');
    });
  });

  describe('--sse:on:event', () => {
    it('should set up event handler for specific event type', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const mockEs = {
        readyState: EventSource.OPEN,
        addEventListener: vi.fn()
      };
      (target as any)._sseConnection = mockEs;

      const handler = document.createElement('div');
      handler.setAttribute('data-event-command', '--text:append');
      document.body.appendChild(handler);

      await invokerManager.executeCommand('--sse:on:event:user-joined', '#sse-target', handler);

      expect(mockEs.addEventListener).toHaveBeenCalledWith('user-joined', expect.any(Function));
    });

    it('should throw error without event type parameter', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const mockEs = { readyState: EventSource.OPEN };
      (target as any)._sseConnection = mockEs;

      const handler = document.createElement('div');
      handler.setAttribute('data-event-command', '--text:append');
      document.body.appendChild(handler);

      await expect(
        invokerManager.executeCommand('--sse:on:event', '#sse-target', handler)
      ).rejects.toThrow('--sse:on:event requires an event type parameter');
    });
  });

  describe('Browser Support', () => {
    it('should throw error when WebSocket is not supported', async () => {
      // Temporarily remove WebSocket
      delete (globalThis as any).WebSocket;

      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', 'wss://test.com');
      document.body.appendChild(button);

      await expect(
        invokerManager.executeCommand('--websocket:connect', '#websocket-target', button)
      ).rejects.toThrow('WebSocket is not supported in this browser');

      // Restore WebSocket
      (globalThis as any).WebSocket = originalWebSocket;
    });

    it('should throw error when EventSource is not supported', async () => {
      // Temporarily remove EventSource
      delete (globalThis as any).EventSource;

      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const button = document.createElement('button');
      button.setAttribute('data-url', '/api/events');
      document.body.appendChild(button);

      await expect(
        invokerManager.executeCommand('--sse:connect', '#sse-target', button)
      ).rejects.toThrow('Server-Sent Events are not supported in this browser');

      // Restore EventSource
      (globalThis as any).EventSource = originalEventSource;
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch websocket:message events', async () => {
      const target = document.createElement('div');
      target.id = 'websocket-target';
      document.body.appendChild(target);

      const mockWs = {
        readyState: WebSocket.OPEN,
        onmessage: null
      };
      (target as any)._websocketConnection = mockWs;
      (target as any)._websocketUrl = 'wss://test.com';

      const handler = document.createElement('div');
      handler.setAttribute('data-message-command', '--text:append');
      document.body.appendChild(handler);

      await invokerManager.executeCommand('--websocket:on:message', '#websocket-target', handler);

      // Listen for custom event
      let receivedEvent: any = null;
      target.addEventListener('websocket:message', (e) => {
        receivedEvent = e;
      });

      // Simulate message
      const messageEvent = { data: 'test data' };
      mockWs.onmessage(messageEvent);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.detail.data).toBe('test data');
      expect(receivedEvent.detail.origin).toBe('wss://test.com');
    });

    it('should dispatch sse:message events', async () => {
      const target = document.createElement('div');
      target.id = 'sse-target';
      document.body.appendChild(target);

      const mockEs = {
        readyState: EventSource.OPEN,
        onmessage: null
      };
      (target as any)._sseConnection = mockEs;
      (target as any)._sseUrl = '/api/events';

      const handler = document.createElement('div');
      handler.setAttribute('data-message-command', '--text:append');
      document.body.appendChild(handler);

      await invokerManager.executeCommand('--sse:on:message', '#sse-target', handler);

      // Listen for custom event
      let receivedEvent: any = null;
      target.addEventListener('sse:message', (e) => {
        receivedEvent = e;
      });

      // Simulate message
      const messageEvent = { data: 'SSE data', type: 'message' };
      mockEs.onmessage(messageEvent);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.detail.data).toBe('SSE data');
      expect(receivedEvent.detail.type).toBe('message');
      expect(receivedEvent.detail.origin).toBe('/api/events');
    });
  });
});
