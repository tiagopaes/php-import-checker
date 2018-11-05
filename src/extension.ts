/**
 * For further reference, this extension was based on the decorator-sample
 * available at https://github.com/Microsoft/vscode-extension-samples/blob/master/decorator-sample/src/extension.ts
 */

'use strict';

import * as vscode from 'vscode';

let context = 0;

// keeps all the unused classes to highlight
let ranges: vscode.Range[] = [];

const unusedNamespaceDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,0,0, 0.5)',
    light: {
        borderColor: 'darkblue'
    },
    dark: {
        borderColor: 'lightblue'
    }
});

export function activate(context: vscode.ExtensionContext) {
    console.log('php-import-checker" is now active!');

    vscode.window.onDidChangeActiveTextEditor((editor) => {
        generateHighlighting();
    }, null, context.subscriptions);

    vscode.workspace.onDidSaveTextDocument(callback => {
        generateHighlighting();
    });

    let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
        generateHighlighting();
    });

    context.subscriptions.push(disposable);
}

function generateHighlighting() {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId != 'php') {
        return;
    }

    let timeout: any = null;
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(updateDecorations, 500);
    }

    triggerUpdateDecorations();

    function updateDecorations() {
        if (!editor) {
            return;
        }

        // clean up the found matches
        ranges = [];

        const text = editor.document.getText();
        const search = findMatch(editor, text);

        search.forEach((match: any) => {
            highlightSelections(editor, match.ranges);
        });
    }
}

export function findMatch(editor: vscode.TextEditor, text: string): any {
    const regEx = /use (.*);/g;
    let match;
    let matches = [];
    let isAlias = false;
    
    while (match = regEx.exec(text)) {
        let found = 0;
        let splitNameSpace = match[1].split('\\');
        let className = splitNameSpace[splitNameSpace.length - 1];

        if (className.search(/ as /) > -1) {
            isAlias = true;
            let splitAlias = className.split(' as ');
            className = splitAlias[splitAlias.length - 1].trim();
        }
        
        let test = text.match(new RegExp('\\b' + className + '\\b', 'g'));
        
        found = (test || []).length;
        
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);

        if (match[0].length && found < 2) {
            matches.push({
                isAlias: isAlias,
                classname: className,
                found: found,
                ranges: [new vscode.Range(startPos, endPos)]
            });
        }

        isAlias = false;
    }

    return matches;
}

function resetAllDecorations() {
    vscode.window.visibleTextEditors.forEach(textEditor => {
        resetDecorations(textEditor);
    });
}

function resetDecorations(textEditor: vscode.TextEditor) {
    highlightSelections(textEditor, []);
}

function highlightSelections(editor: vscode.TextEditor, selections: vscode.Range[]) {
    selections.forEach(s => {
        if (context < 0) {
            ranges.push(s);
        } else {
            ranges.push(new vscode.Range(
                new vscode.Position(Math.max(s.start.line - context, 0), 0),
                new vscode.Position(s.end.line + context, Number.MAX_VALUE)
            ));
        }
    });

    editor.setDecorations(unusedNamespaceDecorationType, ranges);
}

export function deactivate() {
    resetAllDecorations();
}
