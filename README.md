# code-links package

[![Join the chat at https://gitter.im/AsaAyers/code-links](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/AsaAyers/code-links?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Makes parts of your code linkable using ctrl+click. Pluggable architecture
allows other plugins to provide link locations and destinations.

I have been informed that on a mac ctrl+click opens the context menu. v0.2.0
will detect this and use alt instead.

![screenshot](https://raw.githubusercontent.com/AsaAyers/code-links/master/screenshot.png)

## Known plugins

* [coffee-links](https://atom.io/packages/coffee-links)

## Web Page URLs

Plugins may choose to link to URLs instead of a file on disk. The link opens the URL in the default external browser or shows the web page inside atom if the package `web-browser` is installed.

# Upcoming plans

* core
  * [x] Hide the underlines by default, only show them while holding the modifier key.
  * [x] Add the ability to jump to a specific line in a file once it's open.
* JavaScript Processor
  * [x] Parse the AST and read all `require()`s and `imports`.
  * [x] Jump using module names that aren't relative paths.
  * [ ] Make variables into links so you can jump to where they're defined.

```javascript
const SubAtom = require('sub-atom')
// ... many lines later ...
    this.subs = new SubAtom()
    //              ^
    // Jump the same as if you clicked the require.
```
