import { Node, parseTree, ParseError } from 'jsonc-parser';
import { SymbolTable, JRefSymbol } from './symbolTable';
import { visit } from './visitor';

export interface DocumentAnalysis {
  symbols: SymbolTable;
  errors: ParseError[];
}

export function analyze(content: string): DocumentAnalysis {
  const errors: ParseError[] = [];
  const ast = parseTree(content, errors);
  const symbols: SymbolTable = new Map();
  visit(ast, symbols);
  return { symbols, errors };
}

function createJRefSymbol(node: Node, pointer: string): JRefSymbol {
  const isReference = isReferenceValue(node);
  return {
    pointer,
    node,
    isReference,
    refersTo: isReference ? node.value : null,
  };
}

function isReferenceValue(node: Node): boolean {
  return (
    node.type === 'string' &&
    node.parent?.type === 'property' &&
    node.parent.children?.[0].value === '$ref'
  );
}
