import { Node } from 'jsonc-parser';

export interface JRefSymbol {
  pointer: string;
  node: Node;
  isReference: boolean;
  refersTo: string | null;
}

export type SymbolTable = Map<string, JRefSymbol>;

const visitFunctions: Record<string, (node: Node, acc: SymbolTable, path: string) => void> = {
  object: visitObject,
  array: visitArray,
  property: visitProperty,
};

function isCompositeNode(node: Node): boolean {
  return node.type === 'object' || node.type === 'array';
}

function visitObject(node: Node, acc: SymbolTable, path: string) {
  const children = node?.children || [];
  for (const child of children) {
    visit(child, acc, path);
  }
}

function visitArray(node: Node, acc: SymbolTable, path: string) {
  const children = node?.children || [];
  children.forEach((child, index) => {
    visit(child, acc, path + '/' + index);
  });
}

function visitProperty(node: Node, acc: SymbolTable, path: string) {
  const children = node?.children || [];
  if (children.length !== 2) {
    /* incomplete property */
    return;
  }
  const key = children[0];
  const value = children[1];
  const pointer = path + '/' + key.value;
  const isReference = key.type === 'string' && key.value === '$ref' && value.type === 'string';
  const refersTo = isReference ? value.value : null;

  acc.set(pointer, {
    pointer,
    node,
    isReference,
    refersTo,
  });

  if (isCompositeNode(value)) {
    visit(value, acc, pointer);
  }
}

export function visit(node: Node | undefined, acc: SymbolTable, path: string = '') {
  if (!node?.type) {
    console.error('Node type is undefined');
    return;
  }
  const visit = visitFunctions[node.type];
  visit?.(node, acc, path);
}
