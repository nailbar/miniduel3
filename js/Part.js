class Part {
  constructor(x, y, type, parentPart, team, signals, game) {
    this.game = game;
    this.pos = { x, y };
    this.type = type;
    this.team = team;
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
        case 'turn left': return cur.signal == 'turnLeft';
        case 'turn right': return cur.signal == 'turnRight';
        case 'accelerate': return cur.signal == 'forward';
        default: return false;
      }
    }, false);
  }

  act(spf, signals, ship) {
    if (this.parentPart && this.parentPart.destroy) {
      this.destroy = true;
      return 0;
    }

    const powerLevel = ship.getPowerLevel();

    let reloading = false;
    if (this.reload > 0) {
      this.reload -= spf * powerLevel;
      reloading = true;
    }

    // Check if activated
    const strength = this.getSignalStrength(signals) * powerLevel;
    if (!strength) {
      return 0; // Not active
    }

    // Apply thrust
    switch (this.type) {
      case 'left thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(0, strength * -30.0)),
          ship.body.getWorldPoint(this.getPartPos())
        );
        return this.getPowerDraw();
      case 'right thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(0, strength * 30.0)),
          ship.body.getWorldPoint(this.getPartPos())
        );
        return this.getPowerDraw();
      case 'main thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(strength * 100.0, 0)),
          ship.body.getWorldPoint(this.getPartPos())
        );
        return this.getPowerDraw();
      case 'retro thruster':
        ship.body.applyForce(
          ship.body.getWorldVector(planck.Vec2(strength * -50.0, 0)),
          ship.body.getWorldPoint(this.getPartPos())
        );
        return this.getPowerDraw();
      case 'blaster':
        if (this.reload <= 0) {
          this.reload = 0.3;
          this.addBullet(ship);
          reloading = true;
        }
        if (reloading) {
          return this.getPowerDraw();
        }
        break;
      case 'auto cannon':
        if (this.reload <= 0) {
          this.reload = 0.1;
          this.addBullet(ship);
          reloading = true;
        }
        if (reloading) {
          return this.getPowerDraw();
        }
        break;
      default:
    }
    
    return 0;
  }

  addBullet(ship) {
    const pos = ship.body.getWorldPoint(this.getPartPos());
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

  draw(c, signals, ship) {
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

    if (ship) {
      this.drawOnSignal(c, signals, ship);
    }
  }

  drawOnSignal(c, signals, ship) {

    // Check if activated
    const strength = this.getSignalStrength(signals) * ship.getPowerLevel();
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
        c.moveTo(-0.35, 0);
        c.lineTo(-0.35 - (0.2 + Math.random() * 0.2) * strength, 0.3);
        c.lineTo(-0.35 - (1.0 + Math.random() * 0.5) * strength, 0);
        c.lineTo(-0.35 - (0.2 + Math.random() * 0.2) * strength, -0.3);
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
      case 'life support':
        if (setColors) {
          this.game.setColors('greeble');
        }
        return [
          { x: 0.8, y: -0.1 },
          { x: 0.8, y: 0.1 },
          { x: 0.4, y: 0.4 },
          { x: -0.5, y: 0.4 },
          { x: -0.6, y: 0 },
          { x: -0.5, y: -0.4 },
          { x: 0.4, y: -0.4 },
        ];
      case 'hull':
        if (setColors) {
          this.game.setColors('hull ' + this.team);
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
          this.game.setColors('hull ' + this.team);
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
          { x: 0.3, y: -0.3 },
          { x: 0.3, y: 0.3 },
          { x: -0.3, y: 0.35 },
          { x: -0.3, y: -0.35 },
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
    const maxDamage = this.getMaxDamage();
    if (this.damage > maxDamage) {
      this.destroy = true;
    }
  }

  getHealth() {
    return Math.min(1.0, Math.max(0.0, 1.0 - 1.0 / this.getMaxDamage() * this.damage));
  }

  getMaxDamage() {
    switch (this.type) {
      case 'life support': return 5.0;
      case 'hull': return 10.0;
      case 'hull2': return 15.0;
      case 'main thruster': return 5.0;
      case 'retro thruster': return 4.0;
      case 'left thruster': return 3.0;
      case 'right thruster': return 3.0;
      case 'blaster': return 4.0;
      case 'auto cannon': return 6.0;
      default: return 10000; // "Invincible"
    }
  }

  getPowerGeneration() {
    switch (this.type) {
      case 'life support': return 2.0;
      case 'hull': return 10.0;
      case 'hull2': return 15.0;
      default: return 0;
    }
  }

  getPowerDraw() {
    switch (this.type) {
      case 'main thruster': return 7.0;
      case 'retro thruster': return 4.0;
      case 'left thruster': return 3.0;
      case 'right thruster': return 3.0;
      case 'blaster': return 4.0;
      case 'auto cannon': return 6.0;
      default: return 0;
    }
  }

  drawHealth(c) {
    const health = this.getHealth();
    const red = Math.floor((1.0 - health) * 255);
    const green = Math.floor(health * 255);
    c.fillStyle = 'rgb(' + red + ',' + green + ',0)';
    
    c.save();
    c.translate(this.pos.x, this.pos.y);
    c.beginPath();
    let first = true;
    this.getShape().forEach((point) => {
      if (first) {
        c.moveTo(point.x, point.y);
        first = false;
        return;
      }
      c.lineTo(point.x, point.y);
    });
    c.closePath();
    c.fill();
    c.restore();
  }

  getPartPos() {
    return planck.Vec2(this.pos.x, this.pos.y);
  }
}