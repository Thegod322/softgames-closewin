import { LevelJSON } from './types.ts';

const STORAGE_KEY = 'softgames_custom_levels_v1';

export class CustomLevelStorage {
  public static getPersistedCustomLevels(): LevelJSON[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to load custom levels from localStorage', e);
      return [];
    }
  }

  public static persistCustomLevels(levels: LevelJSON[]): void {
    try {
      const map = new Map<string, LevelJSON>();
      // Keep previously persisted
      for (const lvl of this.getPersistedCustomLevels()) {
        map.set(lvl.id, lvl);
      }
      // Add new levels
      for (const lvl of levels) {
        map.set(lvl.id, lvl);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    } catch (e) {
      console.error('Failed to persist custom levels to localStorage', e);
    }
  }

  public static async parseBatchJsonFiles(files: File[]): Promise<LevelJSON[]> {
    const results: LevelJSON[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const json = JSON.parse(text) as any;

        if (!Array.isArray(json.cards)) {
          console.warn(`File "${file.name}" missing "cards" array. Skipping.`);
          continue;
        }

        if (!json.settings) {
          json.settings = { cards_in_stack: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
        } else if (!Array.isArray(json.settings.cards_in_stack)) {
          json.settings.cards_in_stack = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        }

        const cleanName = file.name.replace(/\.json$/i, '').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const rawId = json.id ? String(json.id) : cleanName;
        const levelId = rawId.startsWith('custom_') ? rawId : `custom_${rawId}`;
        json.id = levelId;

        results.push(json as LevelJSON);
      } catch (err) {
        console.error(`Failed to parse file "${file.name}":`, err);
      }
    }

    return results;
  }
}
