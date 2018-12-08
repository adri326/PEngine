# PEngine, the canvas and object management library for HTML5 canvases

It's not *the* canvas and object management library, it is mainly *my stab at a* (copy-paste here the title).
The goal of this library was to give myself a more easy way to manage tiles, entity instances and connecting map tiles.
There has been a first version out there, but it was some so-called "spaghetti code": unreadable, unmaintanable. The thing you're reading as of right now is the README of the new, readable and maintanable version of PEngine.
As this version probably needs a name, let's give it one right now: `1.0.1`.

## Installation / usage

`PEngine` is a single-file library, so you only have to load it in your HTML code:

```html
<script src="//adri326.github.io/pengine/index.js"></script>
```

Alternatively, you can clone this repository and load the file on your side, it'll be the same one (unless you modify it).

Once this is done, you can use it in your javascript code; all of the classes, constants, etc… are in the global `PEngine` object. So, for instance, to create a `Scene` object, call `PEngine.Scene::constructor`:

```js
let scene = new PEngine.Scene("#canvas");
```

Some examples can be found in the `examples` directory.
