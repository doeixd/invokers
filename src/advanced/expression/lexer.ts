// src/expression-lexer.ts

export enum TokenType {
  IDENTIFIER, // e.g., this, value, length, detail
  NUMBER,     // e.g., 100, 3.14
  STRING,     // e.g., 'hello', "world"
  OPERATOR,   // e.g., +, -, ===, &&, ?
  DOT,        // . (for property access)
  BOOLEAN,    // true, false
  NULL,       // null
  LPAREN,     // (
  RPAREN,     // )
  LBRACKET,   // [
  RBRACKET,   // ]
  COMMA,      // ,
  COLON,      // : (for ternary operator)
  EOF,        // End of input
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// A map of regex patterns for each token type
const TOKEN_REGEX: [TokenType, RegExp][] = [
  [TokenType.NUMBER, /^[0-9]+(\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/],
  [TokenType.STRING, /^'(?:[^'\\]|\\.)*'|^"(?:[^"\\]|\\.)*"/],
  [TokenType.BOOLEAN, /^(true|false)\b/],
  [TokenType.NULL, /^null\b/],
   [TokenType.IDENTIFIER, /^[a-zA-Z_$][a-zA-Z0-9_$]*/],
   [TokenType.OPERATOR, /^(===|!==|==|!=|<=|>=|&&|\|\||[<>\+\-\*\/%?!])/],
   [TokenType.DOT, /^\./],
   [TokenType.LPAREN, /^\(/],
   [TokenType.RPAREN, /^\)/],
   [TokenType.LBRACKET, /^\[/],
   [TokenType.RBRACKET, /^\]/],
   [TokenType.COMMA, /^,/],
   [TokenType.COLON, /^:/],
 ];

export class Lexer {
  private static readonly MAX_EXPRESSION_LENGTH = 10000;
  private static readonly MAX_TOKEN_COUNT = 1000;

  public tokenize(input: string): Token[] {
    if (typeof input !== 'string') {
      throw new Error('Invokers Expression Error: Expression must be a string');
    }

    if (input.length > Lexer.MAX_EXPRESSION_LENGTH) {
      throw new Error(`Invokers Expression Error: Expression too long (max ${Lexer.MAX_EXPRESSION_LENGTH} characters)`);
    }

    // Additional security checks
    if (input.includes('\u0000') || input.includes('\u2028') || input.includes('\u2029')) {
      throw new Error('Invokers Expression Error: Expression contains invalid characters');
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
      /XMLHttpRequest/i,
      /fetch\s*\(/i,
      /import\s*\(/i,
      /require\s*\(/i,
      /process\./i,
      /globalThis\./i,
      /window\./i,
      /document\./i,
      /console\./i,
      /alert\s*\(/i,
      /prompt\s*\(/i,
      /confirm\s*\(/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        throw new Error('Invokers Expression Error: Expression contains potentially unsafe operations');
      }
    }

    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < input.length) {
      // Check token count limit
      if (tokens.length >= Lexer.MAX_TOKEN_COUNT) {
        throw new Error(`Invokers Expression Error: Expression too complex (max ${Lexer.MAX_TOKEN_COUNT} tokens)`);
      }

      // Ignore whitespace
      if (/\s/.test(input[cursor])) {
        cursor++;
        continue;
      }

      let matched = false;
      for (const [type, regex] of TOKEN_REGEX) {
        const match = input.substring(cursor).match(regex);
        if (match) {
          // Additional validation for specific token types
          if (type === TokenType.IDENTIFIER) {
            const identifier = match[0];
            // Prevent access to dangerous properties
            if (this.isDangerousIdentifier(identifier)) {
              throw new Error(`Invokers Expression Error: Access to '${identifier}' is not allowed`);
            }
          }

          tokens.push({
            type,
            value: match[0],
            position: cursor
          });
          cursor += match[0].length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const char = input[cursor];
        const start = Math.max(0, cursor - 10);
        const end = Math.min(input.length, cursor + 10);
        const context = input.substring(start, end);
        const pointer = ' '.repeat(cursor - start) + '^';
        throw new Error(`Invokers Expression Error: Unexpected character '${char}' at position ${cursor}\n${context}\n${pointer}`);
      }
    }

    // Add EOF token
    tokens.push({
      type: TokenType.EOF,
      value: '',
      position: cursor
    });

    return tokens;
  }

  private isDangerousIdentifier(identifier: string): boolean {
    const dangerousIdentifiers = [
      // Global objects (allow 'this' as it's a context variable)
      'globalThis', 'global', 'self',
      // Browser APIs
      'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
      'indexedDB', 'cookies', 'XMLHttpRequest', 'fetch', 'WebSocket',
      // Node.js globals
      'process', 'Buffer', 'require', 'module', 'exports', '__dirname', '__filename',
      // Dangerous functions
      'eval', 'Function', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
      'alert', 'prompt', 'confirm', 'console', 'debugger',
       // Prototype pollution
       'prototype', 'constructor',
      // Other dangerous properties
      'innerHTML', 'outerHTML', 'innerText', 'insertAdjacentHTML'
    ];

    return dangerousIdentifiers.includes(identifier) ||
           identifier.startsWith('__') ||
           identifier.includes('script') ||
           identifier.includes('javascript') ||
           identifier.includes('vbscript');
  }
}
