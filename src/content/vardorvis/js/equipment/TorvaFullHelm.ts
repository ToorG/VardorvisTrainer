"use strict";
import { Helmet, ItemName } from "osrs-sdk";

export class TorvaFullHelm extends Helmet {
  get itemName(): ItemName { return "Torva full helm" as ItemName; }
  get weight() { return 0; }
  get model(): string { return "https://assets-soltrainer.netlify.app/models/player_sanguine_torva_full_helm.glb"; }
}
