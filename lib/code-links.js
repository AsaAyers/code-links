'use 6to5';
/*global atom */

const SubAtom = require('sub-atom');
const jsProcessor = require('./javascript-processor.js');
const { Disposable } = require('atom');

let linkMap = new WeakMap();

module.exports = {
    subs: null,

    activate() {
        this.subs = new SubAtom();
        this.processors = [];

        this.subs.add(atom.workspace.observeTextEditors((editor) => {
            this.processEditor(editor);
            this.subs.add(
                editor.onDidSave(this.processEditor.bind(this, editor))
            );
            this.setupClickHandler(editor);
        }));
    },
    provideJavascriptLinks() {
        return jsProcessor;
    },
    consumeLinkProviderV0(provider) {
        this.processors.push(provider);
        this.onProvidersChanged();
        return new Disposable(() => {
            let idx = this.processors.indexOf(provider);
            if (idx > -1) {
                this.processors.splice(idx, 1);
                this.onProvidersChanged();
            }
        });
    },
    onProvidersChanged() {
        atom.workspace.getEditors().map((editor) => {
            this.processEditor(editor);
        });
    },
    processEditor(editor) {
        let links = linkMap.get(editor) || [];
        // Always reset by destroying the existing markers.
        // It might be more efficient to diff, but I'm not sure how to do that.
        links.map(( { marker } ) => { marker.destroy(); });

        links = this.processors.reduce(function (prev, p) {
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
        this.subs.add(links, 'click', '.code-links .region', (e) => {
            // Default modifier
            let modifier = e.ctrlKey;
            if (process.platform === 'darwin') {
                modifier = e.altKey;
            }

            if (modifier) {
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
            console.error('Tried to click overlapping markers.');
            console.log(markers);
        }
        if (markers.length) {
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
            class: 'code-links'
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
