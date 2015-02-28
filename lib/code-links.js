'use 6to5';
/*global atom */

const SubAtom = require('sub-atom');
const { Disposable } = require('atom');

let linkMap = new WeakMap();

const matchScope = function(scopeName) {
    return function(provider) {
        return (provider.scopes.indexOf(scopeName) !== -1);
    };
};

const flatten = function(prev, next) {
    return prev.concat(next);
};

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
        return require('./javascript-processor.js');
    },
    consumeLinkProviderV0(provider) {
        if (typeof provider.process !== 'function') {
            console.warn('Invalid link provider: invalid process()');
            // Does this have to return a disposable?
            return new Disposable();
        }
        if (!provider.scopes || typeof provider.scopes.indexOf !== 'function') {
            console.warn('Invalid link provider: invalid scopes');
            // Does this have to return a disposable?
            return new Disposable();
        }

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
        try {
            let links = linkMap.get(editor) || [];
            // Always reset by destroying the existing markers.
            // It might be more efficient to diff, but I'm not sure how to do that.
            links.map(( { marker } ) => { marker.destroy(); });

            let source = editor.getText();

            links = this.processors
                .filter(matchScope(editor.getGrammar().scopeName))
                .map(function(provider) {
                    return provider.process(source).map(function(link) {
                        link.provider = provider;
                        return link;
                    });
                })
                .reduce(flatten, [])
                .map(this.generateMarker.bind(this, editor));

            linkMap.set(editor, links);
        } catch (e) {
            console.error('Exception from ProcessEditor');
            console.log(e.message);
            console.log(e.stack);
        }
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
            let { provider } = markers[0];
            let filename = provider.followLink(editor.getPath(), markers[0]);

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
