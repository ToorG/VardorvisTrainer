"use strict";

import { Player, GLTFModel, Model, Region, Location, UnitOptions } from "osrs-sdk";

/**
 * VardorvisPlayer
 *
 * Uses the SDK's default Player.create3dModel() which composites
 * equipment pieces from the CDN. The pieces that ARE available
 * (infernal cape, ferocious gloves, primordial boots, avernic defender)
 * will render correctly.
 *
 * The RuneLite-exported full player model can be used as a fallback
 * if we find the right scale factor.
 */
export class VardorvisPlayer extends Player {
  constructor(region: Region, location: Location, options?: UnitOptions) {
    super(region, location, options);
  }

  // Use default SDK player model (composites available gear pieces)
  // This renders the player with cape, gloves, boots visible
  // Override removed - letting SDK handle it
}
