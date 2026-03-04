import * as assert from 'assert';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { onDocumentSymbol } from '../providers/documentSymbols.js';
import { analyze } from '../analyzer.js';
import { DocumentSymbolParams, SymbolKind } from 'vscode-languageserver/node';

class MockTextDocuments {
  private docs = new Map<string, TextDocument>();
  constructor(docs: TextDocument[]) {
    docs.forEach((doc) => this.docs.set(doc.uri, doc));
  }
  get(uri: string) {
    return this.docs.get(uri);
  }
}

suite('Document Symbols Test Suite', () => {
  test('Should return symbols for a simple object', () => {
    const text = '{"name": "Jason", "age": 30}';
    const uri = URI.file('/abs/path/main.jref').toString();
    const doc = TextDocument.create(uri, 'jref', 1, text);

    const { symbols } = analyze(text);
    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentSymbols: new WeakMap([[doc, symbols]]),
    };

    const params: DocumentSymbolParams = {
      textDocument: { uri },
    };

    const result = onDocumentSymbol(params, context);

    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'name');
    assert.strictEqual(result[0].kind, SymbolKind.String);
    assert.strictEqual(result[1].name, 'age');
    assert.strictEqual(result[1].kind, SymbolKind.Number);
  });

  test('Should return symbols for nested objects', () => {
    const text = '{"person": {"name": "Jason"}}';
    const uri = URI.file('/abs/path/main.jref').toString();
    const doc = TextDocument.create(uri, 'jref', 1, text);

    const { symbols } = analyze(text);
    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentSymbols: new WeakMap([[doc, symbols]]),
    };

    const params: DocumentSymbolParams = {
      textDocument: { uri },
    };

    const result = onDocumentSymbol(params, context);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'person');
    assert.strictEqual(result[0].kind, SymbolKind.Object);
    assert.ok(result[0].children);
    assert.strictEqual(result[0].children!.length, 1);
    assert.strictEqual(result[0].children![0].name, 'name');
  });

  test('Should return symbols for arrays', () => {
    const text = '{"tags": ["a", "b"]}';
    const uri = URI.file('/abs/path/main.jref').toString();
    const doc = TextDocument.create(uri, 'jref', 1, text);

    const { symbols } = analyze(text);
    const context = {
      documents: new MockTextDocuments([doc]) as any,
      documentSymbols: new WeakMap([[doc, symbols]]),
    };

    const params: DocumentSymbolParams = {
      textDocument: { uri },
    };

    const result = onDocumentSymbol(params, context);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'tags');
    assert.strictEqual(result[0].kind, SymbolKind.Array);
    assert.ok(result[0].children);
    assert.strictEqual(result[0].children!.length, 2);
    assert.strictEqual(result[0].children![0].name, '0');
    assert.strictEqual(result[0].children![1].name, '1');
  });
});
