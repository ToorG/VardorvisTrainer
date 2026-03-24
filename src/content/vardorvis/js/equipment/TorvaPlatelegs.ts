"use strict";
import { Legs, ItemName } from "osrs-sdk";
export class TorvaPlatelegs extends Legs {
  get itemName(): ItemName { return "Torva platelegs" as ItemName; }
  get weight() { return 0; }
  get model(): string | null { return null; }
}
