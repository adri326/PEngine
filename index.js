class PScene {
  constructor(element) {
    this.element = element;
    this.world = null;
    this.context = element.getContext("2d");
    this.update_size();
    this.uninterpolate();
    this._normal = false;
    this.normal_element = null;
    this.normal_context = null;
  }

  normal(e) {
    console.warn("Nah, still not done, update or wait for this feature to be done, 'cause right now it is very buggy");
    this._normal = !!e;
    this.normal_element = e || null;
    this.normal_context = e ? e.getContext("2d") : null;
    return this;
  }

  bind_world(world) {
    this.world = world;
    return this;
  }

  loop(wait) {
    if (wait && this.world.tileset && this.world.tileset.is_loading()) {
      let _this = this;
      this.world.tileset.on_load = function() {
        _this.loop(true);
      }
    }
    else {
      if (!this.looping) {
        this.looping = true;
        window.requestAnimationFrame(() => {
          this._loop();
        });
      }
    }
    return this;
  }

  stop() {
    this.looping = false;
  }

  _loop() {
    this.context.clearRect(0, 0, this.element.width, this.element.height);

    if (this.world) {
      this.world.draw(this.context, this.element.width, this.element.height, {
        normal: this._normal,
        normal_context: this.normal_context
      });
    }


    if (this.looping) {
      window.requestAnimationFrame(() => {
        this._loop()
      });
    }
  }

  listen_on_resize(w = window) {
    w.addEventListener("resize", () => {
      this.update_size();
      this.uninterpolate();
    });
    return this;
  }

  uninterpolate() {
    this.context.imageSmoothingEnabled = false;
    this.context.mozImageSmoothingEnabled = false;
    this.context.webkitImageSmoothingEnabled = false;
    this.context.msImageSmoothingEnabled = false;
  }

  update_size() {
    this.element.width = this.context.width = this.element.clientWidth;
    this.element.height = this.context.height = this.element.clientHeight;
  }
}

class PWorld {
  static get default_settings() {
    return {
      render_entities: true,
      render_blocks: true,
      offset_x: 0,
      offset_y: 0,
      scale_x: 4,
      scale_y: 4,
      blockSizeX: 32,
      blockSizeY: 32,
      background: "#242329",
      entitiesUseBlockSize: false,
      set scale(s) {
        this.scale_x = s;
        this.scale_y = s;
      },
      get scale() {
        return (this.scale_x + this.scale_y) / 2;
      },
      set tile_size(ts) {
        this.tile_size_x = ts;
        this.tile_size_y = ts;
      },
      get tile_size() {
        return (this.tile_size_x + this.tile_size_y) / 2;
      }
    }
  }

  constructor(settings) {
    this.settings = Object.assign(PWorld.default_settings, settings);
    this.tileset = null;
    this.normal_tileset = null;
    this.blockset = null;
    this.entities = [];
    this.blocks = [];
  }

  bind_tileset(tileset) {
    this.tileset = tileset;
    return this;
  }

  bind_normal_tileset(tileset) {
    this.normal_tileset = tileset;
    return this;
  }

  bind_blockset(blockset) {
    this.blockset = blockset;
    return this;
  }

  draw(context, width, height, settings) {
    let {normal = false, normal_context = null} = settings;
    settings = Object.assign({}, this.settings, settings);
    if (typeof settings.background == "string") {
      context.fillStyle = settings.background;
      context.fillRect(0, 0, context.width, context.height);
    }
    if (normal) {
      context.fillStyle = "blue";
      normal_context.clearRect(0, 0, context.width, context.height);
    }
    if (!this.tileset) return false;
    if (this.tileset.is_loading()) return false;

    if (typeof this.onBeforeDraw === "function") this.onBeforeDraw(context);

    if (this.settings.render_entities && this.entities.length) {
      this.entities.forEach(entity => {
        entity._pre_draw({
          world: this,
          tileset: this.tileset,
          normal_tileset: this.normal_tileset,
          context,
          normal,
          normal_context
        });
      });
    }

    if (this.settings.render_blocks && this.blocks.length) {
      this.blocks.forEach((layer, z) => {
        layer.forEach((column, x) => {
          if (Array.isArray(column)) {
            column.forEach((row, y) => {
              let block = row.block;
              if (this.blockset && typeof block == "string") block = this.blockset.get(block);
              if (block) {
                block.draw(x, y, z, { // Renderer element
                  world: this,
                  tileset: this.tileset,
                  normal_tileset: this.normal_tileset,
                  context,
                  neighbors: this.block_neightbors(x, y, z),
                  data: row.data,
                  normal,
                  normal_context
                });
              }
            });
          }
        });
      });
    }

    if (this.settings.render_entities && this.entities.length) {
      this.entities.forEach(entity => {
        entity.draw({
          world: this,
          tileset: this.tileset,
          normal_tileset: this.normal_tileset,
          context,
          normal,
          normal_context
        });
      });
    }
  }

