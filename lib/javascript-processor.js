'use 6to5';

const resolve = require('resolve').sync;
const path = require('path');


module.exports = {
    scopes: [
        'source.js',
        'source.js.jsx',
    ],
    processEditor(editor) {
        let results = [];
        // Match either quote, then a `./` followed by anything that isn't the same
        // quote character, until it gets to the closing quote.
        let potentialPaths = /(['"])(\.\.?\/[^\1]*)\1/;

        for (let lineNum = 0; lineNum < editor.getLineCount(); lineNum++) {
            let line = editor.lineTextForBufferRow(lineNum);

            let modulePath = (line.match(potentialPaths) || []).pop();
            if (modulePath) {
                let column = line.indexOf(modulePath);
                results.push({
                    processor: this,
                    modulePath,
                    range: [
                        [lineNum, column],
                        [lineNum, (column + modulePath.length) ]
                    ],
                });
            }
        }
        return results;
    },
    followLink(srcFilename, { modulePath } ) {
        // This is the same order they're listed in CoffeeScript.
        let coffeeExtensions = ['.coffee', '.litcoffee', '.coffee.md'];
        let basedir = path.dirname(srcFilename);
        try {
            return resolve(modulePath, {
                basedir: basedir,
                extensions: [ '.js', ...coffeeExtensions]
            });
        } catch (e) {
            // Nothing to do here, resolve throws instead of returning
            // undefined or null.
        }
    }
};
