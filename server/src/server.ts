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
  DefinitionParams,
  DefinitionLink,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { Node, ParseError, parseTree } from 'jsonc-parser';
import { createParseErrorDiagnostic } from './diagnostics';
import path from 'path';
import { URI } from 'vscode-uri';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

const documentRefs: WeakMap<TextDocument, Array<Node>> = new WeakMap();

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
      definitionProvider: true,
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
  const references: Array<Node> = [];
  visit(ast, references);
  documentRefs.set(change.document, references);
  sendDiagnostics(change.document, errors);
});

function isCompositeNode(node: Node): boolean {
  return node.type === 'object' || node.type === 'array';
}

function visitCompositeNode(node: Node, acc: Array<Node>) {
  const children = node?.children || [];
  for (const child of children) {
    visit(child, acc);
  }
}

const visitFunctions: Record<string, (node: Node, acc: Array<Node>) => void> = {
  object: visitCompositeNode,
  array: visitCompositeNode,
  property: (node: Node, acc: Array<Node>) => {
    const children = node?.children || [];
    if (children.length !== 2) {
      /* incomplete property */
      return;
    }
    const key = children[0];
    const value = children[1];
    const isReference = key.type === 'string' && key.value === '$ref' && value.type === 'string';
    if (isReference) {
      acc.push(node);
    }

    if (isCompositeNode(value)) {
      visit(value, acc);
    }
  },
};

function visit(node: Node | undefined, acc: Array<Node>) {
  if (!node?.type) {
    console.error('Node type is undefined');
    return;
  }
  const visit = visitFunctions[node.type];
  visit(node, acc);
}

function sendDiagnostics(document: TextDocument, parseErrors: ParseError[]) {
  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics: parseErrors.map((parseError) => createParseErrorDiagnostic(document, parseError)),
  });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VS Code
  connection.console.log('We received a file change event');
});

connection.onDefinition((params: DefinitionParams): DefinitionLink[] | undefined => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return;

  const refs = documentRefs.get(document);
  if (!refs || refs.length === 0) return;

  const offset = document.offsetAt(params.position);
  const targetRef = refs.find((ref) => {
    const value = ref.children![1];
    return offset >= value.offset && offset <= value.offset + value.length;
  });
  if (!targetRef) return;

  return createDefinitionLink(document, targetRef);
});

function createDefinitionLink(document: TextDocument, ref: Node): DefinitionLink[] | undefined {
  const refValueNode = ref.children![1];
  const targetPath = refValueNode.value;
  const currentDir = path.dirname(URI.parse(document.uri).fsPath);
  const absolutePath = path.resolve(currentDir, targetPath);
  return [
    {
      originSelectionRange: {
        start: document.positionAt(refValueNode.offset + 1),
        end: document.positionAt(refValueNode.offset + refValueNode.length - 1),
      },
      targetUri: URI.file(absolutePath).toString(),
      targetRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      targetSelectionRange: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    },
  ];
}

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