  add_entity(entity) {
    this.entities.push(entity);
    return this;
  }

  add_block(block, x, y, z, data = {}) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (!this.blocks[z]) this.blocks[z] = [];
    if (!this.blocks[z][x]) this.blocks[z][x] = [];
    if (!this.blocks[z][x][y]) this.blocks[z][x][y] = [];
    this.blocks[z][x][y] = {block, data};
    return this;
  }

  add_blocks(sx, sy, ex, ey, block, data, sz = 0, ez = sz) {
    for (let z = sz; z <= ez; z++) {
      for (let x = sx; x <= ex; x++) {
        for (let y = sy; y <= ey; y++) {
          if (typeof block == "function" && typeof data == "function") {
            this.add_block(block(x, y, z), x, y, z, data(x, y, z));
          }
          else if (typeof block == "function") {
            this.add_block(block(x, y, z), x, y, z, data);
          }
          else if (typeof data == "function") {
            this.add_block(block, x, y, z, data(x, y, z));
          }
          else {
            this.add_block(block, x, y, z, data);
          }
        }
      }
    }
  }

  get_block(x, y, z = 0) {
    let block = (((this.blocks[z] || [])[x] || [])[y] || {}).block;
    if (this.blockset && typeof block == "string") return this.blockset.get(block);
    return block;
  }

  get_blocks(x, y, z = -1) {
    if (!~z) {
      return (this.blocks[z] || []).map(layer => {
        let block = ((layer[x] || [])[y] || {}).block;
        if (this.blockset && typeof block == "string") {
          return this.blockset.get(block);
        }
        return block;
      });
    }
  }

  get_block_data(x, y, z = 0) {
    return (((this.blocks[z] || [])[x] || [])[y] || {}).data;
  }

  get_raw_block(x, y, z = 0) {
    return ((this.blocks[z] || [])[x] || [])[y] || null;
  }

  coords(x, y, width, height, kind) {
    if (kind == "entity") {
      if (this.settings.entitiesUseBlockSize) {
        x *= this.settings.blockSizeX;
        y *= this.settings.blockSizeY;
        width *= this.settings.blockSizeX;
        height *= this.settings.blockSizeY;
      }
      return {
        x: this.settings.scale_x * (x + this.settings.offset_x),
        y: this.settings.scale_y * (y + this.settings.offset_y),
        width: this.settings.scale_x * width,
        height: this.settings.scale_y * height
      }
    }
    else {
      return {
        x: this.settings.scale_x * (x * this.settings.blockSizeX + this.settings.offset_x),
        y: this.settings.scale_y * (y * this.settings.blockSizeY + this.settings.offset_y),
        width: this.settings.scale_x * this.settings.blockSizeX * (width || 1),
        height: this.settings.scale_y * this.settings.blockSizeY * (height || 1)
      }
    }
  }

  block_neightbors(x, y, z) {
    return {
      top: this.get_block(x, y-1, z),
      left: this.get_block(x-1, y, z),
      right: this.get_block(x+1, y, z),
      bottom: this.get_block(x, y+1, z),
      above: this.get_blocks(x, y).filter((_, id) => id > z),
      below: this.get_blocks(x, y).filter((_, id) => id < z)
    }
  }
}

window.PWorld = PWorld;


function PWorldify(C) {
  let c = class extends C {
    constructor(name, tilename) {
      super();
      Object.assign(this, new PWorld(name, tilename));
    }

    static get default_settings() {
      return PWorld.default_settings;
    }
  };
  ([
    "bind_tileset",
    "bind_blockset",
    "draw",
    "add_entity",
    "add_block",
    "add_blocks",
    "get_block",
    "get_blocks",
    "get_block_data",
    "get_raw_block",
    "coords",
    "block_neightboors"
  ]).forEach(property => {
    c.prototype[property] = PWorld.prototype[property];
  });
  return c;
}
/*
The PTileset class, stores every tile used by a World.
  PTileset.add(<name>, <image>, [<sx>], [<sy>], [<swidth>], [<sheight>]):
    adds a tile,
    <name>: String,
    <image>: String (url or parent name)
    <sx>, <sy>, <swidth>, <sheight>: numbers, used as in CanvasRenderingContext.drawImage()
*/
class PTileset {
  constructor(settings = {}) {
    if (settings.copy) {
      let copy = function copy(e) {
        return Object.assign({}, e);
      }
      this.tiles = copy(settings.copy.tiles);
      this.loading = copy(settings.copy.loading);
      this.attrs = copy(settings.copy.attrs);
    }
    else {
      this.tiles = {};
      this.loading = {};
      this.attrs = {};
    }
    this.settings = settings;
  }

