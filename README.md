# code-links package

[![Join the chat at https://gitter.im/AsaAyers/code-links](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/AsaAyers/code-links?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Makes parts of your code linkable using ctrl+click. Pluggable architecture
allows other plugins to provide link locations and destinations.

I have been informed that on a mac ctrl+click opens the context menu. v0.2.0
will detect this and use alt instead.

![screenshot](https://raw.githubusercontent.com/AsaAyers/code-links/master/screenshot.png)

## Known plugins

* [coffee-links](https://atom.io/packages/coffee-links)

# Upcoming plans

* core
  * [x] Hide the underlines by default, only show them while holding the modifier key.
  * [x] Add the ability to jump to a specific line in a file once it's open.
* JavaScript Processor
  * [ ] Parse the AST and read all `require()`s and `imports`.
  * [ ] Jump using module names that aren't relative paths.
    * This may need to go find a `package.json` and read it's `main` to find the right file.
  * [ ] Make variables into links so you can jump to where they're defined.

        const SubAtom = require('sub-atom')
        // ... many lines later ...
        this.subs = new SubAtom()
        //              ^
        // Jump the same as clicking the require
