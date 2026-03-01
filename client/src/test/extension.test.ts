import * as assert from 'assert';
import * as vscode from 'vscode';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite('Extension Test Suite', () => {
  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

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
    await sleep(2000);

    assert.strictEqual(ext.isActive, true, 'Extension should be active after opening a jref file');
  }).timeout(5000);

  test('Should show diagnostics', async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: 'jref',
      content: '{',
    });
    await vscode.window.showTextDocument(doc);
    await sleep(2000);

    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    assert.ok(diagnostics.length > 0, 'Server should send diagnostics for missing brace');
    assert.strictEqual(diagnostics[0].message, `Closing brace "}" expected`);
  }).timeout(5000);
});
