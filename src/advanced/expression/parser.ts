// src/expression-parser.ts

import { Token, TokenType } from './lexer';

export enum ASTNodeType {
  LITERAL = 'LITERAL',
  IDENTIFIER = 'IDENTIFIER',
  BINARY_OP = 'BINARY_OP',
  UNARY_OP = 'UNARY_OP',
  MEMBER_ACCESS = 'MEMBER_ACCESS',
  ARRAY_ACCESS = 'ARRAY_ACCESS',
  CONDITIONAL = 'CONDITIONAL',
  CALL_EXPRESSION = 'CALL_EXPRESSION'
}

export interface ASTNode {
  type: ASTNodeType;
  value?: any;
  left?: ASTNode;
  right?: ASTNode;
  operator?: string;
  object?: ASTNode;
  property?: string;
  index?: ASTNode;
  test?: ASTNode;
  consequent?: ASTNode;
  alternate?: ASTNode;
  callee?: ASTNode;
  args?: ASTNode[];
}

export class ExpressionParser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    const expr = this.expression();
    if (!this.isAtEnd()) {
      const token = this.peek();
      throw new Error(`Invokers Expression Error: Unexpected token '${token.value}' at position ${token.position}. Expected end of expression.`);
    }
    return expr;
  }

  private expression(): ASTNode {
    return this.conditional();
  }

  private conditional(): ASTNode {
    let expr = this.logicalOr();

    if (this.match(TokenType.OPERATOR, '?')) {
      const test = expr;
      const consequent = this.expression();
      this.consume(TokenType.COLON, "Expected ':' after '?' in conditional expression");
      const alternate = this.conditional(); // Allow nested ternaries
      return {
        type: ASTNodeType.CONDITIONAL,
        test,
        consequent,
        alternate
      };
    }

    return expr;
  }

  private logicalOr(): ASTNode {
    let expr = this.logicalAnd();

    while (this.match(TokenType.OPERATOR, '||')) {
      const operator = '||';
      const right = this.logicalAnd();
      expr = {
        type: ASTNodeType.BINARY_OP,
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private logicalAnd(): ASTNode {
    let expr = this.equality();

    while (this.match(TokenType.OPERATOR, '&&')) {
      const operator = '&&';
      const right = this.equality();
      expr = {
        type: ASTNodeType.BINARY_OP,
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private equality(): ASTNode {
    let expr = this.comparison();

    while (this.match(TokenType.OPERATOR, '===', '!==', '==', '!=')) {
      const operator = this.previous().value;
      const right = this.comparison();
      expr = {
        type: ASTNodeType.BINARY_OP,
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private comparison(): ASTNode {
    let expr = this.term();

    while (this.match(TokenType.OPERATOR, '<', '>', '<=', '>=')) {
      const operator = this.previous().value;
      const right = this.term();
      expr = {
        type: ASTNodeType.BINARY_OP,
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private term(): ASTNode {
    let expr = this.factor();

    while (this.match(TokenType.OPERATOR, '+', '-')) {
      const operator = this.previous().value;
      const right = this.factor();
      expr = {
        type: ASTNodeType.BINARY_OP,
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private factor(): ASTNode {
    let expr = this.unary();

    while (this.match(TokenType.OPERATOR, '*', '/', '%')) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = {
        type: ASTNodeType.BINARY_OP,
        left: expr,
        operator,
        right
      };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match(TokenType.OPERATOR, '!', '-')) {
      const operator = this.previous().value;
      const right = this.unary();
      return {
        type: ASTNodeType.UNARY_OP,
        operator,
        right
      };
    }

    return this.memberAccess();
  }

  private memberAccess(): ASTNode {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'").value;
        expr = {
          type: ASTNodeType.MEMBER_ACCESS,
          object: expr,
          property
        };
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.expression();
        this.consume(TokenType.RBRACKET, "Expected ']' after array index");
        expr = {
          type: ASTNodeType.ARRAY_ACCESS,
          object: expr,
          index
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private primary(): ASTNode {
    if (this.match(TokenType.NUMBER)) {
      return {
        type: ASTNodeType.LITERAL,
        value: parseFloat(this.previous().value)
      };
    }

    if (this.match(TokenType.STRING)) {
      const str = this.previous().value;
      // Remove quotes
      return {
        type: ASTNodeType.LITERAL,
        value: str.slice(1, -1)
      };
    }

    if (this.match(TokenType.BOOLEAN)) {
      return {
        type: ASTNodeType.LITERAL,
        value: this.previous().value === 'true'
      };
    }

    if (this.match(TokenType.NULL)) {
      return {
        type: ASTNodeType.LITERAL,
        value: null
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const identifier = this.previous();
      if (this.match(TokenType.LPAREN)) {
        // Function call
        const args: ASTNode[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, "Expected ')' after function arguments");
        return {
          type: ASTNodeType.CALL_EXPRESSION,
          callee: { type: ASTNodeType.IDENTIFIER, value: identifier.value },
          args
        };
      } else {
        return {
          type: ASTNodeType.IDENTIFIER,
          value: identifier.value
        };
      }
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw new Error(`Invokers Expression Error: Unexpected token at position ${this.peek().position}: '${this.peek().value}'`);
  }

  private match(first: TokenType | TokenType[], ...rest: string[]): boolean {
    if (Array.isArray(first)) {
      for (const type of first) {
        if (this.check(type)) {
          this.advance();
          return true;
        }
      }
      return false;
    } else {
      if (this.check(first)) {
        if (rest.length === 0 || rest.includes(this.peek().value)) {
          this.advance();
          return true;
        }
      }
      return false;
    }
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw new Error(`Invokers Expression Error: ${message}. Found '${this.peek().value}' at position ${this.peek().position}`);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
