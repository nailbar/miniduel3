class Player {
  constructor(ship, game) {
    this.category = 'player';
    this.ship = ship;
    this.game = game;
    this.target = ship;
  }

  findNearerEnemy() {
    const nearestEnemy = this.game.ships.reduce((prev, cur) => {
      if (cur.team == this.ship.team || cur.destroy) {
        return prev;
      }
      const distance = this.ship.getDistanceTo(cur.getPosition());
      if (!prev || distance < prev.distance) {
        return {
          distance,
          target: cur
        };
      }
      return prev;
    }, false);

    if (nearestEnemy) {
      this.target = nearestEnemy.target;
    }
  }

  updateTarget() {
    if (!this.target) {
      return;
    }

    if (this.target.team == this.ship.team || this.target.destroy) {
      this.target = false;
      return;
    }
  }

  ponder() {
    this.updateTarget();

    this.ship.initSignals();
    if (this.game.keys.i || this.game.keys.ArrowUp) {
      this.ship.signals.forward = 1.0;
    }
    if (this.game.keys.j || this.game.keys.ArrowLeft) {
      this.ship.signals.turnLeft = 1.0;
    }
    if (this.game.keys.k || this.game.keys.ArrowDown) {
      this.ship.signals.reverse = 1.0;
    }
    if (this.game.keys.l || this.game.keys.ArrowRight) {
      this.ship.signals.turnRight = 1.0;
    }
    if (this.game.keys.a) {
      this.ship.signals.strafeLeft = 1.0;
    }
    if (this.game.keys.d) {
      this.ship.signals.strafeRight = 1.0;
    }
    if (this.game.keys.x || this.game.keys[' ']) {
      this.ship.signals.slide = 1.0;
    }
    if (this.game.keys.w || this.game.keys.Shift) {
      this.ship.signals.shootPrimary = 1.0;
    }
    if (this.game.keys.s || this.game.keys.Enter) {
      this.ship.signals.shootSecondary = 1.0;
    }
    if (this.game.keys.t) {
      this.findNearerEnemy();
    }
  }
}