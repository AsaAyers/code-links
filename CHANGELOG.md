## 0.3.0 - Semver!
* Until 1.0 and 0.x increases indicate a non-backward compatible api change.
* Added tests for `javascript-processor`
* [service] Changed `processEditor(editor)` to `process(source)`. `source` is just the plain text of what is in the editor.
* [service] No need to return a `processor` property. Just return an array of objects
with a `range`

      [
      { range: [ [line, startColumn], [line,endColumn] ] },
      { range: [ [line, startColumn], [line,endColumn] ] }
      ]

* Settings - You can change your modifier key
* Settings - By default links will only be visible while holding the modifier key.

## 0.2.0
* Detect macs and switch to the alt key (this will probably become configurable)

## 0.1.2
* Also match paths starting with `../`

## 0.1.1 - Bugfix
* Catch when `resolve` can't find the target file.
* Log when multiple markers are found instead of throwing.

## 0.1.0 - First Release
* Extremely naive JavaScript provider (only handles relative links)
* Blue underlines links
* Handles ctrl+click while ignoring all others
