'use babel';

const path = require('path');

module.exports = {
    scopes: [
        'source.js',
        'source.js.jsx',
    ],
    process(source) {
        let results = [];
        // Match either quote, then a `./` followed by anything that isn't the same
        // quote character, until it gets to the closing quote.
        let potentialPaths = /(['"])(\.\.?\/[^\1]*)\1/;
        let lines = source.split('\n');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            let line = lines[lineNum];

            let modulePath = (line.match(potentialPaths) || []).pop();
            if (modulePath) {
                let column = line.indexOf(modulePath);
                results.push({
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
    // Attached to the object so it can be mocked for tests
    _resolve(modulePath, options) {
        const resolve = require('resolve').sync;
        return resolve(modulePath, options);
    },
    followLink(srcFilename, { modulePath } ) {
        // This is the same order they're listed in CoffeeScript.
        let coffeeExtensions = ['.coffee', '.litcoffee', '.coffee.md'];
        let basedir = path.dirname(srcFilename);
        try {
            return this._resolve(modulePath, {
                basedir: basedir,
                extensions: [ '.js', ...coffeeExtensions]
            });
        } catch (e) {
            // Nothing to do here, resolve throws instead of returning
            // undefined or null.
            console.log(e);
        }
    },
    scanForDestination(source, marker) {
        let lines = source.split('\n');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            let line = lines[lineNum];

            if (line.indexOf('module.exports') !== -1) {
                return [ lineNum, line.indexOf('module.exports') ];
            }
        }
    }
};
