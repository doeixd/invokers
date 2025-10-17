// test/expression.test.ts

import { describe, it, expect } from 'vitest';
import { evaluateExpression } from '../src/advanced/expression';
import { interpolateString } from '../src/advanced/interpolation';

describe('Expression Evaluation', () => {
  const context = {
    this: {
      value: 'hello world',
      count: 42,
      items: [1, 2, 3],
      nested: {
        prop: 'nested value'
      }
    },
    event: {
      type: 'click',
      detail: {
        message: 'test message'
      }
    }
  };

  describe('Literals', () => {
    it('should evaluate numbers', () => {
      expect(evaluateExpression('42', context)).toBe(42);
      expect(evaluateExpression('3.14', context)).toBe(3.14);
    });

    it('should evaluate strings', () => {
      expect(evaluateExpression('"hello"', context)).toBe('hello');
      expect(evaluateExpression("'world'", context)).toBe('world');
    });

    it('should evaluate booleans', () => {
      expect(evaluateExpression('true', context)).toBe(true);
      expect(evaluateExpression('false', context)).toBe(false);
    });

    it('should evaluate null', () => {
      expect(evaluateExpression('null', context)).toBe(null);
    });
  });

  describe('Property Access', () => {
    it('should access this properties', () => {
      expect(evaluateExpression('this.value', context)).toBe('hello world');
      expect(evaluateExpression('this.count', context)).toBe(42);
    });

    it('should access nested properties', () => {
      expect(evaluateExpression('this.nested.prop', context)).toBe('nested value');
      expect(evaluateExpression('event.detail.message', context)).toBe('test message');
    });

    it('should handle array access', () => {
      expect(evaluateExpression('this.items[0]', context)).toBe(1);
      expect(evaluateExpression('this.items[2]', context)).toBe(3);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should perform addition', () => {
      expect(evaluateExpression('2 + 3', context)).toBe(5);
      expect(evaluateExpression('this.count + 8', context)).toBe(50);
    });

    it('should perform subtraction', () => {
      expect(evaluateExpression('10 - 4', context)).toBe(6);
      expect(evaluateExpression('this.count - 2', context)).toBe(40);
    });

    it('should perform multiplication', () => {
      expect(evaluateExpression('3 * 4', context)).toBe(12);
      expect(evaluateExpression('this.count * 2', context)).toBe(84);
    });

    it('should perform division', () => {
      expect(evaluateExpression('8 / 2', context)).toBe(4);
      expect(evaluateExpression('this.count / 2', context)).toBe(21);
    });

    it('should perform modulo', () => {
      expect(evaluateExpression('7 % 3', context)).toBe(1);
      expect(evaluateExpression('this.count % 10', context)).toBe(2);
    });
  });

  describe('Comparison Operations', () => {
    it('should perform equality comparisons', () => {
      expect(evaluateExpression('2 === 2', context)).toBe(true);
      expect(evaluateExpression('2 === 3', context)).toBe(false);
      expect(evaluateExpression('2 == 2', context)).toBe(true);
      expect(evaluateExpression('2 == "2"', context)).toBe(true);
    });

    it('should perform inequality comparisons', () => {
      expect(evaluateExpression('2 !== 3', context)).toBe(true);
      expect(evaluateExpression('2 !== 2', context)).toBe(false);
      expect(evaluateExpression('2 != 3', context)).toBe(true);
      expect(evaluateExpression('2 != "2"', context)).toBe(false);
    });

    it('should perform relational comparisons', () => {
      expect(evaluateExpression('2 < 3', context)).toBe(true);
      expect(evaluateExpression('3 > 2', context)).toBe(true);
      expect(evaluateExpression('2 <= 2', context)).toBe(true);
      expect(evaluateExpression('3 >= 3', context)).toBe(true);
    });
  });

  describe('Logical Operations', () => {
    it('should perform logical AND', () => {
      expect(evaluateExpression('true && true', context)).toBe(true);
      expect(evaluateExpression('true && false', context)).toBe(false);
      expect(evaluateExpression('this.count > 40 && this.count < 50', context)).toBe(true);
    });

    it('should perform logical OR', () => {
      expect(evaluateExpression('true || false', context)).toBe(true);
      expect(evaluateExpression('false || false', context)).toBe(false);
      expect(evaluateExpression('this.count > 50 || this.count < 50', context)).toBe(true);
    });
  });

  describe('Unary Operations', () => {
    it('should perform logical NOT', () => {
      expect(evaluateExpression('!true', context)).toBe(false);
      expect(evaluateExpression('!false', context)).toBe(true);
      expect(evaluateExpression('!(this.count > 50)', context)).toBe(true);
    });

    it('should perform unary minus', () => {
      expect(evaluateExpression('-5', context)).toBe(-5);
      expect(evaluateExpression('-this.count', context)).toBe(-42);
    });
  });

  describe('Conditional (Ternary) Operations', () => {
    it('should evaluate conditional expressions', () => {
      expect(evaluateExpression('true ? "yes" : "no"', context)).toBe('yes');
      expect(evaluateExpression('false ? "yes" : "no"', context)).toBe('no');
      expect(evaluateExpression('this.count > 40 ? "big" : "small"', context)).toBe('big');
    });

    it('should handle nested conditionals', () => {
      expect(evaluateExpression('this.count > 50 ? "large" : this.count > 20 ? "medium" : "small"', context)).toBe('medium');
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate complex expressions', () => {
      expect(evaluateExpression('this.value', context)).toBe('hello world');
      expect(evaluateExpression('this.value.length', context)).toBe(11);
      expect(evaluateExpression('this.value.length > 5', context)).toBe(true);
      expect(evaluateExpression('this.value.length > 5 ? "HELLO WORLD" : "short"', context)).toBe('HELLO WORLD');
      expect(evaluateExpression('(this.count * 2) + 10', context)).toBe(94);
      expect(evaluateExpression('this.items.length === 3 && this.count > 40', context)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle division by zero', () => {
      expect(evaluateExpression('5 / 0', context)).toBeUndefined();
    });

    it('should handle invalid expressions gracefully', () => {
      expect(evaluateExpression('invalid expression +++', context)).toBeUndefined();
      expect(evaluateExpression('this.nonexistent.property.deep', context)).toBeUndefined();
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    describe('Nested Property Access', () => {
      it('should handle deeply nested property chains', () => {
        const deepContext = {
          this: {
            level1: {
              level2: {
                level3: {
                  value: 'deep value',
                  array: [1, 2, { nested: 'item' }]
                }
              }
            }
          }
        };
        expect(evaluateExpression('this.level1.level2.level3.value', deepContext)).toBe('deep value');
        expect(evaluateExpression('this.level1.level2.level3.array[2].nested', deepContext)).toBe('item');
      });

      it('should handle property access on undefined intermediates', () => {
        expect(evaluateExpression('this.missing.level3.value', context)).toBeUndefined();
        expect(evaluateExpression('this.value.missing.property', context)).toBeUndefined();
      });
    });

    describe('Complex Operator Precedence', () => {
      it('should handle mixed arithmetic and comparison operators', () => {
        expect(evaluateExpression('2 + 3 * 4 > 10 && 5 < 10', context)).toBe(true);
        expect(evaluateExpression('this.count + 5 * 2 === 52', context)).toBe(true);
      });

      it('should handle logical operator precedence', () => {
        expect(evaluateExpression('true || false && false', context)).toBe(true);
        expect(evaluateExpression('false && true || true', context)).toBe(true);
      });

      it('should handle unary operators with precedence', () => {
        expect(evaluateExpression('!this.count > 40 && true', context)).toBe(false);
        expect(evaluateExpression('-this.count + 50', context)).toBe(8);
      });
    });

    describe('String Operations', () => {
      it('should handle string property access', () => {
        expect(evaluateExpression('this.value.length', context)).toBe(11);
        // Note: String methods are accessible but not callable in our safe evaluator
        expect(typeof evaluateExpression('this.value.toUpperCase', context)).toBe('function');
      });

      it('should handle string concatenation via addition', () => {
        expect(evaluateExpression('"hello" + " " + "world"', context)).toBe('hello world');
        expect(evaluateExpression('this.value + " test"', context)).toBe('hello world test');
      });
    });

    describe('Array Access Edge Cases', () => {
      it('should handle array access with expressions', () => {
        expect(evaluateExpression('this.items[0]', context)).toBe(1);
        expect(evaluateExpression('this.items[this.items.length - 1]', context)).toBe(3);
      });

      it('should handle out-of-bounds array access', () => {
        expect(evaluateExpression('this.items[10]', context)).toBeUndefined();
        expect(evaluateExpression('this.items[-1]', context)).toBeUndefined();
      });

      it('should handle nested array access', () => {
        const nestedArrayContext = {
          this: {
            matrix: [[1, 2], [3, 4], [5, 6]]
          }
        };
        expect(evaluateExpression('this.matrix[1][0]', nestedArrayContext)).toBe(3);
        expect(evaluateExpression('this.matrix[2][1]', nestedArrayContext)).toBe(6);
      });
    });

    describe('Ternary Operator Edge Cases', () => {
      it('should handle nested ternary operators', () => {
        expect(evaluateExpression('this.count > 50 ? "large" : this.count > 30 ? "medium" : "small"', context)).toBe('medium');
        expect(evaluateExpression('this.count > 50 ? "big" : this.count < 30 ? "small" : "medium"', context)).toBe('medium');
      });

      it('should handle ternary with complex conditions', () => {
        expect(evaluateExpression('this.value.length > 10 && this.count > 40 ? "valid" : "invalid"', context)).toBe('valid');
      });

      it('should handle ternary with different value types', () => {
        expect(evaluateExpression('true ? 42 : "string"', context)).toBe(42);
        expect(evaluateExpression('false ? 42 : null', context)).toBe(null);
      });
    });

    describe('Parentheses and Grouping', () => {
      it('should handle deeply nested parentheses', () => {
        expect(evaluateExpression('((2 + 3) * (4 + 5))', context)).toBe(45);
        expect(evaluateExpression('(this.count + 10) * 2', context)).toBe(104); // (42 + 10) * 2 = 52 * 2 = 104
      });

      it('should handle parentheses affecting precedence', () => {
        expect(evaluateExpression('2 + 3 * 4', context)).toBe(14);
        expect(evaluateExpression('(2 + 3) * 4', context)).toBe(20);
        expect(evaluateExpression('this.count > 40 && (this.value.length > 5 || false)', context)).toBe(true);
      });
    });

    describe('Null and Undefined Handling', () => {
      it('should handle null values in expressions', () => {
        const nullContext = {
          this: {
            value: null,
            count: 42
          }
        };
        expect(evaluateExpression('this.value === null', nullContext)).toBe(true);
        expect(evaluateExpression('this.value || "default"', nullContext)).toBe('default');
      });

      it('should handle undefined property access', () => {
        expect(evaluateExpression('this.undefinedProp', context)).toBeUndefined();
        expect(evaluateExpression('this.undefinedProp || "fallback"', context)).toBe('fallback');
      });
    });

    describe('Type Coercion', () => {
      it('should handle loose equality with type coercion', () => {
        expect(evaluateExpression('2 == "2"', context)).toBe(true);
        expect(evaluateExpression('0 == false', context)).toBe(true);
        expect(evaluateExpression('1 == true', context)).toBe(true);
      });

      it('should handle strict equality without coercion', () => {
        expect(evaluateExpression('2 === "2"', context)).toBe(false);
        expect(evaluateExpression('0 === false', context)).toBe(false);
        expect(evaluateExpression('null === undefined', context)).toBe(false);
      });
    });

    describe('Complex Expression Combinations', () => {
      it('should handle very complex nested expressions', () => {
        const complexExpr = `
          this.count > 40
            ? (this.value.length * 2 + this.items.length) > 20
              ? "complex true"
              : "complex false"
            : "too small"
        `.replace(/\s+/g, ' ').trim();

        expect(evaluateExpression(complexExpr, context)).toBe('complex true');
      });

      it('should handle expressions with multiple array operations', () => {
        const arrayContext = {
          this: {
            data: [10, 20, 30, 40, 50],
            index: 2
          }
        };
        expect(evaluateExpression('this.data[this.index] + this.data[this.index + 1]', arrayContext)).toBe(70); // data[2] + data[3] = 30 + 40 = 70
      });

      it('should handle randomChoice function', () => {
        const randomContext = {
          adjectives: ['pretty', 'large', 'small'],
          colors: ['red', 'blue', 'green']
        };
        const result = evaluateExpression('randomChoice(adjectives)', randomContext);
        expect(['pretty', 'large', 'small']).toContain(result);
      });
    });
  });

  describe('Interpolation Edge Cases', () => {
    describe('Multiple Expressions in Template', () => {
      it('should handle multiple expressions in one template', () => {
        expect(interpolateString('Count: {{this.count}}, Value: {{this.value}}', context)).toBe('Count: 42, Value: hello world');
      });

      it('should handle adjacent expressions', () => {
        expect(interpolateString('{{this.count}}{{this.value}}', context)).toBe('42hello world');
      });

      it('should handle expressions with special characters', () => {
        expect(interpolateString('Result: {{this.count > 40 ? "big" : "small"}}', context)).toBe('Result: big');
      });
    });

    describe('Nested Interpolation', () => {
      it('should handle expressions that reference interpolated values', () => {
        // This tests that interpolation happens in the right order
        const nestedContext = {
          this: {
            prefix: 'hello',
            suffix: 'world',
            combined: '{{this.prefix}} {{this.suffix}}'
          }
        };
        // Note: Our current implementation doesn't support nested interpolation
        // This should return the literal string
        expect(interpolateString('{{this.combined}}', nestedContext)).toBe('{{this.prefix}} {{this.suffix}}');
      });
    });

    describe('Empty and Malformed Expressions', () => {
      it('should handle empty expressions', () => {
        expect(interpolateString('{{}}', context)).toBe('');
        expect(interpolateString('{{ }}', context)).toBe('');
      });

      it('should handle malformed expressions gracefully', () => {
        expect(interpolateString('{{invalid expression}}', context)).toBe('');
        expect(interpolateString('{{this.missing.prop}}', context)).toBe('');
      });

      it('should handle unclosed expressions', () => {
        expect(interpolateString('{{this.value', context)).toBe('{{this.value');
        expect(interpolateString('this.value}}', context)).toBe('this.value}}');
      });
    });

    describe('Expression Whitespace Handling', () => {
      it('should trim whitespace around expressions', () => {
        expect(interpolateString('{{ this.count }}', context)).toBe('42');
        expect(interpolateString('{{this.value }}', context)).toBe('hello world');
        expect(interpolateString('{{ this.value }}', context)).toBe('hello world');
      });
    });
  });

  describe('Command Chaining with Expressions', () => {
    describe('Dynamic Command Generation', () => {
      it('should handle expressions in command parameters', () => {
        // Test that expressions can be used in command strings
        const commandContext = {
          this: {
            action: 'toggle',
            target: 'modal',
            count: 5
          }
        };

        // This would be used in a command like: --{{this.action}}:{{this.target}}
        // But since we can't test the full command execution here, we test the expression evaluation
        expect(evaluateExpression('this.action', commandContext)).toBe('toggle');
        expect(evaluateExpression('this.target', commandContext)).toBe('modal');
      });

      it('should handle conditional command generation', () => {
        const conditionalContext = {
          this: {
            isVisible: true,
            action: 'show',
            altAction: 'hide'
          }
        };

        expect(evaluateExpression('this.isVisible ? this.action : this.altAction', conditionalContext)).toBe('show');
        expect(evaluateExpression('!this.isVisible ? this.action : this.altAction', conditionalContext)).toBe('hide');
      });
    });

    describe('Complex Command Chains', () => {
      it('should handle expressions in chained commands', () => {
        // Simulate: --fun:arg, --fun:sub:{{this.value.length}}
        const chainContext = {
          this: {
            value: 'hello world',
            arg: 'primary',
            subCommand: 'process'
          }
        };

        // Test the expressions that would be used in the chain
        expect(evaluateExpression('this.arg', chainContext)).toBe('primary');
        expect(evaluateExpression('this.value.length', chainContext)).toBe(11);
        expect(evaluateExpression('this.subCommand', chainContext)).toBe('process');
      });

      it('should handle dynamic parameter calculation', () => {
        const calcContext = {
          this: {
            items: [1, 2, 3, 4, 5],
            multiplier: 2,
            offset: 10
          }
        };

        // Expressions that might be used in command parameters
        expect(evaluateExpression('this.items.length * this.multiplier', calcContext)).toBe(10);
        expect(evaluateExpression('this.items.length + this.offset', calcContext)).toBe(15);
        expect(evaluateExpression('this.items[this.items.length - 1] * this.multiplier', calcContext)).toBe(10);
      });
    });

    describe('Error Handling in Command Chains', () => {
      it('should handle expression failures in command contexts', () => {
        const errorContext = {
          this: {
            missing: undefined,
            count: 42
          }
        };

        // These should fail gracefully
        expect(evaluateExpression('this.missing.property', errorContext)).toBeUndefined();
        expect(evaluateExpression('this.count + this.missing.value', errorContext)).toBeNaN(); // 42 + undefined = NaN
      });

      it('should handle type mismatches in expressions', () => {
        const typeContext = {
          this: {
            number: 42,
            string: 'hello',
            bool: true
          }
        };

        // These should work or fail gracefully
        expect(evaluateExpression('this.number + this.string', typeContext)).toBe('42hello');
        expect(evaluateExpression('this.number * this.bool', typeContext)).toBe(42);
        expect(evaluateExpression('this.string - this.number', typeContext)).toBeNaN();
      });
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large arrays efficiently', () => {
      const largeArrayContext = {
        this: {
          largeArray: Array.from({ length: 1000 }, (_, i) => i),
          index: 500
        }
      };

      expect(evaluateExpression('this.largeArray.length', largeArrayContext)).toBe(1000);
      expect(evaluateExpression('this.largeArray[this.index]', largeArrayContext)).toBe(500);
    });

    it('should handle deep object traversal', () => {
      // Create a deeply nested object
      let deep = { value: 'deepest' };
      for (let i = 0; i < 50; i++) {
        deep = { nested: deep };
      }

      const deepContext = {
        this: deep
      };

      // Build a long property access chain
      let path = 'this';
      for (let i = 0; i < 50; i++) {
        path += '.nested';
      }
      path += '.value';

      expect(evaluateExpression(path, deepContext)).toBe('deepest');
    });

    it('should handle complex expressions with many operations', () => {
      const complexOpsContext = {
        this: {
          a: 1, b: 2, c: 3, d: 4, e: 5,
          arr: [10, 20, 30, 40, 50]
        }
      };

      const complexExpr = `
        this.a + this.b * this.c - this.d / this.e +
        this.arr[0] * this.arr[1] +
        (this.a > this.b ? this.c : this.d)
      `;

      expect(evaluateExpression(complexExpr.replace(/\s+/g, ''), complexOpsContext)).toBe(1 + 2 * 3 - 4 / 5 + 10 * 20 + 4);
    });
  });

  describe('Security and Adversarial Inputs', () => {
    it('should reject dangerous global object access', () => {
      expect(() => evaluateExpression('window', {})).toThrow('Access to \'window\' is not allowed');
      expect(() => evaluateExpression('document', {})).toThrow('Access to \'document\' is not allowed');
      expect(() => evaluateExpression('eval', {})).toThrow('Access to \'eval\' is not allowed');
      expect(() => evaluateExpression('Function', {})).toThrow('Access to \'Function\' is not allowed');
    });

    it('should reject dangerous function calls', () => {
      expect(() => evaluateExpression('eval("1+1")', {})).toThrow('potentially unsafe operations');
      expect(() => evaluateExpression('setTimeout', {})).toThrow('Access to \'setTimeout\' is not allowed');
      expect(() => evaluateExpression('fetch', {})).toThrow('Access to \'fetch\' is not allowed');
    });

    it('should reject prototype pollution attempts', () => {
      expect(() => evaluateExpression('__proto__', {})).toThrow('Access to \'__proto__\' is not allowed');
      expect(() => evaluateExpression('prototype', {})).toThrow('Access to \'prototype\' is not allowed');
      expect(() => evaluateExpression('constructor', {})).toThrow('Access to \'constructor\' is not allowed');
    });

    it('should reject expressions with invalid characters', () => {
      expect(() => evaluateExpression('1 + 1\u0000', {})).toThrow('contains invalid characters');
      expect(() => evaluateExpression('1 + 1\u2028', {})).toThrow('contains invalid characters');
      expect(() => evaluateExpression('1 + 1\u2029', {})).toThrow('contains invalid characters');
    });

    it('should handle overly complex expressions', () => {
      const complexExpr = ('1 + ').repeat(334) + '1'; // Creates deeply nested AST
      expect(() => evaluateExpression(complexExpr, {})).toThrow('Maximum recursion depth exceeded');
    });

    it('should prevent deep recursion', () => {
      // This would create infinite recursion if not protected
      const context = { this: {} };
      context.this = context;
      expect(() => evaluateExpression('this.this.this.value', context)).toThrow('Maximum recursion depth exceeded');
    });

    it('should sanitize context objects', () => {
      const dangerousContext = {
        this: {
          safe: 'ok',
          evil: { polluted: true },
          dangerous: function() { return 'evil'; },
          window: { some: 'object' }
        }
      };

      expect(evaluateExpression('this.safe', dangerousContext)).toBe('ok');
      expect(evaluateExpression('this.evil', dangerousContext)).toEqual({ polluted: true });
      expect(evaluateExpression('this.dangerous', dangerousContext)).toBeUndefined();
      expect(evaluateExpression('this.window', dangerousContext)).toBeUndefined();
    });
  });
});