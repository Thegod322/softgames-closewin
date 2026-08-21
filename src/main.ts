import { LevelJSON } from './core/types.ts';
import { GameView } from './game/GameView.ts';
import { TestingDashboard } from './testing/TestingDashboard.ts';

import lvl25 from '../data/levels/level_25.json';
import lvl31 from '../data/levels/level_31.json';
import lvl43 from '../data/levels/level_43.json';
import lvl54 from '../data/levels/level_54.json';

const levelMap = new Map<string, LevelJSON>([
  ['level_25', lvl25 as unknown as LevelJSON],
  ['level_31', lvl31 as unknown as LevelJSON],
  ['level_43', lvl43 as unknown as LevelJSON],
  ['level_54', lvl54 as unknown as LevelJSON],
]);

document.addEventListener('DOMContentLoaded', async () => {
  const tabGame = document.getElementById('tab-game') as HTMLButtonElement;
  const tabTuner = document.getElementById('tab-tuner') as HTMLButtonElement;
  const gameViewSection = document.getElementById('game-view') as HTMLElement;
  const tunerViewSection = document.getElementById('tuner-view') as HTMLElement;

  const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
  const gameDeckInput = document.getElementById('game-deck-size') as HTMLInputElement;
  const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;
  const chkKeepSeed = document.getElementById('chk-keep-seed') as HTMLInputElement;
  const chkGoldenSeed = document.getElementById('chk-golden-seed') as HTMLInputElement;
  const activeSeedBadge = document.getElementById('active-seed-badge') as HTMLElement;
  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;

  const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  const tunerDashboard = document.getElementById('tuner-dashboard') as HTMLElement;

  // Initialize Testing Dashboard (Tab 2)
  const testingDashboard = new TestingDashboard();

  function updateSeedBadge(seed: number, isGolden: boolean = false) {
    if (activeSeedBadge) {
      activeSeedBadge.innerText = isGolden ? `🌟 Golden Seed: #${seed}` : `Seed: #${seed}`;
      activeSeedBadge.style.borderColor = isGolden ? 'rgba(251, 191, 36, 0.6)' : 'var(--border-subtle)';
      activeSeedBadge.style.color = isGolden ? '#fbbf24' : 'var(--text-main)';
    }
  }

  function getActiveLevelSeed(): { seed: number; isGolden: boolean } {
    if (chkGoldenSeed?.checked) {
      const goldenSeeds = testingDashboard.getActiveGoldenSeedIds();
      if (goldenSeeds.length > 0) {
        const picked = goldenSeeds[Math.floor(Math.random() * goldenSeeds.length)];
        return { seed: picked, isGolden: true };
      }
    }
    return { seed: Math.floor(Math.random() * 1000000) + 1, isGolden: false };
  }

  function getSelectedHandSize(): number {
    const parsed = parseInt(gameDeckInput?.value || '14', 10);
    return isNaN(parsed) || parsed < 5 ? 14 : parsed;
  }

  // 1. Initialize Game View (Tab 1)
  const gameView = new GameView();
  await gameView.init(canvasContainer);

  const initialLvl = levelMap.get('level_25')!;
  const defaultHand = initialLvl.settings.cards_in_stack.length;
  if (gameDeckInput) gameDeckInput.value = `${defaultHand}`;

  gameView.loadLevel(initialLvl, 42, defaultHand);
  updateSeedBadge(42, false);

  function handleGameRestart() {
    const keep = chkKeepSeed?.checked ?? false;
    const selectedLevel = levelMap.get(levelSelect.value);
    if (!selectedLevel) return;

    const handSize = getSelectedHandSize();

    if (keep) {
      // Replay EXACT current seed and hand size!
      const currentSeed = gameView.getCurrentSeed();
      gameView.loadLevel(selectedLevel, currentSeed, handSize);
      updateSeedBadge(currentSeed, chkGoldenSeed?.checked ?? false);
    } else {
      // Sample fresh seed based on golden mode or PRNG
      const { seed, isGolden } = getActiveLevelSeed();
      gameView.loadLevel(selectedLevel, seed, handSize);
      updateSeedBadge(seed, isGolden);
    }
  }

  // Wire up overlay and toolbar restart actions to the unified handler
  gameView.onRestartRequested = () => {
    handleGameRestart();
  };

  btnRestart?.addEventListener('click', () => {
    handleGameRestart();
  });

  gameDeckInput?.addEventListener('change', () => {
    handleGameRestart();
  });

  // 2. Initialize Testing Dashboard (Tab 2)
  testingDashboard.init(tunerDashboard, levelMap, (levelJson, customDeckSize, customSeed) => {
    // Switch to Game tab and play calibrated level / specific seed from inspector
    switchTab('game');
    levelSelect.value = levelJson.id;
    const handToUse = customDeckSize ?? levelJson.settings.cards_in_stack.length;
    if (gameDeckInput) gameDeckInput.value = `${handToUse}`;

    const seedToUse = customSeed !== undefined ? customSeed : 42;

    if (customSeed !== undefined) {
      if (chkKeepSeed) chkKeepSeed.checked = true; // Auto-keep seed so user can retry it repeatedly
      if (chkGoldenSeed) chkGoldenSeed.checked = true;
      updateSeedBadge(seedToUse, true);
    } else {
      updateSeedBadge(seedToUse, false);
    }

    gameView.loadLevel(levelJson, seedToUse, handToUse);
  });

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
        const { seed, isGolden } = getActiveLevelSeed();
        gameView.loadLevel(selectedLevel, seed, defaultDeck);
        updateSeedBadge(seed, isGolden);
      }
    }
  });

  chkGoldenSeed?.addEventListener('change', () => {
    const selectedLevel = levelMap.get(levelSelect.value);
    if (selectedLevel) {
      const handSize = getSelectedHandSize();
      const { seed, isGolden } = getActiveLevelSeed();
      gameView.loadLevel(selectedLevel, seed, handSize);
      updateSeedBadge(seed, isGolden);
    }
  });

  btnUndo?.addEventListener('click', () => {
    gameView.undo();
  });
});
