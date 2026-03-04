import * as assert from 'assert';
import { parseTree } from 'jsonc-parser';
import { visit } from '../visitor.js';

suite('Visitor Pattern Test Suite', () => {
  test('Should call visit callback for each node in correct order', () => {
    const text = '{"a": 1, "b": [2]}';
    const ast = parseTree(text);

    const trace: string[] = [];
    visit(ast, (node, path) => {
      trace.push(`visit: ${path || '/'}`);
    });

    const expected = ['visit: /', 'visit: /a', 'visit: /b', 'visit: /b/0'];

    assert.deepStrictEqual(trace, expected);
  });
});
