"use strict";

import {
  Region,
  Player,
  BrowserUtils,
  InvisibleMovementBlocker,
  TileMarker,
  Trainer,
  Viewport,
} from "osrs-sdk";

import { Vardorvis, VARDORVIS_NORMAL_HP, VARDORVIS_AWAKENED_HP } from "./mobs/Vardorvis";
import { VardorvisAxe, AxeDirection } from "./mobs/VardorvisAxe";
import { VardorvisHead } from "./mobs/VardorvisHead";
import { VardorvisSpike } from "./mobs/VardorvisSpike";
import { VardorvisStrangle } from "./mobs/VardorvisStrangle";
import { VardorvisSettings } from "./VardorvisSettings";
import { VardorvisLoadout } from "./VardorvisLoadout";

import SidebarContent from "../sidebar.html";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Arena is 9x9 tiles. Vardorvis occupies center 3x3 (tiles 3-5, 3-5 within arena).
// We offset into the world coordinate space.
const ARENA_OFFSET_X = 5;
const ARENA_OFFSET_Y = 5;
const ARENA_SIZE = 9;

// Boss sits in center 3x3
const BOSS_TILE_X = ARENA_OFFSET_X + 3;
const BOSS_TILE_Y = ARENA_OFFSET_Y + 3;

// Player starts at bottom-center of arena
const PLAYER_START_X = ARENA_OFFSET_X + 4;
const PLAYER_START_Y = ARENA_OFFSET_Y + 6;

// Axe formation intervals (ticks)
const AXE_INTERVAL_NORMAL = 12;
const AXE_INTERVAL_AWAKENED = 8;
const AXE_INTERVAL_ENRAGE = 5;

// Head attack intervals
const HEAD_INTERVAL_NORMAL = 16;
const HEAD_INTERVAL_AWAKENED = 11;
const HEAD_INTERVAL_ENRAGE = 7;

// Spike intervals
const SPIKE_INTERVAL_NORMAL = 15;
const SPIKE_INTERVAL_ENRAGE = 9;

// Strangle intervals
const STRANGLE_INTERVAL_NORMAL = 32;
const STRANGLE_INTERVAL_ENRAGE = 20;

// HP thresholds
const HEAD_APPEARS_HP = 570;        // Normal — 570/700
const STRANGLE_THRESHOLD_HP = 0.8;  // Below 80% HP
const ENRAGE_THRESHOLD_HP = 0.33;   // Below 33% HP (231 normal / 462 awakened)

type AxeDirEntry = {
  dir: AxeDirection;
  startX: () => number;
  startY: () => number;
  dx: number;
  dy: number;
};

