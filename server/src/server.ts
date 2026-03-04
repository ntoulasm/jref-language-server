import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentChangeEvent,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { ParseError } from 'jsonc-parser';
import { createParseErrorDiagnostic } from './providers/diagnostics';

import { onDefinition } from './providers/definition';
import { SymbolTable } from './symbolTable';
import { handleSemanticTokens, tokenTypes } from './providers/semanticTokens';
import { analyze } from './analyzer';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);
// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const documentSymbols: WeakMap<TextDocument, SymbolTable> = new WeakMap();

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes,
          tokenModifiers: [],
        },
        full: true,
      },
    },
  };
  return result;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change: TextDocumentChangeEvent<TextDocument>) => {
  const { symbols, errors } = analyze(change.document.getText());
  documentSymbols.set(change.document, symbols);
  sendDiagnostics(change.document, errors);
});

function sendDiagnostics(document: TextDocument, parseErrors: ParseError[]) {
  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics: parseErrors.map((parseError) => createParseErrorDiagnostic(document, parseError)),
  });
}

connection.onDefinition((params) => onDefinition(params, { documents, documentSymbols }));

connection.languages.semanticTokens.on((params) =>
  handleSemanticTokens(params, { documents, documentSymbols }),
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
