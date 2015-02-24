'use 6to5';
/*global atom */

const AtomLinksView = require('./atom-links-view');
const { CompositeDisposable } = require('atom');

const scopes = [
    'source.js',
    'source.js.jsx',
];
const processEditor = function(editor) {
    if (scopes.indexOf(editor.getGrammar().scopeName) === -1) {
        return;
    }
    console.log(editor);
    // Match either quote, then a `./` followed by anything that isn't the same
    // quote character, until it gets to the closing quote.
    let potentialPaths = /(['"])(\.\/[^\1]*)\1/;

    for (let i = 0; i < editor.getLineCount(); i++) {
        let line = editor.lineTextForBufferRow(i);

        let path = (line.match(potentialPaths) || []).pop();
        if (path) {
            let column = line.indexOf(path);
            let range = [
                [i, column],
                [i, (column + path.length) ]
            ];

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
    }
};

module.exports = {
    atomLinksView: null,
    modalPanel: null,
    subscriptions: null,

    activate(state) {
        this.atomLinksView = new AtomLinksView(state.atomLinksViewState);
        this.modalPanel = atom.workspace.addModalPanel({
            item: this.atomLinksView.getElement(),
            visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with
        // a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(
            atom.commands.add('atom-workspace', {
                'atom-links:toggle': this.toggle.bind(this)
            })
        );

        atom.workspace.observeTextEditors(function (editor) {
            processEditor(editor);
        });
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
