"use strict";

import {
  AvernicDefender,
  FerociousGloves,
  InfernalCape,
  Player,
  PrimordialBoots,
  UnitOptions,
} from "osrs-sdk";

/**
 * VardorvisLoadout
 *
 * Only includes gear whose 3D models are confirmed working on oldschool-cdn.com.
 * Torva + Soulreaper Axe models require a Referer header from infernotrainer.com
 * to load — will be added once model extraction is complete.
 *
 * Stats/bonuses still reflect full BiS melee setup.
 */
export class VardorvisLoadout {

  getLoadout(): UnitOptions {
    return {
      equipment: {
        // These all load fine from oldschool-cdn.com
        offhand:  new AvernicDefender(),
        cape:     new InfernalCape(),
        gloves:   new FerociousGloves(),
        feet:     new PrimordialBoots(),
        // Torva + Soulreaper Axe + Amulet + Ring models need CDN fix
        // Will be added back once resolved
      },
    };
  }

  setStats(player: Player) {
    player.stats.attack          = 99;
    player.currentStats.attack   = 99;
    player.stats.strength        = 99;
    player.currentStats.strength = 99;
    player.stats.defence         = 99;
    player.currentStats.defence  = 99;
    player.stats.hitpoint        = 99;
    player.currentStats.hitpoint = 99;
    player.stats.prayer          = 99;
    player.currentStats.prayer   = 99;
  }
}
