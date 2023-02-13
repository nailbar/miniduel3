class Particle {
  constructor(x, y, vx, vy, type, game) {
    this.game = game;
    this.pos = { x, y };
    this.vel = { x: vx, y: vy };
    this.type = type;
    this.age = 0;
  }

  actAndDraw(c, spf) {
    this.age += spf;
    if (this.age > 0.5) {
      this.destroy = true;
      return;
    }

    this.pos.x += this.vel.x * spf;
    this.pos.y += this.vel.y * spf;

    this.game.setColors('spark');
    c.beginPath();
    c.arc(0, 0, (0.5 - this.age) * 0.5, 0, Math.PI * 2.0);
    c.fill();
  }
}