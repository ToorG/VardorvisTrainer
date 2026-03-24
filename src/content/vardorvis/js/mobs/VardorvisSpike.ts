"use strict";

import { BasicModel, Entity, Model, Trainer } from "osrs-sdk";

export class VardorvisSpike extends Entity {
  private spawnTick  = 0;
  private erupted    = false;
  private readonly eruptAt  = 2;
  private readonly removeAt = 5;
  private vardorvisRef: any;

  constructor(region, location, options: { vardorvis?: any } = {}) {
    super(region, location);
    this.vardorvisRef = options.vardorvis;
  }

  entityName()    { return "VardorvisSpike"; }
  get size()      { return 1; }
  get color()     { return "#7733aa"; }
  shouldDestroy() { return this.spawnTick >= this.removeAt; }
  get animationIndex() { return 0; }

  tick() {
    this.spawnTick++;
    if (this.spawnTick >= this.eruptAt && !this.erupted) this.erupt();
  }

  private erupt() {
    this.erupted = true;
    const player = Trainer.player;
    if (!player) return;
    if (player.location.x === this.location.x && player.location.y === this.location.y) {
      const dmg = Math.floor(Math.random() * 25) + 1;
      player.currentStats.hitpoint = Math.max(0, player.currentStats.hitpoint - dmg);
      player.damageTaken();
      if (this.vardorvisRef) {
        this.vardorvisRef.currentStats.hitpoint = Math.min(
          this.vardorvisRef.stats.hitpoint,
          this.vardorvisRef.currentStats.hitpoint + Math.floor(dmg / 2),
        );
      }
    }
  }

  getPerceivedLocation(tickPercent: number) { return { x: this.location.x, y: this.location.y, z: 0 }; }
  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }
  create3dModel(): Model { return BasicModel.forRenderable(this); }
  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const x = this.location.x * scale;
    const y = this.location.y * scale;

    if (!this.erupted) {
      // Warning crack
      const flicker = 0.4 + 0.35 * Math.sin((this.spawnTick + tickPercent) * Math.PI * 6);
      context.strokeStyle = `rgba(140, 60, 200, ${flicker})`;
      context.lineWidth = 1.5;
      context.setLineDash([4, 4]);
      context.strokeRect(x + 5, y + 5, scale - 10, scale - 10);
      context.setLineDash([]);
      // X marker
      context.strokeStyle = `rgba(180, 80, 220, ${flicker * 0.7})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + 10, y + 10); context.lineTo(x + scale - 10, y + scale - 10);
      context.moveTo(x + scale - 10, y + 10); context.lineTo(x + 10, y + scale - 10);
      context.stroke();
    } else {
      // Erupted spike
      const age    = this.spawnTick - this.eruptAt + tickPercent;
      const life   = this.removeAt  - this.eruptAt;
      const fadeOut = Math.max(0, 1 - age / life);
      const cx = x + scale / 2;
      const cy = y + scale / 2;

      context.save();
      context.globalAlpha = fadeOut;

      // Shadow
      context.fillStyle = "rgba(80, 30, 120, 0.4)";
      context.beginPath();
      context.ellipse(cx, cy + scale * 0.25, scale * 0.38, scale * 0.1, 0, 0, Math.PI * 2);
      context.fill();

      // Main spike
      context.fillStyle = "#7733aa";
      context.strokeStyle = "#aa55dd";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cx, y + scale * 0.05);
      context.lineTo(cx - scale * 0.2, y + scale * 0.75);
      context.lineTo(cx, y + scale * 0.6);
      context.lineTo(cx + scale * 0.2, y + scale * 0.75);
      context.closePath();
      context.fill();
      context.stroke();

      // Side spikes
      context.fillStyle = "#5522aa";
      [-0.28, 0.28].forEach(ox => {
        context.beginPath();
        context.moveTo(cx + ox * scale, y + scale * 0.25);
        context.lineTo(cx + (ox - 0.13) * scale, y + scale * 0.65);
        context.lineTo(cx + (ox + 0.13) * scale, y + scale * 0.65);
        context.closePath();
        context.fill();
      });

      context.restore();
    }
  }
}
