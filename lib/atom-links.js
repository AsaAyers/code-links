'use 6to5';
/*global atom */

const SubAtom = require('sub-atom');
const jsProcessor = require('./javascript-processor.js');

let linkMap = new WeakMap();

module.exports = {
    subs: null,

    activate() {
        this.subs = new SubAtom();

        this.registeredProcessors = [];
        this.registeredProcessors.push(jsProcessor);

        this.subs.add(atom.workspace.observeTextEditors((editor) => {
            this.processEditor(editor);
            this.subs.add(
                editor.onDidSave(this.processEditor.bind(this, editor))
            );
            this.setupClickHandler(editor);
        }));
    },
    processEditor(editor) {
        let links = linkMap.get(editor) || [];
        // Always reset by destroying the existing markers.
        // It might be more efficient to diff, but I'm not sure how to do that.
        links.map(( { marker } ) => { marker.destroy(); });

        links = this.registeredProcessors.reduce(function (prev, p) {
            let { scopeName } = editor.getGrammar();
            if (p.scopes.indexOf(scopeName) !== -1) {
                return prev.concat(p.processEditor(editor));
            }
            return prev;
        }, []).map(
            this.generateMarker.bind(this, editor)
        );

        linkMap.set(editor, links);

    },
    setupClickHandler(editor) {
        let view = atom.views.getView(editor);
        let links = view.shadowRoot.querySelector('.lines');
        this.subs.add(links, 'click', '.atom-links .region', (e) => {
            if (e.ctrlKey) {
                this.handleClick(editor);
            }
        });
    },
    handleClick(editor) {
        let links = linkMap.get(editor);
        if (!links || links.length === 0) {
            return;
        }
        let pos = editor.getCursorBufferPosition();

        let linkFilter = function( { range }) {
            let row, start, end;
            [ [row, start], [row, end] ] = range;
            return (pos.row === row && start <= pos.column && pos.column <= end);
        };

        let markers = links.filter(linkFilter);
        if (markers.length > 1) {
            throw new Error('Tried to click overlapping markers.');
        }
        if (markers.length === 1) {
            let { processor } = markers[0];
            let filename = processor.followLink(editor.getPath(), markers[0]);

            if (filename) {
                atom.workspace.open(filename);
            }
        }
    },
    generateMarker(editor, link) {
        link.marker = editor.markBufferRange(link.range, {
            persistent: false,
            invalidate: 'inside',
        });
        editor.decorateMarker(link.marker, {
            type: 'highlight',
            class: 'atom-links'
        });

        return link;
    },
    deactivate() {
        this.subs.dispose();
    },
    serialize() {
        return {};
    },
};
