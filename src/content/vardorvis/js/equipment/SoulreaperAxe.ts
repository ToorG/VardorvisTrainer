"use strict";
import { MeleeWeapon, ItemName } from "osrs-sdk";
import { PlayerAnimationIndices } from "osrs-sdk";

export class SoulreaperAxe extends MeleeWeapon {
  get itemName(): ItemName { return "Soulreaper Axe" as ItemName; }
  get weight() { return 0; }
  get isTwoHander() { return true; }
  hasSpecialAttack() { return false; }
  get attackRange() { return 1; }
  get attackSpeed() { return 6; }
  get model(): string { return "/cdn-models/player_soul_reaper_axe.glb"; }
  get attackAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ScytheSwing; }
  get idleAnimationId(): PlayerAnimationIndices { return PlayerAnimationIndices.ScytheIdle; }
}
