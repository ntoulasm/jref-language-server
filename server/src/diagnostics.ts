import { ParseError, ParseErrorCode } from 'jsonc-parser';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export function getDiagnosticsMessage(code: ParseErrorCode): string {
  switch (code) {
    case ParseErrorCode.InvalidSymbol:
      return 'Invalid symbol found';
    case ParseErrorCode.InvalidNumberFormat:
      return 'Invalid number format';
    case ParseErrorCode.PropertyNameExpected:
      return 'Property name expected';
    case ParseErrorCode.ValueExpected:
      return 'Value expected';
    case ParseErrorCode.ColonExpected:
      return 'Colon expected';
    case ParseErrorCode.CommaExpected:
      return 'Comma expected';
    case ParseErrorCode.CloseBraceExpected:
      return 'Closing brace "}" expected';
    case ParseErrorCode.CloseBracketExpected:
      return 'Closing bracket "]" expected';
    case ParseErrorCode.EndOfFileExpected:
      return 'End of file expected';
    case ParseErrorCode.InvalidCommentToken:
      return 'Invalid comment token';
    case ParseErrorCode.UnexpectedEndOfComment:
      return 'Unexpected end of comment';
    case ParseErrorCode.UnexpectedEndOfString:
      return 'Unexpected end of string';
    case ParseErrorCode.UnexpectedEndOfNumber:
      return 'Unexpected end of number';
    case ParseErrorCode.InvalidUnicode:
      return 'Invalid unicode sequence';
    case ParseErrorCode.InvalidEscapeCharacter:
      return 'Invalid escape character';
    case ParseErrorCode.InvalidCharacter:
      return 'Invalid character found';
    default:
      return 'Unknown syntax error';
  }
}

export function createParseErrorDiagnostic(
  document: TextDocument,
  parseError: ParseError,
): Diagnostic {
  const { offset, length, error } = parseError;
  const start = document.positionAt(offset);
  const end = document.positionAt(offset + length);
  const range = { start, end };
  return {
    range,
    message: getDiagnosticsMessage(error),
    severity: DiagnosticSeverity.Error,
    source: 'jref-language-server',
  };
}
