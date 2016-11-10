'use babel';

const COMMENT_REGEX = /^\s*\/\//;

import { CompositeDisposable } from 'atom';

export default {

  modalPanel: null,
  subscriptions: null,

  activate() {
    // Events subscribed to in atom's system can be easily cleaned up with
    // a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'wrap-comments:hard-wrap': () => this.hardWrap()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  // TODO: Break functions out of this mega function
  // TODO: Consider /* */ style comments and possibly other languages
  hardWrap() {
    const editor = atom.workspace.getActiveTextEditor();
    if (editor) {
      // Break editor text into lines
      const lines = editor.getText().split('\n');

      // Collect comment blocks
      const commentBlocks = [];
      let prevLineWasComment = false;
      for (let [i, line] of lines.entries()) {
        if (line.match(COMMENT_REGEX)) {
          if (prevLineWasComment) {
            const block = commentBlocks[commentBlocks.length - 1];
            block.lines.push(line);
            block.endLine = i;
            block.endChar = line.length;
          } else if (line.length > 80) {
            commentBlocks.push({
              startLine: i,
              endLine: i,
              endChar: line.length,
              lines: [line]});
            prevLineWasComment = true;
          }
        } else {
          prevLineWasComment = false;
        }
      }

      let linesAdded = 0;
      for (let block of commentBlocks) {
        // Parse comment blocks into contiguous strings
        const charsBeforeToken = block.lines[0].split('//')[0].length;
        const lineLimit =
          atom.config.get('editor.preferredLineLength') - charsBeforeToken;
        const joinedStr = block.lines.reduce(
          (str, line) => (
            [str, line.replace(COMMENT_REGEX, '').trimLeft()].join(' ')),
          '//');

        // Split back out into wrapped strings
        const resplitList = this.wrapText(joinedStr, lineLimit);
        const resplitString = resplitList
          .map(
            line => ' '.repeat(charsBeforeToken) + line)
          .join('\n');

        // Modify editor contents
        // TODO: This currently makes multiple changes in editor when
        //       instead it could potentially make a single block change
        editor.setTextInBufferRange(
          [
            [block.startLine + linesAdded, 0],
            [block.endLine + linesAdded, block.endChar]
          ],
          resplitString
        );
        linesAdded += resplitList.length - block.lines.length;
      }
    }
  },

  // Recursive wrap function that takes a single line and wraps it to the
  // appropriate length
  wrapText(str, lineLength, commentToken='//') {
    if (str.length > lineLength) {
      // Find first break before lineLimit
      let breakIndex;
      for (let i = lineLength; breakIndex === undefined; i--) {
        if (str[i] === ' ') {
          breakIndex = i;
        } else if (i === 0) {
          // If no break is found, just break it off at lineLength
          breakIndex = lineLength;
        }
      }

      return [
        str.slice(0, breakIndex),
        ...this.wrapText(
          commentToken + str.slice(breakIndex), lineLength, commentToken)
      ];
    } else {
      return [str];
    }
  }

};
