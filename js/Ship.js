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
    
    this.body = this.game.physics.createBody({
      bullet: true,
      type: 'dynamic',
      position: planck.Vec2(x, y),
    });

    // this.body = this.game.physics.createDynamicBody(planck.Vec2(x, y));
    this.body.setLinearDamping(0.1);
    this.body.setUserData(this);
    this.parts = [];
    this.buildShip();

    this.initSignals();
    this.ai = new ShipAi(this, game);

    this.dying = 0;
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

    // Debug targeting data if it's set (See ShipAI.js)
    if (this.targetingData) {
      this.game.setColors('text');
      if (this.targetingData.move) {
        c.beginPath();
        c.rect(this.targetingData.move.position.x - 2, this.targetingData.move.position.y - 2, 4, 4);
        c.stroke();
      } else {
        c.beginPath();
        c.arc(this.targetingData.position.x, this.targetingData.position.y, 20, 0, Math.PI * 2.0);
        c.stroke();
      }
      if (this.targetingData.shoot) {
        c.beginPath();
        c.arc(this.targetingData.shoot.position.x, this.targetingData.shoot.position.y, 2, 0, Math.PI * 2.0);
        c.moveTo(0, 0);
        c.lineTo(this.ai.personality.attackDistance, 0);
        c.stroke();
      }
    }
  
    let signals = this.autoStop();
    let rebuild = false;
    let hasLifeSupport = false;
    let powerDraw = 0;

    this.canShoot = false;
    this.canTurnLeft = false;
    this.canTurnRight = false;
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
      if (part.hasAbility('turn left')) {
        this.canTurnLeft = true;
      }
      if (part.hasAbility('turn right')) {
        this.canTurnRight = true;
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

    if (!this.canAccel || !this.canTurnLeft || !this.canTurnRight || !this.canShoot || !hasLifeSupport) {
      this.dieALittle(spf);
    }

    this.powerDraw = powerDraw;
  }

  dieALittle(spf) {
    this.dying -= spf;
    if (this.dying < 0) {
      const partId = Math.floor(Math.random() * this.parts.length);
      this.parts[partId].getBulletDamage();
      this.dying = Math.random() * 1.0;
      
      const position = this.body.getWorldPoint(this.parts[partId].getPartPos());
      const particles = Math.floor(Math.random() * 10) + 3;

      for (let i = 0; i < particles; i++) {
        this.game.addParticle(
          position.x,
          position.y,
          Math.random() * 50 - 25,
          Math.random() * 50 - 25,
          'spark'
        );
      }
    }
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
    switch (Math.floor(Math.random() * 9)) {
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
      case 1:
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
          [ 1.5, 0, 'auto cannon', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      case 2:
        return [
          [ 0, 0, 'hull', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.1, 0.4, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ -1.1, -0.4, 'main thruster', 0, [
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
      case 3:
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
          [ 0.8, 0.5, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
          [ 0.8, -0.5, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      case 4:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.2, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ 1.2, 0.5, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 },
          ]],
          [ 1.2, -0.5, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 },
          ]],
          [ -0.2, 1.0, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 },
          ]],
          [ -0.2, -1.0, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 },
          ]],
          [ 1.5, 0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      case 5:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.2, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ 1.2, 0.5, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 },
          ]],
          [ 1.2, -0.5, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 },
          ]],
          [ -0.2, 1.0, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 },
          ]],
          [ -0.2, -1.0, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 },
          ]],
          [ 1.5, 0, 'auto cannon', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      case 6:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.2, 0.5, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ -1.2, -0.5, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ 1.2, 0.5, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 },
          ]],
          [ 1.2, -0.5, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 },
          ]],
          [ -0.2, 1.0, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 },
          ]],
          [ -0.2, -1.0, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 },
          ]],
          [ 1.5, 0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      case 7:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.2, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ 1.2, 0.5, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 },
          ]],
          [ 1.2, -0.5, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 },
          ]],
          [ -0.2, 1.0, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 },
          ]],
          [ -0.2, -1.0, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 },
          ]],
          [ 0, 1.0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
          [ 0, -1.0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
        ];
      case 8:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -0.5, 0, 'life support', 0, false ],
          [ -1.2, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 },
          ]],
          [ 1.2, 0.5, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 },
          ]],
          [ 1.2, -0.5, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 },
          ]],
          [ -0.2, 1.0, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 },
          ]],
          [ -0.2, -1.0, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 },
          ]],
          [ 0, 1.0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
          ]],
          [ 0, -1.0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 },
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