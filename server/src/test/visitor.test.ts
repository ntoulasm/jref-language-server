import * as assert from 'assert';
import { parseTree } from 'jsonc-parser';
import { visit } from  '../visitor.js';
import { SymbolTable } from '../symbolTable.js';

suite('Visitor Test Suite', () => {
  test('Should find a single $ref in a simple object', () => {
    const text = '{"$ref": "path/to/schema.json"}';
    const ast = parseTree(text);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    assert.strictEqual(symbols.get('/$ref')?.node.type, 'string');
    assert.strictEqual(symbols.get('/$ref')?.isReference, true);
    assert.strictEqual(symbols.get('/$ref')?.refersTo, 'path/to/schema.json');
  });

  test('Should find multiple $refs in nested objects', () => {
    const text = `{
            "first": { "$ref": "one.json" },
            "second": { "inner": { "$ref": "two.json" } }
        }`;
    const ast = parseTree(text);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    assert.strictEqual(symbols.get('/first/$ref')?.node.type, 'string');
    assert.strictEqual(symbols.get('/first/$ref')?.isReference, true);
    assert.strictEqual(symbols.get('/first/$ref')?.refersTo, 'one.json');

    assert.strictEqual(symbols.get('/second/inner/$ref')?.node.type, 'string');
    assert.strictEqual(symbols.get('/second/inner/$ref')?.isReference, true);
    assert.strictEqual(symbols.get('/second/inner/$ref')?.refersTo, 'two.json');
  });

  test('Should find $refs inside arrays', () => {
    const text = `[
            { "$ref": "item1.json" },
            { "other": "value" },
            { "$ref": "item2.json" }
        ]`;
    const ast = parseTree(text);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    assert.strictEqual(symbols.get('/0/$ref')?.node.type, 'string');
    assert.strictEqual(symbols.get('/0/$ref')?.isReference, true);
    assert.strictEqual(symbols.get('/0/$ref')?.refersTo, 'item1.json');

    assert.strictEqual(symbols.get('/1/other')?.node.type, 'string');
    assert.strictEqual(symbols.get('/1/other')?.isReference, false);
    assert.strictEqual(symbols.get('/1/other')?.refersTo, null);

    assert.strictEqual(symbols.get('/2/$ref')?.node.type, 'string');
    assert.strictEqual(symbols.get('/2/$ref')?.isReference, true);
    assert.strictEqual(symbols.get('/2/$ref')?.refersTo, 'item2.json');
  });

  test('Should NOT pick up $ref if the value is not a string', () => {
    const text = '{"$ref": 123}';
    const ast = parseTree(text);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    assert.strictEqual(symbols.get('/$ref')?.isReference, false);
    assert.strictEqual(symbols.get('/$ref')?.refersTo, null);
  });

  test('Should handle empty objects and arrays', () => {
    const text = '{"obj": {}, "arr": []}';
    const ast = parseTree(text);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    assert.ok(symbols.has('/obj'), 'Should have a symbol for the empty object');
    assert.strictEqual(symbols.get('/obj')?.node.type, 'object');

    assert.ok(symbols.has('/arr'), 'Should have a symbol for the empty array');
    assert.strictEqual(symbols.get('/arr')?.node.type, 'array');
  });

  test('Should handle undefined or null nodes gracefully', () => {
    const symbols: SymbolTable = new Map();
    visit(undefined, symbols);
    assert.strictEqual(symbols.size, 0);
  });

  test('Should handle array elements', () => {
    const text = '{"arr": ["a", "b", "c"]}';
    const ast = parseTree(text);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    assert.ok(symbols.has('/arr'), 'Should have a symbol for the array');
    assert.strictEqual(symbols.get('/arr')?.node.type, 'array');

    assert.ok(symbols.has('/arr/0'), 'Should have a symbol for the first element');
    assert.strictEqual(symbols.get('/arr/0')?.node.type, 'string');

    assert.ok(symbols.has('/arr/1'), 'Should have a symbol for the second element');
    assert.strictEqual(symbols.get('/arr/1')?.node.type, 'string');

    assert.ok(symbols.has('/arr/2'), 'Should have a symbol for the third element');
    assert.strictEqual(symbols.get('/arr/2')?.node.type, 'string');
  });
});
