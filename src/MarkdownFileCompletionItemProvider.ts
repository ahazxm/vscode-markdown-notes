import * as vscode from 'vscode';
import { RefType, getRefAt } from './Ref';
import { NoteWorkspace } from './NoteWorkspace';
import { NoteParser } from './NoteParser';

interface Dictionary<T> {
  [key: string]: T;
}
// Given a document and position, check whether the current word matches one of
// these 2 contexts:
// 1. [[wiki-links]]
// 2. #tags
//
// If so, provide appropriate completion items from the current workspace
export class MarkdownFileCompletionItemProvider implements vscode.CompletionItemProvider {
  private _paths: Dictionary<string> = {};

  public async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ) {
    const ref = getRefAt(document, position);
    let items = [];
    switch (ref.type) {
      case RefType.Null:
        return [];
        break;
      case RefType.Tag:
        items = (await NoteParser.distinctTags()).map((t) => {
          let kind = vscode.CompletionItemKind.File;
          let label = `${t}`; // cast to a string
          let item = new vscode.CompletionItem(label, kind);
          if (ref && ref.range) {
            item.range = ref.range;
          }
          return item;
        });
        return items;
        break;
      case RefType.WikiLink:
        let files = await NoteWorkspace.noteFiles();
        items = files.map((f) => {
          let kind = vscode.CompletionItemKind.Snippet;
          let label = NoteWorkspace.wikiLinkCompletionForConvention(f, document);
          this._paths[label] = f.fsPath
          let item = new vscode.CompletionItem(label, kind);
          item.commitCharacters = ['#', '|'] // ! for [[wiki-link#heading]] [[Text|wiki-link]]
          if (ref && ref.range) {
            item.range = ref.range;
          }
          return item;
        });
        return items;
        break;
      default:
        return [];
        break;
    }
  }

  public async resolveCompletionItem(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem> {
    let fsPath = this._paths[item.label]
    if (fsPath) {
      let note = NoteParser.noteFromFsPath(fsPath)
      item.detail = note.title
      item.documentation = note.documentation()
      delete this._paths[item.label]
    }
    return item
  }
}
