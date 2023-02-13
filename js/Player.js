class Player {
  constructor(ship, game) {
    this.category = 'player';
    this.ship = ship;
    this.game = game;
  }

  ponder() {
    this.ship.initSignals();
    if (game.keys.w || game.keys.ArrowUp) {
      this.ship.signals.forward = 1.0;
    }
    if (game.keys.a || game.keys.ArrowLeft) {
      this.ship.signals.turnLeft = 1.0;
    }
    if (game.keys.s || game.keys.ArrowDown) {
      this.ship.signals.reverse = 1.0;
    }
    if (game.keys.d || game.keys.ArrowRight) {
      this.ship.signals.turnRight = 1.0;
    }
    if (game.keys.q) {
      this.ship.signals.strafeLeft = 1.0;
    }
    if (game.keys.e) {
      this.ship.signals.strafeRight = 1.0;
    }
    if (game.keys[' ']) {
      this.ship.signals.slide = 1.0;
    }
    if (game.keys.Shift) {
      this.ship.signals.shootPrimary = 1.0;
    }
    if (game.keys.Enter) {
      this.ship.signals.shootSecondary = 1.0;
    }
  }
}