"use strict";

import { BasicModel, Entity, Model, Trainer } from "osrs-sdk";

export class VardorvisStrangle extends Entity {
  private spawnTick    = 0;
  private isAwakened: boolean;
  private bossHpPct: number;
  private sporesCleared = false;
  private resolved      = false;
  onComplete?: (cleared: boolean) => void;

  get totalDuration() { return this.isAwakened ? 7 : 9; }

  get sporeCount() {
    return Math.min(8, 4 + Math.floor((1 - this.bossHpPct) * 4));
  }

  constructor(region, location, options: { awakened?: boolean; bossHpPercent?: number } = {}) {
    super(region, location);
    this.isAwakened = options.awakened ?? false;
    this.bossHpPct  = options.bossHpPercent ?? 1.0;
  }

  entityName()    { return "VardorvisStrangle"; }
  get size()      { return 1; }
  get color()     { return "#2a8844"; }
  shouldDestroy() { return this.resolved; }
  get animationIndex() { return 0; }

  clearAllSpores() { this.sporesCleared = true; }

  tick() {
    this.spawnTick++;
    if (this.spawnTick >= this.totalDuration && !this.resolved) this.resolve();
  }

  private resolve() {
    this.resolved = true;
    const player = Trainer.player;
    if (!player) return;

    if (!this.sporesCleared) {
      const dmg = Math.min(80, this.sporeCount * 9 + Math.floor(Math.random() * 15) + 5);
      player.currentStats.hitpoint = Math.max(0, player.currentStats.hitpoint - dmg);
      player.damageTaken();
    }

    this.onComplete?.(this.sporesCleared);
    this.region.removeEntity(this);
  }

  getPerceivedLocation(tickPercent: number) { return { x: this.location.x, y: this.location.y, z: 0 }; }
  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }
  create3dModel(): Model { return BasicModel.forRenderable(this); }
  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    if (this.resolved) return;
    const progress = (this.spawnTick + tickPercent) / this.totalDuration;
    const urgency  = 0.4 + 0.45 * progress;
    const x = this.location.x * scale;
    const y = this.location.y * scale;

    // Pulsing vine border
    const pulse = 0.5 + 0.4 * Math.sin((this.spawnTick + tickPercent) * Math.PI * 3);
    context.strokeStyle = `rgba(40, 180, 40, ${urgency * pulse})`;
    context.lineWidth = 2;
    context.setLineDash([5, 3]);
    context.strokeRect(x + 2, y + 2, scale - 4, scale - 4);
    context.setLineDash([]);

    // Countdown bar
    const remaining = 1 - progress;
    context.fillStyle = "#222";
    context.fillRect(x + 4, y + scale - 8, scale - 8, 4);
    context.fillStyle = progress < 0.5 ? "#44aa44" : progress < 0.75 ? "#aaaa22" : "#cc2222";
    context.fillRect(x + 4, y + scale - 8, (scale - 8) * remaining, 4);
  }
}
