import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('ntoulasm.jref-language-server-extension'));
  });

  test('Should activate the extension when a .jref file is opened', async () => {
    const ext = vscode.extensions.getExtension('ntoulasm.jref-language-server-extension');
    assert.ok(ext, 'Extension not found in the registry');

    const doc = await vscode.workspace.openTextDocument({
      language: 'jref',
      content: '{"$ref": "test"}',
    });
    await vscode.window.showTextDocument(doc);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    assert.strictEqual(ext.isActive, true, 'Extension should be active after opening a jref file');
  }).timeout(3000);
});
