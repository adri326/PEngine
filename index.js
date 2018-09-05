let PEngine = window.PEngine = {};

PEngine.PScene = class PScene {
  constructor(element) {
    this.canvas = element;
    this.world = null;
    this.context = element.getContext("2d");
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
            PEngine.PScene.draw(this);
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
    w.addEventListener("resize", () => {
      this.updateSize();
      this.uninterpolate();
    });
    return this;
  }

  updateSize() {
    this.canvas.width = this.context.width = this.canvas.clientWidth;
    this.canvas.height = this.context.height = this.canvas.clientHeight;
  }

  uninterpolate() {
    this.context.imageSmoothingEnabled = false;
    /*this.context.mozImageSmoothingEnabled = false;
    this.context.webkitImageSmoothingEnabled = false;
    this.context.msImageSmoothingEnabled = false;*/
  }

  static draw(scene) {
    scene.context.clearRect(0, 0, scene.canvas.width, scene.canvas.height);

    if (scene.world) {
      scene.world.draw(
        scene.context,
        scene.canvas.width,
        scene.canvas.height
      );
    }
  }
}

PEngine.PWorld = class PWorld {
  static getDefaultSettings() {
    return {
      background: "rgba(21, 16, 18, 0.7)",
      render: {
        entities: true,
        blocks: true
      },
      scale: [4, 4],
      offset: [0, 0],
      blockSize: [32, 32],
      entitiesUseBlockSize: false
    };
  }

  constructor(settings = {}) {
    this.settings = Object.assign(PWorld.getDefaultSettings(), settings);
    this.tileset = null;
    this.blockset = null;
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

  addEntity(entity) {
    this.levels[this.level].entities.push(entity);
    return this;
  }

  addBlock(block, x, y, data) {
    x = ~~x;
    y = ~~y;
    if (!this.levels[this.level].blocks[x]) this.levels[this.level].blocks[x] = [];
    if (!this.levels[this.level].blocks[x][y]) this.levels[this.level].blocks[x][y] = [];
    this.levels[this.level].blocks[x][y].push({block, data});
    return this;
  }

  getBlockStack(x, y) {
    return (this.levels[this.level].blocks[x] || [])[y] || [];
  }

  getBlock(x, y, layer = 0) {
    return (((this.levels[this.level].blocks[x] || [])[y] || []).find(({data = {}}) => (data.layer || 0) === layer) || {block: null}).block;
  }

  getBlockData(x, y, layer = 0) {
    return (((this.levels[this.level].blocks[x] || [])[y] || []).find(({data = {}}) => (data.layer || 0) === layer) || {data: null}).data;
  }

  getBlockRaw(x, y, layer = 0) {
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
          toDraw.push([block, block.layer || 0, {data, x, y}]);
        }
      )));
    }

    // sort them by layer and draw them
    toDraw.sort(([a, b], [c, d]) => b - d).forEach(([element, _, additional]) => {
      element.draw({
        world: this,
        tileset: this.tileset,
        context,
        level: this.levels[this.level],
        ...additional
      });
    });
  }

  coords(x, y, width, height, kind) {
    if (
      kind === PEngine.KIND_ENTITY && this.settings.entitiesUseBlockSize
      || kind === PEngine.KIND_BLOCK
    ) {
      x *= this.settings.blockSize[0];
      y *= this.settings.blockSize[1];
      width *= this.settings.blockSize[0];
      height *= this.settings.blockSize[1];
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
      above: this.getBlockStack(x, y).filter(({data}) => (data.layer || 0) > z),
      below: this.getBlockStack(x, y).filter(({data}) => (data.layer || 0) < z)
    }
  }
}

PEngine.KIND_ENTITY = 0;
PEngine.KIND_BLOCK = 1;

PEngine.PTileset = class PTileset {
  constructor(settings = {}) {
    this.tiles = {};
    this.loading = {};
    this.attributes = {};
    this.settings = settings;
  }

  get(name, n = 0) {
    if (n > (this.settings.maxDepth || 4)) return;
    if (typeof this.tiles[name] === "string") {
      return this.get(this.tiles[name], n+1);
    }
    return this.tiles[name] || null;
  }

  getAttributes(name) {
    return this.attributes[name] || {};
  }

  registerTile(name, image, attributes = {}) {
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
    this.attributes[name] = Object.assign({}, attributes, {
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
    let image = this.get(name);
    let attributes = this.getAttributes(name);
    if (!image && attributes.color) {
      context.fillStyle = attributes.color;
      context.fillRect(x, y, width, height);
      return;
    }
    if (!image) throw new Error("No image called " + image);
    if (attributes.animation) { // animation
      let tileCount;
      if (attributes.anim.direction === "x") {
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

      let active = Math.floor(performace.now() / attributes.animation.interval) % tileCount;
      if (Array.isArray(attributes.animation.steps)) {
        active = attributes.animation.steps[active];
      }

      if (attributes.anim.direction === "x") {
        context.drawImage(image,
          Math.floor(attributes.sx) + attributes.swidth * active_tile,
          Math.floor(attributes.sy),
          attributes.swidth,
          attributes.sheight,
          x, y, width, height
        );
      }
      if (attributes.anim.direction === "x") {
        context.drawImage(image,
          Math.floor(attributes.sx),
          Math.floor(attributes.sy) + attributes.sheight * active_tile,
          attributes.swidth,
          attributes.sheight,
          x, y, width, height
        );
      }
    }
    else {
      context.drawImage(image,
        attributes.sx,
        attributes.sy,
        attributes.swidth,
        attributes.sheight,
        x, y, width, height
      );
    }
  }
}

PEngine.PEntity = class PEntity {
  constructor(x, y, width, height, name, tile = name, layer = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.name = name;
    this.tile = tile;
    this.layer = layer;
  }

  draw(options) {
    let {world, context, tileset} = options;
    let {x, y, width, height} = world.coords(this.x, this.y, this.width, this.height, PEngine.KIND_ENTITY);
    if ((x + width >= 0 && x <= context.width) && (y + height >= 0 && y <= context.height)) {
      tileset.draw(context, this.tile, x, y, width, height);
    }
  }
}

PEngine.PBlock = class PBlock {
  constructor(name, tile = name) {
    this.name = name;
    this.tile = tile;
  }

  draw(options) {
    let {world, context, tileset} = options;
    let {x, y, width, height} = world.coords(options.x, options.y, 1, 1, PEngine.KIND_BLOCK);
    if ((x + width >= 0 && x <= context.width) && (y + height >= 0 && y <= context.height)) { // visible
      tileset.draw(context, this.tile, x, y, width, height);
    }
  }
}
