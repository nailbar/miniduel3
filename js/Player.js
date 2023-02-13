class Player {
  constructor(ship, game) {
    this.category = 'player';
    this.ship = ship;
    this.game = game;
    this.nearestEnemy = ship;
    this.target = ship;
  }

  findNearerEnemy() {
    const ship = this.game.getRandomShip();
    if (!ship || ship.team == this.ship.team) {
      return;
    }

    if (this.nearestEnemy.team == this.ship.team || this.nearestEnemy.destroy) {
      this.nearestEnemy = ship;
      return;
    }

    const newDistance = this.ship.getDistanceTo(ship.getPosition());
    const oldDistance = this.ship.getDistanceTo(this.nearestEnemy.getPosition());
    if (newDistance < oldDistance) {
      this.nearestEnemy = ship;
    }
  }

  updateTarget() {
    if (this.target.team == this.ship.team || this.target.destroy) {
      this.target = this.nearestEnemy;
      return;
    }
    
    const distance = this.ship.getDistanceTo(this.target.getPosition());
    if (distance > 100) {
      this.target = this.nearestEnemy;
    }
  }

  ponder() {
    this.findNearerEnemy();
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
      this.updateTarget();
    }
  }
}