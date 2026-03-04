import { Node } from 'jsonc-parser';

export type VisitCallback = (node: Node, path: string) => void;

export function visit(node: Node | undefined, cb: VisitCallback, path: string = '') {
  if (!node?.type) {
    return;
  }

  const isProperty = node.type === 'property';

  if (!isProperty) {
    cb(node, path);
  }

  const visitChildren = visitFunctions[node.type];
  visitChildren?.(node, cb, path);
}

const visitFunctions: Record<string, (node: Node, cb: VisitCallback, path: string) => void> = {
  object: visitObject,
  array: visitArray,
  property: visitProperty,
};

function visitObject(node: Node, cb: VisitCallback, path: string) {
  node?.children?.forEach((child) => {
    visit(child, cb, path);
  });
}

function visitArray(node: Node, cb: VisitCallback, path: string) {
  node?.children?.forEach((child, index) => {
    visit(child, cb, path + '/' + index);
  });
}

function visitProperty(node: Node, cb: VisitCallback, path: string) {
  if (node.children?.length !== 2) return;
  const key = node.children[0].value;
  const value = node.children[1];
  visit(value, cb, `${path}/${key}`);
}
