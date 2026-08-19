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
  const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;
  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;

  const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  const tunerDashboard = document.getElementById('tuner-dashboard') as HTMLElement;

  // 1. Initialize Game View (Tab 1)
  const gameView = new GameView();
  await gameView.init(canvasContainer);
  gameView.loadLevel(levelMap.get('level_25')!, 42);

  // 2. Initialize Testing Dashboard (Tab 2)
  const testingDashboard = new TestingDashboard();
  testingDashboard.init(tunerDashboard, levelMap, (levelJson, customDeckSize) => {
    // Switch to Game tab and play calibrated level
    switchTab('game');
    levelSelect.value = levelJson.id;
    gameView.loadLevel(levelJson, 42, customDeckSize);
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
      gameView.loadLevel(selectedLevel, 42);
    }
  });

  btnRestart?.addEventListener('click', () => {
    gameView.restart();
  });

  btnUndo?.addEventListener('click', () => {
    gameView.undo();
  });
});
