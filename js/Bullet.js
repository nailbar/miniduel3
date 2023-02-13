class Bullet {
  constructor(x, y, vx, vy, type, game) {
    this.game = game;
    this.category = 'bullet';
    this.body = this.game.physics.createBody({
      bullet: true,
      type: 'dynamic',
      position: planck.Vec2(x, y),
      linearVelocity: planck.Vec2(vx, vy),
    });
    this.body.createFixture(planck.Circle(0.1), 5);
    this.body.setUserData(this);
    
    this.type = type;
    this.ttl = 2.0;
  }

  actAndDraw(c, spf) {
    this.ttl -= spf;
    if (this.ttl <= 0) {
      this.destroy = true;
    }
    this.game.setColors('blaster bullet');
    c.beginPath();
    c.arc(0, 0, 0.2, 0, Math.PI * 2.0);
    c.stroke();
    c.fill();
  }

  unCreate() {
    const position = this.body.getWorldPoint(planck.Vec2(0, 0));
    const particles = Math.floor(Math.random() * 10) + 3;

    if (this.ttl > 0) {
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

    this.game.physics.destroyBody(this.body);
  }
}