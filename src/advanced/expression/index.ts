// src/expression.ts

import { Lexer } from './lexer';
import { ExpressionParser, ASTNode } from './parser';
import { ExpressionEvaluator } from './evaluator';

// Simple LRU cache for parsed expressions
class ExpressionCache {
  private cache = new Map<string, ASTNode>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): ASTNode | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: ASTNode): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const expressionCache = new ExpressionCache();

// Rate limiting for expression evaluation
class ExpressionRateLimiter {
  private static readonly MAX_EVALUATIONS_PER_SECOND = 10000;
  private static readonly WINDOW_SIZE_MS = 1000;
  private evaluations: number[] = [];

  canEvaluate(): boolean {
    const now = Date.now();
    // Remove old evaluations outside the window
    this.evaluations = this.evaluations.filter(time => now - time < ExpressionRateLimiter.WINDOW_SIZE_MS);

    if (this.evaluations.length >= ExpressionRateLimiter.MAX_EVALUATIONS_PER_SECOND) {
      return false;
    }

    this.evaluations.push(now);
    return true;
  }
}

const rateLimiter = new ExpressionRateLimiter();

/**
 * Evaluates a safe expression within a given context.
 * Supports arithmetic, comparisons, logical operations, and property access.
 * @param expression The expression string to evaluate (e.g., "this.value.length > 10 ? 'Too long' : 'OK'")
 * @param context The context object containing values for the expression
 * @returns The result of evaluating the expression
 */
export interface ExpressionResult<T = any> {
  success: boolean;
  value?: T;
  error?: string;
}

export function evaluateExpression(expression: string, context: Record<string, any>): any {
  // Rate limiting check
  if (!rateLimiter.canEvaluate()) {
    console.warn('Invokers: Expression evaluation rate limit exceeded');
    return undefined;
  }

  try {
    // Check cache first
    let ast = expressionCache.get(expression);
    if (!ast) {
      // Parse and cache the expression
      const lexer = new Lexer();
      const tokens = lexer.tokenize(expression);
      const parser = new ExpressionParser(tokens);
      ast = parser.parse();
      expressionCache.set(expression, ast);
    }

    // Include helper functions in context
    const enhancedContext = {
      ...expressionHelpers,
      ...context
    };

    const evaluator = new ExpressionEvaluator(enhancedContext, true); // Allow functions for helpers
    return evaluator.evaluate(ast);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Re-throw security-related and structural errors
    if (errorMessage.includes('not allowed') ||
        errorMessage.includes('potentially unsafe') ||
        errorMessage.includes('invalid characters') ||
        errorMessage.includes('Maximum recursion depth') ||
        errorMessage.includes('Expression too')) {
      throw error;
    }
    if (errorMessage.includes('Maximum call stack')) {
      throw new Error('Invokers Expression Error: Maximum recursion depth exceeded');
    }
    console.error(`Invokers Expression Error in "${expression}": ${errorMessage}`);
    return undefined;
  }
}

/**
 * Evaluates a safe expression and returns a Result object for better error handling.
 * @param expression The expression string to evaluate
 * @param context The context object containing values for the expression
 * @returns A Result object with success/value or error information
 */
