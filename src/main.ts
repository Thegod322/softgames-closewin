import { LevelJSON } from './core/types.ts';
import { GameView } from './game/GameView.ts';
import { TestingDashboard } from './testing/TestingDashboard.ts';
import { SeedMiner } from './core/SeedMiner.ts';
import { CustomLevelStorage } from './core/CustomLevelStorage.ts';

import lvl25 from '../data/levels/level_25.json';
import lvl31 from '../data/levels/level_31.json';
import lvl43 from '../data/levels/level_43.json';
import lvl54 from '../data/levels/level_54.json';

function initLevel(id: string, raw: any): LevelJSON {
  const lvl = { ...raw, id: raw.id || id };
  return lvl as LevelJSON;
}

const levelMap = new Map<string, LevelJSON>([
  ['level_25', initLevel('level_25', lvl25)],
  ['level_31', initLevel('level_31', lvl31)],
  ['level_43', initLevel('level_43', lvl43)],
  ['level_54', initLevel('level_54', lvl54)],
]);

// Restore persisted custom levels from storage
const persistedLevels = CustomLevelStorage.getPersistedCustomLevels();
for (const lvl of persistedLevels) {
  if (!lvl.id) lvl.id = `custom_${Math.random().toString(36).substring(2, 7)}`;
  levelMap.set(lvl.id, lvl);
}

