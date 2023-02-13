class Part {
  constructor(x, y, type, parentPart, signals, game) {
    this.game = game;
    this.pos = { x, y };
    this.type = type;
    this.signals = signals;
    this.reload = 0;
    this.damage = 0;
    this.parentPart = parentPart;
  }

  hasAbility(ability) {
    if (!this.signals) {
      return false;
    }
    
    return this.signals.reduce((prev, cur) => {
      if (prev) {
        return prev;
      }

      switch (ability) {
        case 'shoot': return cur.signal == 'shootPrimary' || cur.signal == 'shootSecondary';
        case 'turn': return cur.signal == 'turnLeft' || cur.signal == 'turnRight';
        case 'accelerate': return cur.signal == 'forward';
        default: return false;
      }
    }, false);
  }

  act(spf, signals, ship) {
    if (this.parentPart && this.parentPart.destroy) {
      this.destroy = true;
      return;
    }

    if (this.reload > 0) {
      this.reload -= spf;
    }

    // Check if activated
    const strength = this.getSignalStrength(signals);
    if (!strength) {
      return; // Not active
    }

    // Apply thrust
    switch (this.type) {
      case 'left thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(0, strength * -30.0)),
          ship.body.getWorldPoint(planck.Vec2(this.pos.x, this.pos.y))
        );
        break;
      case 'right thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(0, strength * 30.0)),
          ship.body.getWorldPoint(planck.Vec2(this.pos.x, this.pos.y))
        );
        break;
      case 'main thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(strength * 100.0, 0)),
          ship.body.getWorldPoint(planck.Vec2(this.pos.x, this.pos.y))
        );
        break;
      case 'retro thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(strength * -50.0, 0)),
          ship.body.getWorldPoint(planck.Vec2(this.pos.x, this.pos.y))
        );
        break;
      case 'blaster':
        if (this.reload <= 0) {
          this.reload = 0.3;
          this.addBullet(ship);
        }
        break;
      case 'auto cannon':
        if (this.reload <= 0) {
          this.reload = 0.1;
          this.addBullet(ship);
        }
        break;
      default:
    }
  }

  addBullet(ship) {
    const pos = ship.body.getWorldPoint(planck.Vec2(this.pos.x, this.pos.y));
    const vec = ship.body.getWorldVector(planck.Vec2(1, 0));
    const vel = ship.body.getLinearVelocity();
    ship.game.addBullet(
      pos.x + vec.x * 0.5,
      pos.y + vec.y * 0.5,
      vel.x + vec.x * 70.0,
      vel.y + vec.y * 70.0,
      'blaster bullet'
    );
  }

  draw(c, signals) {
    c.beginPath();
    let first = true;
    this.getShape(true).forEach((point) => {
      if (first) {
        c.moveTo(point.x, point.y);
        first = false;
        return;
      }
      c.lineTo(point.x, point.y);
    });
    c.closePath();
    c.fill();
    c.stroke();
    this.drawOnSignal(c, signals);
  }

  drawOnSignal(c, signals) {

    // Check if activated
    const strength = this.getSignalStrength(signals);
    if (!strength) {
      return; // Not active
    }

    // Draw if activated
    switch (this.type) {
      case 'left thruster':
        this.game.setColors('thruster exhaust');
        c.beginPath();
        c.moveTo(-0.1, 0.1 + (0.1) * strength);
        c.lineTo(0, 0.1);
        c.lineTo(0.1, 0.1 + (0.1) * strength);
        c.lineTo(0, 0.1 + (0.2 + Math.random() * 0.3) * strength);
        c.closePath();
        c.fill();
        c.stroke();
        break;
      case 'right thruster':
        this.game.setColors('thruster exhaust');
        c.beginPath();
        c.moveTo(-0.1, -0.1 - (0.1) * strength);
        c.lineTo(0, -0.1);
        c.lineTo(0.1, -0.1 - (0.1) * strength);
        c.lineTo(0, -0.1 - (0.2 + Math.random() * 0.3) * strength);
        c.closePath();
        c.fill();
        c.stroke();
        break;
      case 'main thruster':
        this.game.setColors('thruster exhaust');
        c.beginPath();
        c.moveTo(-0.2, 0);
        c.lineTo(-0.2 - (0.2 + Math.random() * 0.2) * strength, 0.3);
        c.lineTo(-0.2 - (1.0 + Math.random() * 0.5) * strength, 0);
        c.lineTo(-0.2 - (0.2 + Math.random() * 0.2) * strength, -0.3);
        c.closePath();
        c.fill();
        c.stroke();
        break;
      case 'retro thruster':
        this.game.setColors('thruster exhaust');
        c.beginPath();
        c.moveTo(0.2, 0);
        c.lineTo(0.2 + (0.1 + Math.random() * 0.1) * strength, 0.15);
        c.lineTo(0.2 + (0.5 + Math.random() * 0.25) * strength, 0);
        c.lineTo(0.2 + (0.1 + Math.random() * 0.1) * strength, -0.15);
        c.closePath();
        c.fill();
        c.stroke();
        break;
      default:
    }
  }

  getSignalStrength(signals) {
    if (!this.signals) {
      return 0; // No signals
    }
    
    // Check if activated
    let active = 0;
    this.signals.forEach((signal) => {
      if (signals[signal.signal]) {
        active = Math.max(active, signal.strength * signals[signal.signal]);
      }
    });

    return active;
  }

  getShape(setColors) {
    switch (this.type) {
      case 'hull':
        if (setColors) {
          this.game.setColors('hull');
        }
        return [
          { x: -1, y: -0.7 },
          { x: -0.9, y: 0 },
          { x: -1, y: 0.7 },
          { x: 1.5, y: 0.1 },
          { x: 1.5, y: -0.1 },
        ];
      case 'hull2':
        if (setColors) {
          this.game.setColors('hull');
        }
        return [
          { x: -1, y: -1.2 },
          { x: -1.1, y: 0 },
          { x: -1, y: 1.2 },
          { x: 1.3, y: 0.4 },
          { x: 1.3, y: -0.4 },
        ];
      case 'main thruster':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: 0.2, y: -0.2 },
          { x: 0.2, y: 0.2 },
          { x: -0.2, y: 0.3 },
          { x: -0.2, y: -0.3 },
        ];
      case 'retro thruster':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: 0.2, y: -0.15 },
          { x: 0.2, y: 0.15 },
          { x: -0.2, y: 0.2 },
          { x: -0.2, y: -0.2 },
        ];
      case 'left thruster':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: -0.1, y: 0.1 },
          { x: -0.15, y: -0.1 },
          { x: 0.15, y: -0.1 },
          { x: 0.1, y: 0.1 },
        ];
      case 'right thruster':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: 0.1, y: -0.1 },
          { x: 0.15, y: 0.1 },
          { x: -0.15, y: 0.1 },
          { x: -0.1, y: -0.1 },
        ];
      case 'blaster':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: -0.1, y: -0.1 },
          { x: 0.2, y: -0.05 },
          { x: 0.2, y: 0.05 },
          { x: -0.1, y: 0.1 },
        ];
      case 'auto cannon':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: -0.1, y: -0.2 },
          { x: 0.2, y: -0.15 },
          { x: 0.2, y: 0.15 },
          { x: -0.1, y: 0.2 },
        ];
      default:
        if (setColors) {
          this.game.setColors('default');
        }
        return [
          { x: 1, y: 1 },
          { x: -1, y: 1 },
          { x: -1, y: -1 },
          { x: 1, y: -1 },
        ]
    }
  }

  getPolygon() {
    const points = this.getShape().map((point) => {
      return planck.Vec2(point.x + this.pos.x, point.y + this.pos.y);
    });
    return planck.Polygon(points);
  }

  getMass() {
    return 1.0;
  }

  getBulletDamage(bullet) {
    this.damage += 0.5 + Math.random() * 2.5;
    let maxDamage = 0;
    switch (this.type) {
      case 'hull': maxDamage = 10.0; break;
      case 'hull2': maxDamage = 15.0; break;
      case 'main thruster': maxDamage = 5.0; break;
      case 'retro thruster': maxDamage = 4.0; break;
      case 'left thruster': maxDamage = 3.0; break;
      case 'right thruster': maxDamage = 3.0; break;
      case 'blaster': maxDamage = 4.0; break;
      case 'auto cannon': maxDamage = 6.0; break;
      default: return; // Invincible
    }
    if (this.damage > maxDamage) {
      this.destroy = true;
    }
  }
}