'use babel';

const path = require('path');
const espree = require('espree');
const escope = require('escope');

// from esprima's examples:
// https://github.com/ariya/esprima/blob/master/examples/findbooleantrap.js
// Executes visitor on the object and its children (recursively).
const traverse = function (object, visitor) {
    let key, child;

    if (visitor.call(null, object) === false) {
        return;
    }
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
};

module.exports = {
    scopes: [
        'source.js',
        'source.js.jsx',
    ],
    process(source) {
        let results = [];

        let ast = espree.parse(source, {
            range: true,
            loc: true,
            // tokens: true,
            ecmaFeatures: {
                modules: true,
                arrowFunctions: true,
                blockBindings: true,
                destructuring: true,
                regexYFlag: true,
                regexUFlag: true,
                templateStrings: true,
                binaryLiterals: true,
                octalLiterals: true,
                unicodeCodePointEscapes: true,
                defaultParams: true,
                restParams: true,
                forOf: true,
                objectLiteralComputedProperties: true,
                objectLiteralShorthandMethods: true,
                objectLiteralShorthandProperties: true,
                objectLiteralDuplicateProperties: true,
                generators: true,
                spread: true,
                classes: true,
                jsx: true,
                globalReturn: true
            }
        });

        const scopeManager = escope.analyze(ast, {
            ignoreEval: true,
            nodejsScope: true,
            ecmaVersion: 6,
            sourceType: 'module',
        });
        console.log(scopeManager);

        const references = scopeManager.scopes.reduce((memo, scope) => {
            return memo.concat(scope.references);
        }, []);

        references.map((ref) => {
            if (!ref.resolved) {
                return;
            }
            if (ref.identifier && ref.identifier.loc) {
                let { start, end } = ref.identifier.loc;
                results.push({
                    reference: ref,
                    range: [
                    // espree uses 1-indexed lines where
                    // atom uses 0-indexed
                    [start.line - 1, start.column],
                    [end.line - 1, end.column]
                    ]
                });
                if (ref.identifier.name === 'ref') {
                    console.log(ref.identifier.name, ref);
                }
            } else {
                console.log('no identifier', ref);
            }
        });

        // console.log(references);

        traverse(ast, (node) => {
            if (node.type === 'CallExpression'
                && node.callee.name === 'require'
                && node.arguments.length === 1
            ) {
                let { value, loc: {start, end} } = node.arguments[0];

                results.push({
                    moduleName: value,
                    range: [
                        // espree uses 1-indexed lines where
                        // atom uses 0-indexed
                        [start.line - 1, start.column],
                        [end.line - 1, end.column]
                    ]
                });
            }
        });

        return results;
    },
    // Attached to the object so it can be mocked for tests
    _resolve(moduleName, options) {
        const resolve = require('resolve').sync;
        return resolve(moduleName, options);
    },
    followLink(srcFilename, link) {
        if (link.moduleName) {
            return this.followModule(srcFilename, link);
        } else {
            console.log(link);
            return this.followReference(srcFilename, link);
        }
    },
    followReference(srcFilename, { reference }) {
        if (reference.resolved && reference.resolved.defs) {
            return srcFilename;
        }
    },
    followModule(srcFilename, { moduleName } ) {
        // This is the same order they're listed in CoffeeScript.
        let coffeeExtensions = ['.coffee', '.litcoffee', '.coffee.md'];
        let basedir = path.dirname(srcFilename);
        try {
            let resolved = this._resolve(moduleName, {
                basedir: basedir,
                extensions: [ '.js', ...coffeeExtensions]
            });
            // If it resolves but isn't a path it's probably a built
            // in node module.
            if (resolved === moduleName) {
                return `http://nodejs.org/api/${moduleName}.html`;
            }
            return resolved;
        } catch (e) {
        }

        // Allow linking to relative files that don't exist yet.
        if (moduleName[0] === '.') {
            return moduleName;
        }
    },
    scanForDestination(source, marker) {
        if (marker.reference) {
            let { reference } = marker;
            let { defs } = reference.resolved;
            if (defs.length === 1) {
                let { start } = defs[0].name.loc;

                return [
                    start.line - 1,
                    start.column
                ];
            } else {
                console.log('multiple defs?', reference);
            }
        }

        let lines = source.split('\n');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            let line = lines[lineNum];

            if (line.indexOf('module.exports') !== -1) {
                return [ lineNum, line.indexOf('module.exports') ];
            }
        }
    }
};
