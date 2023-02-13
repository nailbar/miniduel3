class ShipAi {
  constructor(ship, game) {
    this.category = 'ai';
    this.ship = ship;
    this.game = game;
    this.mode = 'attack' //'goto';
    this.target = { x: 0, y: 0 };
    this.targetId = -1;
    this.timeout = 20.0;

    this.personality = {
      maxRotation: 2.0 + Math.random() * 3.0,
      velocityCoeff: 0.5 + Math.random() * 4.0,
      targetLead: Math.random() * 0.02,
      velocityLead: Math.random() * 0.02,
    };
  }

  ponder(spf) {
    this.ship.initSignals();
    const Vec2 = planck.Vec2;

    const target = this.ship.body.getLocalPoint(Vec2(this.target.x, this.target.y));
    const distance = Vec2.lengthOf(target);

    let invalidTarget = false;
    const velocity = this.ship.body.getLinearVelocity();
    if (this.updateMode(distance, spf)) {
      invalidTarget = true;
      this.target = Vec2(0, 0).sub(Vec2(velocity.x, velocity.y).mul(distance * 0.1));
    }
    
    if (distance < 3.0) {
      return;
    }

    const p = this.personality;
    const rotation = this.ship.body.getAngularVelocity() / p.maxRotation;
    const vector = Vec2(target.x / distance, target.y / distance);
    const forwardVector = this.ship.body.getWorldVector(Vec2(1, 0));
    const forwardVelocity = forwardVector.x * velocity.x + forwardVector.y * velocity.y;
    const targetVelocity = distance * p.velocityCoeff;

    let targetRotation = 0;
    if (vector.y < 0) {
      if (vector.x > 0) {
        targetRotation = vector.y;
      } else {
        targetRotation = -1.0;
      }
    }
    if (vector.y > 0) {
      if (vector.x > 0) {
        targetRotation = vector.y;
      } else {
        targetRotation = 1.0;
      }
    }

    if (Math.abs(rotation) > 1.0) {
      return;
    }
    
    if (targetRotation < rotation) {
      this.ship.signals.turnRight = Math.min(1, rotation - targetRotation);
    }
    if (targetRotation > rotation) {
      this.ship.signals.turnLeft = Math.min(1, targetRotation - rotation);
    }
    if (vector.x > 0.5 && forwardVelocity < targetVelocity && distance > 10.0) {
      this.ship.signals.forward = Math.min(1, targetVelocity - forwardVelocity);
    }
    if (vector.x > 0.9 && distance < 50.0 && !invalidTarget) {
      this.ship.signals.shootPrimary = 1;
    }
  }

  updateMode(distance, spf) {
    this.timeout -= spf;
    switch (this.mode) {
      case 'goto':
        break;

      case 'follow':
        if (this.checkTarget(distance)) {
          return true;
        }
        this.target = this.game.ships[this.targetId].getPosition();
        break;

      case 'attack':
        if (!this.ship.canShoot) {
          this.mode = 'evade';
          return true;
        }
        if (this.checkTarget(distance)) {
          return true;
        }
        if (this.timeout <= 0) {
          this.timeout = Math.random() * 200.0;
          if (this.findNearestTarget(distance)) {
            return true;
          }
        }
        this.interceptTarget();
        break;

      case 'evade':
        if (this.checkTarget(distance)) {
          return true;
        }
        if (this.findNearestTarget(distance)) {
          return true;
        }
        this.evadeTarget();
        break;
      default:
        return true;
    }
    return false;
  }

  checkTarget(distance) {
    if (distance > 100, this.targetId < 0 || this.targetId >= this.game.ships.length || this.game.ships[this.targetId].team == this.ship.team) {
      this.targetId = Math.floor(Math.random() * this.game.ships.length);
      return true;
    }
    return false;
  }

  findNearestTarget(distance) {
    const targetId = Math.floor(Math.random() * this.game.ships.length);
    if (this.game.ships[targetId].team == this.ship.team) {
      return false;
    }
    const newDistance = this.distanceToShip(targetId)
    if (newDistance < distance) {
      this.targetId = targetId;
      return true;
    }
    return false;
  }

  distanceToShip(targetId) {
    return planck.Vec2.lengthOf(
      this.game.ships[targetId].body.getLocalPoint(
        this.ship.getPosition()
      )
    );
  }

  evadeTarget() {
    const myPos = this.ship.getPosition();
    const relative = myPos.sub(this.game.ships[this.targetId].getPosition());
    this.target = myPos.add(relative);
    this.ship.signals.forward = 1.0; // Always full speed ahead
  }

  interceptTarget() {
    const Vec2 = planck.Vec2;
    const p = this.personality;
    const targetPos = this.game.ships[this.targetId].getPosition();
    const targetVel = this.game.ships[this.targetId].body.getLinearVelocity();
    const ownVel = this.ship.body.getLinearVelocity();
    const distance = planck.Vec2.lengthOf(this.ship.body.getLocalPoint(targetPos));
    this.target = targetPos.add(Vec2(
      targetVel.x * distance * p.targetLead,
      targetVel.y * distance * p.targetLead
    )).sub(Vec2(
      ownVel.x * distance * p.velocityLead,
      ownVel.y * distance * p.velocityLead
    ));
  }
}