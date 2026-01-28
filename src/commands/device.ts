/**
 * @file device.ts
 * @summary Device API Command Pack for the Invokers library.
 * @description
 * This module provides commands for interacting with device APIs including
 * vibration, geolocation, battery status, clipboard, wake lock, and more.
 * These commands enable rich device integration with proper permission handling.
 *
 * @example
 * ```javascript
 * import { registerDeviceCommands } from 'invokers/commands/device';
 * import { InvokerManager } from 'invokers';
 *
 * const invokerManager = InvokerManager.getInstance();
 * registerDeviceCommands(invokerManager);
 * ```
 */

import { debugLog, debugWarn, debugError } from '../utils';
import type { InvokerManager } from '../core';
import type { CommandCallback, CommandContext } from '../index';
import { createInvokerError, ErrorSeverity } from '../index';

/**
 * Device API commands for hardware and sensor integration.
 * Includes vibration, geolocation, battery, clipboard, and wake lock functionality.
 */
const deviceCommands: Record<string, CommandCallback> = {

   /**
    * `--device:vibrate`: Triggers device vibration with specified pattern.
    * @example `<button command="--device:vibrate:200" commandfor="#status">Vibrate</button>`
    * @example `<button command="--device:vibrate:100:200:100">Pattern Vibrate</button>`
    */
   "--device:vibrate": async ({ invoker, params }: CommandContext) => {
     try {
        if (invoker && !invoker.isConnected) {
          throw createInvokerError('--device:vibrate failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
            command: '--device:vibrate', element: invoker, recovery: 'Ensure the element is still in the document.'
          });
        }

       const pattern = params.slice(0);
       if (pattern.length === 0) {
         throw createInvokerError(
           'Device vibrate requires a pattern',
           ErrorSeverity.ERROR,
           {
             command: '--device:vibrate',
             element: invoker,
             recovery: 'Use --device:vibrate:200 or --device:vibrate:100:200:100'
           }
         );
       }

       if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:vibrate: Vibration API not supported');
         }
         return;
       }

       try {
         const vibrationPattern = pattern.length === 1 ? parseInt(pattern[0], 10) : pattern.map(n => parseInt(n, 10));
         const vibrateResult = (navigator as any).vibrate(vibrationPattern);

         if (!vibrateResult) {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('--device:vibrate: Vibration failed - may be blocked or not supported');
           }
         } else {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugLog('--device:vibrate: Vibration triggered with pattern:', vibrationPattern);
           }
         }
       } catch (error) {
         throw createInvokerError('--device:vibrate failed: Error triggering vibration', ErrorSeverity.ERROR, {
           command: '--device:vibrate', element: invoker, cause: error as Error, recovery: 'Check vibration pattern format.'
         });
       }
     } catch (error) {
       throw createInvokerError('--device:vibrate failed', ErrorSeverity.ERROR, {
         command: '--device:vibrate', element: invoker, cause: error as Error, recovery: 'Check element connectivity and parameter format.'
       });
     }
   },

   /**
    * `--device:share`: Shares content using the Web Share API.
    * @example `<button command="--device:share:title:My Title:text:Check this out:url:https://example.com">Share</button>`
    */
   "--device:share": async ({ params }: CommandContext) => {
     try {
       if (!('share' in navigator) || typeof (navigator as any).share !== 'function') {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:share: Web Share API not supported');
         }
         return;
       }

       const shareData: ShareData = {};
       // Parse key:value pairs
       for (let i = 0; i < params.length; i += 2) {
         const key = params[i];
         const val = params[i + 1];
         if (key && val !== undefined) {
           if (key === 'url') shareData.url = val;
           else if (key === 'text') shareData.text = val;
           else if (key === 'title') shareData.title = val;
         }
       }

       if (!shareData.title && !shareData.text && !shareData.url) {
         throw createInvokerError('--device:share failed: No share data provided', ErrorSeverity.ERROR, {
           command: '--device:share', recovery: 'Provide at least one of: title, text, or url parameters'
         });
       }

       try {
         await (navigator as any).share(shareData);
         // Dispatch success event
         document.dispatchEvent(new CustomEvent('device:share:success'));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:share: Content shared successfully');
         }
       } catch (shareError) {
         // User cancelled or error occurred
         document.dispatchEvent(new CustomEvent('device:share:cancelled', {
           detail: shareError
         }));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:share: Share cancelled or failed:', shareError);
         }
       }
     } catch (error) {
       throw createInvokerError('--device:share failed', ErrorSeverity.ERROR, {
         command: '--device:share', cause: error as Error, recovery: 'Check share data format and API support.'
       });
     }
   },

   /**
    * `--device:geolocation:get`: Gets current geolocation with permission handling.
    * @example `<button command="--device:geolocation:get" commandfor="#location-display" data-geo-high-accuracy="true">Get Location</button>`
    */
    "--device:geolocation:get": async ({ invoker, getTargets }: CommandContext) => {
      try {
        if (invoker && !invoker.isConnected) {
          throw createInvokerError('--device:geolocation:get failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
            command: '--device:geolocation:get', element: invoker, recovery: 'Ensure the element is still in the document.'
          });
        }

        if (!('geolocation' in navigator) || typeof navigator.geolocation?.getCurrentPosition !== 'function') {
          if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
            debugWarn('--device:geolocation:get: Geolocation API not supported');
          }
          return;
        }

       // Helper function to request permissions
       const requestPermission = async (permissionName: string): Promise<boolean> => {
         if ('permissions' in navigator) {
           try {
             const permission = await (navigator as any).permissions.query({ name: permissionName });
             return permission.state === 'granted';
           } catch {
             return false;
           }
         }
         return true; // Assume granted if permissions API not available
       };

       const hasGeoPermission = await requestPermission('geolocation');
       if (!hasGeoPermission) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:geolocation:get: Geolocation permission not granted');
         }
         document.dispatchEvent(new CustomEvent('device:geolocation:denied'));
         return;
       }

       const targets = getTargets();
       const geoOptions: PositionOptions = {
         enableHighAccuracy: invoker?.dataset?.geoHighAccuracy === 'true',
         timeout: parseInt(invoker?.dataset?.geoTimeout || '10000'),
         maximumAge: parseInt(invoker?.dataset?.geoMaxAge || '0')
       };

       navigator.geolocation.getCurrentPosition(
         (position) => {
           const data = {
             latitude: position.coords.latitude,
             longitude: position.coords.longitude,
             accuracy: position.coords.accuracy,
             altitude: position.coords.altitude,
             altitudeAccuracy: position.coords.altitudeAccuracy,
             heading: position.coords.heading,
             speed: position.coords.speed,
             timestamp: position.timestamp
           };
           if (targets.length > 0 && targets[0].isConnected) {
             targets[0].textContent = JSON.stringify(data);
           }
           // Dispatch success event
           document.dispatchEvent(new CustomEvent('device:geolocation:success', { detail: data }));

           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugLog('--device:geolocation:get: Location retrieved successfully');
           }
         },
         (error) => {
           const errorData = {
             code: error.code,
             message: error.message
           };
           // Dispatch error event
           document.dispatchEvent(new CustomEvent('device:geolocation:error', { detail: errorData }));

           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('--device:geolocation:get: Location retrieval failed:', error.message);
           }
         },
         geoOptions
       );
      } catch (error) {
        throw createInvokerError('--device:geolocation:get failed', ErrorSeverity.ERROR, {
          command: '--device:geolocation:get', element: invoker, cause: error as Error, recovery: 'Check element connectivity and geolocation support.'
        });
      }
    },

   /**
    * `--device:orientation:get`: Gets current device orientation.
    * @example `<button command="--device:orientation:get" commandfor="#orientation-display">Get Orientation</button>`
    */
   "--device:orientation:get": ({ getTargets }: CommandContext) => {
     try {
       if (!window.DeviceOrientationEvent) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:orientation:get: Device Orientation API not supported');
         }
         return;
       }

       const targets = getTargets();
       // Get current orientation if available
       const orientation = (window as any).screen?.orientation || (window as any).orientation;
       const orientationData = {
         angle: orientation?.angle || 0,
         type: orientation?.type || 'unknown'
       };

       if (targets.length > 0 && targets[0].isConnected) {
         targets[0].textContent = JSON.stringify(orientationData);
       }

       // Dispatch event
       document.dispatchEvent(new CustomEvent('device:orientation:current', { detail: orientationData }));

       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog('--device:orientation:get: Orientation retrieved:', orientationData);
       }
     } catch (error) {
       throw createInvokerError('--device:orientation:get failed', ErrorSeverity.ERROR, {
         command: '--device:orientation:get', cause: error as Error, recovery: 'Check device orientation API support.'
       });
     }
   },

   /**
    * `--device:motion:get`: Checks device motion API support and permissions.
    * @example `<button command="--device:motion:get" commandfor="#motion-display">Check Motion</button>`
    */
   "--device:motion:get": async ({ getTargets }: CommandContext) => {
     try {
       if (!window.DeviceMotionEvent) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:motion:get: Device Motion API not supported');
         }
         return;
       }

       const targets = getTargets();

       // Request permission for iOS 13+
       if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
         try {
           const permission = await (DeviceMotionEvent as any).requestPermission();
           if (permission !== 'granted') {
             if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
               debugWarn('--device:motion:get: Device motion permission denied');
             }
             return;
           }
         } catch (error) {
           if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
             debugWarn('--device:motion:get: Failed to request device motion permission:', error);
           }
           return;
         }
       }

       // Note: Actual motion data requires event listeners, this just confirms support
       const motionSupported = true;
       if (targets.length > 0 && targets[0].isConnected) {
         targets[0].textContent = JSON.stringify({ supported: motionSupported });
       }

       if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
         debugLog('--device:motion:get: Motion API support confirmed');
       }
     } catch (error) {
       throw createInvokerError('--device:motion:get failed', ErrorSeverity.ERROR, {
         command: '--device:motion:get', cause: error as Error, recovery: 'Check device motion API support and permissions.'
       });
     }
   },

   /**
    * `--device:battery:get`: Gets battery status information.
    * @example `<button command="--device:battery:get" commandfor="#battery-display">Check Battery</button>`
    */
   "--device:battery:get": async ({ getTargets }: CommandContext) => {
     try {
        if (!('getBattery' in navigator) || typeof (navigator as any).getBattery !== 'function') {
          debugWarn('Invokers: Battery API not supported');
          return;
        }

       const targets = getTargets();

       try {
         const battery = await (navigator as any).getBattery();
         const data = {
           level: battery.level,
           charging: battery.charging,
           chargingTime: battery.chargingTime,
           dischargingTime: battery.dischargingTime
         };
         if (targets.length > 0 && targets[0].isConnected) {
           targets[0].textContent = JSON.stringify(data);
         }
         // Dispatch event
         document.dispatchEvent(new CustomEvent('device:battery:status', { detail: data }));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:battery:get: Battery status retrieved:', data);
         }
       } catch (batteryError) {
         throw createInvokerError('--device:battery:get failed: Error retrieving battery status', ErrorSeverity.ERROR, {
           command: '--device:battery:get', cause: batteryError as Error, recovery: 'Check battery API support.'
         });
       }
     } catch (error) {
       throw createInvokerError('--device:battery:get failed', ErrorSeverity.ERROR, {
         command: '--device:battery:get', cause: error as Error, recovery: 'Check battery API support.'
       });
     }
   },

   /**
    * `--device:clipboard:read`: Reads text from the clipboard.
    * @example `<button command="--device:clipboard:read" commandfor="#clipboard-input">Read Clipboard</button>`
    */
   "--device:clipboard:read": async ({ getTargets }: CommandContext) => {
     try {
        if (!navigator.clipboard?.readText) {
          debugWarn('Invokers: Clipboard read failed');
          return;
        }

       const targets = getTargets();

       try {
         const clipboardText = await navigator.clipboard.readText();
         if (targets.length > 0 && targets[0].isConnected) {
           if ('value' in targets[0]) {
             (targets[0] as HTMLInputElement).value = clipboardText;
           } else {
             targets[0].textContent = clipboardText;
           }
         }
         document.dispatchEvent(new CustomEvent('device:clipboard:read', { detail: clipboardText }));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:clipboard:read: Clipboard text read successfully');
         }
        } catch (clipboardError) {
          document.dispatchEvent(new CustomEvent('device:clipboard:denied'));
          debugWarn('Invokers: Clipboard read failed', clipboardError);
        }
     } catch (error) {
       throw createInvokerError('--device:clipboard:read failed', ErrorSeverity.ERROR, {
         command: '--device:clipboard:read', cause: error as Error, recovery: 'Check clipboard API support and permissions.'
       });
     }
   },

   /**
    * `--device:clipboard:write`: Writes text to the clipboard.
    * @example `<button command="--device:clipboard:write:Hello World">Copy Text</button>`
    */
   "--device:clipboard:write": async ({ invoker, params }: CommandContext) => {
     try {
        if (invoker && !invoker.isConnected) {
          throw createInvokerError('--device:clipboard:write failed: Invoker element not connected to DOM', ErrorSeverity.ERROR, {
            command: '--device:clipboard:write', element: invoker, recovery: 'Ensure the element is still in the document.'
          });
        }

       if (!navigator.clipboard?.writeText) {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:clipboard:write: Clipboard write not supported');
         }
         return;
       }

       const textToWrite = params.join(':');
       if (!textToWrite) {
         throw createInvokerError(
           'Clipboard write requires text to copy',
           ErrorSeverity.ERROR,
           {
             command: '--device:clipboard:write',
             element: invoker,
             recovery: 'Use --device:clipboard:write:text-to-copy'
           }
         );
       }

       try {
         await navigator.clipboard.writeText(textToWrite);
         document.dispatchEvent(new CustomEvent('device:clipboard:written', { detail: textToWrite }));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:clipboard:write: Text written to clipboard successfully');
         }
       } catch (clipboardError) {
         document.dispatchEvent(new CustomEvent('device:clipboard:denied'));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:clipboard:write: Clipboard write failed:', clipboardError);
         }
       }
     } catch (error) {
       throw createInvokerError('--device:clipboard:write failed', ErrorSeverity.ERROR, {
         command: '--device:clipboard:write', element: invoker, cause: error as Error, recovery: 'Check clipboard API support and text to write.'
       });
     }
   },

   /**
    * `--device:wake-lock`: Requests a wake lock to keep screen awake.
    * @example `<button command="--device:wake-lock">Keep Screen Awake</button>`
    */
   "--device:wake-lock": async (): Promise<void> => {
     try {
        if (!('wakeLock' in navigator) || typeof (navigator as any).wakeLock?.request !== 'function') {
          debugWarn('Invokers: Wake lock request failed');
          return;
        }

       try {
         const wakeLock = await (navigator as any).wakeLock.request('screen');
         // Store wake lock for potential release
         (window as any)._invokersWakeLock = wakeLock;

         document.dispatchEvent(new CustomEvent('device:wake-lock:acquired'));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:wake-lock: Wake lock acquired successfully');
         }
        } catch (wakeError) {
          document.dispatchEvent(new CustomEvent('device:wake-lock:denied'));
          debugWarn('Invokers: Wake lock request failed', wakeError);
        }
     } catch (error) {
       throw createInvokerError('--device:wake-lock failed', ErrorSeverity.ERROR, {
         command: '--device:wake-lock', cause: error as Error, recovery: 'Check wake lock API support.'
       });
     }
   },

   /**
    * `--device:wake-lock:release`: Releases the current wake lock.
    * @example `<button command="--device:wake-lock:release">Release Wake Lock</button>`
    */
   "--device:wake-lock:release": (): void => {
     try {
       if ((window as any)._invokersWakeLock) {
         (window as any)._invokersWakeLock.release();
         delete (window as any)._invokersWakeLock;
         document.dispatchEvent(new CustomEvent('device:wake-lock:released'));

         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugLog('--device:wake-lock:release: Wake lock released successfully');
         }
       } else {
         if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
           debugWarn('--device:wake-lock:release: No active wake lock to release');
         }
       }
     } catch (error) {
       throw createInvokerError('--device:wake-lock:release failed', ErrorSeverity.ERROR, {
         command: '--device:wake-lock:release', cause: error as Error, recovery: 'Check if wake lock was previously acquired.'
       });
     }
   }
};

/**
 * Registers all device API commands with the InvokerManager.
 * This includes vibration, geolocation, battery, clipboard, and wake lock functionality.
 *
 * @param manager - The InvokerManager instance to register commands with
 * @example
 * ```javascript
 * import { registerDeviceCommands } from 'invokers/commands/device';
 * import invokerManager from 'invokers';
 *
 * registerDeviceCommands(invokerManager);
 * ```
 */
export function registerDeviceCommands(manager: InvokerManager): void {
  for (const name in deviceCommands) {
    if (deviceCommands.hasOwnProperty(name)) {
      manager.register(name, deviceCommands[name]);
    }
  }
}
