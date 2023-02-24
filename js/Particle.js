class Particle {
  constructor(x, y, vx, vy, type, game) {
    this.game = game;
    this.pos = { x, y };
    this.vel = { x: vx, y: vy };
    this.type = type;
    this.ttl = this.getTimeToLive();
  }

  actAndDraw(c, spf) {
    this.ttl -= spf;
    if (this.ttl < 0) {
      this.destroy = true;
      return;
    }

    this.pos.x += this.vel.x * spf;
    this.pos.y += this.vel.y * spf;

    switch (this.type) {
      case 'spark':
        this.game.setColors('spark');
        c.beginPath();
        c.arc(0, 0, this.ttl * 0.5, 0, Math.PI * 2.0);
        c.fill();
        break;
      case 'mini blast':
        this.game.setColors('blast');
        c.beginPath();
        c.arc(0, 0, this.ttl * 10.0, 0, Math.PI * 2.0);
        c.fill();
        break;
      default: return;
    }
  }

  getTimeToLive() {
    switch (this.type) {
      case 'spark': return Math.random() * 0.8;
      case 'mini blast': return Math.random() * 0.2;
      default: return 0.1;
    }
  }
}