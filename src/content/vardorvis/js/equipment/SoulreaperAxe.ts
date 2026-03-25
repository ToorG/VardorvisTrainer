"use strict";
import { MeleeWeapon, ItemName } from "osrs-sdk";
import { PlayerAnimationIndices } from "osrs-sdk";

// Soulreaper Axe model not available on CDN - using Blade of Saeldor model
// Stats still reflect Soulreaper Axe
export class SoulreaperAxe extends MeleeWeapon {
  get itemName(): ItemName { return "Soulreaper Axe" as ItemName; }
  get weight() { return 0; }
  get isTwoHander() { return false; }
  hasSpecialAttack() { return false; }
  get attackRange() { return 1; }
  get attackSpeed() { return 6; }
  get model(): string { return "https://assets-soltrainer.netlify.app/models/player_blade_of_saeldor.glb"; }
  get attackAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.SwordSlash; }
  get idleAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.Idle; }
}
