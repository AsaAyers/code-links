# code-links package

:rotating_light: Deprecated :rotating_light: 
==========

If you use `code-links` for scanning JavaScript and not CoffeeScript, you should uninstall it and install [`js-hyperclick`][js-hyperclick] and [hyperclick][hyperclick] instead.

code-links
==========

`code-links` does two things:

1. Provide a service allowing other plugins to scan code to produce links.
2. Acts as one of those other plugins providing JavaScript scanning.

Combining these two was a mistake that I'm going to fix now.
[hyperclick][hyperclick] completely overlaps with the first goal of this
project. As for the 2nd goal, I have rewritten `code-links` as [`js-hyperclick`][js-hyperclick].

What about the other plugins?
=============================

I got no traction in getting others to write plugins for `code-link`. The only
plugin I'm aware of is [`coffee-links`][coffee-links]. I have no plans to
rewrite or migrate this plugin. I have moved away from using CoffeeScript as it
provides very few benefits over ES6.

[hyperclick]: https://atom.io/packages/hyperclick
[js-hyperclick]: https://atom.io/packages/js-hyperclick
[coffee-links]: https://atom.io/packages/coffee-links
