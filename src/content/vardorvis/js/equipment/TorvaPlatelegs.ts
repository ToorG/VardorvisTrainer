"use strict";
import { Legs, ItemName } from "osrs-sdk";

export class TorvaPlatelegs extends Legs {
  get itemName(): ItemName { return "Torva platelegs" as ItemName; }
  get weight() { return 0; }
  get model(): string { return "/cdn-models/player_torva_platelegs.glb"; }
}
