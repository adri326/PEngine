// PEngine: entities example

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
tileset.registerTile("player", "#source", {
  sx: 0,
  sy: 0,
  swidth: 8,
  sheight: 8,
  animation: {
    direction: "x",
    steps: 2,
    interval: 150
  }
});
tileset.registerTile("object-a", "#source", {
  sx: 0,
  sy: 8,
  swidth: 8,
  sheight: 8
});
tileset.registerTile("object-b", "#source", {
  sx: 8,
  sy: 8,
  swidth: 8,
  sheight: 8
});

world.bindTileset(tileset);


// entityset and entity initialization
let entityset = new PEngine.Entityset();
entityset.registerEntity("player", new PEngine.Entity(1, 1, "player"));
entityset.registerEntity("object-a", new PEngine.Entity(1, 1, "object-a"));
entityset.registerEntity("object-b", new PEngine.Entity(1, 1, "object-b"));

let counter = 0; // the score

// this is a custom entity: the `draw` method is being overriden with a function printing the score
let counterEntity = new PEngine.Entity(1, 1, "");
counterEntity.draw = function(options, instance) {
  let {world, context} = options;
  let {x, y, width, height} = world.coords(instance.x, instance.y + 1, this.width, this.height, PEngine.KIND_ENTITY);
  context.fillStyle = "white";
  context.font = height + "px mono";
  context.fillText(counter, x, y);
}

entityset.registerEntity("counter", counterEntity);

world.bindEntityset(entityset);


// we add the entities: there can be as many instances of one entity as you want
world.addEntity(new PEngine.EntityInstance(1, 3, "object-a", 3));
world.addEntity(new PEngine.EntityInstance(1, 5, "object-a", 3));
world.addEntity(new PEngine.EntityInstance(1, 7, "object-a", 3));
world.addEntity(new PEngine.EntityInstance(3, 7, "object-a", 3));
world.addEntity(new PEngine.EntityInstance(5, 7, "object-b", 1));

world.addEntity(new PEngine.EntityInstance(0, 0, "counter", 100));

let player = new PEngine.EntityInstance(1, 1, "player", 2);

world.addEntity(player);


// just a tiny WASD mover
window.addEventListener("keypress", event => {
  switch (event.code) {
    case "KeyW":
      player.y--;
      break;
    case "KeyD":
      player.x++;
      break;
    case "KeyS":
      player.y++;
      break;
    case "KeyA":
      player.x--;
      break;
  }
  let entities = world.getEntities();
  for (var n = 0; n < entities.length; n++) {
    let entity = entities[n];
    if (entity.x == player.x && entity.y == player.y) {
      if (entity.getParent().name === "object-a") {
        counter++;
        world.removeEntity(n--);
      }
      else if (entity.getParent().name === "object-b") {
        counter += 5;
        world.removeEntity(n--);
      }
    }
  }

});

// start all of this up!
scene.loop();
