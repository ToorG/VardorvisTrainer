"use strict";

import { BasicModel, DelayedAction, Entity, Model, Trainer } from "osrs-sdk";

export type HeadAttackType = "green" | "blue";

export interface HeadOptions {
  attackType: HeadAttackType;
  isAwakened?: boolean;
  at50Percent?: boolean;
}

/**
 * VardorvisHead
 *
 * Fires off-tick from the body (flickable).
 *
 * Green → Protect from Missiles
 * Blue  → Protect from Magic (awakened only)
 * At 50% HP (awakened): fires BOTH simultaneously, one each.
 *
 * On fail:
 *  - Drain 10 prayer points
 *  - Disable overhead prayers for 3 ticks (tracked on player via _vardorvisPrayerDisabledTicks)
 *  - Vardorvis's NEXT auto-attack treats player as having no protection prayer
 *    (VardorvisMeleeWeapon checks this flag and forces the hit through)
 */
export class VardorvisHead extends Entity {
  attackType: HeadAttackType;
  isAwakened: boolean;
  at50Percent: boolean;
  private spawnTick = 0;
  private resolved  = false;

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
    // Projectile lands after 3 ticks (off-tick from body)
    if (this.spawnTick >= 3 && !this.resolved) {
      this.resolveAttack();
    }
  }

  private resolveAttack() {
    this.resolved = true;
    const player  = Trainer.player as any;
    if (!player) return;

    this.requiredPrayers.forEach(req => {
      const blocked = !!player.prayerController?.matchFeature(req);
      if (!blocked) {
        // 1. Drain 10 prayer points
        player.currentStats.prayer = Math.max(0, player.currentStats.prayer - VardorvisHead.PRAYER_DRAIN);

        // 2. Disable overheads for 3 ticks
        //    We track this with a custom property on the player.
        //    VardorvisMeleeWeapon reads this to force the next hit through.
        player._vardorvisPrayerDisabledTicks = VardorvisHead.PRAYER_DISABLE_TICKS;

        // 3. Deactivate all overhead prayers visually
        player.prayerController?.deactivateAll(player);

        // 4. Re-enable after 3 ticks via DelayedAction
        //    (player can re-activate themselves after this point)
        DelayedAction.registerDelayedAction(
          new DelayedAction(() => {
            const p = Trainer.player as any;
            if (p && p._vardorvisPrayerDisabledTicks > 0) {
              p._vardorvisPrayerDisabledTicks = 0;
            }
          }, VardorvisHead.PRAYER_DISABLE_TICKS),
        );
      }
    });

    this.region.removeEntity(this);
  }

  getPerceivedLocation(tickPercent: number) { return { x: this.location.x, y: this.location.y, z: 0 }; }
  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }
  create3dModel(): Model { return BasicModel.forRenderable(this); }
  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawOverTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const progress  = Math.min(1, (this.spawnTick + tickPercent) / 3);
    const alpha     = Math.min(1, progress * 2.5);
    const isBlue    = this.attackType === "blue";
    const isBoth    = this.at50Percent && this.isAwakened;

    const cx = this.location.x * scale + scale / 2;
    const cy = this.location.y * scale + scale / 2
             - Math.sin(this.spawnTick * 0.9) * 5 * progress;  // bob
    const r  = scale * 0.44;

    context.save();
    context.globalAlpha = alpha;

    // Glow
    const glowColor = isBoth ? "rgba(160,100,255," : isBlue ? "rgba(68,136,255," : "rgba(0,220,100,";
    context.fillStyle = glowColor + (0.18 + 0.1 * Math.sin(progress * Math.PI * 8)) + ")";
    context.beginPath();
    context.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    context.fill();

    // Head
    context.fillStyle   = "#441010";
    context.strokeStyle = "#8a2010";
    context.lineWidth   = 1.5;
    context.beginPath();
    context.roundRect(cx - r * 0.88, cy - r * 0.68, r * 1.76, r * 1.32, 6);
    context.fill();
    context.stroke();

    // Eyes
    const eyePulse  = 0.55 + 0.45 * Math.sin(progress * Math.PI * 10);
    const leftColor  = isBoth ? "#bb77ff" : isBlue ? "#4499ff" : "#00ff99";
    const rightColor = isBoth ? "#4499ff" : leftColor;

    context.globalAlpha = alpha * eyePulse;
    [[cx - r * 0.35, cy - r * 0.1, leftColor], [cx + r * 0.35, cy - r * 0.1, rightColor]].forEach(([ex, ey, col]) => {
      context.fillStyle = col as string;
      context.beginPath();
      context.ellipse(ex as number, ey as number, r * 0.13, r * 0.09, 0, 0, Math.PI * 2);
      context.fill();
    });

    // Prayer label — shown clearly so player knows what to flick to
    context.globalAlpha = alpha;
    const labelColor = isBoth ? "#cc99ff" : isBlue ? "#99bbff" : "#66ffbb";
    const labelText  = isBoth
      ? "MISSILES + MAGIC"
      : isBlue
      ? "PROTECT MAGIC"
      : "PROTECT MISSILES";

    context.fillStyle = labelColor;
    context.font      = `bold ${Math.max(8, Math.floor(scale * 0.18))}px monospace`;
    context.textAlign = "center";
    context.fillText(labelText, cx, cy + r * 1.15);
    context.textAlign = "left";

    context.restore();
  }
}
