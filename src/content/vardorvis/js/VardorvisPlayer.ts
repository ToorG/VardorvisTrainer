"use strict";
import { Player, Region, Location, UnitOptions } from "osrs-sdk";

export class VardorvisPlayer extends Player {
  constructor(region: Region, location: Location, options?: UnitOptions) {
    super(region, location, options);
  }
}
