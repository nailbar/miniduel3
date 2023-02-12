class Bullet {
  constructor(x, y, vx, vy, physics, type, ships, addParticle) {
    this.category = 'bullet';
    this.physics = physics;
    this.addParticle = addParticle;
    this.body = physics.createBody({
      bullet: true,
      type: 'dynamic',
      position: planck.Vec2(x, y),
      linearVelocity: planck.Vec2(vx, vy),
    });
    this.body.createFixture(planck.Circle(0.2), 5);
    this.body.setUserData(this);
    
    this.type = type;
    this.ships = ships;
    this.age = 0;
  }

  actAndDraw(c, spf) {
    this.age += spf;
    if (this.age > 3.0) {
      this.destroy = true;
    }
    c.beginPath();
    c.arc(0, 0, 0.2, 0, Math.PI * 2.0);
    c.fill();
  }

  unCreate() {
    const position = this.body.getWorldPoint(planck.Vec2(0, 0));
    const particles = Math.floor(Math.random() * 10) + 3;

    for (let i = 0; i < particles; i++) {
      this.addParticle(
        position.x,
        position.y,
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        'spark'
      );
    }

    this.physics.destroyBody(this.body);
  }
}