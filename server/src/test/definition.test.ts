import * as assert from 'assert';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onDefinition } from '../definition.js';
import { Node, parseTree } from 'jsonc-parser';
import { visit } from '../visitor.js';
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
    const refs: Node[] = [];
    visit(ast, refs);

    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentRefs: new WeakMap([[doc, refs]]),
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
    const refs: Node[] = [];
    visit(ast, refs);

    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentRefs: new WeakMap([[doc, refs]]),
    };

    const params: DefinitionParams = {
      textDocument: { uri },
      position: { line: 0, character: 2 }, // At "$ref" key
    };

    const result = onDefinition(params, context);
    assert.ok(!result);
  });
});
