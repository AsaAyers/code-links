Building a code-links provider
==============================

CodeLinks` only ships with the ability to parse Javascript files. I'm leaving other languages up to other plugins.

This document won't cover how to parse your language of choice, just the steps required to be compatible with `code-links`.

Providing the service
---------------------

Make sure this is in your package.json.

```json
  "providedServices": {
    "code-links": {
      "description": "Provides code links for PHP files.",
      "versions": {
        "0.2.0": "provideLinks"
      }
    }
  },
```

Then your main file needs to have a function named `provideLinks`

```CoffeeScript
module.exports = YourPluginHere =
    provideLinks: ->
        # You can build this however you like, it just needs to return an object
        # that conforms to the interface below.
        require('./processor')
```

1. What can you scan
--------------------

Your service needs a `scopes` property. It should be an array of scope names that it can match.

2. Scanning the file
--------------------

```CoffeeScript
# @param {string} source - editor text
# @returns {Object[]} - minimum requirement: a `range` property
process(source) ->
```

When CodeLinks encounters a file you can scan it will call `process(source)`. See Atom's [docs for `range`](https://atom.io/docs/api/v0.186.0/Range#). The objects you pass back will be passed into your other functions. Add anything that might help your code to these objects. You don't have to resolve the full filename here, just return potential links. You probably want to store the text you found as a property.

3. Following a link
-------------------

```CoffeeScript
# @param {string}
# @param {Object} - One of the objects returned from `process`
# @returns {string|null}
followLink(sourceFilename, obj) ->
```

This is your opportunity to resolve the full filename.

* Relative paths will be resolved relative to the source file
* Any paths will be opened in Atom in a new tab.
* You may return `http://` or `https://` URLs that will be opened in a browser.

4. (optional) positioning the cursor
------------------------------------

```CoffeeScript
# @param {string} - Source for the destination file
# @param {Object} - One of the objects returned from `process`
# @returns {int[]|null} - [ row, column ] to move the cursor to
scanForDestination(source, obj) ->
```

If you returned a path to a file and that file was opened in Atom, CodeLinks will call `scanForDestination(source, obj)`. The built in `javascript-processor` uses this to scan for `module.exports`.

[range]: https://atom.io/docs/api/v0.186.0/Range
