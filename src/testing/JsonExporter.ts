import { LevelJSON } from '../core/types.ts';

export class JsonExporter {
  public static exportCalibratedLevel(
    originalJson: LevelJSON,
    optimalDeckSize: number
  ): void {
    const levelId = originalJson.id || 'level';
    const calibrated: LevelJSON = JSON.parse(JSON.stringify(originalJson));
    calibrated.id = levelId;
    if (!calibrated.settings) {
      calibrated.settings = {
        level_number: 1,
        background: 'default',
        win_criteria: [{ type: 'clear_all' }],
        tags: [],
        cards_in_stack: [],
      };
    }
    calibrated.settings.cards_in_stack = Array(optimalDeckSize).fill(-1);

    const jsonStr = JSON.stringify(calibrated, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${levelId}_calibrated.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
