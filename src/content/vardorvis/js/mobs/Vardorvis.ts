"use strict";

import {
  Assets,
  Mob,
  MeleeWeapon,
  RangedWeapon,
  MagicWeapon,
  Sound,
  UnitBonuses,
  EntityNames,
  Trainer,
  Random,
} from "osrs-sdk";

// Vardorvis OSRS NPC ID: 12225 (normal), 12227 (awakened)
// These would reference the actual model files once extracted from the cache
// const VardorvisModel = Assets.getAssetUrl("models/vardorvis.glb");

export const VARDORVIS_NORMAL_HP = 700;
export const VARDORVIS_AWAKENED_HP = 1400;

// Attack style constants matching OSRS wiki data
const ATTACK_SPEED = 4; // 4 tick attack speed
const HEAD_GAZE_THRESHOLD = 570; // HP at which head starts appearing
const STRANGLE_THRESHOLD = 0.8; // 80% HP
const ENRAGE_THRESHOLD = 0.33; // 33% HP (231 HP normal / 462 HP awakened)

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

    // Vardorvis uses melee as primary attack
    // Protect from Melee reduces auto-attack damage by 75%
    this.weapons = {
      slash: new MeleeWeapon({
        sound: new Sound(Assets.getAssetUrl("assets/sounds/vardorvis_melee.ogg"), 0.6),
      }),
    };

    const maxHp = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;

    // Stats scale linearly with HP:
    // As HP drops: Defence decreases, Strength increases
    this.stats = {
      attack: 215,
      strength: 180, // increases as HP drops (roughly +1 per 10 HP lost)
      defence: 215,   // decreases as HP drops (roughly -1 per 10 HP lost)
      range: 1,
      magic: 1,
      hitpoint: maxHp,
    };

    this.currentStats = JSON.parse(JSON.stringify(this.stats));
  }

  /**
   * Scale Vardorvis stats with remaining HP.
   * Called each tick from postTick() in VardorvisRegion.
   */
  scaleStats() {
    const maxHp = this.isAwakened ? VARDORVIS_AWAKENED_HP : VARDORVIS_NORMAL_HP;
    const hpLost = maxHp - this.currentStats.hitpoint;
    const statChange = Math.floor(hpLost / 10);

    // Defence decreases, Strength increases as HP drops
    this.currentStats.defence = Math.max(0, 215 - statChange);
    this.currentStats.strength = 180 + statChange;

    // Enter enrage at 33% HP
    this.enrageActive = this.currentStats.hitpoint <= maxHp * ENRAGE_THRESHOLD;
  }

  get bonuses(): UnitBonuses {
    return {
      attack: {
        stab: 0,
        slash: 130,
        crush: 0,
        magic: 0,
        range: 0,
      },
      defence: {
        stab: 80,
        slash: 80,
        crush: 80,
        magic: 30,
        range: 30,
      },
      other: {
        meleeStrength: 90,
        rangedStrength: 0,
        magicDamage: 0,
        prayer: 0,
      },
    };
  }

  get attackSpeed() {
    return ATTACK_SPEED;
  }

  get attackRange() {
    return 1; // melee only
  }

  // Vardorvis occupies a 3x3 tile footprint
  get size() {
    return 3;
  }

  get maxHit() {
    // Max hit scales with Strength level. Base ~50, boosted during enrage
    return this.enrageActive ? 65 : 50;
  }

  attackStyleForNewAttack() {
    return "slash";
  }

  get isDefenceImmune() {
    // Awakened Vardorvis is immune to stat drains
    return this.isAwakened;
  }

  override get attackAnimationId() {
    return 10515; // OSRS animation ID for Vardorvis melee
  }

  override get deathAnimationId() {
    return 10517;
  }

  override get idlePoseId() {
    return 10513;
  }

  // Vardorvis faces the player and his Defence/Strength scale — don't use
  // standard defence-reducing weapons.
  drawUnderTile(context, scale, tickPercent) {
    // Draw a red tile under Vardorvis during enrage
    if (this.enrageActive) {
      context.fillStyle = "rgba(200, 0, 0, 0.2)";
      context.fillRect(
        this.location.x * scale,
        this.location.y * scale,
        this.size * scale,
        this.size * scale,
      );
    }
  }
}
