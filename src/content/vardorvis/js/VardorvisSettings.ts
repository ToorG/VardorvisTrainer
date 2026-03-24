"use strict";

/**
 * VardorvisSettings
 *
 * Persists user preferences for the Vardorvis trainer via localStorage.
 */
export class VardorvisSettings {
  static awakened = true;
  static showSafeTiles = true;
  static showAxePaths = true;
  static strangleEnabled = true;
  static spikesEnabled = true;
  static headEnabled = true;
  static autoAttackEnabled = true;
  static forceEnrage = false;

  static readonly STORAGE_KEY = "vardorvis_settings";

  static readFromStorage() {
    try {
      const raw = localStorage.getItem(VardorvisSettings.STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      VardorvisSettings.awakened = data.awakened ?? true;
      VardorvisSettings.showSafeTiles = data.showSafeTiles ?? true;
      VardorvisSettings.showAxePaths = data.showAxePaths ?? true;
      VardorvisSettings.strangleEnabled = data.strangleEnabled ?? true;
      VardorvisSettings.spikesEnabled = data.spikesEnabled ?? true;
      VardorvisSettings.headEnabled = data.headEnabled ?? true;
      VardorvisSettings.autoAttackEnabled = data.autoAttackEnabled ?? true;
      VardorvisSettings.forceEnrage = data.forceEnrage ?? false;
    } catch {
      // ignore parse errors
    }
  }

  static persistToStorage() {
    try {
      localStorage.setItem(
        VardorvisSettings.STORAGE_KEY,
        JSON.stringify({
          awakened: VardorvisSettings.awakened,
          showSafeTiles: VardorvisSettings.showSafeTiles,
          showAxePaths: VardorvisSettings.showAxePaths,
          strangleEnabled: VardorvisSettings.strangleEnabled,
          spikesEnabled: VardorvisSettings.spikesEnabled,
          headEnabled: VardorvisSettings.headEnabled,
          autoAttackEnabled: VardorvisSettings.autoAttackEnabled,
          forceEnrage: VardorvisSettings.forceEnrage,
        }),
      );
    } catch {
      // ignore storage errors
    }
  }
}
