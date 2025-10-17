/**
 * String helper functions for expressions
 * These can be imported separately to reduce bundle size
 */

export const stringHelpers = {
  // Basic string operations
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

  capitalize: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // String manipulation
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

  // String checking
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

  // String formatting
  truncate: (str: string, length: number): string => {
    if (typeof str !== 'string') return '';
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
  },

  pad: (str: string, length: number, char = ' '): string => {
    if (typeof str !== 'string') str = String(str || '');
    if (typeof length !== 'number' || length < 0) return str;
    if (typeof char !== 'string' || char.length !== 1) char = ' ';

    if (str.length >= length) return str;
    const padding = char.repeat(length - str.length);
    return str + padding;
  },

  // String utilities
  sanitize: (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
  },

  pluralize: (count: number, singular: string, plural?: string): string => {
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${count} ${word}`;
  },
};