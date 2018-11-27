// PEngine: basic example

// initializing the scene
let scene = new PEngine.Scene("#canvas");

// we create a world object
let world = new PEngine.World();
scene.bindWorld(world);

// let's initialize the tileset!
let tileset = new PEngine.Tileset();
tileset.registerTile("source", "./basic-tiles.png");
tileset.registerTile("wall", "#source", {
  sx: 0,
  sy: 0,
  swidth: 8,
  sheight: 8
});
tileset.registerTile("wall-bottom", "#source", {
  sx: 0,
  sy: 8,
  swidth: 8,
  sheight: 8
});
tileset.registerTile("button", "#source", {
  sx: 8,
  sy: 0,
  swidth: 8,
  sheight: 8
});
tileset.registerTile("grid", "#source", {
  sx: 8,
  sy: 8,
  swidth: 8,
  sheight: 8
});

// bind the tileset
world.bindTileset(tileset);

// now to the blockset
let blockset = new PEngine.Blockset();
blockset.registerBlock("wall", new PEngine.Block("wall"));
blockset.registerBlock("wall-bottom", new PEngine.Block("wall-bottom"));
blockset.registerBlock("button", new PEngine.Block("button"));
blockset.registerBlock("grid", new PEngine.Block("grid"));

world.bindBlockset(blockset);


// place the blocks
world.addBlock("wall", 0, 0);
world.addBlock("wall", 1, 0);
world.addBlock("wall", 2, 0);

world.addBlock("wall", 0, 1);
world.addBlock("wall", 1, 1);
world.addBlock("wall", 2, 1);

world.addBlock("wall-bottom", 0, 2);
world.addBlock("wall-bottom", 1, 2);
world.addBlock("wall-bottom", 2, 2);

world.addBlock("button", 2, 1);
world.addBlock("grid", 0, 0);

// let's go!
scene.loop();
