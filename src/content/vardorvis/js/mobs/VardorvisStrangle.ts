"use strict";

import { EmptyModel, Entity, Model, Trainer } from "osrs-sdk";

/**
 * VardorvisStrangle
 *
 * Vardorvis binds the player — they CANNOT MOVE until all spores are clicked
 * or the timer expires.
 *
 * - 4-8 spores depending on boss HP (more spores at lower HP)
 * - Window: 9 ticks normal / 7 ticks awakened
 * - Failure: up to 80 typeless damage based on spores missed
 * - The region tracks the active strangle and locks player movement
 */
export class VardorvisStrangle extends Entity {
  private spawnTick     = 0;
  private isAwakened: boolean;
  private bossHpPct: number;
  sporesCleared         = false;
  private resolved      = false;
  onComplete?: (cleared: boolean) => void;

  get totalDuration(): number {
    return this.isAwakened ? 7 : 9;
  }

  get sporeCount(): number {
    // 4 spores at full HP, up to 8 at very low HP
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

  /** Called by the region's spore UI when the player clicks the last spore */
  clearAllSpores() {
    this.sporesCleared = true;
  }

  /** Remaining ticks before the strangle resolves */
  get ticksRemaining(): number {
    return Math.max(0, this.totalDuration - this.spawnTick);
  }

  tick() {
    this.spawnTick++;

    // Tick down prayer disable counter on player each tick
    const player = Trainer.player as any;
    if (player && player._vardorvisPrayerDisabledTicks > 0) {
      player._vardorvisPrayerDisabledTicks--;
    }

    if (this.spawnTick >= this.totalDuration && !this.resolved) {
      this.resolve();
    }
  }

  private resolve() {
    this.resolved = true;
    const player = Trainer.player;
    if (!player) return;

    if (!this.sporesCleared) {
      // Damage scales with number of spores missed
      const dmg = Math.min(80, this.sporeCount * 9 + Math.floor(Math.random() * 16) + 5);
      player.currentStats.hitpoint = Math.max(0, player.currentStats.hitpoint - dmg);
      player.damageTaken();
    }

    this.onComplete?.(this.sporesCleared);
    this.region.removeEntity(this);
  }

  getPerceivedLocation(tickPercent: number) { return { x: this.location.x, y: this.location.y, z: 0 }; }
  getPerceivedRotation(tickPercent?: number) { return 0; }
  getTrueLocation() { return this.location; }
  create3dModel(): Model { return new EmptyModel(); }
  draw(tickPercent: number, context: OffscreenCanvasRenderingContext2D) {}

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    if (this.resolved) return;
    const progress = (this.spawnTick + tickPercent) / this.totalDuration;
    const urgency  = 0.4 + 0.45 * progress;
    const x = this.location.x * scale;
    const y = this.location.y * scale;

    // Pulsing vine border — gets more urgent as timer runs out
    const pulse = 0.5 + 0.45 * Math.sin((this.spawnTick + tickPercent) * Math.PI * 3.5);
    context.strokeStyle = `rgba(40, 180, 40, ${urgency * pulse})`;
    context.lineWidth = 2;
    context.setLineDash([5, 3]);
    context.strokeRect(x + 2, y + 2, scale - 4, scale - 4);
    context.setLineDash([]);

    // Countdown bar — green → yellow → red
    const remaining = 1 - progress;
    context.fillStyle = "#111";
    context.fillRect(x + 3, y + scale - 7, scale - 6, 4);
    context.fillStyle = progress < 0.5 ? "#44bb44"
                      : progress < 0.75 ? "#bbbb22"
                      : "#cc2222";
    context.fillRect(x + 3, y + scale - 7, (scale - 6) * remaining, 4);
  }
}
