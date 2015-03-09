'use babel';
/*global atom */
let jsProcessor = require('./javascript-processor.js');

const url = require('url');
const shell = require('shell');
const path = require('path');

const SubAtom = require('sub-atom');
const { Disposable } = require('atom');

let linkMap = new WeakMap();
let providerMap = new WeakMap();

const matchScope = function(scopeName) {
    return function(provider) {
        return (provider.scopes.indexOf(scopeName) !== -1);
    };
};

const flatten = function(prev, next) {
    return prev.concat(next);
};

module.exports = {

    config: {
        modifierKey: {
            description: 'Hold this key and click a link to open it',
            type: 'string',
            default: (process.platform === 'darwin') ? 'alt' : 'ctrl',
            enum: [ 'ctrl', 'alt' ]
        },
        displayMode: {
            type: 'string',
            default: 'modifier',
            enum: [ 'always', 'modifier' ]
        }
    },

    subs: null,

    activate() {
        this.subs = new SubAtom();
        this.processors = [];

        this.subs.add(atom.config.observe('code-links.modifierKey', (modifier) => {
            document.body.classList.remove('code-links-ctrl');
            document.body.classList.remove('code-links-alt');
            let mode = atom.config.get('code-links.displayMode');
            if (mode === 'modifier') {
                document.body.classList.add(`code-links-${modifier}`);
            }

        }));
        this.subs.add(atom.config.observe('code-links.displayMode', (mode) => {
            if (mode === 'always') {
                document.body.classList.add('code-links-visible');
            } else {
                document.body.classList.remove('code-links-visible');
            }
        }));

        this.subs.add(atom.workspace.observeTextEditors((editor) => {
            this.processEditor(editor);
            this.subs.add(
                editor.onDidSave(this.processEditor.bind(this, editor))
            );
            this.setupClickHandler(editor);
        }));

        // I had trouble detecting keyup for the modifier key, so this relies on
        // the keyboard's repeat rate to keep the links visible.
        let timer;
        atom.commands.add('atom-text-editor', 'code-links:tmp-show-links', (e) => {
            // Don't interfere with any other keybindings.
            e.abortKeyBinding();

            let mode = atom.config.get('code-links.displayMode');
            if (mode === 'always') {
                return;
            }

            if (timer) {
                clearTimeout(timer);
            } else {
                this.showLinks();
            }
            timer = setTimeout(() => {
                timer = undefined;
                this.hideLinks();
            }, 500);
        });
    },
    provideJavascriptLinks() {
        return jsProcessor;
    },
    showLinks() {
        document.body.classList.add('code-links-visible');
    },
    hideLinks() {
        document.body.classList.remove('code-links-visible');
    },
    consumeLinkProviderV0(provider) {
        if (typeof provider.process !== 'function') {
            console.warn('Invalid link provider: invalid process()');
            // Does this have to return a disposable?
            return new Disposable();
        }
        if (typeof provider.followLink !== 'function') {
            console.warn('Invalid link provider: invalid followLink()');
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
                        providerMap.set(link, provider);
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
            let modifier = atom.config.get('code-links.modifierKey');

            if (modifier === 'alt' && e.altKey) {
                this.handleClick(editor);
            } else if (modifier === 'ctrl' && e.ctrlKey) {
                /* These didn't make any difference in preventing multiple
                 * cursors from showing up.
                 */
                // e.preventDefault();
                // e.stopPropagation();
                this.handleClick(editor);
            }
        });
    },
    handleClick(editor) {

        // ctrl+click creates multiple cursors. This will remove all but the
        // last one to simulate cursor movement instead of creation.
        const lastCursor = editor.getLastCursor();
        editor.setCursorBufferPosition(lastCursor.getBufferPosition());

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
            // TODO: Ask the user which marker to follow
            let marker = markers[0];
            let provider = providerMap.get(marker);
            let filename = provider.followLink(editor.getPath(), markers[0]);

            if (filename) {
                let { protocol } = url.parse(filename);
                if (protocol === 'http:' || protocol === 'https:') {
                    if (atom.packages.isPackageLoaded('web-browser')) {
                        atom.workspace.open(filename);
                    } else {
                        shell.openExternal(filename);
                    }
                    return;
                }

                let basedir = path.dirname(editor.getPath());
                filename = path.resolve(basedir, filename);
                atom.workspace.open(filename).then((editor) => {
                    if (typeof provider.scanForDestination !== 'function') {
                        return;
                    }
                    let source = editor.getText();
                    let dest = provider.scanForDestination(source, marker);
                    console.log('dest', dest);
                    if (dest) {
                        editor.setCursorBufferPosition(dest);
                        editor.scrollToCursorPosition();
                    }
                });
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
        document.body.classList.remove('code-links-visible');
        document.body.classList.remove('code-links-ctrl');
        document.body.classList.remove('code-links-alt');
        this.subs.dispose();
    },
    serialize() {
        return {};
    },
};
