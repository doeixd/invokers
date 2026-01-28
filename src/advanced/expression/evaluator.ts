// src/expression-evaluator.ts

import { ASTNode, ASTNodeType } from './parser';
import { hasExpressionFunction, callExpressionFunction } from '../expressions';

export class ExpressionEvaluator {
  private context: Record<string, any>;
  private static readonly MAX_RECURSION_DEPTH = 100;
  private recursionDepth = 0;

  constructor(context: Record<string, any>, allowFunctions = false) {
    this.context = this.sanitizeContext(context, allowFunctions);
  }

  private sanitizeContext(context: Record<string, any>, allowFunctions = false): Record<string, any> {
    // Create a safe context that prevents access to dangerous properties
    const safeContext: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.isSafeProperty(key)) {
        safeContext[key] = this.sanitizeValue(value, allowFunctions);
      }
    }

    return safeContext;
  }

  private sanitizeValue(value: any, allowFunctions = false): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'function') {
      // Allow functions if explicitly permitted (for expression helpers)
      if (allowFunctions) {
        return value;
      }
      // Block functions for security - they could be dangerous
      return undefined;
    }

    if (Array.isArray(value)) {
      return value.slice(0, 1000); // Limit array size
    }

    if (typeof value === 'object' && value !== null) {
      // Allow DOM objects for interpolation but sanitize their properties
      if (value.constructor !== Object && !Array.isArray(value)) {
        // For DOM objects, create a safe proxy that only allows safe property access
        return this.createSafeDOMObject(value);
      }
      // Limit object depth and size
      return this.sanitizeObject(value, 0);
    }

    return value;
  }

  private sanitizeObject(obj: any, depth: number): any {
    if (depth > 50) return {}; // Prevent deep nesting

    const safeObj: Record<string, any> = {};
    let count = 0;

    for (const [key, value] of Object.entries(obj)) {
      if (count >= 50) break; // Limit object size
      if (this.isSafeProperty(key)) {
        safeObj[key] = this.sanitizeValue(value);
        count++;
      }
    }

    return safeObj;
  }

  private isSafeProperty(key: string): boolean {
    return !key.startsWith('__') &&
           !['prototype', 'constructor', '__proto__', 'window', 'document', 'eval', 'Function'].includes(key) &&
           key.length <= 50; // Reasonable key length limit
  }

  private createSafeDOMObject(domObject: any): any {
    // Create a proxy that only allows access to safe properties
    return new Proxy(domObject, {
      get: (target, property) => {
        if (typeof property === 'string' && this.isSafeProperty(property)) {
          const value = target[property];
          // Don't allow functions or dangerous values
          if (typeof value === 'function') {
            return undefined;
          }
          // For primitive values, return them directly
          if (typeof value !== 'object' || value === null) {
            return value;
          }
          // For nested objects, sanitize them
          return this.sanitizeValue(value);
        }
        return undefined;
      },
      set: () => false, // Don't allow setting properties
      has: (target, property) => {
        return typeof property === 'string' && this.isSafeProperty(property) && property in target;
      }
    });
  }

  public evaluate(node: ASTNode): any {
    if (this.recursionDepth > ExpressionEvaluator.MAX_RECURSION_DEPTH) {
      throw new Error('Invokers Expression Error: Maximum recursion depth exceeded');
    }

    this.recursionDepth++;
    try {
      switch (node.type) {
        case ASTNodeType.LITERAL:
          return node.value;

        case ASTNodeType.IDENTIFIER:
          return this.resolveIdentifier(node.value!);

        case ASTNodeType.BINARY_OP:
          return this.evaluateBinaryOp(node);

        case ASTNodeType.UNARY_OP:
          return this.evaluateUnaryOp(node);

        case ASTNodeType.MEMBER_ACCESS:
          return this.evaluateMemberAccess(node);

        case ASTNodeType.ARRAY_ACCESS:
          return this.evaluateArrayAccess(node);

        case ASTNodeType.CONDITIONAL:
          return this.evaluateConditional(node);

        case ASTNodeType.CALL_EXPRESSION:
          return this.evaluateCallExpression(node);

        default:
          throw new Error(`Invokers Expression Error: Unknown AST node type: ${(node as any).type}`);
      }
    } finally {
      this.recursionDepth--;
    }
  }

  /**
   * Evaluates an expression with access to data contexts
   */
  public evaluateWithContexts(node: ASTNode, dataContexts: Record<string, Record<string, any>>): any {
    // Temporarily extend context with data contexts
    const originalContext = this.context;
    this.context = { ...this.context, ...dataContexts };

    try {
      return this.evaluate(node);
    } finally {
      this.context = originalContext;
    }
  }




  private evaluateBinaryOp(node: ASTNode): any {
    const left = this.evaluate(node.left!);
    const right = this.evaluate(node.right!);
    const _op = node.operator!;

    // Handle NaN and undefined comparisons specially
    if ((left === undefined || left === null || Number.isNaN(left)) ||
        (right === undefined || right === null || Number.isNaN(right))) {
      switch (_op) {
        case '===':
          return left === right;
        case '!==':
          return left !== right;
        case '==':
          return left == right; // eslint-disable-line eqeqeq
        case '!=':
          return left != right; // eslint-disable-line eqeqeq
        case '&&':
          return left && right;
        case '||':
          return left || right;
        default:
          // For arithmetic operations with undefined/NaN, return NaN
          if (['+', '-', '*', '/', '%'].includes(_op)) {
            return Number.NaN;
          }
          // For comparisons with undefined/NaN, return false
          return false;
      }
    }

    switch (_op) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right === 0) throw new Error('Invokers Expression Error: Division by zero');
        return left / right;
      case '%':
        return left % right;
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '==':
        return left == right; // eslint-disable-line eqeqeq
      case '!=':
        return left != right; // eslint-disable-line eqeqeq
      case '<':
        return left < right;
      case '>':
        return left > right;
      case '<=':
        return left <= right;
      case '>=':
        return left >= right;
      case '&&':
        return left && right;
      case '||':
        return left || right;
      default:
        throw new Error(`Invokers Expression Error: Unknown binary operator: ${_op}`);
    }
  }

  private evaluateUnaryOp(node: ASTNode): any {
    const right = this.evaluate(node.right!);
    const op = node.operator!;

    switch (op) {
      case '!':
        return !right;
      case '-':
        return -right;
      default:
        throw new Error(`Invokers Expression Error: Unknown unary operator: ${op}`);
    }
  }

  private evaluateMemberAccess(node: ASTNode): any {
    const object = this.evaluate(node.object!);
    if (object != null && (typeof object === 'object' || typeof object === 'string')) {
      const property = node.property!;
      if (typeof property === 'string' && this.isSafeProperty(property)) {
        return object[property];
      }
    }
    return undefined;
  }

  private evaluateArrayAccess(node: ASTNode): any {
    const object = this.evaluate(node.object!);
    const index = this.evaluate(node.index!);

    // Validate index to prevent prototype pollution and other attacks
    if (typeof index === 'string') {
      if (!this.isSafeProperty(index)) {
        return undefined;
      }
    } else if (typeof index === 'number') {
      if (index < 0 || index > 10000 || !Number.isInteger(index)) {
        return undefined; // Prevent negative indices and very large indices
      }
    } else {
      return undefined; // Only allow string or integer indices
    }

    if (object && (typeof object === 'object' || Array.isArray(object)) && index in object) {
      return object[index];
    }
    return undefined;
  }

  private resolveIdentifier(name: string): any {
    if (!this.isSafeProperty(name)) {
      throw new Error(`Invokers Expression Error: Access to '${name}' is not allowed`);
    }
    if (name in this.context) {
      return this.context[name];
    }
    return undefined;
  }

  private evaluateConditional(node: ASTNode): any {
    const test = this.evaluate(node.test!);
    return test ? this.evaluate(node.consequent!) : this.evaluate(node.alternate!);
  }

  private evaluateCallExpression(node: ASTNode): any {
    // First check if it's a registered expression function
    if (node.callee!.type === ASTNodeType.IDENTIFIER) {
      const functionName = node.callee!.value as string;
      if (hasExpressionFunction(functionName)) {
        const args = node.args!.map(arg => this.evaluate(arg));
        return callExpressionFunction(functionName, ...args);
      }
    }

    // Fall back to context function
    const callee = this.evaluate(node.callee!);
    if (typeof callee !== 'function') {
      throw new Error(`Invokers Expression Error: '${(node.callee as any).value}' is not a function`);
    }
    const args = node.args!.map(arg => this.evaluate(arg));
    return callee(...args);
  }

  /**
   * Gets a data context by key (for use in expressions)
   */
  public getDataContext(_key: string): Record<string, any> {
    // This will be overridden by the expression evaluation system
    return {};
  }

  /**
   * Sets a data context (for use in expressions)
   */
  public setDataContext(_key: string, _data: Record<string, any>): void {
    // This will be overridden by the expression evaluation system
  }
}
