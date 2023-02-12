class Ship {
  constructor(x, y, physics, ships, playerControlled, addBullet, addDebris) {
    const Vec2 = planck.Vec2;
    this.category = 'ship';
    this.physics = physics;
    this.body = physics.createDynamicBody(Vec2(x, y));
    this.body.setUserData(this);
    this.addBullet = addBullet;
    this.addDebris = addDebris;
    this.parts = [];
    this.initSignals();

    if (!playerControlled) {
      this.ai = new ShipAi(this, ships);
    }

    this.buildShip();
  }
  
  autoStop() {
    let signals = { ...this.signals };
    const rotation = this.body.getAngularVelocity();
    const velocity = this.body.getLinearVelocity();
    const vector = this.body.getWorldVector(planck.Vec2(1, 0));
    const forward = velocity.x * vector.x + velocity.y * vector.y;
    const right = velocity.x * vector.y + velocity.y * -vector.x;
    
    // Prevent going too fast
    if (Math.abs(forward) > 100) {
      signals.forward = 0;
      signals.reverse = 0;
    }
    if (Math.abs(right) > 100) {
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
    if (this.ai) {
      this.ai.ponder();

      // Debug target leading
      // const pos = this.body.getLocalPoint(planck.Vec2(this.ai.target.x, this.ai.target.y));
      // c.fillRect(pos.x - 0.3, pos.y - 0.3, 0.6, 0.6);
      // c.fillRect(0, -0.01, 100, 0.02);
    }
    let signals = this.autoStop();
    let rebuild = false;
    this.parts.forEach((part, i) => {
      if (part.destroy) {
        this.debrisFromPart(part);
        this.parts.splice(i, 1);
        rebuild = true;
        return;
      }
      part.act(spf, signals, this);
      c.save();
      c.translate(part.pos.x, part.pos.y);
      part.draw(c, signals);
      c.restore();
    });

    const position = this.body.getWorldPoint(planck.Vec2(0, 0));
    this.body.applyForceToCenter(planck.Vec2(
      position.x * -0.1,
      position.y * -0.1
    ));

    if (rebuild) {
      this.updateBody();
    }
  }

  debrisFromPart(part) {
    const point = this.body.getWorldPoint(planck.Vec2(part.pos.x, part.pos.y));
    const velocity = this.body.getLinearVelocity();
    this.addDebris(
      point.x,
      point.y,
      velocity.x + Math.random() * 10 - 5,
      velocity.y + Math.random() * 10 - 5,
      this.body.getAngle(),
      part.type
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
    this.physics.destroyBody(this.body);
  }

  buildShip() {
    const s = this.getSchematic();
    s.forEach((part, i) => {
      part[5] = new Part(part[0], part[1], part[2], part[3] >= i ? false : s[part[3]][5], part[4]);
      this.parts.push(part[5]);
    });
    this.updateBody();
  }

  getSchematic() {
    switch (Math.floor(Math.random() * 6)) {
      case 0:
        return [
          [ 0, 0, 'hull', 0, false ],
          [ -1.0, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ 1.2, 0.1, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 0.5 }, // Activate on strafe
          ]],
          [ 1.2, -0.1, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 0.5 }, // Activate on strafe
          ]],
          [ -0.8, 0.6, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, -0.6, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],
          [ -0.6, 0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ -0.6, -0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ 1.5, 0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
        ];
      case 1:
        return [
          [ 0, 0, 'hull', 0, false ],
          [ -1.0, -0.3, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ -1.0, 0.3, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ 1.2, 0.1, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 0.5 }, // Activate on strafe
          ]],
          [ 1.2, -0.1, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 0.5 }, // Activate on strafe
          ]],
          [ -0.8, 0.6, 'left thruster', 0, [
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, -0.6, 'right thruster', 0, [
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],
          [ -0.6, 0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ -0.6, -0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ 1.5, 0, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
        ];
      case 2:
        return [
          [ 0, 0, 'hull', 0, false ],
          [ -1.0, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ 0.7, 0.4, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 0.8 }, // Activate on strafe
          ]],
          [ 0.7, -0.4, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 0.8 }, // Activate on strafe
          ]],
          [ -0.8, 0.6, 'left thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, -0.6, 'right thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],
          [ -0.6, 0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ -0.6, -0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ 0.8, 0.4, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
          [ 0.8, -0.4, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
        ];
      case 3:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -1.1, 0, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ 1.3, 0, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],

          [ 0.6, 0.6, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 0.8 }, // Activate on strafe
          ]],
          [ 0.6, -0.6, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 0.8 }, // Activate on strafe
          ]],
          [ -0.8, 1.1, 'left thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, -1.1, 'right thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],

          [ 0.8, 0.7, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
          [ 0.8, -0.7, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
        ];
      case 4:
        return [
          [ 0, 0, 'hull2', 0, false ],
          [ -1.1, 0.4, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ -1.1, -0.4, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ 1.3, 0, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],

          [ 0.6, 0.6, 'left thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 0.8 }, // Activate on strafe
          ]],
          [ 0.6, -0.6, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 0.8 }, // Activate on strafe
          ]],
          [ -0.8, 1.1, 'left thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, -1.1, 'right thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],

          [ 0.8, 0.7, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
          [ 0.8, -0.7, 'blaster', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
        ];
      case 5:
        return [
          [ 0, -0.5, 'hull', 0, false ],
          [ 0, 0.5, 'hull', 1, false ],

          [ -1.0, -0.5, 'main thruster', 0, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ -1.0, 0.5, 'main thruster', 1, [
            { signal: 'forward', strength: 1 }, // Activate on forward
          ]],
          [ 1.5, -0.5, 'retro thruster', 0, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],
          [ 1.5, 0.5, 'retro thruster', 1, [
            { signal: 'reverse', strength: 1 }, // Activate on reverse
          ]],

          [ 0.6, -0.6, 'right thruster', 0, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],
          [ 0.6, 0.6, 'left thruster', 1, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, -1.1, 'right thruster', 0, [
            { signal: 'turnRight', strength: 1 }, // Activate on turn
            { signal: 'strafeLeft', strength: 1 }, // Activate on strafe
          ]],
          [ -0.8, 1.1, 'left thruster', 1, [
            { signal: 'turnLeft', strength: 1 }, // Activate on turn
            { signal: 'strafeRight', strength: 1 }, // Activate on strafe
          ]],
          
          [ 0.3, 0, 'auto cannon', 0, [
            { signal: 'shootPrimary', strength: 1 }, // Activate on shooty
          ]],
        ];
      default:
        return [
          [ 0, 0, 'box', 0, false ],
        ];
    }
  }
}