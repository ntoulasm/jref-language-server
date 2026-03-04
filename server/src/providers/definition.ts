import path from 'path';
import { URI } from 'vscode-uri';

import { DefinitionParams, DefinitionLink, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JRefSymbol } from '../visitor';
import { ServerContext } from '../utils';

const defaultTargetRange: Range = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 0 },
};

export function onDefinition(
  params: DefinitionParams,
  context: ServerContext,
): DefinitionLink[] | undefined {
  const { documents, documentSymbols } = context;
  const document = documents.get(params.textDocument.uri);
  if (!document) return;

  const symbols = documentSymbols.get(document);
  if (!symbols || symbols.size === 0) return;

  const refs = Array.from(symbols.values()).filter((symbol) => symbol.isReference);
  const offset = document.offsetAt(params.position);
  const targetRef = refs.find((ref) => {
    return offset >= ref.node.offset && offset <= ref.node.offset + ref.node.length;
  });
  if (!targetRef) return;

  return createDefinitionLink(document, targetRef, context);
}

function createDefinitionLink(
  document: TextDocument,
  ref: JRefSymbol,
  context: ServerContext,
): DefinitionLink[] | undefined {
  const { documents, documentSymbols } = context;
  const refValueNode = ref.node;
  const targetPath = refValueNode.value;
  const uri = URI.parse(targetPath);
  const currentDir = path.dirname(URI.parse(document.uri).fsPath);
  const absolutePath = path.resolve(currentDir, uri.path.slice(1));
  const targetDocument = documents.get(URI.file(absolutePath).toString());
  const targetRange = getTargetRange(targetDocument);

  function getTargetRange(targetDocument: TextDocument | undefined): Range {
    if (!targetDocument) return defaultTargetRange;
    const targetSymbolTable = documentSymbols.get(targetDocument);
    if (!targetSymbolTable) return defaultTargetRange;
    const targetSymbol = targetSymbolTable?.get(uri.fragment);
    if (!targetSymbol) return defaultTargetRange;
    return {
      start: targetDocument.positionAt(targetSymbol.node.offset),
      end: targetDocument.positionAt(targetSymbol.node.offset + targetSymbol.node.length),
    };
  }

  return [
    {
      originSelectionRange: {
        start: document.positionAt(refValueNode.offset + 1), // +1 to skip the opening quote
        end: document.positionAt(refValueNode.offset + refValueNode.length - 1), // -1 to skip the closing quote
      },
      targetUri: URI.file(absolutePath).toString(),
      targetRange: targetRange,
      targetSelectionRange: targetRange,
    },
  ];
}
