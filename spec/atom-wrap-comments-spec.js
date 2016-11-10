'use babel';

import path from 'path';
import fs from 'fs-plus';
import temp from 'temp';

// Use the command `window:run-package-specs` (cmd-alt-ctrl-p) to run specs.

describe('AtomWrapComments', () => {
  let editor, workspaceElement, activationPromise;

  beforeEach(() => {
    const directory = temp.mkdirSync();
    atom.project.setPaths([directory]);
    workspaceElement = atom.views.getView(atom.workspace);
    let filePath = path.join(directory, 'atom-wrap-comments.js');
    fs.writeFileSync(filePath, '');
    fs.writeFileSync(
      path.join(directory, 'sample.js'),
      'var a = 1+1;\n// ding dong'
    );

    waitsForPromise(() => atom.workspace.open(filePath).then(o => editor = o));

    // runs(() => buffer = editor.getBuffer());

    activationPromise = atom.packages.activatePackage('atom-wrap-comments');
  });

  describe('when the wrap-comments:hard-wrap event is triggered', () => {
    // TODO: Break this into multiple discrete tests to test each different
    //       possible interpretation
    it('returns the lines with comments in them', () => {
      /* eslint-disable max-len */
      const inputText = `
        import something from './somewhere-that-goes-exactly-to-80-characterss';
        // I'm a comment that is over 80 characters long so I'm about to break but not at
        // the right place but ideally I should be broken up and reformmatted so that I'm
        // a valid comment block at 80 chars. This should be broken into 4 lines
        var codeString = "I'm not a comment"; // I'm a comment but ignore me
        // I'm a comment that goes to exactly 80, you shouldn't break meeeeeeeee

        // I'm a comment that goes to 81, I should break even though it's a painn

        // I'm a comment with another comment below me
        // We should be seen as two seperate blocks since we don't go over 80c
      `;
      /* eslint-enable max-len */
      const outputText = `
        import something from './somewhere-that-goes-exactly-to-80-characterss';
        // I'm a comment that is over 80 characters long so I'm about to break
        // but not at the right place but ideally I should be broken up and
        // reformmatted so that I'm a valid comment block at 80 chars. This
        // should be broken into 4 lines
        var codeString = "I'm not a comment"; // I'm a comment but ignore me
        // I'm a comment that goes to exactly 80, you shouldn't break meeeeeeeee

        // I'm a comment that goes to 81, I should break even though it's a
        // painn

        // I'm a comment with another comment below me
        // We should be seen as two seperate blocks since we don't go over 80c
      `;
      editor.insertText(inputText);

      atom.commands.dispatch(workspaceElement, 'wrap-comments:hard-wrap');

      waitsForPromise(() => activationPromise);

      runs(() => {
        expect(editor.getText()).toBe(outputText);
      });
    });
  });
});
