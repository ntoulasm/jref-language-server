import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

  test('Should provide a definition for $ref values', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jref-test-'));
    const targetFile = path.join(tmpDir, 'schema.jref');
    const sourceFile = path.join(tmpDir, 'main.jref');

    fs.writeFileSync(targetFile, '{"type": "string"}');
    fs.writeFileSync(sourceFile, '{"$ref": "schema.jref"}');

    const doc = await vscode.workspace.openTextDocument(sourceFile);
    await vscode.window.showTextDocument(doc);

    await sleep(2000);

    // Line 0, Character 12 is roughly inside the "target.jref"
    const position = new vscode.Position(0, 12);

    const locations = await vscode.commands.executeCommand<vscode.DefinitionLink[]>(
      'vscode.executeDefinitionProvider',
      doc.uri,
      position,
    );

    assert.ok(
      locations && Array.isArray(locations) && locations.length > 0,
      'Should return an array of DefinitionLinks',
    );

    const link = locations[0];
    const resolvedPath = link.targetUri.fsPath.toLowerCase();
    const expectedPath = targetFile.toLowerCase();

    assert.strictEqual(
      resolvedPath,
      expectedPath,
      `Expected to point to ${expectedPath} but got ${resolvedPath}`,
    );
    assert.ok(fs.existsSync(link.targetUri.fsPath), 'The resolved target file must exist on disk');
  }).timeout(5000);

  test('Should NOT provide a definition when clicking on irrelevant characters', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jref-test-'));
    const targetFile = path.join(tmpDir, 'schema.jref');
    const sourceFile = path.join(tmpDir, 'main.jref');

    fs.writeFileSync(targetFile, '{"type": "string"}');
    fs.writeFileSync(sourceFile, '{"$ref": "schema.jref"}');

    const doc = await vscode.workspace.openTextDocument(sourceFile);
    await vscode.window.showTextDocument(doc);

    await sleep(2000);

    // Line 0, Character 1 is at the "{"
    const position = new vscode.Position(0, 1);

    const locations = await vscode.commands.executeCommand<vscode.DefinitionLink[]>(
      'vscode.executeDefinitionProvider',
      doc.uri,
      position,
    );

    const hasResults = locations && locations.length > 0;
    assert.strictEqual(hasResults, false, 'Should not return a definition for non $ref keys');
  }).timeout(5000);
});