export function evaluateExpressionSafe<T = any>(expression: string, context: Record<string, any>): ExpressionResult<T> {
  try {
    const result = evaluateExpression(expression, context);
    return { success: true, value: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// --- Expression Helper Functions ---

/**
 * Built-in helper functions available in expressions
 */
export const expressionHelpers = {
  // String helpers
  capitalize: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str: string, length: number): string => {
    if (typeof str !== 'string') return '';
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  },

  pluralize: (count: number, singular: string, plural?: string): string => {
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${count} ${word}`;
  },

  // Additional String Functions (Phase 4)
  concat: (...args: any[]): string => {
    return args.map(arg => String(arg || '')).join('');
  },

  uppercase: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.toUpperCase();
  },

  lowercase: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.toLowerCase();
  },

  trim: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.trim();
  },

  replace: (str: string, search: string, replacement: string): string => {
    if (typeof str !== 'string') return '';
    if (typeof search !== 'string') return str;
    return str.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement || '');
  },

  substring: (str: string, start: number, end?: number): string => {
    if (typeof str !== 'string') return '';
    if (typeof start !== 'number' || isNaN(start)) return str;
    return str.substring(start, end);
  },

  charAt: (str: string, index: number): string => {
    if (typeof str !== 'string') return '';
    if (typeof index !== 'number' || isNaN(index)) return '';
    return str.charAt(index);
  },

  includes: (str: string, search: string): boolean => {
    if (typeof str !== 'string' || typeof search !== 'string') return false;
    return str.includes(search);
  },

  startsWith: (str: string, search: string): boolean => {
    if (typeof str !== 'string' || typeof search !== 'string') return false;
    return str.startsWith(search);
  },

  endsWith: (str: string, search: string): boolean => {
    if (typeof str !== 'string' || typeof search !== 'string') return false;
    return str.endsWith(search);
  },

  // Array helpers
  join: (arr: any[], separator = ', '): string => {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator);
  },

  filter: (arr: any[], predicate: string | ((item: any) => boolean)): any[] => {
    if (!Array.isArray(arr)) return [];
    if (typeof predicate === 'string') {
      // Simple property filter like 'active'
      return arr.filter(item => item && item[predicate]);
    }
    if (typeof predicate === 'function') {
      return arr.filter(predicate);
    }
    return arr;
  },

  sort: (arr: any[], property?: string): any[] => {
    if (!Array.isArray(arr)) return [];
    if (!property) return [...arr].sort();
    return [...arr].sort((a, b) => {
      const aVal = a?.[property];
      const bVal = b?.[property];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  },

  // Additional Array Functions (Phase 4)
  randomChoice: (arr: any[]): any => {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Invokers: randomChoice called with:', arr);
    }
    if (!Array.isArray(arr) || arr.length === 0) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        console.log('Invokers: randomChoice returning undefined - not array or empty');
      }
      return undefined;
    }
    const index = Math.floor(Math.random() * arr.length);
    const result = arr[index];
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      console.log('Invokers: randomChoice result:', result, 'from index', index);
    }
    return result;
  },

  arrayGenerate: (count: number, generator?: (index: number) => any): any[] => {
    if (typeof count !== 'number' || count < 0 || count > 1000) return [];
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(generator ? generator(i) : i);
    }
    return result;
  },

  arrayMap: (arr: any[], mapper: (item: any, index: number) => any): any[] => {
    if (!Array.isArray(arr)) return [];
    if (typeof mapper !== 'function') return arr;
    return arr.map(mapper);
  },

  arrayFilter: (arr: any[], predicate: (item: any, index: number) => boolean): any[] => {
    if (!Array.isArray(arr)) return [];
    if (typeof predicate !== 'function') return arr;
    return arr.filter(predicate);
  },

  arraySlice: (arr: any[], start?: number, end?: number): any[] => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(start, end);
  },

  arrayJoin: (arr: any[], separator = ','): string => {
    if (!Array.isArray(arr)) return '';
    return arr.join(separator);
  },

  arrayLength: (arr: any[]): number => {
    if (!Array.isArray(arr)) return 0;
    return arr.length;
  },

  arrayFirst: (arr: any[]): any => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[0];
  },

  arrayLast: (arr: any[]): any => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    return arr[arr.length - 1];
  },

  arrayIncludes: (arr: any[], item: any): boolean => {
    if (!Array.isArray(arr)) return false;
    return arr.includes(item);
  },

  arrayIndexOf: (arr: any[], item: any): number => {
    if (!Array.isArray(arr)) return -1;
    return arr.indexOf(item);
  },

  arrayReverse: (arr: any[]): any[] => {
    if (!Array.isArray(arr)) return [];
    return [...arr].reverse();
  },

  arraySort: (arr: any[], compareFn?: (a: any, b: any) => number): any[] => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort(compareFn);
  },

  arrayReduce: (arr: any[], reducer: (accumulator: any, current: any, index: number) => any, initialValue?: any): any => {
    if (!Array.isArray(arr)) return initialValue;
    if (typeof reducer !== 'function') return initialValue;
    return arr.reduce(reducer, initialValue);
  },

  // Date/time helpers
  formatDate: (date: Date | string | number, format = 'MM/dd/yyyy'): string => {
    try {
      let d: Date;

      // Handle string dates in YYYY-MM-DD format explicitly to avoid timezone issues
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, day] = date.split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(date);
      }

      if (isNaN(d.getTime())) return '';

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      return format
        .replace(/yyyy/g, String(year))
        .replace(/MM/g, month)
        .replace(/dd/g, day);
    } catch {
      return '';
    }
  },

  timeAgo: (date: Date | string | number): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  },

  // Additional Date Functions (Phase 4)
  now: (): Date => new Date(),

  // Number helpers
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

  // Math Functions (Phase 4)
  random: (): number => Math.random(),

  randomInt: (min: number, max: number): number => {
    if (typeof min !== 'number' || typeof max !== 'number' || min >= max) return 0;
    return Math.floor(Math.random() * (max - min)) + min;
  },

  floor: (num: number): number => {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.floor(num);
  },

  ceil: (num: number): number => {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.ceil(num);
  },

  round: (num: number): number => {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.round(num);
  },

  min: (...args: number[]): number => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length > 0 ? Math.min(...nums) : 0;
  },

  max: (...args: number[]): number => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  },

  abs: (num: number): number => {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.abs(num);
  },

  pow: (base: number, exponent: number): number => {
    if (typeof base !== 'number' || typeof exponent !== 'number' || isNaN(base) || isNaN(exponent)) return 0;
    return Math.pow(base, exponent);
  },

  sqrt: (num: number): number => {
    if (typeof num !== 'number' || isNaN(num) || num < 0) return 0;
    return Math.sqrt(num);
  },

  clamp: (value: number, min: number, max: number): number => {
    if (typeof value !== 'number' || isNaN(value)) return min || 0;
    if (typeof min !== 'number' || isNaN(min)) min = 0;
    if (typeof max !== 'number' || isNaN(max)) max = 1;
    return Math.min(Math.max(value, min), max);
  },

  // Utility helpers
  isEmpty: (value: any): boolean => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  isNotEmpty: (value: any): boolean => {
    return !expressionHelpers.isEmpty(value);
  },

  // Conditional Functions (Phase 4)
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

  // Type Functions (Phase 4)
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

  // Object Functions (Phase 4)
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

  // Additional Utility Functions (Phase 4)
  range: (start: number, end: number, step = 1): number[] => {
    if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number') return [];
    if (step === 0 || (start < end && step < 0) || (start > end && step > 0)) return [];

    const result = [];
    if (start < end) {
      for (let i = start; i < end; i += step) {
        result.push(i);
      }
    } else {
      for (let i = start; i > end; i += step) {
        result.push(i);
      }
    }
    return result.slice(0, 1000); // Limit size
  },

  repeat: (value: any, count: number): any[] => {
    if (typeof count !== 'number' || count < 0 || count > 1000) return [];
    return new Array(count).fill(value);
  },

  pad: (str: string, length: number, char = ' '): string => {
    if (typeof str !== 'string') str = String(str || '');
    if (typeof length !== 'number' || length < 0) return str;
    if (typeof char !== 'string' || char.length !== 1) char = ' ';

    if (str.length >= length) return str;
    const padding = char.repeat(length - str.length);
    return str + padding;
  },

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

  sanitize: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
  },
};

/**
 * Enhanced evaluateExpression that includes helper functions in context
 */
export function evaluateExpressionWithHelpers(expression: string, context: Record<string, any>): any {
  const enhancedContext = {
    ...expressionHelpers,
    ...context
  };
  return evaluateExpression(expression, enhancedContext);
}