import { Node } from 'jsonc-parser';

export interface JRefSymbol {
  pointer: string;
  node: Node;
  isReference: boolean;
  refersTo: string | null;
}

export type SymbolTable = Map<string, JRefSymbol>;
