"use strict";

import { Entity, Trainer } from "osrs-sdk";

/**
 * VardorvisStrangle
 *
 * Vardorvis strikes his arm into the ground and entangles the player.
 * Spores appear — click them all within the time limit.
 * Failure deals heavy typeless damage.
 * In Awakened: shorter window, more spores at lower HP.
 */
export class VardorvisStrangle extends Entity {
  private spawnTick = 0;
  private isAwakened: boolean;
  private bossHpPercent: number;
  private sporesCleared = false;
  private resolved = false;
  onComplete?: (cleared: boolean) => void;

  get totalDuration(): number {
    return this.isAwakened ? 7 : 9;
  }

  get sporeCount(): number {
    const base = 4;
    const extra = Math.floor((1 - this.bossHpPercent) * 4);
    return Math.min(8, base + extra);
  }

  constructor(region, location, options: { awakened?: boolean; bossHpPercent?: number } = {}) {
    super(region, location);
    this.isAwakened = options.awakened ?? false;
    this.bossHpPercent = options.bossHpPercent ?? 1.0;
  }

  entityName() { return "VardorvisStrangle"; }
  get size() { return 1; }
  get color() { return "#2a8844"; }
  shouldDestroy() { return this.resolved; }
  get animationIndex() { return 0; }

  clearAllSpores() {
    this.sporesCleared = true;
  }

  tick() {
    this.spawnTick++;
    if (this.spawnTick >= this.totalDuration && !this.resolved) {
      this.resolve();
    }
  }

  private resolve() {
    this.resolved = true;
    const player = Trainer.player;
    if (!player) return;

    if (!this.sporesCleared) {
      const missed = this.sporeCount;
      const damage = Math.min(80, missed * 8 + Math.floor(Math.random() * 15) + 5);
      player.currentStats.hitpoint = Math.max(0, player.currentStats.hitpoint - damage);
      player.damageTaken();
    }

    this.onComplete?.(this.sporesCleared);
    this.region.removeEntity(this);
  }

  getPerceivedLocation(tickPercent: number) {
    return { x: this.location.x, y: this.location.y, z: 0 };
  }
  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }

  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    if (this.resolved) return;
    const progress = this.spawnTick / this.totalDuration;
    const urgency = 0.4 + 0.4 * progress;
    const x = this.location.x * scale;
    const y = this.location.y * scale;

    context.strokeStyle = `rgba(40, 180, 40, ${urgency})`;
    context.lineWidth = 2;
    context.setLineDash([5, 3]);
    context.strokeRect(x + 2, y + 2, scale - 4, scale - 4);
    context.setLineDash([]);

    const barWidth = (scale - 8) * (1 - progress);
    context.fillStyle = progress < 0.6 ? "#44aa44" : progress < 0.8 ? "#aaaa22" : "#aa2222";
    context.fillRect(x + 4, y + scale - 8, barWidth, 4);
  }
}
