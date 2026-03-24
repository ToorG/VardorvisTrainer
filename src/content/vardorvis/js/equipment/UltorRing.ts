"use strict";
import { Ring, ItemName } from "osrs-sdk";

export class UltorRing extends Ring {
  get itemName(): ItemName { return "Ultor ring" as ItemName; }
  get weight() { return 0; }
  get model(): string { return "/cdn-models/player_ultor_ring.glb"; }
}
