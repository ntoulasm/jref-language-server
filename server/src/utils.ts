import { TextDocuments, Range } from 'vscode-languageserver/node';
import { SymbolTable } from './symbolTable';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Node } from 'jsonc-parser';

export interface ServerContext {
  documents: TextDocuments<TextDocument>;
  documentSymbols: WeakMap<TextDocument, SymbolTable>;
}

export function createRange(document: TextDocument, node: Node): Range {
  return {
    start: document.positionAt(node.offset),
    end: document.positionAt(node.offset + node.length),
  };
}
