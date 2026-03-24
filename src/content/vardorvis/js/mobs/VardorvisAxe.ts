"use strict";

import { BasicModel, Mob, UnitBonuses, Location, Region, Model } from "osrs-sdk";

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
 * VardorvisAxe — travels one tile per tick across the arena.
 * Awakened middle-lane axes have an extended hitbox (+1 perpendicular tile).
 * Hit: 5-35 base, halved by Protect from Melee. Bleed on hit.
 */
export class VardorvisAxe extends Mob {
  direction: AxeDirection;
  dx: number;
  dy: number;
  isAwakened: boolean;
  private spinAngle: number;

  constructor(region: Region, location: Location, options: { direction: AxeDirection; awakened?: boolean; aggro?: any }) {
    super(region, location, options);
    this.direction  = options.direction;
    this.isAwakened = options.awakened ?? false;
    const v = DIR_VECTORS[this.direction];
    this.dx = v.dx;
    this.dy = v.dy;
    this.spinAngle = Math.random() * Math.PI * 2;
  }

  mobName()              { return "Swinging Axe"; }
  get size()             { return 1; }
  get combatLevel()      { return 0; }
  get attackSpeed()      { return 99; }
  get attackRange()      { return 0; }
  get color()            { return "#cc4422"; }
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

  /** Extended hitbox tile for middle-lane awakened axes */
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

  // 3D placeholder — swap to GLTFModel later
  create3dModel(): Model {
    return BasicModel.forRenderable(this);
  }

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    // Red danger tile under axe
    context.fillStyle = "rgba(204, 74, 26, 0.35)";
    context.fillRect(this.location.x * scale + 1, this.location.y * scale + 1, scale - 2, scale - 2);

    // Extended hitbox dashed outline
    const ext = this.extendedHitboxTile;
    if (ext && ext.x >= 0 && ext.x < 9 && ext.y >= 0 && ext.y < 9) {
      context.strokeStyle = "rgba(255, 140, 60, 0.6)";
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.strokeRect(ext.x * scale + 3, ext.y * scale + 3, scale - 6, scale - 6);
      context.setLineDash([]);
    }
  }

  drawOverTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    this.spinAngle += tickPercent * 0.4;
    const cx = this.location.x * scale + scale / 2;
    const cy = this.location.y * scale + scale / 2;
    const r  = scale * 0.38;

    context.save();
    context.translate(cx, cy);
    context.rotate(this.spinAngle + Math.atan2(this.dy, this.dx));

    // Handle
    context.strokeStyle = "#553311";
    context.lineWidth = Math.max(3, scale * 0.08);
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-r * 0.9, 0);
    context.lineTo(r * 0.9, 0);
    context.stroke();

    // Left blade
    context.fillStyle = "#8a2000";
    context.strokeStyle = "#cc5533";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(-r * 0.7, 0);
    context.lineTo(-r * 1.1, -r * 0.6);
    context.lineTo(-r * 0.15, -r * 0.5);
    context.closePath();
    context.fill();
    context.stroke();

    // Right blade
    context.beginPath();
    context.moveTo(r * 0.7, 0);
    context.lineTo(r * 1.1, -r * 0.6);
    context.lineTo(r * 0.15, -r * 0.5);
    context.closePath();
    context.fill();
    context.stroke();

    // Center rivet
    context.fillStyle = "#ff8844";
    context.beginPath();
    context.arc(0, 0, r * 0.12, 0, Math.PI * 2);
    context.fill();

    context.restore();
    context.lineCap = "butt";
  }
}
