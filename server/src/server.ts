import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentChangeEvent,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { Node, ParseError, ParseErrorCode, parseTree } from 'jsonc-parser';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(change.settings.languageServerExample || defaultSettings);
  }
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change: TextDocumentChangeEvent<TextDocument>) => {
  const errors: ParseError[] = [];
  const ast: Node | undefined = parseTree(change.document.getText(), errors);
  sendDiagnostics(change.document, errors);
});

function getDiagnosticsMessage(code: ParseErrorCode): string {
  switch (code) {
    case ParseErrorCode.InvalidSymbol:
      return 'Invalid symbol found';
    case ParseErrorCode.InvalidNumberFormat:
      return 'Invalid number format';
    case ParseErrorCode.PropertyNameExpected:
      return 'Property name expected';
    case ParseErrorCode.ValueExpected:
      return 'Value expected';
    case ParseErrorCode.ColonExpected:
      return 'Colon expected';
    case ParseErrorCode.CommaExpected:
      return 'Comma expected';
    case ParseErrorCode.CloseBraceExpected:
      return 'Closing brace "}" expected';
    case ParseErrorCode.CloseBracketExpected:
      return 'Closing bracket "]" expected';
    case ParseErrorCode.EndOfFileExpected:
      return 'End of file expected';
    case ParseErrorCode.InvalidCommentToken:
      return 'Invalid comment token';
    case ParseErrorCode.UnexpectedEndOfComment:
      return 'Unexpected end of comment';
    case ParseErrorCode.UnexpectedEndOfString:
      return 'Unexpected end of string';
    case ParseErrorCode.UnexpectedEndOfNumber:
      return 'Unexpected end of number';
    case ParseErrorCode.InvalidUnicode:
      return 'Invalid unicode sequence';
    case ParseErrorCode.InvalidEscapeCharacter:
      return 'Invalid escape character';
    case ParseErrorCode.InvalidCharacter:
      return 'Invalid character found';
    default:
      return 'Unknown syntax error';
  }
}

function sendDiagnostics(document: TextDocument, parseErrors: ParseError[]) {
  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics: parseErrors.map((parseError) => {
      const { offset, length, error } = parseError;
      const start = document.positionAt(offset);
      const end = document.positionAt(offset + length);
      const range = { start, end };
      return {
        range,
        message: getDiagnosticsMessage(error),
        severity: DiagnosticSeverity.Error,
        source: 'jref-language-server',
      };
    }),
  });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VS Code
  connection.console.log('We received a file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
  // The pass parameter contains the position of the text document in
  // which code complete got requested. For the example we ignore this
  // info and always provide the same completion items.
  return [];
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