  get(name) {
    if (typeof this.tiles[name] == "string") {
      return this.get(this.tiles[name]); // /!\ recursive /!\
    }
    return this.tiles[name] || null;
  }

  get_attrs(name) {
    return this.attrs[name] || {};
  }

  add(name, image, data = {}) {
    if (image instanceof Image) { // If image is an image: store it and wait for it to load if it hasn't yet
      if (has_loaded(image)) { // image has already loaded
        this.tiles[name] = image;
        this.attrs[name] = Object.assign({}, data, {
          sx: data.sx && ~data.sx ? data.sx : 0,
          sy: data.sy && ~data.sy ? data.sy : 0,
          swidth: data.swidth && ~data.swidth ? data.swidth : image.naturalWidth,
          sheight: data.sheight && ~data.sheight ? data.sheight : image.naturalHeight,
          loaded: true,
          error: false});
      }
      else { // image hasn't loaded yet
        this.tiles[name] = image;
        this.loading[name] = true;
        this.attrs[name] = {loaded: false};
        image.addEventListener("load", () => {
          this.loading[name] = false;
          this.attrs[name] = Object.assign({}, data, {
            sx: data.sx && ~data.sx ? data.sx : 0,
            sy: data.sy && ~data.sy ? data.sy : 0,
            swidth: data.swidth && ~data.swidth ? data.swidth : image.naturalWidth,
            sheight: data.sheight && ~data.sheight ? data.sheight : image.naturalHeight,
            loaded: true,
            error: false});
          this._check_loaded();
        });
        image.addEventListener("error", () => {
          this.loading[name] = false;
          this.attrs[name] = {loaded: false, error: true};
          this.tiles[name] = null;
          this._check_loaded();
        });
      }
    }

    /*else if (typeof image == "string") { // If image is a string: check if the string corresponds to an existing tile, if yes, bind it, if not, load the image with the string being its src and eventually wait for it (uses recursive function)
      let _image = this.get(image);
      if (!_image) {
        _image = new Image();
        _image.src = image;
      }
      this.add(name, _image, data); // ! recursive !
    }*/
    else if (typeof image == "string") {
      if (this.get(image)) {
        this.tiles[name] = image;
        this.attrs[name] = Object.assign({parent: image}, data);
      }
      else {
        let _image = new Image();
        _image.src = image;
        this.add(name, _image, data);
      }
    }

    else if (image === false) {
      this.attrs[name] = data;
    }

    else if (Array.isArray(name) && !image) { // If name is an array and image is not provided: loop through name and use its objects to recursively load tiles
      name.forEach(n => {
        this.add(n.name, n.image || n.tilename || false, Object.assign({}, data, n)); // ! recursive !
      });
    }
    return this;
  }

  get set() {
    console.warn("Warning! PTileset.set() will likely be removed in the future!");
    return this.add.bind(this);
  }

  is_loading() {
    return Object.entries(this.loading).reduce((a, b) => a||b[1], false);
  }

  _check_loaded() {
    if (!this.is_loading() && this.on_load && typeof this.on_load == "function") {
      this.on_load();
    }
  }

  draw(ctx, name, x, y, width, height) {
    let image = this.get(name);
    let data = this.get_attrs(name);
    if (image) {
      if (data.anim) { // anim
        let tile_count;
        if (data.anim_direction == "x") {
          tile_count = data.anim_steps_count || (data.anim_steps || []).length || Math.floor(image.naturalWidth / data.swidth);
        }
        else {
          tile_count = data.anim_steps_count || (data.anim_steps || []).length || Math.floor(image.naturalHeight / data.sheight);
        }
        let active_tile = Math.floor(performance.now() / data.anim_interval) % tile_count;

        if (data.anim_direction == "x") {
          ctx.drawImage(image, ~~data.sx + data.swidth * (data.anim_steps ? data.anim_steps[active_tile] : active_tile), ~~data.sy, data.swidth, data.sheight, x, y, width, height);
        }
        else {
          ctx.drawImage(image, ~~data.sx, ~~data.sy + data.sheight * (data.anim_steps ? data.anim_steps[active_tile] : active_tile), data.swidth, data.sheight, x, y, width, height);
        }
      }
      else { // Not anim
        if (["sx", "sy", "swidth", "sheight"].reduce((acc, act) => acc && data.hasOwnProperty(act), true)) {
          ctx.drawImage(image, ~~data.sx, ~~data.sy, ~~data.swidth, ~~data.sheight, x, y, width, height);
        }
        else {
          ctx.drawImage(image, x, y, width, height);
        }
      }
    }
    else if (data && data.color) {
      ctx.fillStyle = data.color;
      ctx.fillRect(x, y, width, height);
    }
    else {
      if (this.settings.log_errors) console.error("Image not found: ", name);
    }
  }
}
window.PTileset = PTileset;

