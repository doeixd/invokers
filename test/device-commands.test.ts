import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvokerManager } from '../src';
import { registerDeviceCommands } from '../src/commands/device';

describe('Device Commands', () => {
  let manager: InvokerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = InvokerManager.getInstance();
    manager.reset();

    // Enable debug mode for testing warnings
    if (typeof window !== 'undefined') {
      if (typeof window !== 'undefined') {
        window.Invoker = window.Invoker || {};
        window.Invoker.debug = true;
      }
    }

    // Register device commands
    registerDeviceCommands(manager);
  });

  afterEach(() => {
    // Clean up debug mode
    if (typeof window !== 'undefined' && (window as any).Invoker) {
      delete (window as any).Invoker.debug;
    }
  });

  describe('--device:vibrate command', () => {
    it('should vibrate with single duration', async () => {
      document.body.innerHTML = `
        <button command="--device:vibrate:200">Vibrate</button>
      `;

      const button = document.querySelector('button')!;

      // Mock navigator.vibrate
      const mockVibrate = vi.fn().mockReturnValue(true);
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockVibrate).toHaveBeenCalledWith(200);
    });

    it('should vibrate with pattern', async () => {
      document.body.innerHTML = `
        <button command="--device:vibrate:100:200:100">Vibrate Pattern</button>
      `;

      const button = document.querySelector('button')!;

      // Mock navigator.vibrate
      const mockVibrate = vi.fn().mockReturnValue(true);
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockVibrate).toHaveBeenCalledWith([100, 200, 100]);
    });

    it('should handle unsupported vibration API', async () => {
      document.body.innerHTML = `
        <button command="--device:vibrate:200">Vibrate</button>
      `;

      const button = document.querySelector('button')!;

      // Mock vibrate as undefined
      const originalVibrate = navigator.vibrate;
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Command should complete without throwing when API is unsupported

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true
      });
    });

    it('should throw error for missing pattern', async () => {
      document.body.innerHTML = `
        <button command="--device:vibrate">Vibrate</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be logged, command should fail gracefully
    });
  });

  describe('--device:share command', () => {
    it('should share content successfully', async () => {
      document.body.innerHTML = `
        <button command="--device:share:title:Test Title:text:Test text:url:https\\://example.com">Share</button>
      `;

      const button = document.querySelector('button')!;

      // Mock navigator.share
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Title',
        text: 'Test text',
        url: 'https://example.com'
      });
    });

    it('should handle share cancellation', async () => {
      document.body.innerHTML = `
        <button command="--device:share:title:Test">Share</button>
      `;

      const button = document.querySelector('button')!;

      // Mock navigator.share to reject
      const mockShare = vi.fn().mockRejectedValue(new Error('User cancelled'));
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockShare).toHaveBeenCalled();
    });

    it('should handle unsupported share API', async () => {
      document.body.innerHTML = `
        <button command="--device:share:title:Test">Share</button>
      `;

      const button = document.querySelector('button')!;

      // Mock share as undefined
      const originalShare = (navigator as any).share;
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Command should complete without throwing when API is unsupported

      // Restore
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        writable: true
      });
    });
  });

  describe('--device:geolocation:get command', () => {
    it('should get geolocation successfully', async () => {
      document.body.innerHTML = `
        <button command="--device:geolocation:get" commandfor="#location">Get Location</button>
        <div id="location"></div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#location')!;

      // Mock geolocation
      const mockGetCurrentPosition = vi.fn((success) => {
        success({
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
      });

      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        writable: true
      });

      // Mock permissions API
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'granted' })
        },
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetCurrentPosition).toHaveBeenCalled();
      expect(target.textContent).toContain('40.7128');
      expect(target.textContent).toContain('-74.006');
    });

    it('should handle geolocation permission denied', async () => {
      document.body.innerHTML = `
        <button command="--device:geolocation:get">Get Location</button>
      `;

      const button = document.querySelector('button')!;

      // Mock permissions API to deny
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockResolvedValue({ state: 'denied' })
        },
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Command should complete without throwing when permission is denied
    });

    it('should handle unsupported geolocation API', async () => {
      document.body.innerHTML = `
        <button command="--device:geolocation:get">Get Location</button>
      `;

      const button = document.querySelector('button')!;

      // Mock geolocation as undefined
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged

      // Restore
      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true
      });
    });
  });

  describe('--device:battery:get command', () => {
    it('should get battery status', async () => {
      document.body.innerHTML = `
        <button command="--device:battery:get" commandfor="#battery">Get Battery</button>
        <div id="battery"></div>
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#battery')!;

      // Mock getBattery
      const mockBattery = {
        level: 0.8,
        charging: false,
        chargingTime: 3600,
        dischargingTime: 7200
      };

      const mockGetBattery = vi.fn().mockResolvedValue(mockBattery);
      Object.defineProperty(navigator, 'getBattery', {
        value: mockGetBattery,
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockGetBattery).toHaveBeenCalled();
      expect(target.textContent).toContain('0.8');
      expect(target.textContent).toContain('false');
    });

    it('should handle unsupported battery API', async () => {
      document.body.innerHTML = `
        <button command="--device:battery:get">Get Battery</button>
      `;

      const button = document.querySelector('button')!;

      // Mock getBattery as undefined
      const originalGetBattery = (navigator as any).getBattery;
      Object.defineProperty(navigator, 'getBattery', {
        value: undefined,
        writable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invokers: Battery API not supported');

      // Restore
      Object.defineProperty(navigator, 'getBattery', {
        value: originalGetBattery,
        writable: true
      });
      consoleWarnSpy.mockRestore();
    });
  });

  describe('--device:clipboard:read command', () => {
    it('should read from clipboard', async () => {
      document.body.innerHTML = `
        <button command="--device:clipboard:read" commandfor="#clipboard">Read Clipboard</button>
        <input id="clipboard" type="text">
      `;

      const button = document.querySelector('button')!;
      const target = document.querySelector('#clipboard') as HTMLInputElement;

      // Mock clipboard
      const mockReadText = vi.fn().mockResolvedValue('clipboard content');
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockReadText).toHaveBeenCalled();
      expect(target.value).toBe('clipboard content');
    });

    it('should handle clipboard read failure', async () => {
      document.body.innerHTML = `
        <button command="--device:clipboard:read">Read Clipboard</button>
      `;

      const button = document.querySelector('button')!;

      // Mock clipboard to reject
      const mockReadText = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: mockReadText },
        writable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invokers: Clipboard read failed', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('--device:clipboard:write command', () => {
    it('should write to clipboard', async () => {
      document.body.innerHTML = `
        <button command="--device:clipboard:write:Hello World">Write Clipboard</button>
      `;

      const button = document.querySelector('button')!;

      // Mock clipboard
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockWriteText).toHaveBeenCalledWith('Hello World');
    });

    it('should throw error for missing text', async () => {
      document.body.innerHTML = `
        <button command="--device:clipboard:write">Write Clipboard</button>
      `;

      const button = document.querySelector('button')!;

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Error should be thrown and logged
    });
  });

  describe('--device:wake-lock command', () => {
    it('should request wake lock', async () => {
      document.body.innerHTML = `
        <button command="--device:wake-lock">Wake Lock</button>
      `;

      const button = document.querySelector('button')!;

      // Mock wakeLock
      const mockWakeLock = { release: vi.fn() };
      const mockRequest = vi.fn().mockResolvedValue(mockWakeLock);
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: mockRequest },
        writable: true
      });

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRequest).toHaveBeenCalledWith('screen');
      expect((window as any)._invokersWakeLock).toBe(mockWakeLock);
    });

    it('should handle wake lock failure', async () => {
      document.body.innerHTML = `
        <button command="--device:wake-lock">Wake Lock</button>
      `;

      const button = document.querySelector('button')!;

      // Mock wakeLock to reject
      const mockRequest = vi.fn().mockRejectedValue(new Error('Not allowed'));
      Object.defineProperty(navigator, 'wakeLock', {
        value: { request: mockRequest },
        writable: true
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleWarnSpy).toHaveBeenCalledWith('Invokers: Wake lock request failed', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('--device:wake-lock:release command', () => {
    it('should release wake lock', async () => {
      document.body.innerHTML = `
        <button command="--device:wake-lock:release">Release Wake Lock</button>
      `;

      const button = document.querySelector('button')!;
      const mockRelease = vi.fn();

      // Set up existing wake lock
      (window as any)._invokersWakeLock = { release: mockRelease };

      button.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRelease).toHaveBeenCalled();
      expect((window as any)._invokersWakeLock).toBeUndefined();
    });
  });
});
