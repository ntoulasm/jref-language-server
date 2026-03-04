import { TextDocuments } from 'vscode-languageserver/node';
import { SymbolTable } from './visitor';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface ServerContext {
  documents: TextDocuments<TextDocument>;
  documentSymbols: WeakMap<TextDocument, SymbolTable>;
}
