// PEngine: MultiComponent example

let scene = new PEngine.Scene("#canvas").listenResize();

// world
let world = new PEngine.World({
  entitiesUseBlockSize: true,
  blockScale: [16, 16],
  background: "rgb(37, 34, 33)"
});
scene.bindWorld(world);

// tileset
let tileset = new PEngine.Tileset();
tileset.registerTile("source", "./entities-tiles.png");
tileset.registerTile("body", "#source", {
  sx: 0,
  sy: 0,
  swidth: 8,
  sheight: 8,
  animation: {
    direction: "x",
    steps: 2,
    interval: 250
  }
});
tileset.registerTile("banana", "#source", {
  sx: 8,
  sy: 8,
  swidth: 8,
  sheight: 8
});
world.bindTileset(tileset);

let bodyComponent = new PEngine.Component(1, 1, "body");

let bananaComponent = new PEngine.Component(0.5, 0.5, "banana");

let player = new PEngine.MultiComponentEntity(1, 1, "player");

player.addComponent(bodyComponent, {
  dx: 0,
  dy: 0
});

for (let x = 0; x < 4; x++) {
  player.addComponent(bananaComponent, {
    dx: () => 0.25 + Math.cos(Math.PI * x / 2 + performance.now() / 1000),
    dy: () => 0.25 + Math.sin(Math.PI * x / 2 + performance.now() / 1000)
  });
}

let entityset = new PEngine.Entityset();
entityset.registerEntity("player", player);

world.bindEntityset(entityset);

world.addEntity(new PEngine.EntityInstance(2, 2, "player"));

scene.loop();
