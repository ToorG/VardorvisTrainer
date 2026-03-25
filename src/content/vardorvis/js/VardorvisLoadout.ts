"use strict";

import {
  AvernicDefender,
  FerociousGloves,
  InfernalCape,
  Player,
  PrimordialBoots,
  UnitOptions,
} from "osrs-sdk";

import { SoulreaperAxe }   from "./equipment/SoulreaperAxe";
import { TorvaFullHelm }   from "./equipment/TorvaFullHelm";
import { TorvaPlatebody }  from "./equipment/TorvaPlatebody";
import { TorvaPlatelegs }  from "./equipment/TorvaPlatelegs";
import { AmuletOfTorture } from "./equipment/AmuletOfTorture";
import { UltorRing }       from "./equipment/UltorRing";

export class VardorvisLoadout {
  getLoadout(): UnitOptions {
    return {
      equipment: {
        weapon:   new SoulreaperAxe(),
        offhand:  new AvernicDefender(),
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