class PBlockset {
  constructor(settings) {
    this.blocks = [];
    this.settings = settings;
  }

  add(block, name) {
    if (!Array.isArray(block)) {
      this.blocks[name || block.name] = block;
    }
    else {
      block.forEach(b => {
        this.add(b, name);
      });
    }
    return this;
  }

  get(name) {
    let block = this.blocks[name];
    if (!block) {
      block = this.blocks.find(b => b.name == name);
    }
    return block || null;
  }
}
window.PBlockset = PBlockset;


class PEntity { // The generic Entity class, implements basic Entity drawing
  constructor(x, y, width, height, name, tilename) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.name = name;
    this.tilename = tilename || name;
  }

  draw(renderer) {
    let {world, context, normal, normal_context, tileset, normal_tileset} = renderer;
    let {x, y, width, height} = world.coords(this.x, this.y, this.width, this.height, "entity");
    if (Array.isArray(this.tilename)) {

    }
    else {
      tileset.draw(context, this.tilename, x, y, width, height);
    }
  }

  _pre_draw(...args) {
    if (this.hasOwnProperty("pre_draw") && typeof this.pre_draw == "function") this.pre_draw(...args);
  }
}

window.PEntity = PEntity;

function PEntitify(C) { // Used to extend a class (which can already be extending another class) with the PEntity class
  let c = class extends C {
    constructor(name, tilename) {
      super();
      Object.assign(this, new PEntity(name, tilename));
    }
  };
  c.prototype.draw = PEntity.prototype.draw;
  c.prototype._pre_draw = PEntity.prototype._pre_draw;
  return c;
}


class PBlock { // Generic Block class, implements a basic block drawing system
  constructor(name, tilename) {
    this.name = name;
    this.tilename = tilename || name;
  }

  draw(_x, _y, z, renderer) {
    let {world, context, normal, normal_context, tileset, data, neighbors} = renderer;
    //console.log(tileset);
    let {x, y, width, height} = world.coords(_x, _y, null, null, "block");
    if ((x + width >= 0 && x <= context.width) && (y + height >= 0 && y <= context.height)) {
      if (Array.isArray(this.tilename) && !data.tilename) {
        let tilename = PBlock.resolve({neighbors, tiles: this.tilename, name: this.name, x: _x, y: _y});
        if (tilename) {
          tileset.draw(context, tilename, x, y, width, height);
        }
      }
      else if (data.tilename) {
        tileset.draw(context, data.tilename, x, y, width, height);
      }
      else {
        tileset.draw(context, this.tilename, x, y, width, height);
      }
    }
  }

  static resolve(data) {
    let {neighbors, tiles, name, x, y} = data;
    return (tiles.find(scheme => {
      let result = true;

      if (scheme.match) {
        result = result && Object.entries(scheme.match).reduce((sum, active) => {
          if (!sum) return false;
          if (["top", "bottom", "left", "right"].some(_ => _ == active[0])) {
            return (!!neighbors[active[0]] && neighbors[active[0]].name == name) == active[1] || !!neighbors[active[0]] && typeof active[1] == "string" && active[1].split("||").some(term => neighbors[active[0]].name === term); // The magic line of code :D
          }
          return true;
        }, true);
      }

      if (scheme.random) {
        let random = Math.floor(noise2D(x, y) * (scheme.random.width || 2));
        result = result && !!(scheme.random.values || []).some(value => value == random);
      }

      if (scheme.pattern) {
        if (scheme.pattern.x) result = result && !!scheme.pattern.x[x%scheme.pattern.x.length + (scheme.pattern.x_offset || 0)]
        if (scheme.pattern.y) result = result && !!scheme.pattern.y[y%scheme.pattern.y.length + (scheme.pattern.y_offset || 0)]
      }

      return result;
    }) || {tile: null}).tile
  }
}

window.PBlock = PBlock;

function PBlockify(C) {
  let c = class extends C {
    constructor(name, tilename) {
      super();
      Object.assign(this, new PBlock(name, tilename));
    }
  };
  c.prototype.draw = PBlock.prototype.draw;
  return c;
}

function noise2D(x, y) {
  return 1;
  return Math.random();
}

function has_loaded(image) {
  return image.complete && image.naturalWidth !== 0 && image.naturalHeight !== 0;
}
