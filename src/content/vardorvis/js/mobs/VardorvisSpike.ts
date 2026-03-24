"use strict";

import { Entity, Trainer } from "osrs-sdk";

/**
 * VardorvisDartingSpike
 *
 * Vardorvis darts around the player 1-3 times, leaving cracks in the ground.
 * After ~2 ticks the cracks erupt into spikes dealing up to 25 damage and
 * HEALING Vardorvis for 50% of the damage dealt.
 *
 * Standing near arena edges (by tendrils) minimises cracks spawned.
 * The first crack ALWAYS spawns under the player unless they stand near the edge.
 */
export class VardorvisSpike extends Entity {
  private spawnTick = 0;
  private erupted = false;
  private readonly eruptTick = 2;
  private readonly removeTick = 5;
  private vardorvisRef: any;

  readonly MAX_DAMAGE = 25;

  constructor(region, location, options: { vardorvis?: any } = {}) {
    super(region, location);
    this.vardorvisRef = options.vardorvis;
  }

  entityName() {
    return "VardorvisSpike";
  }

  get size() { return 1; }
  get color() { return "#7733aa"; }
  shouldDestroy() { return this.spawnTick >= this.removeTick; }
  get animationIndex() { return 0; }

  tick() {
    this.spawnTick++;
    if (this.spawnTick >= this.eruptTick && !this.erupted) {
      this.erupt();
    }
  }

  private erupt() {
    this.erupted = true;
    const player = Trainer.player;
    if (!player) return;

    if (player.location.x === this.location.x && player.location.y === this.location.y) {
      const damage = Math.floor(Math.random() * this.MAX_DAMAGE) + 1;
      // Directly apply damage via currentStats (same pattern as InfernoPillar)
      player.currentStats.hitpoint = Math.max(0, player.currentStats.hitpoint - damage);
      player.damageTaken();

      // Vardorvis heals for 50% of damage dealt
      if (this.vardorvisRef) {
        const healAmount = Math.floor(damage / 2);
        this.vardorvisRef.currentStats.hitpoint = Math.min(
          this.vardorvisRef.stats.hitpoint,
          this.vardorvisRef.currentStats.hitpoint + healAmount,
        );
      }
    }
  }

  getPerceivedLocation(tickPercent: number) {
    return { x: this.location.x, y: this.location.y, z: 0 };
  }

  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }

  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {
    // Handled by drawUnderTile in the region's background draw
  }

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const progress = this.spawnTick / this.removeTick + tickPercent / this.removeTick;

    if (!this.erupted) {
      const crackAlpha = 0.4 + 0.3 * Math.sin(progress * Math.PI * 8);
      context.strokeStyle = `rgba(140, 60, 200, ${crackAlpha})`;
      context.lineWidth = 1.5;
      context.setLineDash([4, 4]);
      context.strokeRect(
        this.location.x * scale + 5,
        this.location.y * scale + 5,
        scale - 10, scale - 10
      );
      context.setLineDash([]);

      context.strokeStyle = `rgba(180, 80, 220, ${crackAlpha * 0.7})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(this.location.x * scale + 10, this.location.y * scale + 10);
      context.lineTo(this.location.x * scale + scale - 10, this.location.y * scale + scale - 10);
      context.moveTo(this.location.x * scale + scale - 10, this.location.y * scale + 10);
      context.lineTo(this.location.x * scale + 10, this.location.y * scale + scale - 10);
      context.stroke();
    } else {
      const eruptProgress = Math.min(1, (this.spawnTick - this.eruptTick) / (this.removeTick - this.eruptTick));
      const fadeOut = 1 - eruptProgress;
      const x = this.location.x * scale;
      const y = this.location.y * scale;

      context.save();
      context.globalAlpha = fadeOut;

      context.fillStyle = "rgba(120, 50, 180, 0.3)";
      context.beginPath();
      context.ellipse(x + scale * 0.5, y + scale * 0.8, scale * 0.4, scale * 0.12, 0, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#7733aa";
      context.beginPath();
      context.moveTo(x + scale * 0.5, y + scale * 0.08);
      context.lineTo(x + scale * 0.3, y + scale * 0.75);
      context.lineTo(x + scale * 0.5, y + scale * 0.6);
      context.lineTo(x + scale * 0.7, y + scale * 0.75);
      context.closePath();
      context.fill();
      context.strokeStyle = "#aa55dd";
      context.lineWidth = 1;
      context.stroke();

      context.restore();
    }
  }
}
