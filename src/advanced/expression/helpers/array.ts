/**
 * Array helper functions for expressions
 * These can be imported separately to reduce bundle size
 */
import { debugLog } from '../../../utils';
export const arrayHelpers = {
  // Array creation and generation
  randomChoice: (arr: any[]): any => {
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: randomChoice called with:', arr);
    }
    if (!Array.isArray(arr) || arr.length === 0) {
      if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
        debugLog('Invokers: randomChoice returning undefined - not array or empty');
      }
      return undefined;
    }
    const index = Math.floor(Math.random() * arr.length);
    const result = arr[index];
    if (typeof window !== 'undefined' && (window as any).Invoker?.debug) {
      debugLog('Invokers: randomChoice result:', result, 'from index', index);
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

  // Array transformation
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

  // Array access
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

  arrayIndexOf: (arr: any[], item: any): number => {
    if (!Array.isArray(arr)) return -1;
    return arr.indexOf(item);
  },

  // Array checking
  arrayIncludes: (arr: any[], item: any): boolean => {
    if (!Array.isArray(arr)) return false;
    return arr.includes(item);
  },

  // Legacy compatibility
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
};
