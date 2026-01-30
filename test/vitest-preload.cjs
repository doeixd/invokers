// Polyfill for webidl-conversions issue with "get" property
if (typeof globalThis !== 'undefined' && typeof globalThis.get === 'undefined') {
  globalThis.get = function() {};
}

const abResizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable');
if (!abResizable) {
  Object.defineProperty(ArrayBuffer.prototype, 'resizable', {
    configurable: true,
    get() {
      return false;
    }
  });
}

const abMaxByteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'maxByteLength');
if (!abMaxByteLength) {
  Object.defineProperty(ArrayBuffer.prototype, 'maxByteLength', {
    configurable: true,
    get() {
      return this.byteLength;
    }
  });
}

if (typeof SharedArrayBuffer !== 'undefined') {
  const sabGrowable = Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'growable');
  if (!sabGrowable) {
    Object.defineProperty(SharedArrayBuffer.prototype, 'growable', {
      configurable: true,
      get() {
        return false;
      }
    });
  }

  const sabMaxByteLength = Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'maxByteLength');
  if (!sabMaxByteLength) {
    Object.defineProperty(SharedArrayBuffer.prototype, 'maxByteLength', {
      configurable: true,
      get() {
        return this.byteLength;
      }
    });
  }
}
