import { TextDocuments } from 'vscode-languageserver/node';
import { visit } from './visitor';
import { SymbolTable } from './symbolTable';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface ServerContext {
  documents: TextDocuments<TextDocument>;
  documentSymbols: WeakMap<TextDocument, SymbolTable>;
}
