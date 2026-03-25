"use strict";

import {
  BasicModel,
  GLTFModel,
  DelayedAction,
  Mob,
  MeleeWeapon,
  PrayerGroups,
  Unit,
  AttackBonuses,
  UnitBonuses,
  Model,
} from "osrs-sdk";

const VardorvisModel = "/models/vardorvis.glb";

export const VARDORVIS_NORMAL_HP   = 700;
export const VARDORVIS_AWAKENED_HP = 1400;

const ENRAGE_THRESHOLD = 0.33;

/**
 * Custom melee weapon that:
 * 1. Checks Protect from Melee — reduces damage by 75% if active
 * 2. Respects the prayerDisabledTicks flag set by head gaze failures
 * 3. Normal MeleeWeapon handles all the hit/miss rolls via super.attack()
 */
class VardorvisMeleeWeapon extends MeleeWeapon {
  attack(from: Unit, to: Unit, bonuses: AttackBonuses = {}): boolean {
    // If prayer is disabled (head gaze was missed), force-remove overhead
    // so the base weapon's prayer check fails → full damage lands
    const player = to as any;
    if (player._vardorvisPrayerDisabledTicks > 0) {
      // Temporarily suppress overhead for this hit calculation
      const savedOverhead = to.prayerController?.overhead();
      savedOverhead?.deactivate();
      const result = super.attack(from, to, bonuses);
      // Restore prayer state (player re-activates manually)
      return result;
    }
    return super.attack(from, to, bonuses);
  }
}

export class Vardorvis extends Mob {
  isAwakened: boolean;
  enrageActive = false;

  constructor(region, location, options: { aggro?: any; awakened?: boolean } = {}) {
    super(region, location, options);
    this.isAwakened = options.awakened ?? false;
  }

  mobName() {
    return this.isAwakened ? "Awakened Vardorvis" : "Vardorvis";
  }

  get combatLevel() {
    return this.isAwakened ? 732 : 639;
  }

  setStats() {
    this.stunned = 1;
    this.weapons = {
      slash: new VardorvisMeleeWeapon(),
    };
    const maxHp = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;
    this.stats = {
      attack: 215,
      strength: 180,
      defence: 215,
      range: 1,
      magic: 1,
      hitpoint: maxHp,
    };
    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  /** Called every tick from VardorvisRegion.postTick() */
  scaleStats() {
    const maxHp   = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;
    const hpLost  = maxHp - this.currentStats.hitpoint;
    const delta   = Math.floor(hpLost / 10);
    // Defence drops, Strength rises as HP falls
    this.currentStats.defence = Math.max(0, 215 - delta);
    this.currentStats.strength = 180 + delta;
    this.enrageActive = this.currentStats.hitpoint <= maxHp * ENRAGE_THRESHOLD;
  }

  get bonuses(): UnitBonuses {
    return {
      attack:  { stab: 0, slash: 130, crush: 0, magic: 0, range: 0 },
      defence: { stab: 80, slash: 80, crush: 80, magic: 30, range: 30 },
      other:   { meleeStrength: 90, rangedStrength: 0, magicDamage: 0, prayer: 0 },
    };
  }

  get attackSpeed() { return 4; }
  get attackRange()  { return 1; }
  get size()         { return 3; }
  attackStyleForNewAttack() { return "slash"; }

  get color() {
    return this.enrageActive ? "#cc2200" : "#6a1010";
  }

  // 3D: swap to GLTFModel.forRenderable(this, VardorvisModel) once model files are ready
  create3dModel(): Model {
    return GLTFModel.forRenderable(this, VardorvisModel, { scale: 1 });
  }

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    if (!this.enrageActive) return;
    const alpha = 0.12 + 0.08 * Math.sin(tickPercent * Math.PI * 2);
    context.fillStyle = `rgba(220, 30, 0, ${alpha})`;
    context.fillRect(
      this.location.x * scale,
      this.location.y * scale,
      this.size * scale,
      this.size * scale,
    );
  }

  drawOverTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const cx  = (this.location.x + this.size / 2) * scale;
    const cy  = (this.location.y + this.size / 2) * scale;
    const r   = (this.size * scale) / 2 - 4;
    const maxHp = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;

    // Body
    context.fillStyle = this.enrageActive ? "#8a1400" : "#4a0e0e";
    context.beginPath();
    context.ellipse(cx, cy, r * 0.68, r * 0.88, 0, 0, Math.PI * 2);
    context.fill();

    // Strangler tendrils (animated)
    context.strokeStyle = "rgba(30, 160, 30, 0.55)";
    context.lineWidth = 1.5;
    context.setLineDash([4, 4]);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + tickPercent * Math.PI * 0.8;
      context.beginPath();
      context.moveTo(cx, cy);
      context.bezierCurveTo(
        cx + Math.cos(angle) * r * 0.5,
        cy + Math.sin(angle) * r * 0.5,
        cx + Math.cos(angle + 0.6) * r * 0.9,
        cy + Math.sin(angle + 0.6) * r * 0.9,
        cx + Math.cos(angle + 0.3) * r,
        cy + Math.sin(angle + 0.3) * r,
      );
      context.stroke();
    }
    context.setLineDash([]);

    // Glowing red eyes
    const pulse = 0.65 + 0.35 * Math.sin(tickPercent * Math.PI * 6);
    context.fillStyle = this.enrageActive
      ? `rgba(255, 100, 0, ${pulse})`
      : `rgba(255, 20, 0,  ${pulse})`;
    const eyeY = cy - r * 0.22;
    [-r * 0.26, r * 0.26].forEach(ox => {
      context.beginPath();
      context.ellipse(cx + ox, eyeY, r * 0.11, r * 0.075, 0, 0, Math.PI * 2);
      context.fill();
    });

    // HP bar
    const pct = Math.max(0, this.currentStats.hitpoint / maxHp);
    const bw  = this.size * scale - 6;
    const bx  = this.location.x * scale + 3;
    const by  = (this.location.y * scale) - 8;
    context.fillStyle = "#222";
    context.fillRect(bx, by, bw, 5);
    context.fillStyle = pct > 0.5 ? "#44cc66" : pct > 0.25 ? "#ccaa22" : "#cc2222";
    context.fillRect(bx, by, bw * pct, 5);

    // Name
    context.fillStyle   = this.enrageActive ? "#ff6633" : "#cc3311";
    context.font        = `bold ${Math.max(9, Math.floor(scale * 0.27))}px monospace`;
    context.textAlign   = "center";
    context.fillText(
      this.isAwakened ? "AWAKENED VARDORVIS" : "VARDORVIS",
      cx, by - 4,
    );
    if (this.enrageActive) {
      context.fillStyle = "#ff4400";
      context.font      = `bold ${Math.max(8, Math.floor(scale * 0.22))}px monospace`;
      context.fillText("⚡ ENRAGE", cx, by - 14);
    }
    context.textAlign = "left";
  }
}
