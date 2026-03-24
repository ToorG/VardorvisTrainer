"use strict";
import { Necklace, ItemName } from "osrs-sdk";

export class AmuletOfTorture extends Necklace {
  get itemName(): ItemName { return "Amulet of torture" as ItemName; }
  get weight() { return 0; }
  get model(): string | null { return null; }
}
