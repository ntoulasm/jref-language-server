import { Node } from 'jsonc-parser';
import { SymbolTable, JRefSymbol } from './symbolTable';

const visitFunctions: Record<string, (node: Node, acc: SymbolTable, path: string) => void> = {
  object: visitObject,
  array: visitArray,
  property: visitProperty,
};

function visitObject(node: Node, acc: SymbolTable, path: string) {
  node?.children?.forEach((child) => {
    visit(child, acc, path);
  });
}

function visitArray(node: Node, acc: SymbolTable, path: string) {
  node?.children?.forEach((child, index) => {
    visit(child, acc, path + '/' + index);
  });
}

function visitProperty(node: Node, acc: SymbolTable, path: string) {
  if (node.children?.length !== 2) return;
  const key = node.children[0].value;
  const value = node.children[1];
  visit(value, acc, `${path}/${key}`);
}

export function visit(node: Node | undefined, acc: SymbolTable, path: string = '') {
  if (!node?.type) {
    console.error('Node type is undefined');
    return;
  }
  const symbol = createJRefSymbol(node, path);
  acc.set(path, symbol);

  const visit = visitFunctions[node.type];
  visit?.(node, acc, path);
}

function createJRefSymbol(node: Node, pointer: string): JRefSymbol {
  const isReference = isReferenceValue(node);
  return {
    pointer,
    node,
    isReference,
    refersTo: isReference ? node.value : null,
  };
}

function isReferenceValue(node: Node): boolean {
  return (
    node.type === 'string' &&
    node.parent?.type === 'property' &&
    node.parent.children?.[0].value === '$ref'
  );
}
