import * as assert from 'assert';
import { ParseErrorCode, ParseError } from 'jsonc-parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createParseErrorDiagnostic, getDiagnosticsMessage } from '../diagnostics.js';
import { DiagnosticSeverity } from 'vscode-languageserver';

suite('Diagnostics Test Suite', () => {
  test('Should create a diagnostic from a ParseError', () => {
    const text = '{\n  "key": "value"'; // Missing closing brace
    const doc = TextDocument.create('file:///test.jref', 'jref', 1, text);

    const parseError: ParseError = {
      error: ParseErrorCode.CloseBraceExpected,
      offset: text.length,
      length: 0,
    };

    const diagnostic = createParseErrorDiagnostic(doc, parseError);
    assert.strictEqual(
      diagnostic.message,
      getDiagnosticsMessage(ParseErrorCode.CloseBraceExpected),
    );
    assert.strictEqual(diagnostic.severity, DiagnosticSeverity.Error);
    assert.strictEqual(diagnostic.range.start.line, 1);
    assert.strictEqual(diagnostic.range.start.character, 16);
  });

  test('Should handle unknown syntax errors gracefully', () => {
    const text = '{}';
    const doc = TextDocument.create('file:///test.jref', 'jref', 1, text);

    const parseError: ParseError = {
      error: 999 as ParseErrorCode, // Non-existent error code
      offset: 0,
      length: 1,
    };

    const diagnostic = createParseErrorDiagnostic(doc, parseError);
    assert.strictEqual(diagnostic.message, 'Unknown syntax error');
  });
});
