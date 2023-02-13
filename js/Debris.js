class Debris {
  constructor(x, y, vx, vy, dir, type, game) {
    this.game = game;
    this.type = type;
    this.category = 'debris';
    this.part = new Part(0, 0, type, this, false, this.game);
    this.deathClock = 1.0 + Math.random() * 20.0;

    this.body = this.game.physics.createDynamicBody(planck.Vec2(x, y));
    this.body.setAngle(dir);
    this.body.setAngularVelocity(Math.random() * 20.0 - 10.0);
    this.body.setLinearVelocity(planck.Vec2(vx, vy));
    this.body.createFixture(this.part.getPolygon(), this.part.getMass());
    this.body.setUserData(this);
  }

  actAndDraw(c, spf) {
    this.deathClock -= spf;
    if (this.deathClock <= 0) {
      this.destroy = true;
      return;
    }

    this.part.draw(c);
  }

  unCreate() {
    const position = this.body.getWorldPoint(planck.Vec2(0, 0));
    const particles = this.body.getMass() * 3.0;
    for (let i = 0; i < particles; i++) {
      this.game.addParticle(
        position.x,
        position.y,
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        'spark'
      );
    }
    this.game.physics.destroyBody(this.body);
  }
}