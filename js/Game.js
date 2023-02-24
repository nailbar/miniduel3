class Game {
  constructor(canvasId) {
    this.scale = 10;
    this.canvas = document.getElementById(canvasId);
    this.c = canvas.getContext('2d');

    this.addBullet = this.addBullet.bind(this);
    this.addDebris = this.addDebris.bind(this);
    this.addParticle = this.addParticle.bind(this);
    this.handleHits = this.handleHits.bind(this);
    this.fixCanvasSize = this.fixCanvasSize.bind(this);

    window.onresize = this.fixCanvasSize;

    this.maxShips = 12;
    this.follow = false;
    this.myTeam = Math.floor(Math.random() * 3);
    
    this.paused = false;
    this.demo = true;
    this.showHud = true;

    this.fixCanvasSize();
    this.createWorld();
    this.initKeyListener();
    this.startGameLoop();
  }

  gameLoop(timestamp) {
    const spf = this.getSecondsPerFrame(timestamp);
    this.physics.step(spf, 8, 3);
    this.actAndDraw(spf);
    requestAnimationFrame(this.gameLoop);
  }

  actAndDraw(spf) {
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.showHud) {
      this.infoText();
    }
    this.c.save();
    this.fixCamera();
    this.drawParallax();
    this.doShips(spf);
    this.doBullets(spf);
    this.doDebris(spf);
    this.doParticles(spf);
    this.c.restore();
    if (this.showHud) {
      this.drawTargetStatus();
      this.drawTeamStatus();
    }
  }

  infoText() {
    let pos = 1;
    this.c.save();
    this.c.font = '3px sans-serif';
    this.c.scale(this.scale, this.scale);
    this.c.translate(0.5, 0);
    this.setColors('text');
    this.c.fillText('Pause / unpause: P', 0, 3.5 * pos++);
    if (this.paused || this.demo) {
      this.c.fillText('Forward: I or Up', 0, 3.5 * pos++);
      this.c.fillText('Turn left: J or Left', 0, 3.5 * pos++);
      this.c.fillText('Turn right: L or Right', 0, 3.5 * pos++);
      this.c.fillText('Reverse: K or Down', 0, 3.5 * pos++);
      this.c.fillText('Strafe left: A', 0, 3.5 * pos++);
      this.c.fillText('Strafe right: D', 0, 3.5 * pos++);
      this.c.fillText('Shoot primary: W or Shift', 0, 3.5 * pos++);
      this.c.fillText('Shoot secondary: S or Enter', 0, 3.5 * pos++);
      this.c.fillText('Slide: X or Space', 0, 3.5 * pos++);
      this.c.fillText('Select nearest target: T', 0, 3.5 * pos++);
      this.c.fillText('Toggle HUD: H', 0, 3.5 * pos++);
    }
    if (this.demo) {
      pos++;
      this.c.fillText('Press ship control keys to start playing', 0, 3.5 * pos++);
    }
    this.c.restore();
  }

  doShips(spf) {
    const teamShips = [
      { team: 0, ships: 0, waiting: this.teams[0] },
      { team: 1, ships: 0, waiting: this.teams[1] },
      { team: 2, ships: 0, waiting: this.teams[2] },
    ];
    const teamHasShips = [0, 0, 0];

    this.ships.forEach((ship, i) => {
      if (ship.parts.length == 0) {
        ship.unCreate();
        this.ships.splice(i, 1);
        return;
      }

      teamShips[ship.team].ships++;
      teamHasShips[ship.team] = 1;

      const position = ship.getPosition();
      this.c.save();
      this.c.translate(position.x, position.y);
      this.c.rotate(ship.body.getAngle());
      ship.actAndDraw(this.c, spf);
      this.c.restore();
    });

    if (this.ships.length < this.maxShips) {
      const team = teamShips.reduce((prev, cur) => {
        if (!prev) {
          return cur;
        }
        if (!cur.waiting || cur.ships > prev.ships) {
          return prev;
        }
        return cur;
      }, false);
      if (team.waiting) {
        this.addTeamShip(team.team);
        teamHasShips[team.team] = 1;
      }
    }

    // Restart game when only one or no team remaining
    if (teamHasShips.reduce((prev, cur) => {
      return prev + cur;
    }, 0) < 2) {
      this.endTimer -= spf;
      if (this.endTimer <= 0) {
        this.createWorld();
      }
    }
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

    const modifier = this.paused ? 0.01 : 1.0;

    return (spf > 1.0 ? 0.001 : spf) * modifier;
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

    if (this.demo && (e.key == 'i' || e.key == 'j' || e.key == 'k' || e.key == 'l' || e.key == 'ArrowUp' || e.key == 'ArrowLeft' || e.key == 'ArrowDown' || e.key == 'ArrowRight')) {
      this.demo = false;
      if (!this.follow || this.follow.team != this.myTeam) {
        this.follow = this.ships.reduce((prev, cur) => {
          if (cur.ai.category == 'player') {
            return cur;
          }

          if (prev && prev.ai.category == 'player') {
            return prev;
          }

          return cur.team == this.myTeam ? cur : prev;
        }, false);
      }
      if (this.follow) {
        this.follow.makePlayerControlled();
      }
    }
  }
  
  keyUp(e) {
    this.keys[e.key] = false;

    if (e.key == 'p') {
      this.paused = !this.paused;
    }

    if (e.key == 'h') {
      this.showHud = !this.showHud;
    }
  }

  getCameraPos() {
    if (this.follow) {
      if (!this.follow.destroy) {
        return this.follow.getPosition();
      }
      this.follow = false;
    }
    return { x: 0, y: 0 };
  }

  fixCamera() {
    const position = this.getCameraPos();
    this.c.translate(
      this.canvas.width * 0.5,
      this.canvas.height * 0.5,
    );
    this.c.scale(this.scale, -this.scale);
    this.c.translate(
      -position.x,
      -position.y,
    );

    // Draw indicators
    if (this.showHud) {
      this.drawHomeIndicator(position);
      this.drawTargetIndicator();
    }
  }

  drawHomeIndicator(position) {
    this.setColors('home');
    this.c.beginPath();
    this.c.arc(0, 0, 0.5, 0, Math.PI * 2.0);
    const distance = planck.Vec2.lengthOf(position);
    if (distance > 10) {
      const vector = {
        x: -position.x / distance,
        y: -position.y / distance
      };
      this.c.arc(position.x + vector.x * 10, position.y + vector.y * 10, 0.3, 0, Math.PI * 2.0);
    }
    this.c.fill();
  }

  drawTargetIndicator() {
    const Vec2 = planck.Vec2;
    if (this.follow && this.follow.ai.target && this.follow.ai.target.team != this.follow.team) {
      const myPos = this.follow.getPosition();
      const position = this.follow.ai.target.getPosition();
      const relative = Vec2(position.x - myPos.x, position.y - myPos.y);
      const distance = planck.Vec2.lengthOf(relative);

      this.setColors('enemy');
      this.c.beginPath();
      this.c.arc(position.x, position.y, 3.0, 0, Math.PI * 2.0);
      this.c.stroke();

      if (distance > 10) {
        const vector = relative.mul(1.0 / distance);
        this.c.beginPath();
        this.c.arc(myPos.x + vector.x * 10, myPos.y + vector.y * 10, 0.3, 0, Math.PI * 2.0);
        this.c.fill();
      }
    }
  }

  createWorld() {
    this.emptyWorld();
    this.populateWorld();
  }

  populateWorld() {
    this.endTimer = 10.0;
    this.teams[0] = 20;
    this.teams[1] = 20;
    this.teams[2] = 20;
    this.addTeamShip(Math.floor(Math.random() * 3));
  }

  addTeamShip(team) {
    const spawnPlayer = !this.hasPlayer() && !this.demo && this.teams[this.myTeam] > 0;

    // Always spawn player if possible
    if (spawnPlayer) {
      team = this.myTeam;
    }

    if (this.teams[team] > 0) {
      const position = this.getTeamStartPos(team);
      this.ships.push(new Ship(position.x, position.y, team, this));
      this.teams[team]--;
      
      // Make sure all new NPC ships don't all target the same ship
      this.ships[this.ships.length - 1].ai.targetShip = this.getRandomShip();

      if (spawnPlayer) {
        this.ships[this.ships.length - 1].makePlayerControlled();
        this.follow = this.ships[this.ships.length - 1];
      }

      if (!this.follow || this.follow.destroy) {
        this.follow = this.ships[this.ships.length - 1];
      }
    }
  }

  hasPlayer() {
    return this.ships.reduce((prev, cur) => {
      return cur.ai.category == 'player' || prev;
    }, false);
  }

  getTeamStartPos(team) {
    const dir = (Math.PI * 2.0 / 3) * team;
    return {
      x: Math.cos(dir) * 100.0 + Math.random() * 30.0,
      y: Math.sin(dir) * 100.0 + Math.random() * 30.0
    };
  }

  emptyWorld() {
    this.teams = [0, 0, 0];
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
    this.c.lineWidth = 0.2;
    this.c.lineJoin = 'round';
    this.scale = Math.min(this.canvas.width, this.canvas.height) / 100.0;

    // Reset stars
    this.initParallax();
  }

  addBullet(x, y, vx, vy, type) {
    this.bullets.push(new Bullet(x, y, vx, vy, type, this));
  }

  addDebris(x, y, vx, vy, dir, type, team) {
    this.debris.push(new Debris(x, y, vx, vy, dir, type, team, this));
  }

  addParticle(x, y, vx, vy, type) {
    this.particles.push(new Particle(x, y, vx, vy, type, this));
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
    const pos = this.getCameraPos();
    this.setColors('star');
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

  setColors(item) {
    switch (item) {
      case 'hull 0':
        this.c.fillStyle = '#f56';
        this.c.strokeStyle = '#a23';
        break;
      case 'hull 1':
        this.c.fillStyle = '#5c6';
        this.c.strokeStyle = '#293';
        break;
      case 'hull 2':
        this.c.fillStyle = '#68f';
        this.c.strokeStyle = '#35a';
        break;
      case 'greeble':
        this.c.fillStyle = '#777';
        this.c.strokeStyle = '#555';
        break;
      case 'thruster exhaust':
        this.c.fillStyle = '#f93';
        this.c.strokeStyle = '#f41';
        break;
      case 'blaster bullet':
        this.c.fillStyle = '#f40';
        this.c.strokeStyle = '#f20';
        break;
      case 'spark':
        this.c.fillStyle = '#f93';
        this.c.strokeStyle = '#f93';
        break;
      case 'blast':
        this.c.fillStyle = '#ffe';
        this.c.strokeStyle = '#eed';
        break;
      case 'star':
        this.c.fillStyle = '#fff';
        this.c.strokeStyle = '#fff';
        break;
      case 'home':
        this.c.fillStyle = '#09f';
        this.c.strokeStyle = '#09f';
        break;
      case 'enemy':
        this.c.fillStyle = '#f00';
        this.c.strokeStyle = '#f00';
        break;
      case 'friend':
        this.c.fillStyle = '#0f0';
        this.c.strokeStyle = '#0f0';
        break;
      case 'text':
        this.c.fillStyle = '#779';
        this.c.strokeStyle = '#779';
        break;
      default:
        this.c.fillStyle = '#fff';
        this.c.strokeStyle = '#000';
    }
  }

  getRandomShip() {
    if (this.ships.length == 0) {
      return null;
    }
    return this.ships[Math.floor(Math.random() * this.ships.length)];
  }

  drawTargetStatus() {
    if (this.follow) {
      if (this.follow.ai.target && !this.follow.ai.target.destroy) {
        this.drawShipStatus(this.follow.ai.target, 1, 1, 'enemy');
      }
      this.drawShipStatus(this.follow, 0, 0, 'friend');
    }
  }

  drawShipStatus(ship, cornerX, cornerY, color) {
    this.c.save();
    this.c.translate(0, this.canvas.height);
    this.c.scale(this.scale, -this.scale);
    this.c.translate(
      5.5 + (canvas.width / this.scale - 11.0) * cornerX,
      5.5 + (canvas.height / this.scale - 11.0) * cornerY
    );
    this.setColors(color);
    this.c.clearRect(-5, -5, 10, 10);
    this.c.beginPath();
    this.c.rect(-5, -5, 10, 10);
    this.c.stroke();

    this.c.rotate(ship.body.getAngle());
    ship.parts.forEach((part) => {
      part.drawHealth(this.c);
    });

    this.c.restore();
  }

  drawTeamStatus() {
    const teams = [
      ...this.teams
    ];
    this.ships.forEach((ship) => {
      teams[ship.team]++;
    });

    this.c.save();
    this.c.translate(this.canvas.width, this.canvas.height);
    this.c.scale(-this.scale, -this.scale);
    for (let team = 0; team < 3; team++) {
      if (teams[team]) {
        this.setColors('hull ' + team);
        this.c.fillRect(0.5, 0.5 + 1.0 * team, teams[team] * 0.8, 0.8);
      }
    }
    this.c.restore();
  }
}