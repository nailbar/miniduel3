class Game {
  constructor(canvasId) {
    this.scale = 10;
    this.canvas = document.getElementById(canvasId);
    this.c = canvas.getContext('2d');
    this.addBullet = this.addBullet.bind(this);
    this.addDebris = this.addDebris.bind(this);
    this.addParticle = this.addParticle.bind(this);
    this.handleHits = this.handleHits.bind(this);
    this.fixCanvasSize();
    this.createWorld();
    this.initKeyListener();
    this.initParallax();
    this.startGameLoop();
  }

  gameLoop(timestamp) {
    const spf = this.getSecondsPerFrame(timestamp);
    this.physics.step(spf, 8, 3);
    this.controlShip();
    this.actAndDraw(spf);
    requestAnimationFrame(this.gameLoop);
  }

  controlShip() {
    this.ships[0].ai = false;
    this.ships[0].initSignals();
    if (this.keys.w || this.keys.ArrowUp) {
      this.ships[0].signals.forward = 1.0;
    }
    if (this.keys.a || this.keys.ArrowLeft) {
      this.ships[0].signals.turnLeft = 1.0;
    }
    if (this.keys.s || this.keys.ArrowDown) {
      this.ships[0].signals.reverse = 1.0;
    }
    if (this.keys.d || this.keys.ArrowRight) {
      this.ships[0].signals.turnRight = 1.0;
    }
    if (this.keys.q) {
      this.ships[0].signals.strafeLeft = 1.0;
    }
    if (this.keys.e) {
      this.ships[0].signals.strafeRight = 1.0;
    }
    if (this.keys[' ']) {
      this.ships[0].signals.slide = 1.0;
    }
    if (this.keys.Shift) {
      this.ships[0].signals.shootPrimary = 1.0;
    }
    if (this.keys.Enter) {
      this.ships[0].signals.shootSecondary = 1.0;
    }
  }

  actAndDraw(spf) {
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.c.save();
    this.fixCamera();
    this.drawParallax();
    this.doShips(spf);
    this.doBullets(spf);
    this.doDebris(spf);
    this.doParticles(spf);
    this.c.restore();
  }

  doShips(spf) {
    while (this.ships.length < 20) {
      this.ships.push(new Ship(
        Math.random() * 100 - 50,
        Math.random() * 100 - 50,
        this.physics,
        this.ships,
        false,
        this.addBullet,
        this.addDebris
      ));
    }
    
    this.ships.forEach((ship, i) => {
      if (ship.parts.length == 0) {
        ship.unCreate();
        this.ships.splice(i, 1);
        return;
      }

      const position = ship.getPosition();
      this.c.save();
      this.c.translate(position.x, position.y);
      this.c.rotate(ship.body.getAngle());
      ship.actAndDraw(this.c, spf);
      this.c.restore();
    });
  }

  doBullets(spf) {
    this.bullets.forEach((bullet, i) => {
      if (bullet.destroy) {
        bullet.unCreate();
        this.bullets.splice(i, 1);
        return;
      }

      const position = bullet.body.getWorldPoint(planck.Vec2(0, 0));
      this.c.save();
      this.c.translate(position.x, position.y);
      bullet.actAndDraw(this.c, spf);
      this.c.restore();
    });
  }

  doDebris(spf) {
    this.debris.forEach((debris, i) => {
      if (debris.destroy) {
        debris.unCreate();
        this.debris.splice(i, 1);
        return;
      }

      const position = debris.body.getWorldPoint(planck.Vec2(0, 0));
      this.c.save();
      this.c.translate(position.x, position.y);
      this.c.rotate(debris.body.getAngle());
      debris.actAndDraw(this.c, spf);
      this.c.restore();
    });
  }

  doParticles(spf) {
    this.particles.forEach((particle, i) => {
      if (particle.destroy) {
        this.particles.splice(i, 1);
        return;
      }

      this.c.save();
      this.c.translate(particle.pos.x, particle.pos.y);
      particle.actAndDraw(this.c, spf);
      this.c.restore();
    });
  }

  getSecondsPerFrame(timestamp) {
    if (!this.timestamp) {
      this.timestamp = timestamp;
      return 0.001;
    }

    const spf = (timestamp - this.timestamp) / 1000.0;
    this.timestamp = timestamp;

    return spf;
  }

  startGameLoop() {
    this.gameLoop = this.gameLoop.bind(this);
    requestAnimationFrame(this.gameLoop);
  }

  initKeyListener() {
    this.keys = {};
    this.keyDown = this.keyDown.bind(this);
    this.keyUp = this.keyUp.bind(this);
    window.onkeydown = this.keyDown;
    window.onkeyup = this.keyUp;
  }

  keyDown(e) {
    this.keys[e.key] = true;
  }
  
  keyUp(e) {
    this.keys[e.key] = false;
  }

  fixCamera() {
    const position = this.ships[0].getPosition();
    this.c.translate(
      this.canvas.width * 0.5,
      this.canvas.height * 0.5,
    );
    this.c.scale(this.scale, -this.scale);
    this.c.translate(
      -position.x,
      -position.y,
    );
  }

  createWorld() {
    this.emptyWorld();
    this.addShips();
  }

  addShips() {
    this.ships.push(new Ship(
      50,
      20,
      this.physics,
      this.ships,
      true,
      this.addBullet,
      this.addDebris
    ));
  }

  emptyWorld() {
    this.particles = [];
    this.ships = [];
    this.bullets = [];
    this.debris = [];
    this.particles = [];
    this.physics = planck.World();
    this.physics.on('post-solve', this.handleHits);
  }

  fixCanvasSize() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  addBullet(x, y, vx, vy, type) {
    this.bullets.push(new Bullet(x, y, vx, vy, this.physics, type, this.ships, this.addParticle));
  }

  addDebris(x, y, vx, vy, dir, type) {
    this.debris.push(new Debris(x, y, vx, vy, dir, type, this.physics, this.addParticle));
  }

  addParticle(x, y, vx, vy, type) {
    this.particles.push(new Particle(x, y, vx, vy, type));
  }

  handleHits(contact) {
    const fA = contact.getFixtureA();
    const bA = fA.getBody();
    const dataA = bA.getUserData();
    const dataFA = fA.getUserData();

    const fB = contact.getFixtureB();
    const bB = fB.getBody();
    const dataB = bB.getUserData();
    const dataFB = fB.getUserData();

    if (!dataA || !dataB) {
      return;
    }
    
    if (dataA.category == 'bullet') {
      dataA.destroy = true;
      if (dataB.category == 'ship') {
        dataFB.getBulletDamage(dataA);
      }
    }
    if (dataB.category == 'bullet') {
      dataB.destroy = true;
      if (dataA.category == 'ship') {
        dataFA.getBulletDamage(dataB);
      }
    }
  }

  initParallax() {
    this.stars = [];
    const width = canvas.width / this.scale;
    const height = canvas.height / this.scale;
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
      });
    }
  }

  drawParallax() {
    const width = canvas.width / this.scale;
    const height = canvas.height / this.scale;
    const pos = this.ships[0].getPosition();
    this.stars.forEach((star) => {
      if (star.x < pos.x - width * 0.5) {
        star.x += width;
      }
      if (star.x > pos.x + width * 0.5) {
        star.x -= width;
      }
      if (star.y < pos.y - height * 0.5) {
        star.y += height;
      }
      if (star.y > pos.y + height * 0.5) {
        star.y -= height;
      }
      this.c.fillRect(star.x, star.y, 0.2, 0.2);
    });
  }
}