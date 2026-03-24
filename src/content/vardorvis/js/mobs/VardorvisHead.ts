"use strict";

import { Entity, Trainer } from "osrs-sdk";

export type HeadAttackType = "green" | "blue";

export interface HeadOptions {
  attackType: HeadAttackType;
  isAwakened?: boolean;
  at50Percent?: boolean;
}

/**
 * VardorvisHead
 *
 * The detached head fires a projectile that must be blocked with the correct prayer.
 * Green projectile → Protect from Missiles
 * Blue crescent wave → Protect from Magic (awakened only)
 * At 50% HP (awakened): fires BOTH simultaneously.
 *
 * Failure: drains 10 prayer points, disables overhead prayers for 3 ticks.
 * Head always attacks off-tick from the body.
 */
export class VardorvisHead extends Entity {
  attackType: HeadAttackType;
  isAwakened: boolean;
  at50Percent: boolean;
  private spawnTick = 0;
  private resolved = false;

  static readonly PRAYER_DRAIN = 10;
  static readonly PRAYER_DISABLE_TICKS = 3;

  constructor(region, location, options: HeadOptions) {
    super(region, location);
    this.attackType = options.attackType;
    this.isAwakened = options.isAwakened ?? false;
    this.at50Percent = options.at50Percent ?? false;
  }

  entityName() { return "VardorvisHead"; }
  get size() { return 1; }
  get color() { return "#441010"; }
  shouldDestroy() { return this.resolved; }
  get animationIndex() { return 0; }

  get requiredPrayers(): string[] {
    if (this.at50Percent && this.isAwakened) return ["range", "magic"];
    return this.attackType === "green" ? ["range"] : ["magic"];
  }

  tick() {
    this.spawnTick++;
    // Projectile lands after 3 ticks
    if (this.spawnTick >= 3 && !this.resolved) {
      this.resolveAttack();
    }
  }

  private resolveAttack() {
    this.resolved = true;
    const player = Trainer.player;
    if (!player) return;

    this.requiredPrayers.forEach((requiredPrayer) => {
      // Use SDK's prayerController to check if correct overhead is active
      const prayerActive = player.prayerController?.matchFeature(requiredPrayer);
      const blocked = !!prayerActive;

      if (!blocked) {
        // Drain 10 prayer points
        player.currentStats.prayer = Math.max(0, player.currentStats.prayer - VardorvisHead.PRAYER_DRAIN);
        // Disable overhead prayers for 3 ticks by deactivating all prayers briefly
        // The prayerController handles re-enable on next tick
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

  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const progress = Math.min(1, (this.spawnTick + tickPercent) / 3);
    const x = this.location.x * scale;
    const y = this.location.y * scale;

    const eyeColor = this.attackType === "blue" ? "#4488ff" : "#00ff88";
    const glowColor = this.attackType === "blue" ? "rgba(68,136,255," : "rgba(0,255,136,";

    // Glow aura
    const pulseAlpha = 0.15 + 0.1 * Math.sin(progress * Math.PI * 6);
    context.fillStyle = glowColor + pulseAlpha + ")";
    context.beginPath();
    context.arc(x + scale * 0.5, y + scale * 0.5, scale * 0.6, 0, Math.PI * 2);
    context.fill();

    // Head silhouette
    context.save();
    context.globalAlpha = Math.min(1, progress * 2);
    context.fillStyle = "#441010";
    context.beginPath();
    context.roundRect(x + scale * 0.1, y + scale * 0.15, scale * 0.8, scale * 0.65, 4);
    context.fill();
    context.strokeStyle = "#8a2010";
    context.lineWidth = 1;
    context.stroke();

    // Eyes
    const eyePulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 8);
    context.fillStyle = eyeColor;
    context.globalAlpha = Math.min(1, progress * 2) * eyePulse;
    context.beginPath();
    context.ellipse(x + scale * 0.33, y + scale * 0.43, scale * 0.1, scale * 0.07, -0.2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.ellipse(x + scale * 0.67, y + scale * 0.43, scale * 0.1, scale * 0.07, 0.2, 0, Math.PI * 2);
    context.fill();

    // Label
    context.globalAlpha = Math.min(1, progress * 2);
    context.fillStyle = eyeColor;
    context.font = `bold ${Math.max(8, Math.floor(scale * 0.16))}px monospace`;
    context.textAlign = "center";
    const label = this.at50Percent ? "BOTH!" : this.attackType === "green" ? "MISSILES" : "MAGIC";
    context.fillText(label, x + scale * 0.5, y + scale * 0.97);
    context.textAlign = "left";
    context.restore();
  }
}