function getLevelDisplayName(lvlId: string): string {
  switch (lvlId) {
    case 'level_25':
      return 'Level 25 (Baseline / Hard)';
    case 'level_31':
      return 'Level 31 (Zap + Locks + Keys)';
    case 'level_43':
      return 'Level 43 (Complex Multi-Layer)';
    case 'level_54':
      return 'Level 54 (Bomb Modifiers)';
    default:
      if (lvlId.startsWith('custom_')) {
        return `📁 ${lvlId.replace(/^custom_/, '')} (Uploaded)`;
      }
      return `Level ${lvlId}`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tabGame = document.getElementById('tab-game') as HTMLButtonElement;
  const tabTuner = document.getElementById('tab-tuner') as HTMLButtonElement;
  const gameViewSection = document.getElementById('game-view') as HTMLElement;
  const tunerViewSection = document.getElementById('tuner-view') as HTMLElement;

  const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
  const btnGameUpload = document.getElementById('btn-game-upload-level') as HTMLButtonElement;
  const inputGameUpload = document.getElementById('input-game-upload-level') as HTMLInputElement;
  const gameDeckInput = document.getElementById('game-deck-size') as HTMLInputElement;
  const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;
  const chkKeepSeed = document.getElementById('chk-keep-seed') as HTMLInputElement;
  const chkGoldenSeed = document.getElementById('chk-golden-seed') as HTMLInputElement;
  const activeSeedBadge = document.getElementById('active-seed-badge') as HTMLElement;
  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;

  const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  const tunerDashboard = document.getElementById('tuner-dashboard') as HTMLElement;

  // Synchronize Level Select Dropdown
  function syncLevelSelectOptions(activeLevelId?: string) {
    if (!levelSelect) return;
    const currentSelected = activeLevelId || levelSelect.value || 'level_25';
    levelSelect.innerHTML = '';

    for (const [lvlId] of levelMap.entries()) {
      const opt = document.createElement('option');
      opt.value = lvlId;
      opt.innerText = getLevelDisplayName(lvlId);
      levelSelect.appendChild(opt);
    }

    if (levelMap.has(currentSelected)) {
      levelSelect.value = currentSelected;
    } else if (levelSelect.options.length > 0) {
      levelSelect.value = levelSelect.options[0].value;
    }
  }

  // Initialize Testing Dashboard (Tab 2)
  const testingDashboard = new TestingDashboard();

  function updateSeedBadge(seed: number, isGolden: boolean = false) {
    if (activeSeedBadge) {
      activeSeedBadge.innerText = isGolden ? `🌟 Golden Seed: #${seed}` : `Seed: #${seed}`;
      activeSeedBadge.style.borderColor = isGolden ? 'rgba(251, 191, 36, 0.6)' : 'var(--border-subtle)';
      activeSeedBadge.style.color = isGolden ? '#fbbf24' : 'var(--text-main)';
      activeSeedBadge.title = isGolden
        ? 'Curated winnable close-win seed'
        : 'Random PRNG seed';
    }
  }

  function getActiveLevelSeed(forceNew: boolean = true): { seed: number; isGolden: boolean } {
    const curSeed = gameView.getCurrentSeed();
    const curLvl = levelMap.get(levelSelect?.value || 'level_25');

    if (chkGoldenSeed?.checked && curLvl) {
      const goldenSeeds = testingDashboard.getActiveGoldenSeedIds();
      if (goldenSeeds.length > 0) {
        const pool = (forceNew && goldenSeeds.length > 1)
          ? goldenSeeds.filter((s) => s !== curSeed)
          : goldenSeeds;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        return { seed: picked, isGolden: true };
      } else {
        // Fast on-the-fly search if golden seeds pool isn't mined yet
        const hand = getSelectedHandSize();
        const mined = SeedMiner.mineSingleGoldenSeed(curLvl, hand, 1, 5000);
        if (mined) {
          return { seed: mined.seed, isGolden: true };
        }
      }
    }

    // Generate fresh random PRNG seed (different from current if forceNew)
    let newSeed = Math.floor(Math.random() * 1000000) + 1;
    if (forceNew) {
      while (newSeed === curSeed) {
        newSeed = Math.floor(Math.random() * 1000000) + 1;
      }
    }
    return { seed: newSeed, isGolden: false };
  }

  function getSelectedHandSize(): number {
    const parsed = parseInt(gameDeckInput?.value || '14', 10);
    return isNaN(parsed) || parsed < 5 ? 14 : parsed;
  }

  // 1. Initialize Game View (Tab 1)
  const gameView = new GameView();
  await gameView.init(canvasContainer);

  syncLevelSelectOptions('level_25');
  const initialLvl = levelMap.get('level_25')!;
  const defaultHand = initialLvl.settings.cards_in_stack.length;
  if (gameDeckInput) gameDeckInput.value = `${defaultHand}`;

  gameView.loadLevel(initialLvl, 42, defaultHand);
  updateSeedBadge(42, false);

  function handleGameRestart(forceNewSeed: boolean = true) {
    const keep = chkKeepSeed?.checked ?? false;
    const selectedLevel = levelMap.get(levelSelect.value) || levelMap.get('level_25');
    if (!selectedLevel) return;

    const handSize = getSelectedHandSize();

    if (keep && !forceNewSeed) {
      // Replay EXACT current seed and hand size
      const currentSeed = gameView.getCurrentSeed();
      gameView.loadLevel(selectedLevel, currentSeed, handSize);
      updateSeedBadge(currentSeed, chkGoldenSeed?.checked ?? false);
    } else {
      // Sample fresh seed based on golden mode or PRNG
      const { seed, isGolden } = getActiveLevelSeed(true);
      gameView.loadLevel(selectedLevel, seed, handSize);
      updateSeedBadge(seed, isGolden);
    }
  }

  // Wire up overlay and toolbar restart actions
  gameView.onRestartRequested = () => {
    handleGameRestart(false);
  };

  btnRestart?.addEventListener('click', () => {
    handleGameRestart(false);
  });

  gameDeckInput?.addEventListener('change', () => {
    handleGameRestart(true);
  });

  // Batch upload in Game View toolbar
  btnGameUpload?.addEventListener('click', () => {
    inputGameUpload?.click();
  });

  inputGameUpload?.addEventListener('change', async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length === 0) return;

    const loadedLevels = await CustomLevelStorage.parseBatchJsonFiles(files);
    if (loadedLevels.length > 0) {
      CustomLevelStorage.persistCustomLevels(loadedLevels);
      for (const lvl of loadedLevels) {
        levelMap.set(lvl.id, lvl);
      }
      const lastLevel = loadedLevels[loadedLevels.length - 1];
      syncLevelSelectOptions(lastLevel.id);
      testingDashboard.syncTunerLevelSelectOptions(lastLevel.id);
      const defaultHandSize = lastLevel.settings.cards_in_stack.length;
      if (gameDeckInput) gameDeckInput.value = `${defaultHandSize}`;
      const { seed, isGolden } = getActiveLevelSeed(true);
      gameView.loadLevel(lastLevel, seed, defaultHandSize);
      updateSeedBadge(seed, isGolden);
    }
    inputGameUpload.value = '';
  });

  // Drag and Drop Level JSON Files onto window
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.name.toLowerCase().endsWith('.json'));
    if (files.length === 0) return;

    const loadedLevels = await CustomLevelStorage.parseBatchJsonFiles(files);
    if (loadedLevels.length > 0) {
      CustomLevelStorage.persistCustomLevels(loadedLevels);
      for (const lvl of loadedLevels) {
        levelMap.set(lvl.id, lvl);
      }
      const lastLevel = loadedLevels[loadedLevels.length - 1];
      syncLevelSelectOptions(lastLevel.id);
      testingDashboard.syncTunerLevelSelectOptions(lastLevel.id);
      const defaultHandSize = lastLevel.settings.cards_in_stack.length;
      if (gameDeckInput) gameDeckInput.value = `${defaultHandSize}`;
      const { seed, isGolden } = getActiveLevelSeed(true);
      gameView.loadLevel(lastLevel, seed, defaultHandSize);
      updateSeedBadge(seed, isGolden);
    }
  });

  // 2. Initialize Testing Dashboard (Tab 2)
  testingDashboard.init(
    tunerDashboard,
    levelMap,
    (levelJson, customDeckSize, customSeed) => {
      // Switch to Game tab and play calibrated level / specific seed
      const targetLevelId = levelJson.id || 'level_25';
      switchTab('game');
      syncLevelSelectOptions(targetLevelId);
      levelSelect.value = targetLevelId;
      const targetLevel = levelMap.get(targetLevelId) || levelJson;
      const handToUse = customDeckSize ?? targetLevel.settings.cards_in_stack.length;
      if (gameDeckInput) gameDeckInput.value = `${handToUse}`;

      if (customSeed !== undefined) {
        if (chkKeepSeed) chkKeepSeed.checked = true;
        if (chkGoldenSeed) chkGoldenSeed.checked = true;
        updateSeedBadge(customSeed, true);
        gameView.loadLevel(targetLevel, customSeed, handToUse);
      } else {
        if (chkKeepSeed) chkKeepSeed.checked = false;
        const { seed, isGolden } = getActiveLevelSeed(false);
        updateSeedBadge(seed, isGolden);
        gameView.loadLevel(targetLevel, seed, handToUse);
      }
    },
    (levelId) => {
      syncLevelSelectOptions(levelId);
    }
  );

  // 3. Tab Switching Logic
  function switchTab(target: 'game' | 'tuner') {
    if (target === 'game') {
      tabGame.classList.add('active');
      tabTuner.classList.remove('active');
      gameViewSection.classList.add('active');
      tunerViewSection.classList.remove('active');
    } else {
      tabTuner.classList.add('active');
      tabGame.classList.remove('active');
      tunerViewSection.classList.add('active');
      gameViewSection.classList.remove('active');
    }
  }

  tabGame?.addEventListener('click', () => switchTab('game'));
  tabTuner?.addEventListener('click', () => switchTab('tuner'));

  // 4. Game Toolbar Controls
  levelSelect?.addEventListener('change', () => {
    const selectedLevel = levelMap.get(levelSelect.value);
    if (selectedLevel) {
      const defaultDeck = selectedLevel.settings.cards_in_stack.length;
      if (gameDeckInput) gameDeckInput.value = `${defaultDeck}`;

      const keep = chkKeepSeed?.checked ?? false;
      if (keep) {
        const currentSeed = gameView.getCurrentSeed();
        gameView.loadLevel(selectedLevel, currentSeed, defaultDeck);
        updateSeedBadge(currentSeed, chkGoldenSeed?.checked ?? false);
      } else {
        const { seed, isGolden } = getActiveLevelSeed(true);
        gameView.loadLevel(selectedLevel, seed, defaultDeck);
        updateSeedBadge(seed, isGolden);
      }
    }
  });

  chkGoldenSeed?.addEventListener('change', () => {
    // When toggling golden seed, auto-uncheck keep seed so the new seed is applied
    if (chkKeepSeed) chkKeepSeed.checked = false;

    const selectedLevel = levelMap.get(levelSelect.value);
    if (selectedLevel) {
      const handSize = getSelectedHandSize();
      const { seed, isGolden } = getActiveLevelSeed(true);
      gameView.loadLevel(selectedLevel, seed, handSize);
      updateSeedBadge(seed, isGolden);
    }
  });

  btnUndo?.addEventListener('click', () => {
    gameView.undo();
  });
});
