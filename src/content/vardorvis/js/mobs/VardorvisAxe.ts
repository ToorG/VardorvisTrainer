"use strict";

import { Mob, UnitBonuses, Location, Region, DelayedAction } from "osrs-sdk";

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

/**
 * VardorvisAxe
 *
 * Spawns at the arena edge, travels one tile per tick.
 * Awakened middle-lane axes have an extended hitbox (perpendicular tile).
 * Hit: 5–35 base; Protect Melee halves initial hit.
 * Bleed: 3dmg×5ticks (normal) / 5dmg×5ticks (awakened).
 */
export class VardorvisAxe extends Mob {
  direction: AxeDirection;
  dx: number;
  dy: number;
  isAwakened: boolean;
  spinAngle: number;
  alreadyHit = false;

  constructor(
    region: Region,
    location: Location,
    options: { direction: AxeDirection; awakened?: boolean; aggro?: any },
  ) {
    super(region, location, options);
    this.direction = options.direction;
    this.isAwakened = options.awakened ?? false;
    const v = DIR_VECTORS[this.direction];
    this.dx = v.dx;
    this.dy = v.dy;
    this.spinAngle = Math.random() * Math.PI * 2;
  }

  mobName() { return "Swinging Axe"; }
  get size() { return 1; }
  get combatLevel() { return 0; }
  get attackSpeed() { return 99; }
  get attackRange() { return 0; }
  attackStyleForNewAttack() { return "slash"; }

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

  get extendedHitboxTile(): Location | null {
    if (!this.isAwakened) return null;
    const { x, y } = this.location;
    if (x >= 2 && x <= 6 && y >= 2 && y <= 6) {
      return { x: x + this.dy, y: y + this.dx };
    }
    return null;
  }

  hitsLocation(loc: Location): boolean {
    if (this.location.x === loc.x && this.location.y === loc.y) return true;
    const ext = this.extendedHitboxTile;
    return !!(ext && ext.x === loc.x && ext.y === loc.y);
  }

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    context.fillStyle = "rgba(204, 74, 26, 0.30)";
    context.fillRect(this.location.x * scale, this.location.y * scale, scale, scale);

    const ext = this.extendedHitboxTile;
    if (ext) {
      context.strokeStyle = "rgba(255, 140, 60, 0.55)";
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.strokeRect(ext.x * scale + 2, ext.y * scale + 2, scale - 4, scale - 4);
      context.setLineDash([]);
    }
  }
}
