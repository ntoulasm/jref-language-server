import {
  SemanticTokensBuilder,
  SemanticTokens,
  SemanticTokensParams,
} from 'vscode-languageserver/node';
import { ServerContext } from '../utils';

export const tokenTypes = ['function'];

const tokenToIndex = Object.fromEntries(tokenTypes.map((type, index) => [type, index])) as Record<
  string,
  number
>;

export function handleSemanticTokens(
  params: SemanticTokensParams,
  context: ServerContext,
): SemanticTokens {
  const { documents, documentSymbols } = context;
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
      tokenToIndex['function'],
      0,
    );
  }

  return tokensBuilder.build();
}