const ALL_AXE_DIRECTIONS: AxeDirEntry[] = [
  { dir: "N",  dx: 0,  dy: 1,  startX: () => randInt(1,7), startY: () => 0 },
  { dir: "S",  dx: 0,  dy: -1, startX: () => randInt(1,7), startY: () => 8 },
  { dir: "E",  dx: 1,  dy: 0,  startX: () => 0,            startY: () => randInt(1,7) },
  { dir: "W",  dx: -1, dy: 0,  startX: () => 8,            startY: () => randInt(1,7) },
  { dir: "NE", dx: 1,  dy: 1,  startX: () => randInt(0,3), startY: () => 0 },
  { dir: "NW", dx: -1, dy: 1,  startX: () => randInt(5,8), startY: () => 0 },
  { dir: "SE", dx: 1,  dy: -1, startX: () => randInt(0,3), startY: () => 8 },
  { dir: "SW", dx: -1, dy: -1, startX: () => randInt(5,8), startY: () => 8 },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class VardorvisRegion extends Region {
  private vardorvis: Vardorvis | null = null;
  private activeStrangle: VardorvisStrangle | null = null;

  // Tick counters for mechanic scheduling
  private tickCount = 0;
  private lastAxeTick = -99;
  private lastHeadTick = -99;
  private lastSpikeTick = -99;
  private lastStrTick = -99;

  getName() {
    return VardorvisSettings.awakened ? "Awakened Vardorvis" : "Vardorvis";
  }

  // Arena is 9x9 + some padding
  get width(): number {
    return ARENA_OFFSET_X * 2 + ARENA_SIZE;
  }

  get height(): number {
    return ARENA_OFFSET_Y * 2 + ARENA_SIZE;
  }

  initialiseRegion() {
    VardorvisSettings.readFromStorage();

    // Create player with Soulreaper Axe + Torva loadout
    const loadout = new VardorvisLoadout();
    const player = new Player(this, { x: PLAYER_START_X, y: PLAYER_START_Y }, loadout.getLoadout());
    loadout.setStats(player);
    this.addPlayer(player);

    // Add arena boundary movement blockers (tendril walls — edge tiles)
    this.addArenaBoundaries();

    // Spawn Vardorvis
    this.spawnVardorvis();

    // Wire up sidebar UI
    this.wireSidebarUI(player);

    player.perceivedLocation = player.location;
    player.destinationLocation = player.location;

    return { player };
  }

  private addArenaBoundaries() {
    // Edge tiles of the 9x9 arena are impassable tendril walls
    for (let x = 0; x < ARENA_SIZE; x++) {
      for (let y = 0; y < ARENA_SIZE; y++) {
        const isEdge = x === 0 || x === ARENA_SIZE - 1 || y === 0 || y === ARENA_SIZE - 1;
        if (isEdge) {
          this.addEntity(
            new InvisibleMovementBlocker(this, {
              x: ARENA_OFFSET_X + x,
              y: ARENA_OFFSET_Y + y,
            }),
          );
        }
      }
    }
  }

  private spawnVardorvis() {
    this.vardorvis = new Vardorvis(this, { x: BOSS_TILE_X, y: BOSS_TILE_Y }, {
      aggro: Trainer.player,
      awakened: VardorvisSettings.awakened,
    });
    this.addMob(this.vardorvis);
  }

  getSidebarContent() {
    return SidebarContent;
  }

  // ============================================================
  // TICK LOGIC
  // ============================================================

  postTick() {
    super.postTick();
    this.tickCount++;

    if (!this.vardorvis || this.vardorvis.isDying()) return;

    // Scale boss stats with HP
    this.vardorvis.scaleStats();

    // --- Tick down prayer-disabled counter on player ---
    const player = Trainer.player as any;
    if (player && player._vardorvisPrayerDisabledTicks > 0) {
      player._vardorvisPrayerDisabledTicks--;
    }

    // --- Check axe collisions this tick ---
    const activeAxes = this.mobs.filter(m => m.mobName() === "Swinging Axe") as unknown as VardorvisAxe[];
    activeAxes.forEach(ax => ax.checkHitPlayer());

    // --- Lock player movement during strangle ---
    if (this.activeStrangle && Trainer.player) {
      // Force player to stay on current tile — clear any pending movement
      const p = Trainer.player;
      p.destinationLocation = { x: p.location.x, y: p.location.y };
      p.path = [];
    }

    const maxHp = VardorvisSettings.awakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;
    const currentHp = this.vardorvis.currentStats.hitpoint;
    const hpPct = currentHp / maxHp;
    const enrage = VardorvisSettings.forceEnrage || hpPct <= ENRAGE_THRESHOLD_HP;

    // --- Axe cycles ---
    const axeInterval = enrage
      ? AXE_INTERVAL_ENRAGE
      : VardorvisSettings.awakened
      ? AXE_INTERVAL_AWAKENED
      : AXE_INTERVAL_NORMAL;

    if (this.tickCount - this.lastAxeTick >= axeInterval) {
      this.spawnAxes(hpPct, enrage);
      this.lastAxeTick = this.tickCount;
    }

    // --- Head attacks (below 81% HP) ---
    const headInterval = enrage
      ? HEAD_INTERVAL_ENRAGE
      : VardorvisSettings.awakened
      ? HEAD_INTERVAL_AWAKENED
      : HEAD_INTERVAL_NORMAL;

    const headThresholdPct = HEAD_APPEARS_HP / VARDORVIS_NORMAL_HP;
    if (
      VardorvisSettings.headEnabled &&
      hpPct <= headThresholdPct &&
      this.tickCount - this.lastHeadTick >= headInterval
    ) {
      this.spawnHead(hpPct);
      this.lastHeadTick = this.tickCount;
    }

    // --- Darting spikes ---
    const spikeInterval = enrage ? SPIKE_INTERVAL_ENRAGE : SPIKE_INTERVAL_NORMAL;
    if (
      VardorvisSettings.spikesEnabled &&
      this.tickCount - this.lastSpikeTick >= spikeInterval
    ) {
      this.spawnSpikes();
      this.lastSpikeTick = this.tickCount;
    }

    // --- Strangle (below 80% HP) ---
    const strangleInterval = enrage ? STRANGLE_INTERVAL_ENRAGE : STRANGLE_INTERVAL_NORMAL;
    if (
      VardorvisSettings.strangleEnabled &&
      !this.activeStrangle &&
      hpPct <= STRANGLE_THRESHOLD_HP &&
      this.tickCount - this.lastStrTick >= strangleInterval
    ) {
      this.spawnStrangle(hpPct);
      this.lastStrTick = this.tickCount;
    }
  }

  // ============================================================
  // MECHANIC SPAWNERS
  // ============================================================

  private spawnAxes(hpPct: number, enrage: boolean) {
    // Number of axes:
    // Normal: 1-2 (enrage: 3)
    // Awakened: 3 until 50% HP, then 4
    let numAxes: number;
    if (VardorvisSettings.awakened) {
      numAxes = hpPct > 0.5 ? 3 : 4;
    } else {
      numAxes = enrage ? 3 : randInt(1, 2);
    }

    const directions = shuffle(ALL_AXE_DIRECTIONS).slice(0, numAxes);

    directions.forEach((d) => {
      const sx = d.startX() + ARENA_OFFSET_X;
      const sy = d.startY() + ARENA_OFFSET_Y;
      const axe = new VardorvisAxe(
        this,
        { x: sx, y: sy },
        {
          direction: d.dir,
          awakened: VardorvisSettings.awakened,
        },
      );
      this.addMob(axe);
    });
  }

  private spawnHead(hpPct: number) {
    const player = Trainer.player;
    if (!player) return;

    // At 50% HP in awakened: fire both green + blue simultaneously
    const at50Pct = VardorvisSettings.awakened && hpPct <= 0.5;

    if (at50Pct) {
      // Spawn one head entity that handles both
      const head = new VardorvisHead(this, { x: BOSS_TILE_X - 2, y: BOSS_TILE_Y }, {
        attackType: "green",
        isAwakened: true,
        at50Percent: true,
      });
      this.addEntity(head);
    } else {
      // Random choice: green (normal) or blue (awakened + random)
      const useBlue = VardorvisSettings.awakened && Math.random() < 0.35;
      const head = new VardorvisHead(this, { x: BOSS_TILE_X - 2, y: BOSS_TILE_Y }, {
        attackType: useBlue ? "blue" : "green",
        isAwakened: VardorvisSettings.awakened,
        at50Percent: false,
      });
      this.addEntity(head);
    }
  }

  private spawnSpikes() {
    const player = Trainer.player;
    if (!player) return;

    const count = this.vardorvis?.enrageActive ? randInt(2, 3) : randInt(1, 2);
    for (let i = 0; i < count; i++) {
      const ox = randInt(-2, 2);
      const oy = randInt(-2, 2);
      const tx = Math.max(ARENA_OFFSET_X + 1, Math.min(ARENA_OFFSET_X + 7, player.location.x + ox));
      const ty = Math.max(ARENA_OFFSET_Y + 1, Math.min(ARENA_OFFSET_Y + 7, player.location.y + oy));

      // Don't spawn in boss area (3x3 center)
      const isBossArea =
        tx >= BOSS_TILE_X && tx <= BOSS_TILE_X + 2 &&
        ty >= BOSS_TILE_Y && ty <= BOSS_TILE_Y + 2;
      if (isBossArea) continue;

      const spike = new VardorvisSpike(this, { x: tx, y: ty }, { vardorvis: this.vardorvis });
      this.addEntity(spike);
    }
  }

  private spawnStrangle(hpPct: number) {
    const player = Trainer.player;
    if (!player) return;

    const strangle = new VardorvisStrangle(
      this,
      { x: player.location.x, y: player.location.y },
      {
        awakened: VardorvisSettings.awakened,
        bossHpPercent: hpPct,
      },
    );

    strangle.onComplete = (cleared) => {
      this.activeStrangle = null;
    };

    this.activeStrangle = strangle;
    this.addEntity(strangle);
  }

  // ============================================================
  // FLOOR DRAWING
  // ============================================================

  drawWorldBackground(context: OffscreenCanvasRenderingContext2D, scale: number) {
    // Dark stone floor background
    context.fillStyle = "#0a0a0c";
    context.fillRect(0, 0, this.width * scale, this.height * scale);

    // Arena floor (9x9) — dark purple/stone like the Stranglewood
    for (let ax = 0; ax < ARENA_SIZE; ax++) {
      for (let ay = 0; ay < ARENA_SIZE; ay++) {
        const wx = (ARENA_OFFSET_X + ax) * scale;
        const wy = (ARENA_OFFSET_Y + ay) * scale;

        const isEdge = ax === 0 || ax === ARENA_SIZE - 1 || ay === 0 || ay === ARENA_SIZE - 1;
        const isCenter = ax >= 3 && ax <= 5 && ay >= 3 && ay <= 5;

        if (isEdge) {
          // Tendril wall tiles — dark green
          context.fillStyle = "#0a120a";
          context.fillRect(wx, wy, scale, scale);
          // Vine texture hint
          context.strokeStyle = "rgba(30, 80, 30, 0.4)";
          context.lineWidth = 0.5;
          context.strokeRect(wx + 1, wy + 1, scale - 2, scale - 2);
        } else if (isCenter) {
          // Boss pedestal — darkest
          context.fillStyle = "#1a0808";
          context.fillRect(wx, wy, scale, scale);
        } else {
          // Playable floor — dark stone
          context.fillStyle = "#141418";
          context.fillRect(wx, wy, scale, scale);
        }

        // Grid lines
        context.strokeStyle = "rgba(255,255,255,0.04)";
        context.lineWidth = 0.5;
        context.strokeRect(wx, wy, scale, scale);
      }
    }

    // Boss area border
    const bx = BOSS_TILE_X * scale;
    const by = BOSS_TILE_Y * scale;
    const enrageActive = this.vardorvis?.enrageActive;
    context.strokeStyle = enrageActive ? "#ff4422" : "#8a2010";
    context.lineWidth = enrageActive ? 2 : 1;
    if (enrageActive) context.setLineDash([6, 3]);
    context.strokeRect(bx + 0.5, by + 0.5, 3 * scale - 1, 3 * scale - 1);
    context.setLineDash([]);

    // Safe tile highlights
    if (VardorvisSettings.showSafeTiles) {
      this.drawSafeTiles(context, scale);
    }
  }

  private drawSafeTiles(context: OffscreenCanvasRenderingContext2D, scale: number) {
    const player = Trainer.player;
    if (!player) return;

    // Get all active axe entities
    const activeAxes = this.mobs.filter(m => m.mobName() === "Swinging Axe") as unknown as VardorvisAxe[];

    for (let ax = 1; ax < ARENA_SIZE - 1; ax++) {
      for (let ay = 1; ay < ARENA_SIZE - 1; ay++) {
        const wx = (ARENA_OFFSET_X + ax) * scale;
        const wy = (ARENA_OFFSET_Y + ay) * scale;

        // Skip boss area
        if (ax >= 3 && ax <= 5 && ay >= 3 && ay <= 5) continue;

        const isSafe = !this.isTileDangerous(ARENA_OFFSET_X + ax, ARENA_OFFSET_Y + ay, activeAxes);
        if (isSafe) {
          context.fillStyle = "rgba(44, 180, 88, 0.18)";
          context.fillRect(wx + 1, wy + 1, scale - 2, scale - 2);
        } else if (VardorvisSettings.showAxePaths) {
          context.fillStyle = "rgba(204, 74, 26, 0.15)";
          context.fillRect(wx + 1, wy + 1, scale - 2, scale - 2);
        }
      }
    }
  }

  private isTileDangerous(tx: number, ty: number, axes: VardorvisAxe[]): boolean {
    for (const ax of axes) {
      if (Math.round(ax.location.x) === tx && Math.round(ax.location.y) === ty) return true;
      // Predict next tile
      if (Math.round(ax.location.x + ax.dx) === tx && Math.round(ax.location.y + ax.dy) === ty) return true;
    }
    return false;
  }

  // ============================================================
  // SIDEBAR WIRING
  // ============================================================

  private wireSidebarUI(player: Player) {
    // Mode toggle
    const awakeBtn = document.getElementById("vard-awakened-toggle") as HTMLInputElement;
    if (awakeBtn) {
      awakeBtn.checked = VardorvisSettings.awakened;
      awakeBtn.addEventListener("change", () => {
        VardorvisSettings.awakened = awakeBtn.checked;
        VardorvisSettings.persistToStorage();
        window.location.reload();
      });
    }

    // Safe tile toggle
    const safeTilesBtn = document.getElementById("vard-safe-tiles") as HTMLInputElement;
    if (safeTilesBtn) {
      safeTilesBtn.checked = VardorvisSettings.showSafeTiles;
      safeTilesBtn.addEventListener("change", () => {
        VardorvisSettings.showSafeTiles = safeTilesBtn.checked;
        VardorvisSettings.persistToStorage();
      });
    }

    // Force enrage toggle
    const enrageBtn = document.getElementById("vard-force-enrage") as HTMLInputElement;
    if (enrageBtn) {
      enrageBtn.checked = VardorvisSettings.forceEnrage;
      enrageBtn.addEventListener("change", () => {
        VardorvisSettings.forceEnrage = enrageBtn.checked;
        VardorvisSettings.persistToStorage();
      });
    }

    // Mechanic toggles
    const mechanicToggles: Array<{ id: string; key: keyof typeof VardorvisSettings }> = [
      { id: "vard-strangle",   key: "strangleEnabled" },
      { id: "vard-spikes",     key: "spikesEnabled" },
      { id: "vard-head",       key: "headEnabled" },
      { id: "vard-auto-atk",   key: "autoAttackEnabled" },
    ];

    mechanicToggles.forEach(({ id, key }) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) {
        el.checked = VardorvisSettings[key] as boolean;
        el.addEventListener("change", () => {
          (VardorvisSettings as any)[key] = el.checked;
          VardorvisSettings.persistToStorage();
        });
      }
    });

    // Pause/Resume button
    document.getElementById("vard-pause")?.addEventListener("click", () => {
      this.world.isPaused ? this.world.startTicking() : this.world.stopTicking();
    });
  }
}
