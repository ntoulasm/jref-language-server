import * as assert from 'assert';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onDefinition } from '../providers/definition.js';
import { analyze } from '../analyzer.js';
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

    const { symbols } = analyze(text);

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

    const { symbols } = analyze(text);

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

    const { symbols: mainSymbols } = analyze(mainText);

    const { symbols: schemaSymbols } = analyze(schemaText);

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

  test('Should return a definition for local $ref', () => {
    const text = '{"foo": { "$ref": "#/a" }, "a": 42}';
    const uri = URI.file(path.resolve('/abs/path/local.jref')).toString();
    const doc = TextDocument.create(uri, 'jref', 1, text);

    const { symbols } = analyze(text);

    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentSymbols: new WeakMap([[doc, symbols]]),
    };

    const params: DefinitionParams = {
      textDocument: { uri: uri },
      position: { line: 0, character: 19 }, // Inside "#/a"
    };

    const result = onDefinition(params, context);

    assert.ok(result && result.length > 0);
    const link = result![0];
    assert.ok(link.targetUri.endsWith('local.jref'));
    // Target range should point to the "a" property value in schema.jref
    // {"foo": { "$ref": "#/a" }, "a": 42}
    //                                 ^--- value 42 is at character 32
    assert.strictEqual(link.targetRange.start.character, 32);
  });
});
