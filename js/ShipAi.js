class ShipAi {
  constructor(ship, game) {
    this.category = 'ai';
    this.ship = ship;
    this.game = game;
    this.mode = 'attack';
    this.target = { x: 0, y: 0 };
    this.targetShip = false;
    this.nearestTarget = false;
    this.targetId = -1;
    this.timeout = 20.0;

    this.personality = {
      maxRotation: 2.0 + Math.random() * 3.0,
      velocityCoeff: 0.5 + Math.random() * 4.0,
      interceptMultiplier: Math.random() * 0.03,
      sightsMultiplier: Math.random() * 0.02,
      sightPrecision: 1.0 - Math.random() * 0.5,
      attackDistance: 40.0 + Math.random() * 80.0,
      focusTime: 20.0 + Math.random() * 400.0,
    };
  }

  ponder(spf) {
    this.ship.initSignals();
    this.attackTarget(spf);
  }

  attackTarget(spf) {

    // Switch to better target after attacking one for long enough
    this.timeout -= spf;
    if (this.timeout < 0) {
      this.timeout = Math.random() * this.personality.focusTime;
      this.findNearerTarget();
    }

    // Make sure we have a valid target
    if (!this.haveValidTarget()) {
      return;
    }

    // Get target data relative to this ship
    const data = this.getRelativeData(this.targetShip);
    // this.ship.targetingData = data; // For debugging

    // Avoid collision if target is too near
    if (data.distance < 20) {
      this.turnAwayFrom(data);
      if (data.vector.x < 0) {
        this.ship.signals.forward = 1.0;
      }
      return;
    }

    // Inteception data
    this.getInterceptData(this.targetShip, data);

    // Try to intercept target
    this.turnTowards(data.move);
    if (data.move.vector.x > 0) {
      this.ship.signals.forward = Math.min(1, data.move.vector.x);
    }
    
    // Shoot if target in sights
    if (data.shoot.vector.x > this.personality.sightPrecision && data.distance < this.personality.attackDistance) {
      this.ship.signals.shootPrimary = 1;
    }
  }

  turnAwayFrom(data) {
    if (data.vector.x < 0) {
      this.adjustRotation(-data.vector.y);
    } else {
      if (data.vector.y > 0) {
        this.adjustRotation(-1);
      } else {
        this.adjustRotation(1);
      }
    }
  }

  turnTowards(data) {
    if (data.vector.x > 0) {
      this.adjustRotation(data.vector.y);
    } else {
      if (data.vector.y > 0) {
        this.adjustRotation(1);
      } else {
        this.adjustRotation(-1);
      }
    }
  }

  getInterceptData(ship, data) {
    const Vec2 = planck.Vec2;

    const targetWorldPosition = ship.getPosition();
    const interceptMultiplier = this.personality.interceptMultiplier;
    const sightsMultiplier = this.personality.sightsMultiplier;
    const targetVelocity = ship.body.getLinearVelocity();
    const ownVelocity = this.ship.body.getLinearVelocity();

    data.move = {};
    const moveWorldPosition = Vec2(
      targetWorldPosition.x + (targetVelocity.x - ownVelocity.x) * data.distance * interceptMultiplier,
      targetWorldPosition.y + (targetVelocity.y - ownVelocity.y) * data.distance * interceptMultiplier
    );
    data.move.position = this.ship.body.getLocalPoint(moveWorldPosition);
    data.move.distance = Vec2.lengthOf(data.move.position);
    data.move.vector = data.move.distance > 0.001 ? Vec2(
      data.move.position.x / data.move.distance,
      data.move.position.y / data.move.distance
    ) : Vec2(1, 0);

    data.shoot = {};
    const shootWorldPosition = Vec2(
      targetWorldPosition.x + (targetVelocity.x - ownVelocity.x) * data.distance * sightsMultiplier,
      targetWorldPosition.y + (targetVelocity.y - ownVelocity.y) * data.distance * sightsMultiplier
    );
    data.shoot.position = this.ship.body.getLocalPoint(shootWorldPosition);
    data.shoot.distance = Vec2.lengthOf(data.shoot.position);
    data.shoot.vector = data.shoot.distance > 0.001 ? Vec2(
      data.shoot.position.x / data.shoot.distance,
      data.shoot.position.y / data.shoot.distance
    ) : Vec2(1, 0);
  }

  adjustRotation(targetRotation) {
    const rotation = this.ship.body.getAngularVelocity() / this.personality.maxRotation;
    if (Math.abs(rotation) > 1.0) {
      return; // Turning over max rotation already
    }
    if (targetRotation < rotation) {
      this.ship.signals.turnRight = Math.min(1, (rotation - targetRotation) * 10.0);
    }
    if (targetRotation > rotation) {
      this.ship.signals.turnLeft = Math.min(1, (targetRotation - rotation) * 10.0);
    }
  }

  haveValidTarget() {
    this.findNearerTarget();
    if (!this.targetShip || this.targetShip.team == this.ship.team || this.targetShip.destroy) {
      this.targetShip = this.nearestTarget;
    }
    if (!this.targetShip || this.targetShip.team == this.ship.team || this.targetShip.destroy) {
      return false; // Could not find valid target
    }
    return true;
  }

  getRelativeData(ship) {
    const Vec2 = planck.Vec2;
    const data = {};

    data.position = this.ship.body.getLocalPoint(ship.getPosition());
    data.distance = Vec2.lengthOf(data.position);
    data.vector = data.distance > 0.001 ? Vec2(
      data.position.x / data.distance,
      data.position.y / data.distance
    ) : Vec2(1, 0);

    return data;
  }

  findNearerTarget() {
    const potential = this.game.ships.filter((ship) => {
      return ship.team != this.ship.team && !ship.destory;
    });
    if (potential.length == 0) {
      this.nearestTarget = false;
      return;
    }

    this.targetId++;
    if (this.targetId < 0 || this.targetId >= potential.length) {
      this.targetId = 0;
    }

    const newTarget = potential[this.targetId];
    if (!this.nearestTarget || this.nearestTarget.team == this.ship.team || this.nearestTarget.destroy) {
      this.nearestTarget = newTarget;
      return;
    }
    const oldDistance = this.ship.getDistanceTo(this.nearestTarget.getPosition());
    const newDistance = this.ship.getDistanceTo(newTarget.getPosition());
    if (newDistance < oldDistance) {
      this.nearestTarget = newTarget;
    }
  }
}