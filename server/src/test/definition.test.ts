import * as assert from 'assert';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onDefinition } from '../providers/definition.js';
import { parseTree } from 'jsonc-parser';
import { SymbolTable, visit } from '../visitor.js';
import { DefinitionParams } from 'vscode-languageserver/node';
import path from 'path';

class MockTextDocuments {
  private docs = new Map<string, TextDocument>();
  constructor(docs: TextDocument[]) {
    docs.forEach((doc) => this.docs.set(doc.uri, doc));
  }
  get(uri: string) {
    return this.docs.get(uri);
  }
}

suite('Definition Test Suite', () => {
  test('Should return a definition for $ref', () => {
    const text = '{"$ref": "schema.jref"}';
    const uri = URI.file(path.resolve('/abs/path/main.jref')).toString();
    const doc = TextDocument.create(uri, 'jref', 1, text);

    const errors: any[] = [];
    const ast = parseTree(text, errors);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentSymbols: new WeakMap([[doc, symbols]]),
    };

    const params: DefinitionParams = {
      textDocument: { uri },
      position: { line: 0, character: 12 }, // Inside "schema.jref"
    };

    const result = onDefinition(params, context);

    assert.ok(result && result.length > 0);
    const link = result![0];
    assert.ok(link.targetUri.endsWith('schema.jref'));
  });

  test('Should NOT return a definition if position is outside $ref value', () => {
    const text = '{"$ref": "schema.jref"}';
    const uri = URI.file(path.resolve('/abs/path/main.jref')).toString();
    const doc = TextDocument.create(uri, 'jref', 1, text);

    const errors: any[] = [];
    const ast = parseTree(text, errors);
    const symbols: SymbolTable = new Map();
    visit(ast, symbols);

    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentSymbols: new WeakMap([[doc, symbols]]),
    };

    const params: DefinitionParams = {
      textDocument: { uri },
      position: { line: 0, character: 2 }, // At "$ref" key
    };

    const result = onDefinition(params, context);
    assert.ok(!result);
  });

  test('Should return a definition for $ref with fragment', () => {
    const mainText = '{"$ref": "schema.jref#/definitions/target"}';
    const mainUri = URI.file(path.resolve('/abs/path/main.jref')).toString();
    const mainDoc = TextDocument.create(mainUri, 'jref', 1, mainText);

    const schemaText = '{"definitions": {"target": {}}}';
    const schemaUri = URI.file(path.resolve('/abs/path/schema.jref')).toString();
    const schemaDoc = TextDocument.create(schemaUri, 'jref', 1, schemaText);

    const mainAst = parseTree(mainText);
    const mainSymbols: SymbolTable = new Map();
    visit(mainAst, mainSymbols);

    const schemaAst = parseTree(schemaText);
    const schemaSymbols: SymbolTable = new Map();
    visit(schemaAst, schemaSymbols);

    const context = {
      documents: new MockTextDocuments([mainDoc, schemaDoc]) as any,
      documentSymbols: new WeakMap([
        [mainDoc, mainSymbols],
        [schemaDoc, schemaSymbols],
      ]),
    };

    const params: DefinitionParams = {
      textDocument: { uri: mainUri },
      position: { line: 0, character: 12 }, // Inside "schema.jref#/definitions/target"
    };

    const result = onDefinition(params, context);

    assert.ok(result && result.length > 0);
    const link = result![0];
    assert.ok(link.targetUri.endsWith('schema.jref'));
    // Target range should point to the "target" property value in schema.jref
    // {"definitions": {"target": {}}}
    //                            ^--- value {} is at character 27
    assert.strictEqual(link.targetRange.start.character, 27);
  });
});
