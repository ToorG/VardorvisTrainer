"use strict";
import { Helmet, ItemName } from "osrs-sdk";
export class TorvaFullHelm extends Helmet {
  get itemName(): ItemName { return "Torva full helm" as ItemName; }
  get weight() { return 0; }
  get model(): string | null { return null; }
}
