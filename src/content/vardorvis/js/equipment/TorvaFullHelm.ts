"use strict";
import { Helmet, ItemName } from "osrs-sdk";

export class TorvaFullHelm extends Helmet {
  get itemName(): ItemName { return "Torva full helm" as ItemName; }
  get weight() { return 0; }
  get model(): string { return "/cdn-models/player_torva_full_helm.glb"; }
}
