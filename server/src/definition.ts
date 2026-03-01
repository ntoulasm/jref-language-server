import path from 'path';
import { URI } from 'vscode-uri';

import { DefinitionParams, DefinitionLink, TextDocuments } from 'vscode-languageserver/node';
import { Node } from 'jsonc-parser';
import { TextDocument } from 'vscode-languageserver-textdocument';

interface ServerContext {
  documents: TextDocuments<TextDocument>;
  documentRefs: WeakMap<TextDocument, Array<Node>>;
}

export function onDefinition(
  params: DefinitionParams,
  context: ServerContext,
): DefinitionLink[] | undefined {
  const { documents, documentRefs } = context;
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
}

function createDefinitionLink(document: TextDocument, ref: Node): DefinitionLink[] | undefined {
  const refValueNode = ref.children![1];
  const targetPath = refValueNode.value;
  const currentDir = path.dirname(URI.parse(document.uri).fsPath);
  const absolutePath = path.resolve(currentDir, targetPath);
  return [
    {
      originSelectionRange: {
        start: document.positionAt(refValueNode.offset + 1), // +1 to skip the opening quote
        end: document.positionAt(refValueNode.offset + refValueNode.length - 1), // -1 to skip the closing quote
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
