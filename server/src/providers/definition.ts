import path from 'path';
import { URI } from 'vscode-uri';
import * as fs from 'fs';

import { DefinitionParams, DefinitionLink, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JRefSymbol, SymbolTable } from '../symbolTable';
import { ServerContext, createRange } from '../utils';
import { analyze } from '../analyzer';

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
): DefinitionLink[] {
  const { targetUri, fragment } = resolveTargetUriAndFragment(document.uri, ref.node.value);

  const targetRange = findTargetRange(targetUri, fragment, context);

  return [
    {
      originSelectionRange: createOriginSelectionRange(document, ref),
      targetUri,
      targetRange,
      targetSelectionRange: targetRange,
    },
  ];
}

function resolveTargetUriAndFragment(documentUri: string, targetPath: string) {
  const uri = URI.parse(targetPath);
  const currentDir = path.dirname(URI.parse(documentUri).fsPath);
  const absolutePath = path.resolve(currentDir, uri.path.slice(1));
  const targetUri = URI.file(absolutePath).toString();
  return { targetUri, fragment: uri.fragment };
}

function getOrLoadDocument(targetUri: string, context: ServerContext): TextDocument | undefined {
  const { documents } = context;
  const targetDocument = documents.get(targetUri);
  if (targetDocument) return targetDocument;

  try {
    const filePath = URI.parse(targetUri).fsPath;
    const content = fs.readFileSync(filePath, 'utf8');
    return TextDocument.create(targetUri, 'jref', 1, content);
  } catch (e) {
    return;
  }
}

function getOrAnalyzeSymbols(targetDocument: TextDocument, context: ServerContext): SymbolTable {
  const { documentSymbols } = context;
  let targetSymbolTable = documentSymbols.get(targetDocument);
  if (targetSymbolTable) return targetSymbolTable;

  const { symbols } = analyze(targetDocument.getText());
  documentSymbols.set(targetDocument, symbols);
  return symbols;
}

function findTargetRange(targetUri: string, fragment: string, context: ServerContext): Range {
  const targetDocument = getOrLoadDocument(targetUri, context);
  if (!targetDocument) return defaultTargetRange;

  const targetSymbolTable = getOrAnalyzeSymbols(targetDocument, context);
  const targetSymbol = targetSymbolTable.get(fragment || ''); // Default to empty string if no fragment

  if (!targetSymbol) return defaultTargetRange;
  return createRange(targetDocument, targetSymbol.node);
}

function createOriginSelectionRange(document: TextDocument, ref: JRefSymbol): Range {
  const refValueNode = ref.node;
  return {
    start: document.positionAt(refValueNode.offset + 1), // +1 to skip the opening quote
    end: document.positionAt(refValueNode.offset + refValueNode.length - 1), // -1 to skip the closing quote
  };
}
