"use strict";
import { Necklace, ItemName } from "osrs-sdk";

export class AmuletOfTorture extends Necklace {
  get itemName(): ItemName { return "Amulet of torture" as ItemName; }
  get weight() { return 0; }
  get model(): string { return "/cdn-models/player_amulet_of_torture.glb"; }
}
