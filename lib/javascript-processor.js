'use 6to5';

const scopes = [
    'source.js',
    'source.js.jsx',
];

module.exports = {
    processEditor(editor) {
        let results = [];
        if (scopes.indexOf(editor.getGrammar().scopeName) === -1) {
            return results;
        }
        console.log(editor);
        // Match either quote, then a `./` followed by anything that isn't the same
        // quote character, until it gets to the closing quote.
        let potentialPaths = /(['"])(\.\/[^\1]*)\1/;

        for (let lineNum = 0; lineNum < editor.getLineCount(); lineNum++) {
            let line = editor.lineTextForBufferRow(lineNum);

            let path = (line.match(potentialPaths) || []).pop();
            if (path) {
                let column = line.indexOf(path);
                results.push({
                    processor: this,
                    path,
                    range: [
                        [lineNum, column],
                        [lineNum, (column + path.length) ]
                    ],
                });
            }
        }
        return results;
    },
    followLink(srcFilename, { path } ) {
        console.log('resolve', srcFilename, path);
    }
};
