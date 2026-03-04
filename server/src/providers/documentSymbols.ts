import { DocumentSymbol, SymbolKind, DocumentSymbolParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Node } from 'jsonc-parser';
import { ServerContext, createRange } from '../utils';

export function onDocumentSymbol(
  params: DocumentSymbolParams,
  context: ServerContext,
): DocumentSymbol[] {
  const { documents, documentSymbols } = context;
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const symbols = documentSymbols.get(document);
  if (!symbols) return [];

  const rootSymbol = symbols.get('');
  if (!rootSymbol) return [];

  return createSymbols(rootSymbol.node, document);
}

function createSymbols(node: Node, document: TextDocument): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  if (node.type === 'object') {
    node.children?.forEach((child) => {
      if (child.type === 'property' && child.children?.length === 2) {
        const keyNode = child.children[0];
        const valueNode = child.children[1];

        const symbol: DocumentSymbol = {
          name: keyNode.value,
          kind: getSymbolKind(valueNode),
          range: createRange(document, child),
          selectionRange: createRange(document, keyNode),
          children: createSymbols(valueNode, document),
        };
        symbols.push(symbol);
      }
    });
  } else if (node.type === 'array') {
    node.children?.forEach((child, index) => {
      const range = createRange(document, child);
      const symbol: DocumentSymbol = {
        name: index.toString(),
        kind: getSymbolKind(child),
        range: range,
        selectionRange: range,
        children: createSymbols(child, document),
      };
      symbols.push(symbol);
    });
  }

  return symbols;
}

function getSymbolKind(node: Node): SymbolKind {
  switch (node.type) {
    case 'object':
      return SymbolKind.Object;
    case 'array':
      return SymbolKind.Array;
    case 'string':
      return SymbolKind.String;
    case 'number':
      return SymbolKind.Number;
    case 'boolean':
      return SymbolKind.Boolean;
    default:
      return SymbolKind.Property;
  }
}
