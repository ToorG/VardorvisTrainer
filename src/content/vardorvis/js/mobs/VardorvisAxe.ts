"use strict";

import { BasicModel, DelayedAction, Mob, UnitBonuses, Location, Region, Model, Trainer } from "osrs-sdk";

export type AxeDirection = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW";

const DIR_VECTORS: Record<AxeDirection, { dx: number; dy: number }> = {
  N:  { dx:  0, dy:  1 },
  S:  { dx:  0, dy: -1 },
  E:  { dx:  1, dy:  0 },
  W:  { dx: -1, dy:  0 },
  NE: { dx:  1, dy:  1 },
  NW: { dx: -1, dy:  1 },
  SE: { dx:  1, dy: -1 },
  SW: { dx: -1, dy: -1 },
};

export class VardorvisAxe extends Mob {
  direction: AxeDirection;
  dx: number;
  dy: number;
  isAwakened: boolean;
  alreadyHit = false;
  private spinAngle: number;
  private ticksAlive = 0;

  constructor(region: Region, location: Location, options: { direction: AxeDirection; awakened?: boolean; aggro?: any }) {
    super(region, location, options);
    this.direction  = options.direction;
    this.isAwakened = options.awakened ?? false;
    const v = DIR_VECTORS[this.direction];
    this.dx = v.dx;
    this.dy = v.dy;
    this.spinAngle = Math.random() * Math.PI * 2;
  }

  mobName()  { return "Swinging Axe"; }
  get size() { return 1; }
  get combatLevel() { return 0; }
  get attackSpeed() { return 99; }
  get attackRange() { return 0; }
  get color() { return "#cc4422"; }
  attackStyleForNewAttack() { return "slash"; }

  // Hide HP bar
  get hitpoints() { return 0; }

  setStats() {
    this.stats = { attack: 0, strength: 0, defence: 0, range: 0, magic: 0, hitpoint: 1 };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  get bonuses(): UnitBonuses {
    return {
      attack:  { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      defence: { stab: 0, slash: 0, crush: 0, magic: 0, range: 0 },
      other:   { meleeStrength: 0, rangedStrength: 0, magicDamage: 0, prayer: 0 },
    };
  }

  /** Called from VardorvisRegion.postTick() each tick to move the axe */
  moveAxe() {
    this.ticksAlive++;
    const newX = this.location.x + this.dx;
    const newY = this.location.y + this.dy;

    // Remove after crossing the arena (max 12 tiles at size 9)
    if (this.ticksAlive > 12) {
      this.region.removeMob(this);
      return;
    }

    this.location = { x: newX, y: newY };
    this.perceivedLocation = { x: newX, y: newY };
  }

  hitsLocation(loc: Location): boolean {
    if (this.location.x === loc.x && this.location.y === loc.y) return true;
    const ext = this.extendedHitboxTile;
    return !!(ext && ext.x === loc.x && ext.y === loc.y);
  }

  get extendedHitboxTile(): Location | null {
    if (!this.isAwakened) return null;
    const { x, y } = this.location;
    if (x >= 2 && x <= 6 && y >= 2 && y <= 6) {
      return { x: x + this.dy, y: y + this.dx };
    }
    return null;
  }

  checkHitPlayer() {
    if (this.alreadyHit) return;
    const player = Trainer.player;
    if (!player) return;
    if (!this.hitsLocation(player.location)) return;

    this.alreadyHit = true;
    const hasMelee = !!player.prayerController?.matchFeature("melee");
    const base = 5 + Math.floor(Math.random() * 31);
    const hit  = hasMelee ? Math.floor(base * 0.5) : base;

    if (hit > 0) {
      player.currentStats.hitpoint = Math.max(0, player.currentStats.hitpoint - hit);
      player.damageTaken();
    }

    const bleedDmg = this.isAwakened ? 5 : 3;
    for (let i = 1; i <= 5; i++) {
      DelayedAction.registerDelayedAction(
        new DelayedAction(() => {
          const p = Trainer.player;
          if (!p || p.currentStats.hitpoint <= 0) return;
          p.currentStats.hitpoint = Math.max(0, p.currentStats.hitpoint - bleedDmg);
          p.damageTaken();
        }, i * 2),
      );
    }
  }

  create3dModel(): Model { return BasicModel.forRenderable(this); }

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    context.fillStyle = "rgba(204, 74, 26, 0.32)";
    context.fillRect(this.location.x * scale + 1, this.location.y * scale + 1, scale - 2, scale - 2);
  }

  drawOverTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    this.spinAngle += 0.2;
    const cx = this.location.x * scale + scale / 2;
    const cy = this.location.y * scale + scale / 2;
    const r  = scale * 0.37;

    context.save();
    context.translate(cx, cy);
    context.rotate(this.spinAngle + Math.atan2(this.dy, this.dx));

    context.strokeStyle = "#5a3311";
    context.lineWidth = Math.max(3, scale * 0.07);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-r * 0.95, 0);
    context.lineTo(r * 0.95, 0);
    context.stroke();

    context.fillStyle = "#8a2000";
    context.strokeStyle = "#cc5533";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-r * 0.65, 0);
    context.lineTo(-r * 1.1,  -r * 0.58);
    context.lineTo(-r * 0.12, -r * 0.48);
    context.closePath();
    context.fill(); context.stroke();

    context.beginPath();
    context.moveTo(r * 0.65, 0);
    context.lineTo(r * 1.1,  -r * 0.58);
    context.lineTo(r * 0.12, -r * 0.48);
    context.closePath();
    context.fill(); context.stroke();

    context.fillStyle = "#ff8844";
    context.beginPath();
    context.arc(0, 0, r * 0.11, 0, Math.PI * 2);
    context.fill();

    context.restore();
    context.lineCap = "butt";
  }
}
