'use 6to5';
/*global atom */

const AtomLinksView = require('./atom-links-view');
const { CompositeDisposable } = require('atom');
const SubAtom = require('sub-atom');
const jsProcessor = require('./javascript-processor.js');

let linkMap = new WeakMap();

module.exports = {
    atomLinksView: null,
    modalPanel: null,
    subscriptions: null,
    subs: null,

    activate(state) {
        this.atomLinksView = new AtomLinksView(state.atomLinksViewState);
        this.modalPanel = atom.workspace.addModalPanel({
            item: this.atomLinksView.getElement(),
            visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with
        // a CompositeDisposable
        this.subscriptions = new CompositeDisposable();
        this.subs = new SubAtom();

        // Register command that toggles this view
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'atom-links:toggle': this.toggle.bind(this)
            })
        );

        this.registeredProcessors = [];
        this.registeredProcessors.push(jsProcessor);

        atom.workspace.observeTextEditors((editor) => {
            let links = [];

            for (let i = 0; i < this.registeredProcessors.length; i++) {
                links = links.concat(
                    this.registeredProcessors[i].processEditor(editor)
                );
            }

            linkMap.set(editor, links);
            if (links.length) {
                this.generateMarkers(editor, links);
                this.setupClickHandler(editor);
            }
        });
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
            processor.followLink(editor.getPath(), markers[0]);
        }
    },
    generateMarkers(editor, links) {
        for (let i = 0; i < links.length; i++) {
            let { path, range } = links[i];
            let marker = editor.markBufferRange(range, {
                persistent: false,
                invalidate: 'inside',
            });
            let decoration = editor.decorateMarker(marker, {
                type: 'highlight',
                class: 'atom-links'
            });

            console.log('found path', path, range[0], range[1], decoration);
        }
    },
    deactivate() {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.atomLinksView.destroy();
    },
    serialize() {
        return {
            atomLinksViewState: this.atomLinksView.serialize()
        };
    },
    toggle() {
        console.log('AtomLinks was toggled!');

        if (this.modalPanel.isVisible()) {
            this.modalPanel.hide();
        } else {
            this.modalPanel.show();
        }
    }
};
