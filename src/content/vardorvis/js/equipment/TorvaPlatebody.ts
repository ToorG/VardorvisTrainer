"use strict";
import { Chest, ItemName } from "osrs-sdk";

export class TorvaPlatebody extends Chest {
  get itemName(): ItemName { return "Torva platebody" as ItemName; }
  get weight() { return 0; }
  get model(): string { return "https://oldschool-cdn.com/models/player_torva_platebody.glb"; }
}
