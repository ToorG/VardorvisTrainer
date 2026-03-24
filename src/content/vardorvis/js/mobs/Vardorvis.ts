"use strict";

import {
  Assets,
  BasicModel,
  Mob,
  MeleeWeapon,
  Sound,
  UnitBonuses,
  Model,
} from "osrs-sdk";

export const VARDORVIS_NORMAL_HP  = 700;
export const VARDORVIS_AWAKENED_HP = 1400;

const ENRAGE_THRESHOLD = 0.33;

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
      slash: new MeleeWeapon(),
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

  scaleStats() {
    const maxHp = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;
    const hpLost = maxHp - this.currentStats.hitpoint;
    const delta = Math.floor(hpLost / 10);
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

  // 2D color — dark crimson body
  get color() {
    return this.enrageActive ? "#cc2200" : "#6a1010";
  }

  // 3D placeholder — replace with GLTFModel.forRenderable(this, VardorvisModel) later
  create3dModel(): Model {
    return BasicModel.forRenderable(this);
  }

  drawUnderTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    if (!this.enrageActive) return;
    // Red pulsing glow under boss during enrage
    const alpha = 0.15 + 0.1 * Math.sin(tickPercent * Math.PI * 2);
    context.fillStyle = `rgba(220, 30, 0, ${alpha})`;
    context.fillRect(
      this.location.x * scale,
      this.location.y * scale,
      this.size * scale,
      this.size * scale,
    );
  }

  drawOverTile(tickPercent: number, context: OffscreenCanvasRenderingContext2D, scale: number) {
    const cx = (this.location.x + this.size / 2) * scale;
    const cy = (this.location.y + this.size / 2) * scale;
    const r = (this.size * scale) / 2 - 4;

    // Body silhouette
    context.fillStyle = this.enrageActive ? "#9a1800" : "#4a0e0e";
    context.beginPath();
    context.ellipse(cx, cy, r * 0.7, r * 0.9, 0, 0, Math.PI * 2);
    context.fill();

    // Glowing eyes
    const eyeGlow = 0.7 + 0.3 * Math.sin(tickPercent * Math.PI * 4);
    context.fillStyle = this.enrageActive
      ? `rgba(255, 100, 0, ${eyeGlow})`
      : `rgba(255, 30, 0,  ${eyeGlow})`;
    const eyeY  = cy - r * 0.2;
    const eyeOff = r * 0.25;
    [-eyeOff, eyeOff].forEach(ox => {
      context.beginPath();
      context.ellipse(cx + ox, eyeY, r * 0.1, r * 0.07, 0, 0, Math.PI * 2);
      context.fill();
    });

    // Strangler tendrils (animated green lines)
    context.strokeStyle = `rgba(30, 160, 30, 0.5)`;
    context.lineWidth = 1.5;
    context.setLineDash([4, 4]);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + tickPercent * Math.PI;
      const tx = cx + Math.cos(angle) * r * 0.8;
      const ty = cy + Math.sin(angle) * r * 0.8;
      context.beginPath();
      context.moveTo(cx, cy);
      context.lineTo(tx, ty);
      context.stroke();
    }
    context.setLineDash([]);

    // Name label
    context.fillStyle = this.enrageActive ? "#ff6633" : "#cc3311";
    context.font = `bold ${Math.max(9, Math.floor(scale * 0.28))}px monospace`;
    context.textAlign = "center";
    const label = this.isAwakened ? "AWAKENED VARDORVIS" : "VARDORVIS";
    context.fillText(label, cx, (this.location.y * scale) + 10);

    // HP bar
    const maxHp = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;
    const pct   = Math.max(0, this.currentStats.hitpoint / maxHp);
    const bw    = this.size * scale - 8;
    const bx    = this.location.x * scale + 4;
    const by    = (this.location.y + this.size) * scale + 2;
    context.fillStyle = "#333";
    context.fillRect(bx, by, bw, 5);
    context.fillStyle = pct > 0.5 ? "#44cc66" : pct > 0.25 ? "#ccaa22" : "#cc2222";
    context.fillRect(bx, by, bw * pct, 5);

    context.textAlign = "left";
  }
}
