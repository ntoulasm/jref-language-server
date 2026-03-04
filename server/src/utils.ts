import { TextDocuments } from 'vscode-languageserver/node';
import { SymbolTable, visit } from './visitor';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ParseError, parseTree } from 'jsonc-parser';

export interface ServerContext {
  documents: TextDocuments<TextDocument>;
  documentSymbols: WeakMap<TextDocument, SymbolTable>;
}

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
