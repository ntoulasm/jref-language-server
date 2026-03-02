import * as assert from 'assert';
import { Node, parseTree } from 'jsonc-parser';
import { visit } from '../visitor.js';

suite('Visitor Test Suite', () => {
  test('Should find a single $ref in a simple object', () => {
    const text = '{"$ref": "path/to/schema.json"}';
    const ast = parseTree(text);
    const acc: Node[] = [];
    visit(ast, acc);

    assert.strictEqual(acc.length, 1);
    assert.strictEqual(acc[0].type, 'property');
    assert.strictEqual(acc[0].children![0].value, '$ref');
    assert.strictEqual(acc[0].children![1].value, 'path/to/schema.json');
  });

  test('Should find multiple $refs in nested objects', () => {
    const text = `{
            "first": { "$ref": "one.json" },
            "second": { "inner": { "$ref": "two.json" } }
        }`;
    const ast = parseTree(text);
    const acc: Node[] = [];
    visit(ast, acc);

    assert.strictEqual(acc.length, 2);
    assert.strictEqual(acc[0].children![1].value, 'one.json');
    assert.strictEqual(acc[1].children![1].value, 'two.json');
  });

  test('Should find $refs inside arrays', () => {
    const text = `[
            { "$ref": "item1.json" },
            { "other": "value" },
            { "$ref": "item2.json" }
        ]`;
    const ast = parseTree(text);
    const acc: Node[] = [];
    visit(ast, acc);

    assert.strictEqual(acc.length, 2);
    assert.strictEqual(acc[0].children![1].value, 'item1.json');
    assert.strictEqual(acc[1].children![1].value, 'item2.json');
  });

  test('Should NOT pick up $ref if the value is not a string', () => {
    const text = '{"$ref": 123}';
    const ast = parseTree(text);
    const acc: Node[] = [];
    visit(ast, acc);

    assert.strictEqual(acc.length, 0);
  });

  test('Should handle empty objects and arrays', () => {
    const text = '{"obj": {}, "arr": []}';
    const ast = parseTree(text);
    const acc: Node[] = [];
    visit(ast, acc);

    assert.strictEqual(acc.length, 0);
  });

  test('Should handle undefined or null nodes gracefully', () => {
    const acc: Node[] = [];
    visit(undefined, acc);
    assert.strictEqual(acc.length, 0);
  });
});
