'use babel';
/*eslint-env jasmine */
let processor = require('../lib/javascript-processor.js');

const findLine = function(target, sourceLines) {
    let reg = new RegExp(`\\b${target}\\b`);
    for (let i = 0; i < sourceLines.length; i++) {
        if (reg.test(sourceLines[i])) {
            return i;
        }
    }
};

const linkForLine = function (links, lineNumber) {
    return links.filter(function( { range } ){
        return range[0][0] === lineNumber;
    })[0];
};

describe('javascript-processor', function() {
    describe('process()', function() {
        beforeEach(function() {
            const source = `
            let relativeJS = require('./same.js')
            var relativeLESS = require('./same.less')
            const relative = require('./same')
            let relativeParent = require('../parent')
            let moduleName = require('some-module')
            let modulePath = require('some/complex/path')
            `;
            let result = processor.process(source);

            this.addMatchers({
                toMatchPath(expectedPath) {
                    let lines = source.split('\n');
                    let i = findLine(this.actual, lines);
                    expect(i).not.toBeUndefined();

                    let link = linkForLine(result, i);

                    if (!link) {
                        return false;
                    }

                    // Services may attach any useful properties they want that
                    // might be useful when being passed back into followLink.
                    expect(link.modulePath).toBe(expectedPath);

                    let [
                        [startLine, startCol],
                        [endLine, endCol]
                    ] = link.range;
                    expect(startLine).toBe(endLine);
                    expect(lines[startLine].slice(startCol, endCol)).toBe(expectedPath);
                    return true;
                },
                toNotBeDetected() {
                    let lines = source.split('\n');
                    let i = findLine(this.actual, lines);
                    let link = linkForLine(result, i);

                    return link === undefined;
                }
            });
        });
        it('should mark these modules', function() {
            expect('relativeJS').toMatchPath('./same.js');
            expect('relativeLESS').toMatchPath('./same.less');
            expect('relative').toMatchPath('./same');
            expect('relativeParent').toMatchPath('../parent');

            expect('moduleName').toNotBeDetected('some-module');
            expect('modulePath').toNotBeDetected('some/complex/path');
        });
    });
    describe('followLink()', function() {
        // I don't know how to write tests for this.
    });
    describe('scanForDestination()', function() {
        let scanFor = function(source, target) {

            let [ lineNum, col ] = processor.scanForDestination(source);
            let actual = source.split('\n')[lineNum]
                .slice(col, col + target.length );
            expect(actual).toBe(target);
        };

        it('locates module.exports', function() {
            let source = `
            class Same {

            }

            module.exports = Same
            `;
            scanFor(source, 'module.exports');
        });
    });
});
