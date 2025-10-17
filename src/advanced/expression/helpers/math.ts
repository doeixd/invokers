/**
 * Math helper functions for expressions
 * These can be imported separately to reduce bundle size
 */

export const mathHelpers = {
  // Random functions
  random: (): number => Math.random(),

  randomInt: (min: number, max: number): number => {
    if (typeof min !== 'number' || typeof max !== 'number' || min >= max) return 0;
    return Math.floor(Math.random() * (max - min)) + min;
  },

  // Rounding functions
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

  // Min/Max functions
  min: (...args: number[]): number => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length > 0 ? Math.min(...nums) : 0;
  },

  max: (...args: number[]): number => {
    const nums = args.filter(n => typeof n === 'number' && !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  },

  // Basic math
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

  // Utility math
  clamp: (value: number, min: number, max: number): number => {
    if (typeof value !== 'number' || isNaN(value)) return min || 0;
    if (typeof min !== 'number' || isNaN(min)) min = 0;
    if (typeof max !== 'number' || isNaN(max)) max = 1;
    return Math.min(Math.max(value, min), max);
  },
};