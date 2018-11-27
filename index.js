let PEngine = window.PEngine = {};

PEngine.Scene = class Scene {
  constructor(element) {
    if (typeof element == "string") {
      let temp = document.querySelector(element);
      if (temp) {
        element = temp;
      }
      else {
        throw new Error(`PEngine.Scene::(new): no element matching ${element} found`);
      }
    }
    if (!element instanceof HTMLCanvasElement) {
      throw new Error("PEngine.Scene::(new): element is not a canvas element");
    }
    this.canvas = element;
    this.world = null;
    this.context = this.canvas.getContext("2d");
    if (this.context === null) {
      throw new Error("PEngine.Scene::(new): canvas context was already initialized in another mode or context could not be queried");
    }
    this.updateSize();
    this.uninterpolate();
  }

  bindWorld(world) {
    this.world = world;
    return this;
  }

  loop() {
    if (!this.looping) {
      this.looping = true;
      let looper = () => {
        try {
          if (this.looping) {
            PEngine.Scene.draw(this);
            window.requestAnimationFrame(looper);
          }
        }
        catch (e) {
          console.error(e);
          this.looping = false;
        }
      };
      window.requestAnimationFrame(looper);
    }
    return this;
  }

  stop() {
    this.looping = false;
    return this;
  }

  listenResize(w = window) {
    if (!w.addEventListener) {
      throw new Error("PEngine.Scene::listenResize: invalid element");
    }
    w.addEventListener("resize", () => {
      this.updateSize();
      this.uninterpolate();
    });
    return this;
  }

  updateSize() {
    this.canvas.width = this.context.width = this.canvas.clientWidth;
    this.canvas.height = this.context.height = this.canvas.clientHeight;

    return this;
  }

  uninterpolate() {
    this.context.imageSmoothingEnabled = false;
    return this;
  }

  interpolate() {
    this.context.imageSmoothingEnabled = true;
    return this;
  }

  static draw(scene) {
    if (!scene.world) {
      throw new Error("PEngine.Scene.draw: a bound World instance is required in order to draw");
    }
    if (!scene.world.tileset) {
      throw new Error("PEngine.Scene.draw: a Tileset instance has to be bound to the bound World instance in order to draw");
    }

    scene.context.clearRect(0, 0, scene.canvas.width, scene.canvas.height);

    if (scene.world) {
      scene.world.draw(
        scene.context,
        scene.canvas.width,
        scene.canvas.height
      );
    }
  }
} // ^ Scene

