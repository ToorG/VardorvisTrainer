"use strict";

import { Player, GLTFModel, Model, Region, Location, UnitOptions } from "osrs-sdk";
import { PlayerModelSoulreaper } from "./VardorvisLoadout";

/**
 * VardorvisPlayer — extends Player to use locally served OSRS player model
 * extracted from RuneLite (full character in Torva + Soulreaper Axe).
 */
export class VardorvisPlayer extends Player {
  constructor(region: Region, location: Location, options?: UnitOptions) {
    super(region, location, options);
  }

  create3dModel(): Model {
    return GLTFModel.forRenderable(this, PlayerModelSoulreaper, { scale: 1 });
  }
}
