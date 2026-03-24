"use strict";

import { BasicModel, Entity, Model, Trainer } from "osrs-sdk";

export type HeadAttackType = "green" | "blue";

export interface HeadOptions {
  attackType: HeadAttackType;
  isAwakened?: boolean;
  at50Percent?: boolean;
}

/**
 * VardorvisHead
 *
 * Green projectile → Protect from Missiles
 * Blue crescent    → Protect from Magic (awakened)
 * At 50% HP awakened: fires both simultaneously.
 *
 * Failure drains 10 prayer pts and disables overheads for 3 ticks.
 * Always off-tick from the body — flickable.
 */
export class VardorvisHead extends Entity {
  attackType: HeadAttackType;
  isAwakened: boolean;
  at50Percent: boolean;
  private spawnTick = 0;
  private resolved  = false;
  private bobOffset = 0;

  static readonly PRAYER_DRAIN         = 10;
  static readonly PRAYER_DISABLE_TICKS = 3;

  constructor(region, location, options: HeadOptions) {
    super(region, location);
    this.attackType  = options.attackType;
    this.isAwakened  = options.isAwakened  ?? false;
    this.at50Percent = options.at50Percent ?? false;
  }

  entityName()    { return "VardorvisHead"; }
  get size()      { return 1; }
  get color()     { return "#441010"; }
  shouldDestroy() { return this.resolved; }
  get animationIndex() { return 0; }

  get requiredPrayers(): string[] {
    if (this.at50Percent && this.isAwakened) return ["range", "magic"];
    return this.attackType === "green" ? ["range"] : ["magic"];
  }

  tick() {
    this.spawnTick++;
    this.bobOffset = Math.sin(this.spawnTick * 0.8) * 3;
    if (this.spawnTick >= 3 && !this.resolved) {
      this.resolveAttack();
    }
  }

  private resolveAttack() {
    this.resolved = true;
    const player = Trainer.player;
    if (!player) return;

    this.requiredPrayers.forEach(req => {
      const blocked = !!player.prayerController?.matchFeature(req);
      if (!blocked) {
        player.currentStats.prayer = Math.max(0, player.currentStats.prayer - VardorvisHead.PRAYER_DRAIN);
        player.prayerController?.deactivateAll(player);
      }
    });

    this.region.removeEntity(this);
  }

  getPerceivedLocation(tickPercent: number) {
    return { x: this.location.x, y: this.location.y, z: 0 };
  }
  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }

  // 3D placeholder
  create3dModel(): Model { return BasicModel.forRenderable(this); }

  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawOverTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const progress  = Math.min(1, (this.spawnTick + tickPercent) / 3);
    const alpha     = Math.min(1, progress * 2);
    const isBlue    = this.attackType === "blue";
    const isBoth    = this.at50Percent && this.isAwakened;

    const cx = this.location.x * scale + scale / 2;
    const cy = this.location.y * scale + scale / 2 + this.bobOffset * progress;
    const r  = scale * 0.42;

    context.save();
    context.globalAlpha = alpha;

    // Outer glow
    const glowCol = isBoth ? "rgba(140,100,255," : isBlue ? "rgba(68,136,255," : "rgba(0,220,100,";
    context.fillStyle = glowCol + (0.2 + 0.1 * Math.sin(progress * Math.PI * 6)) + ")";
    context.beginPath();
    context.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
    context.fill();

    // Head shape
    context.fillStyle = "#441010";
    context.strokeStyle = "#8a2010";
    context.lineWidth = 1.5;
    context.beginPath();
    context.roundRect(cx - r * 0.9, cy - r * 0.7, r * 1.8, r * 1.4, 6);
    context.fill();
    context.stroke();

    // Eyes
    const eyePulse  = 0.6 + 0.4 * Math.sin(progress * Math.PI * 8);
    const leftCol   = isBoth ? "#aa66ff" : isBlue ? "#4488ff" : "#00ff88";
    const rightCol  = isBoth ? "#4488ff" : leftCol;

    context.globalAlpha = alpha * eyePulse;
    [[cx - r * 0.38, cy - r * 0.1, leftCol], [cx + r * 0.38, cy - r * 0.1, rightCol]].forEach(([ex, ey, col]) => {
      context.fillStyle = col as string;
      context.beginPath();
      context.ellipse(ex as number, ey as number, r * 0.13, r * 0.09, 0, 0, Math.PI * 2);
      context.fill();
    });

    // Prayer label (what to flick to)
    context.globalAlpha = alpha;
    const labelCol  = isBoth ? "#bb88ff" : isBlue ? "#88aaff" : "#44ff88";
    const labelText = isBoth ? "MISSILES + MAGIC" : isBlue ? "PROTECT MAGIC" : "PROTECT MISSILES";
    context.fillStyle = labelCol;
    context.font = `bold ${Math.max(8, Math.floor(scale * 0.18))}px monospace`;
    context.textAlign = "center";
    context.fillText(labelText, cx, cy + r * 1.1);
    context.textAlign = "left";

    context.restore();
  }
}
