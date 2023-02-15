class Ship {
  constructor(x, y, team, game) {
    this.game = game;
    this.category = 'ship';
    this.canShoot = true;
    this.canTurn = true;
    this.canAccel = true;
    this.team = team;
    this.powerGeneration = 0;
    this.powerDraw = 0;
    
    this.body = this.game.physics.createDynamicBody(planck.Vec2(x, y));
    this.body.setLinearDamping(0.1);
    this.body.setUserData(this);
    this.parts = [];
    this.buildShip();

    this.initSignals();
    this.ai = new ShipAi(this, game);
  }

  makePlayerControlled() {
    this.ai = new Player(this, this.game);
  }
  
  autoStop() {
    let signals = { ...this.signals };
    const rotation = this.body.getAngularVelocity();
    const velocity = this.body.getLinearVelocity();
    const vector = this.body.getWorldVector(planck.Vec2(1, 0));
    const forward = velocity.x * vector.x + velocity.y * vector.y;
    const right = velocity.x * vector.y + velocity.y * -vector.x;
    
    // Prevent going too fast
    if (Math.abs(forward) > 70.0) {
      signals.forward = 0;
      signals.reverse = 0;
    }
    if (Math.abs(right) > 70.0) {
      signals.strafeLeft = 0;
      signals.strafeRight = 0;
    }
    if (Math.abs(rotation) > 5.0) {
      signals.turnLeft = 0;
      signals.turnRight = 0;
    }

    // Stop rotation
    if (!this.signals.turnLeft && !this.signals.turnRight) {
      if (rotation > 0) {
        signals.turnRight = Math.min(1.0, rotation * 0.5);
      } else if (rotation < 0) {
        signals.turnLeft = Math.min(1.0, rotation * -0.5);
      }
    }

    // Sliding
    if (this.signals.slide) {
      return signals;
    }

    // Stop forward / reverse
    if (!this.signals.forward && !this.signals.reverse) {
      if (forward > 0) {
        signals.reverse = Math.min(1.0, forward * 0.3);
      } else if(forward < 0) {
        signals.forward = Math.min(1.0, forward * -0.3);
      }
    }

    // Stop strafing
    if (!this.signals.strafeLeft && !this.signals.strafeRight) {
      if (right > 0) {
        signals.strafeLeft = Math.min(1.0, right * 0.3);
      } else if(right < 0) {
        signals.strafeRight = Math.min(1.0, right * -0.3);
      }
    }

    return signals;
  }

  actAndDraw(c, spf) {
    this.ai.ponder(spf);

    // Debug target leading
    // const pos = this.body.getLocalPoint(planck.Vec2(this.ai.target.x, this.ai.target.y));
    // c.fillRect(pos.x - 0.3, pos.y - 0.3, 0.6, 0.6);
    // c.fillRect(0, -0.01, 100, 0.02);
  
    let signals = this.autoStop();
    let rebuild = false;
    let hasLifeSupport = false;
    let powerDraw = 0;

    this.canShoot = false;
    this.canTurn = false;
    this.canAccel = false;

    this.parts.forEach((part, i) => {
      if (part.destroy) {
        this.debrisFromPart(part);
        this.parts.splice(i, 1);
        rebuild = true;
        return;
      }

      powerDraw += part.act(spf, signals, this);
      c.save();
      c.translate(part.pos.x, part.pos.y);
      part.draw(c, signals, this);
      c.restore();

      if (part.hasAbility('shoot')) {
        this.canShoot = true;
      }
      if (part.hasAbility('turn')) {
        this.canTurn = true;
      }
      if (part.hasAbility('accelerate')) {
        this.canAccel = true;
      }
      if (part.type == 'life support') {
        hasLifeSupport = true;
      }
    });

    const position = this.body.getWorldPoint(planck.Vec2(0, 0));
    this.body.applyForceToCenter(planck.Vec2(
      position.x * -0.1,
      position.y * -0.1
    ));

    if (rebuild) {
      this.updateBody();
    }

    if (!this.parts.length) {
      return;
    }

    if (!this.canAccel || !this.canTurn || !this.canShoot || !hasLifeSupport) {
      const partId = Math.floor(Math.random() * this.parts.length);
      this.parts[partId].getBulletDamage();
    }

    this.powerDraw = powerDraw;
  }

  debrisFromPart(part) {
    const point = this.body.getWorldPoint(planck.Vec2(part.pos.x, part.pos.y));
    const velocity = this.body.getLinearVelocity();
    this.game.addDebris(
      point.x,
      point.y,
      velocity.x + Math.random() * 10 - 5,
      velocity.y + Math.random() * 10 - 5,
      this.body.getAngle(),
      part.type,
      this.team
    );
  }

  updateBody() {
    if (this.bodyFixtures) {
      this.bodyFixtures.forEach((fixture) => {
        this.body.destroyFixture(fixture);
      });
    }

    this.bodyFixtures = [];
    this.parts.forEach((part) => {
      const fixture = this.body.createFixture(part.getPolygon(), part.getMass());
      fixture.setUserData(part);
      this.bodyFixtures.push(fixture);
    });
  }

  getPosition() {
    return this.body.getWorldPoint(planck.Vec2(0, 0));
  }

  initSignals() {
    this.signals = {
      forward: 0,
      reverse: 0,
      turnLeft: 0,
      turnRight: 0,
      strafeLeft: 0,
      strafeRight: 0,
      shootPrimary: 0,
      shootSecondary: 0,
    };
  }

  unCreate() {
    this.destroy = true;
    this.game.physics.destroyBody(this.body);
  }

  buildShip() {
    this.powerGeneration = 0;
    const s = this.getSchematic();
    s.forEach((part, i) => {
      part[5] = new Part(part[0], part[1], part[2], part[3] >= i ? false : s[part[3]][5], this.team, part[4], this.game);
      this.parts.push(part[5]);
      this.powerGeneration += part[5].getPowerGeneration();
    });
    this.updateBody();
  }

  getDistanceTo(point) {
    const Vec2 = planck.Vec2;
    const myPos = this.getPosition();
    return Vec2.lengthOf(Vec2(point.x, point.y).sub(Vec2(myPos.x, myPos.y)));
  }

  getSchematic() {
    switch (Math.floor(Math.random() * 1)) {
      case 0:
        return [
          [ 0, 0, 'hull', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.0, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ 1.2, 0.1, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 },
          ]],
          [ 1.2, -0.1, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 },
          ]],
          [ -0.2, 0.6, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 },
          ]],
          [ -0.2, -0.6, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 },
          ]],
          [ 1.5, 0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      default:
        return [
          [ 0, 0, 'box', 0, false ],
        ];
    }
  }

  getPowerLevel() {
    if (this.powerDraw < this.powerGeneration) {
      return 1.0;
    }
    return 1.0 / this.powerDraw * this.powerGeneration;
  }
}