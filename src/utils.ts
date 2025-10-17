// src/utils.ts
// Utility functions for the Invokers library

/**
 * Generates a unique identifier string.
 * Uses crypto.getRandomValues() for better randomness when available,
 * falls back to Math.random() for compatibility.
 *
 * @param prefix Optional prefix for the generated ID
 * @param length Length of the random part (default: 8, max: 32)
 * @returns A unique identifier string
 */
export function generateUid(prefix = 'invoker', length = 8): string {
  // Validate inputs
  if (typeof prefix !== 'string') {
    prefix = 'invoker';
  }

  if (typeof length !== 'number' || length < 1) {
    length = 8;
  } else if (length > 32) {
    length = 32; // Prevent excessive length
  }

  let randomPart = '';

  try {
    // Use crypto.getRandomValues if available (secure contexts)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(Math.ceil(length * 1.5)); // Generate more bytes for better entropy
      crypto.getRandomValues(array);
      // Convert to base36 for shorter, URL-safe strings
      randomPart = Array.from(array, byte => byte.toString(36)).join('').slice(0, length);
    } else {
      // Fallback to Math.random
      randomPart = Math.random().toString(36).substring(2, 2 + length);
    }
  } catch (error) {
    // If crypto fails for any reason, fallback to Math.random
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.warn('Invokers: crypto.getRandomValues failed, using Math.random fallback:', error);
    }
    randomPart = Math.random().toString(36).substring(2, 2 + length);
  }

  // Ensure we have a valid random part
  if (!randomPart || randomPart.length < 1) {
    randomPart = Date.now().toString(36) + Math.random().toString(36).substring(2, 4);
  }

  return `${prefix}-${randomPart}`;
}

/**
 * Sanitizes a string for use as an HTML ID attribute.
 * Removes invalid characters and ensures it starts with a letter.
 *
 * @param str The string to sanitize
 * @param fallbackPrefix Prefix for generated fallback IDs
 * @returns A valid HTML ID string
 */
export function sanitizeHtmlId(str: string, fallbackPrefix = 'id'): string {
  // Handle null, undefined, or non-string inputs
  if (str == null || typeof str !== 'string') {
    return generateUid(fallbackPrefix, 6);
  }

  // Handle empty strings
  const trimmed = str.trim();
  if (!trimmed) {
    return generateUid(fallbackPrefix, 6);
  }

  // Remove invalid characters, keep only letters, numbers, hyphens, underscores
  let sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');

  // Ensure it starts with a letter (HTML ID requirement)
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = fallbackPrefix + '-' + sanitized;
  }

  // Remove multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens and underscores
  sanitized = sanitized.replace(/^[-_]+|[-_]+$/g, '');

  // Ensure minimum length and valid format
  if (sanitized.length < 1 || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(sanitized)) {
    return generateUid(fallbackPrefix, 6);
  }

  // Limit maximum length to prevent issues
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
    // Make sure we don't end with invalid characters after truncation
    sanitized = sanitized.replace(/[-_]+$/, '');
  }

  return sanitized;
}

/**
 * Deep clones an object using JSON serialization.
 * Note: This doesn't handle functions, undefined values, Date objects, or circular references.
 * For more complex cloning needs, consider using a dedicated library.
 *
 * @param obj The object to clone
 * @returns A deep clone of the object, or the original value if not an object
 */
export function deepClone<T>(obj: T): T {
  // Handle primitive values and null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.slice() as T; // Shallow clone for arrays to preserve reference types
  }

  // For plain objects, use JSON serialization
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    // If JSON serialization fails (circular references, etc.), return shallow clone
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.warn('Invokers: deepClone failed, returning shallow clone:', error);
    }
    return { ...obj };
  }
}

/**
 * Safely gets a nested property from an object using dot notation.
 * Supports array indices (e.g., 'users.0.name').
 *
 * @param obj The object to traverse
 * @param path The property path (e.g., 'user.profile.name' or 'users.0.name')
 * @param defaultValue Default value if path doesn't exist
 * @returns The property value or default value
 */
export function getNestedProperty(obj: any, path: string, defaultValue: any = undefined): any {
  if (!path || typeof path !== 'string') {
    return defaultValue;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }

    // Handle array indices
    if (Array.isArray(current) && /^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      if (index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return defaultValue;
      }
    } else {
      current = current[key];
    }
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Sets a nested property on an object using dot notation.
 * Creates intermediate objects if they don't exist.
 * Supports array indices (e.g., 'users.0.name').
 *
 * @param obj The object to modify (will be mutated)
 * @param path The property path (e.g., 'user.profile.name' or 'users.0.name')
 * @param value The value to set
 * @returns true if successful, false otherwise
 */
export function setNestedProperty(obj: any, path: string, value: any): boolean {
  if (!path || typeof path !== 'string' || obj == null || typeof obj !== 'object') {
    return false;
  }

  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];

    // Handle array indices
    if (Array.isArray(current) && /^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      if (index < 0) {
        return false; // Negative indices not supported
      }

      // Extend array if necessary
      while (current.length <= index) {
        current.push({});
      }

      if (typeof current[index] !== 'object' || current[index] == null) {
        current[index] = {};
      }
      current = current[index];
    } else {
      // Regular object property
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
  }

  const finalKey = keys[keys.length - 1];

  // Handle final array index
  if (Array.isArray(current) && /^\d+$/.test(finalKey)) {
    const index = parseInt(finalKey, 10);
    if (index < 0) {
      return false;
    }

    // Extend array if necessary
    while (current.length <= index) {
      current.push(undefined);
    }

    current[index] = value;
  } else {
    current[finalKey] = value;
  }

  return true;
}