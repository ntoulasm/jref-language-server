import { Node } from 'jsonc-parser';

const visitFunctions: Record<string, (node: Node, acc: Array<Node>) => void> = {
  object: visitCompositeNode,
  array: visitCompositeNode,
  property: visitProperty,
};

function isCompositeNode(node: Node): boolean {
  return node.type === 'object' || node.type === 'array';
}

function visitCompositeNode(node: Node, acc: Array<Node>) {
  const children = node?.children || [];
  for (const child of children) {
    visit(child, acc);
  }
}

function visitProperty(node: Node, acc: Array<Node>) {
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
}

export function visit(node: Node | undefined, acc: Array<Node>) {
  if (!node?.type) {
    console.error('Node type is undefined');
    return;
  }
  const visit = visitFunctions[node.type];
  visit?.(node, acc);
}
