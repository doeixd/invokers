/**
 * Utility helper functions for expressions
 * These can be imported separately to reduce bundle size
 */

export const utilityHelpers = {
  // Number formatting
  formatNumber: (num: number, options?: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }): string => {
    if (typeof num !== 'number' || isNaN(num)) return '0';

    const { locale = 'en-US', minimumFractionDigits = 0, maximumFractionDigits = 2 } = options || {};
    try {
      return num.toLocaleString(locale, { minimumFractionDigits, maximumFractionDigits });
    } catch {
      return num.toString();
    }
  },

  formatCurrency: (amount: number, currency = 'USD', locale = 'en-US'): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';

    try {
      return amount.toLocaleString(locale, {
        style: 'currency',
        currency: currency.toUpperCase()
      });
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  },

  // JSON utilities
  parseJSON: (str: string): any => {
    if (typeof str !== 'string') return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },

  stringify: (value: any, indent?: number): string => {
    try {
      return JSON.stringify(value, null, indent);
    } catch {
      return String(value);
    }
  },

  // Conditional utilities
  if: (condition: any, trueValue: any, falseValue: any): any => {
    return condition ? trueValue : falseValue;
  },

  coalesce: (...args: any[]): any => {
    for (const arg of args) {
      if (arg != null && arg !== '') return arg;
    }
    return null;
  },

  nullish: (...args: any[]): any => {
    for (const arg of args) {
      if (arg != null) return arg;
    }
    return null;
  },

  // Type checking
  typeof: (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  },

  isArray: (value: any): boolean => Array.isArray(value),

  isObject: (value: any): boolean => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },

  isString: (value: any): boolean => typeof value === 'string',

  isNumber: (value: any): boolean => typeof value === 'number' && !isNaN(value),

  isBoolean: (value: any): boolean => typeof value === 'boolean',

  isNull: (value: any): boolean => value === null,

  isUndefined: (value: any): boolean => value === undefined,

  // Emptiness checking
  isEmpty: (value: any): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  isNotEmpty: (value: any): boolean => {
    return !utilityHelpers.isEmpty(value);
  },

  // Object utilities
  keys: (obj: any): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  },

  values: (obj: any): any[] => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj);
  },

  entries: (obj: any): [string, any][] => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj);
  },

  hasProperty: (obj: any, prop: string): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    return prop in obj;
  },

  getProperty: (obj: any, prop: string, defaultValue?: any): any => {
    if (!obj || typeof obj !== 'object') return defaultValue;
    return obj[prop] !== undefined ? obj[prop] : defaultValue;
  },

  setProperty: (obj: any, prop: string, value: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    obj[prop] = value;
    return obj;
  },
};
