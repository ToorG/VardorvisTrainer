"use strict";

import {
  AvernicDefender,
  FerociousGloves,
  InfernalCape,
  Player,
  PrimordialBoots,
  UnitOptions,
} from "osrs-sdk";

import { SoulreaperAxe }  from "./equipment/SoulreaperAxe";
import { TorvaFullHelm }  from "./equipment/TorvaFullHelm";
import { TorvaPlatebody } from "./equipment/TorvaPlatebody";
import { TorvaPlatelegs } from "./equipment/TorvaPlatelegs";
import { AmuletOfTorture } from "./equipment/AmuletOfTorture";
import { UltorRing }       from "./equipment/UltorRing";

/**
 * VardorvisLoadout
 *
 * Default: Soulreaper Axe + Torva — typical Awakened Vardorvis setup.
 * Gear models are loaded from oldschool-cdn.com automatically by the SDK.
 *
 * To swap gear later: replace any slot with a different equipment class.
 * All model files confirmed on CDN:
 *   player_soul_reaper_axe.glb  ✅
 *   player_torva_full_helm.glb  ✅
 *   player_torva_platebody.glb  ✅
 *   player_torva_platelegs.glb  ✅
 *   player_amulet_of_torture.glb ✅
 *   player_infernal_cape.glb    ✅
 *   player_ferocious_gloves.glb ✅
 *   player_primordial_boots.glb ✅
 *   player_avernic_defender.glb ✅
 *   player_ultor_ring.glb       ✅
 */
export class VardorvisLoadout {

  getLoadout(): UnitOptions {
    return {
      equipment: {
        weapon:   new SoulreaperAxe(),
        offhand:  new AvernicDefender(),  // offhand slot — avernic looks right with axe
        helmet:   new TorvaFullHelm(),
        chest:    new TorvaPlatebody(),
        legs:     new TorvaPlatelegs(),
        necklace: new AmuletOfTorture(),
        cape:     new InfernalCape(),
        gloves:   new FerociousGloves(),
        feet:     new PrimordialBoots(),
        ring:     new UltorRing(),
      },
    };
  }

  setStats(player: Player) {
    // Max combat stats for Vardorvis
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