PEngine.World = class World {
  static getDefaultSettings() {
    return {
      background: "rgba(21, 16, 18, 0.7)",
      render: {
        entities: true,
        blocks: true
      },
      scale: [4, 4],
      offset: [0, 0],
      blockScale: [32, 32], // NOTE: blocks only represent a 1x1 tile
      entitiesUseBlockSize: false
    };
  }

  constructor(settings = {}) {
    this.settings = Object.assign(PEngine.World.getDefaultSettings(), settings);
    this.tileset = null;
    this.blockset = null;
    this.entityset = null;
    this.levels = [{blocks: [], entities: []}];
    this.level = 0;
    this.state = {};
  }

  bindTileset(tileset) {
    this.tileset = tileset;
    return this;
  }

  bindBlockset(blockset) {
    this.blockset = blockset;
    return this;
  }

  bindEntityset(entityset) {
    this.entityset = entityset;
    return this;
  }

  addEntity(entity) {
    this._checkLevel("addEntity");
    this.levels[this.level].entities.push(entity);
    return this;
  }

  getEntities(name) {
    this._checkLevel("getEntities");
    if (typeof name == "string") {
      return this.levels[this.level].entities.filter((entity) => entity.name === name || (entity.getParent() || {}).name === name);
    }
    else {
      return this.levels[this.level].entities;
    }
  }

  removeEntity(n) {
    this._checkLevel("removeEntity");
    if (typeof n == "number") {
      this.levels[this.level].entities.splice(n, 1);
      return true;
    }
    else {
      let index = this.levels[this.level].entities.indexOf(n);
      if (~index) {
        this.levels[this.level].entities.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  addBlock(block, x, y, data = {}) {
    this._checkLevel("addBlock");
    x = ~~x;
    y = ~~y;
    if (!this.levels[this.level].blocks[x]) this.levels[this.level].blocks[x] = [];
    if (!this.levels[this.level].blocks[x][y]) this.levels[this.level].blocks[x][y] = [];
    this.levels[this.level].blocks[x][y].push({block, data});
    return this;
  }

  getBlockStack(x, y) {
    this._checkLevel("getBlockStack");
    return (this.levels[this.level].blocks[x] || [])[y] || [];
  }

  getBlock(x, y, layer = 0) {
    this._checkLevel("getBlock");
    return (((this.levels[this.level].blocks[x] || [])[y] || []).find(({data = {}}) => (data.layer || 0) === layer) || {block: null}).block;
  }

  getBlockData(x, y, layer = 0) {
    this._checkLevel("getBlockData");
    return (((this.levels[this.level].blocks[x] || [])[y] || []).find(({data = {}}) => (data.layer || 0) === layer) || {data: null}).data;
  }

  getBlockRaw(x, y, layer = 0) {
    this._checkLevel("getBlockRaw");
    return ((this.levels[this.level].blocks[x] || [])[y] || []).find(({data = {}}) => (data.layer || 0) === layer) || null;
  }

  draw(context, width, height) {
    let settings = this.settings;
    if (this.level === -1 || !this.levels[this.level]) return false;

    if (settings.background) {
      context.fillStyle = settings.background;
      context.fillRect(0, 0, width, height);
    }

    if (!this.tileset) return false;
    if (typeof this.preDraw === "function") {
      this.preDraw(context, width, height);
    }

    let toDraw = [];

    // push entities and blocks
    if (this.settings.render.entities && this.levels[this.level].entities.length) {
      this.levels[this.level].entities.forEach(entity => {
        toDraw.push([entity, entity.layer || 0]);
      });
    }

    if (this.settings.render.blocks && this.levels[this.level].blocks.length) {
      this.levels[this.level].blocks.forEach((row, x) =>
        row.forEach((stack, y) =>
        stack.forEach(({block, data}) => {
          if (this.blockset && typeof block === "string") block = this.blockset.get(block);
          //console.log(block);
          toDraw.push([block, data.layer || 0, {data, x, y}]);
        }
      )));
    }

    // sort them by layer and draw them
    toDraw.sort(([a, b], [c, d]) => b - d).forEach(([element, _, additional]) => {
      element.draw({
        world: this,
        tileset: this.tileset,
        entityset: this.entityset,
        blockset: this.blockset,
        context,
        level: this.levels[this.level],
        ...additional
      });
    });
  } // ^ World.draw

  coords(x, y, width, height, kind) {
    if (
      kind === PEngine.KIND_ENTITY && this.settings.entitiesUseBlockSize
      || kind === PEngine.KIND_BLOCK
    ) {
      x *= this.settings.blockScale[0];
      y *= this.settings.blockScale[1];
      width *= this.settings.blockScale[0];
      height *= this.settings.blockScale[1];
    }
    return {
      x: this.settings.scale[0] * (x + this.settings.offset[0]),
      y: this.settings.scale[1] * (y + this.settings.offset[1]),
      width: this.settings.scale[0] * width,
      height: this.settings.scale[1] * height
    }
  }

  getBlockNeighbors(x, y, layer) {
    return {
      top: this.getBlock(x, y-1, layer),
      left: this.getBlock(x-1, y, layer),
      right: this.getBlock(x+1, y, layer),
      bottom: this.getBlock(x, y+1, layer),
      above: this.getBlockStack(x, y).filter(({data}) => (data.layer || 0) > layer),
      below: this.getBlockStack(x, y).filter(({data}) => (data.layer || 0) < layer)
    }
  }

  _checkLevel(fnname = "*") {
    if (!this.levels[this.level] || !this.levels[this.level].blocks || !this.levels[this.level].entities) {
      throw new Error(`PEngine.World::${fnname}: level not initialized`);
    }
  }
} // ^ World

PEngine.KIND_ENTITY = 0;
PEngine.KIND_BLOCK = 1;

PEngine.Tileset = class Tileset {
  constructor(settings = {}) {
    this.tiles = {};
    this.loading = {};
    this.attributes = {};
    this.settings = settings;
  }

  get(name, n = 0) {
    if (n > (this.settings.maxDepth || 4)) return;
    if (typeof this.tiles[name] === "string") {
      return this.get(this.tiles[name].slice(1), n+1); // the .slice(1) is there because of the leading #
    }
    return this.tiles[name] || null;
  }

  getAttributes(name) {
    return this.attributes[name] || {};
  }

  registerTile(name, image, attributes = {}) {
    if (!image.startsWith("#")) {
      let temp = new Image();
      temp.src = image;
      image = temp;
    }
    this.tiles[name] = image;
    this.setAttributes(name, attributes);
    if (image instanceof Image) {
      if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
        this.loading[name] = true;
        image.addEventListener("load", () => {
          this.loading[name] = false;
        });
        image.addEventListener("error", () => {
          this.setAttributes(name, {error: true});
        });
      }
    }
  }

  setAttributes(name, attributes) {
    let image = this.get(name) || {naturalWidth: 0, naturalHeight: 0};
    this.attributes[name] = Object.assign({}, attributes, this.getAttributes(name), {
      sx: attributes.sx && ~attributes.sx ? attributes.sx : 0,
      sy: attributes.sy && ~attributes.sy ? attributes.sy : 0,
      swidth: attributes.swidth && ~attributes.swidth ? attributes.swidth : image.naturalWidth,
      sheight: attributes.sheight && ~attributes.sheight ? attributes.sheight : image.naturalHeight
    });
  }

  isLoading() {
    return Object.values(this.loading).some((v) => v);
  }

  draw(context, name, x, y, width, height) {
    //console.log(name, this.get(name));
    let image = this.get(name);
    let attributes = this.getAttributes(name);
    if (!image && attributes.color) {
      context.fillStyle = attributes.color;
      context.fillRect(x, y, width, height);
      return;
    }
    if (!image) throw new Error("PEngine.Tileset: no tile called " + name);
    if (attributes.animation) { // animation
      let tileCount;
      if (attributes.animation.direction === "x") {
        tileCount =
          typeof attributes.animation.steps === "number" && attributes.animation.steps
          || Array.isArray(attributes.animation.steps) && attributes.animation.steps.length
          || Math.floor(image.naturalWidth / attributes.swidth);
      }
      else {
        tileCount =
          typeof attributes.animation.steps === "number" && attributes.animation.steps
          || Array.isArray(attributes.animation.steps) && attributes.animation.steps.length
          || Math.floor(image.naturalHeight / attributes.sheight);
      }

      let active = Math.floor(performance.now() / attributes.animation.interval) % tileCount;
      if (Array.isArray(attributes.animation.steps)) {
        active = attributes.animation.steps[active];
      }

      if (attributes.animation.direction === "x") {
        context.drawImage(image,
          Math.floor(attributes.sx) + attributes.swidth * active,
          Math.floor(attributes.sy),
          attributes.swidth,
          attributes.sheight,
          x, y, width, height
        );
      }
      if (attributes.animation.direction === "y") {
        context.drawImage(image,
          Math.floor(attributes.sx),
          Math.floor(attributes.sy) + attributes.sheight * active,
          attributes.swidth,
          attributes.sheight,
          x, y, width, height
        );
      }
    } // ^ animation handler
    else {
      context.drawImage(image,
        attributes.sx,
        attributes.sy,
        attributes.swidth,
        attributes.sheight,
        x, y, width, height
      );
    }
  } // ^ Tileset.draw
} // ^ Tileset

PEngine.Blockset = class Blockset {
  constructor(settings = {}) {
    this.blocks = {};
    this.settings = settings;
  }

  static from(obj) {
    if (typeof obj === "object") {
      this.blocks = obj.blocks;
      this.settings = obj.settings;
    }
  }

  registerBlock(name, block) {
    this.blocks[name] = block;
  }

  get(name, n = 0) {
    if (n > (this.settings.maxDepth || 4)) return null;
    if (!this.blocks.hasOwnProperty(name)) {
      return null;
    }
    else {
      if (typeof this.blocks[name] === "string") {
        return get(this.blocks[name], n+1);
      }
      else {
        return this.blocks[name];
      }
    }
  }
} // ^ Blockset

PEngine.Entityset = class Entityset {
  constructor(settings = {}) {
    this.settings = settings;
    this.entities = {};
  }

  get(name) {
    return this.entities[name];
  }

  registerEntity(name, entity) {
    this.entities[name] = entity;
  }
}

PEngine.Drawable = class Drawable {
  setPreDraw(preDraw) {
    this.preDraw = preDraw;
  }
  clearPreDraw() {
    delete this.preDraw;
  }
  runPreDraw(...args) {
    if (this.hasOwnProperty("preDraw") && typeof this.preDraw === "function") this.preDraw(...args);
  }

  setPostDraw(postDraw) {
    this.postDraw = postDraw;
  }
  clearPostDraw() {
    delete this.postDraw;
  }
  runPostDraw(...args) {
    if (this.hasOwnProperty("postDraw") && typeof this.postDraw === "function") this.postDraw(...args);
  }

  // template / placeholder
  draw(options) {
    this.runPreDraw(options);
    // drawing phase
    this.runPostDraw(options);
  }
} // ^ Drawable

PEngine.Entity = class Entity extends PEngine.Drawable {
  constructor(width, height, name, tiles = {default: name}) {
    super();
    this.width = width;
    this.height = height;
    this.name = name;
    this.tiles = tiles;
  }

  draw(options, instance) {
    this.runPreDraw(options, instance);

    let {world, context, tileset} = options;
    let {x, y, width, height} = world.coords(instance.x, instance.y, this.width, this.height, PEngine.KIND_ENTITY);
    //throw [x, y, width, height];
    if ((x + width >= 0 && x <= context.width) || (y + height >= 0 && y <= context.height)) {
      tileset.draw(context, this.tiles[instance.state] || this.tiles.default, x, y, width, height);
    }

    this.runPostDraw(options, instance);
  }
}

PEngine.EntityInstance = class EntityInstance extends PEngine.Drawable {
  constructor(x, y, parent, layer = 0) {
    super();
    this.x = x;
    this.y = y;
    this.layer = layer;
    this.parent = parent;
    this.state = "default";
  }

  setState(state) {
    this.state = state;
  }

  getParent() {
    let parent = this.parent;
    if (typeof parent == "string" && entityset) {
      parent = entityset.get(parent);
      if (!parent) {
        throw new Error("PEngine.getParent: couldn't find Entity " + this.parent);
      }
    }
    return parent;
  }

  draw(options) {
    this.runPreDraw(options);

    let {world, context, entityset} = options;
    let parent = this.getParent();

    parent.draw(options, this);

    this.runPostDraw(options);
  }
}

PEngine.Block = class Block extends PEngine.Drawable {
  constructor(name, tile = name) {
    super();
    this.name = name;
    this.tile = tile;
  }

  draw(options) {
    // draws the block
    this.runPreDraw(options);

    let {world, context, tileset} = options;
    let {x, y, width, height} = world.coords(options.x, options.y, 1, 1, PEngine.KIND_BLOCK);
    if ((x + width >= 0 && x <= context.width) || (y + height >= 0 && y <= context.height)) { // visible
      tileset.draw(context, this.tile, x, y, width, height);
    }

    this.runPostDraw(options);
  }
}

PEngine.PolyBlock = class PolyBlock extends PEngine.Block {
  constructor(name, tiles = {default: name}) {
    super(name, tiles["default"]);
    this.name = name;
    this.tiles = tiles;
  }

  draw(options) {
    // attempts to draw the connected faces, otherwise draw the default tile
    const sides = ["top", "bottom", "left", "right"];
    const selectors = ["t", "b", "l", "r"];

    this.runPreDraw(options);

    let {world, context, tileset} = options;
    let {x, y, width, height} = world.coords(options.x, options.y, 1, 1, PEngine.KIND_BLOCK);
    if ((x + width >= 0 && x <= context.width) || (y + height >= 0 && y <= context.height)) { // visible
      let neighbors = world.getBlockNeighbors(options.x, options.y, options.layer);
      let drawn = false;
      for (let tile in this.tiles["with"]) {
        let selector = "";
        for (let x = 0; x < 4; x++) {
          if (neighbors[sides[x]] && neighbors[sides[x]].name === tile) {
            selector += selectors[x];
          }
        }
        if (selector !== "" && this.tiles["with"][tile][selector]) {
          tileset.draw(context, this.tiles["with"][tile][selector], x, y, width, height);
          drawn = true;
          break;
        }
      }

      if (!drawn) tileset.draw(context, this.tiles["default"], x, y, width, height);
    }

    this.runPostDraw(options);
  }
} // ^ PolyBlock
