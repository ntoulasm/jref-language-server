import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentChangeEvent,
  SemanticTokensBuilder,
  SemanticTokens,
  SemanticTokensParams,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { Node, ParseError, parseTree } from 'jsonc-parser';
import { createParseErrorDiagnostic } from './diagnostics';

import { onDefinition } from './definition';
import { SymbolTable, visit } from './visitor';

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
          tokenTypes: ['function'],
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
  const errors: ParseError[] = [];
  const ast: Node | undefined = parseTree(change.document.getText(), errors);
  const symbols: SymbolTable = new Map();
  visit(ast, symbols);
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

connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return { data: [] };
  const tokensBuilder = new SemanticTokensBuilder();

  const symbols = documentSymbols.get(document);
  if (!symbols || symbols.size === 0) return { data: [] };

  const refs = Array.from(symbols.values()).filter((symbol) => symbol.isReference);
  for (const ref of refs) {
    const valueNode = ref.node;
    const valuePosition = document.positionAt(valueNode.offset);

    // Highlight the value string
    tokensBuilder.push(
      valuePosition.line,
      valuePosition.character,
      valueNode.length,
      0, // index of token type
      0,
    );
  }

  return tokensBuilder.build();
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
