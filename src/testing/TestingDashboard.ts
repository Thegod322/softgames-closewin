import { LevelJSON, SimulationMetrics } from '../core/types.ts';
import { runSimulationSync } from '../workers/sim.worker.ts';
import { AutoCalibrator, CalibrationResult } from './AutoCalibrator.ts';
import { ChartsView } from './ChartsView.ts';
import { JsonExporter } from './JsonExporter.ts';

export class TestingDashboard {
  private container!: HTMLElement;
  private levelMap: Map<string, LevelJSON> = new Map();
  private currentLevelId: string = 'level_25';
  private autoCalibrator: AutoCalibrator = new AutoCalibrator();
  private currentMetrics: SimulationMetrics | null = null;
  private optimalDeckSize: number | null = null;
  private onPlayLevel?: (levelJson: LevelJSON, customDeckSize: number) => void;

  public getCurrentMetrics(): SimulationMetrics | null {
    return this.currentMetrics;
  }

  public init(
    container: HTMLElement,
    levelMap: Map<string, LevelJSON>,
    onPlayLevel?: (levelJson: LevelJSON, customDeckSize: number) => void
  ): void {
    this.container = container;
    this.levelMap = levelMap;
    this.onPlayLevel = onPlayLevel;

    this.renderUI();
    this.attachEvents();
    this.runManualSimulation();
  }

  private renderUI(): void {
    const currentLevel = this.levelMap.get(this.currentLevelId)!;
    const defaultDeckSize = currentLevel.settings.cards_in_stack.length;

    this.container.innerHTML = `
      <div class="tuner-grid">
        <!-- Left: Control Panel -->
        <div class="tuner-card">
          <h3>⚙️ Simulation & Calibration Controls</h3>
          
          <div class="form-group">
            <label for="tuner-level-select">Target Level:</label>
            <select id="tuner-level-select">
              <option value="level_25">Level 25 (Baseline / Hard)</option>
              <option value="level_31">Level 31 (Zap + Locks + Keys)</option>
              <option value="level_43">Level 43 (Complex Multi-Layer)</option>
              <option value="level_54">Level 54 (Bomb Modifiers)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="sim-iterations">Batch Simulation Runs:</label>
            <select id="sim-iterations">
              <option value="1000">1,000 runs (Instant - 0.2s)</option>
              <option value="2500" selected>2,500 runs (Accurate - 0.5s)</option>
              <option value="5000">5,000 runs (Production - 1.0s)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="deck-slider">Manual Deck Size (Draw Pile):</label>
            <div class="range-wrap">
              <input type="range" id="deck-slider" min="5" max="45" value="${defaultDeckSize}" />
              <span id="deck-slider-val" class="range-val">${defaultDeckSize}</span>
            </div>
          </div>

          <div class="progress-bar-container" id="tuner-progress-wrap">
            <div class="progress-bar-fill" id="tuner-progress-fill"></div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
            <button id="btn-run-sim" class="btn btn-secondary">▶ Run Simulation</button>
            <button id="btn-auto-tune" class="btn btn-warning">⚡ Auto-Tune Target (70% Close Win)</button>
            <button id="btn-export-json" class="btn btn-accent">💾 Export Calibrated JSON</button>
            <button id="btn-play-level" class="btn btn-secondary">🎮 Play Calibrated Level</button>
          </div>

          <div id="calibration-log" style="font-size: 11px; color: var(--text-muted); max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; font-family: monospace; display: none;"></div>
        </div>

        <!-- Right: KPI Cards & Charts -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- KPI Row -->
          <div class="kpi-row">
            <div class="kpi-card" id="kpi-cwr-card">
              <span class="kpi-label">🎯 Close Win Rate (Target: 70%)</span>
              <span class="kpi-value" id="kpi-cwr">--%</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">🏆 Pass Rate (Overall Wins)</span>
              <span class="kpi-value" id="kpi-pass-rate">--%</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">🃏 Median Remainder</span>
              <span class="kpi-value" id="kpi-median">--</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">📊 IQR Remainder Spread</span>
              <span class="kpi-value" id="kpi-iqr">--</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">💣 Bomb Detonations</span>
              <span class="kpi-value" id="kpi-bomb">--%</span>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="charts-container">
            <div class="chart-card">
              <h4>📊 Win Remainder Distribution (0-2: Close Win)</h4>
              <div id="chart-histogram" class="chart-svg-wrap"></div>
            </div>
            <div class="chart-card">
              <h4>🎯 Overall Outcome Breakdown</h4>
              <div id="chart-donut" class="chart-svg-wrap"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const levelSelect = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const deckVal = this.container.querySelector('#deck-slider-val') as HTMLElement;
    const btnRunSim = this.container.querySelector('#btn-run-sim') as HTMLButtonElement;
    const btnAutoTune = this.container.querySelector('#btn-auto-tune') as HTMLButtonElement;
    const btnExport = this.container.querySelector('#btn-export-json') as HTMLButtonElement;
    const btnPlay = this.container.querySelector('#btn-play-level') as HTMLButtonElement;

    levelSelect?.addEventListener('change', () => {
      this.currentLevelId = levelSelect.value;
      const lvl = this.levelMap.get(this.currentLevelId)!;
      deckSlider.value = `${lvl.settings.cards_in_stack.length}`;
      deckVal.innerText = `${lvl.settings.cards_in_stack.length}`;
      this.runManualSimulation();
    });

    deckSlider?.addEventListener('input', () => {
      deckVal.innerText = deckSlider.value;
    });

    deckSlider?.addEventListener('change', () => {
      this.runManualSimulation();
    });

    btnRunSim?.addEventListener('click', () => {
      this.runManualSimulation();
    });

    btnAutoTune?.addEventListener('click', () => {
      this.runAutoTune();
    });

    btnExport?.addEventListener('click', () => {
      const lvl = this.levelMap.get(this.currentLevelId)!;
      const targetDeck = this.optimalDeckSize || parseInt(deckSlider.value, 10);
      JsonExporter.exportCalibratedLevel(lvl, targetDeck);
    });

    btnPlay?.addEventListener('click', () => {
      const lvl = this.levelMap.get(this.currentLevelId)!;
      const targetDeck = this.optimalDeckSize || parseInt(deckSlider.value, 10);
      this.onPlayLevel?.(lvl, targetDeck);
    });
  }

  private runManualSimulation(): void {
    const lvl = this.levelMap.get(this.currentLevelId)!;
    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const iterSelect = this.container.querySelector('#sim-iterations') as HTMLSelectElement;
    const deckSize = parseInt(deckSlider?.value || '14', 10);
    const iterations = parseInt(iterSelect?.value || '2500', 10);

    const metrics = runSimulationSync(lvl, iterations, deckSize);
    this.currentMetrics = metrics;
    this.updateDashboard(metrics);
  }

  private runAutoTune(): void {
    const lvl = this.levelMap.get(this.currentLevelId)!;
    const iterSelect = this.container.querySelector('#sim-iterations') as HTMLSelectElement;
    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const deckVal = this.container.querySelector('#deck-slider-val') as HTMLElement;
    const logEl = this.container.querySelector('#calibration-log') as HTMLElement;

    const iterations = parseInt(iterSelect?.value || '2000', 10);

    if (logEl) {
      logEl.style.display = 'block';
      logEl.innerHTML = `<div>🔍 Starting Auto-Calibrator for ${lvl.id}... Target: 70% CWR</div>`;
    }

    const result: CalibrationResult = this.autoCalibrator.calibrate(
      lvl,
      iterations,
      (step) => {
        if (logEl) {
          logEl.innerHTML += `<div>Testing Deck Size ${step.deckSize}: CWR = ${step.metrics.closeWinRate.toFixed(1)}% (Pass: ${step.metrics.passRate.toFixed(1)}%)</div>`;
          logEl.scrollTop = logEl.scrollHeight;
        }
      }
    );

    this.optimalDeckSize = result.optimalDeckSize;
    this.currentMetrics = result.bestMetrics;

    if (deckSlider && deckVal) {
      deckSlider.value = `${result.optimalDeckSize}`;
      deckVal.innerText = `${result.optimalDeckSize}`;
    }

    if (logEl) {
      logEl.innerHTML += `<div style="color: #22c55e; font-weight: bold; margin-top: 4px;">✅ Optimal Deck Size found: ${result.optimalDeckSize} cards (CWR: ${result.bestMetrics.closeWinRate.toFixed(1)}%)</div>`;
    }

    this.updateDashboard(result.bestMetrics);
  }

  private updateDashboard(metrics: SimulationMetrics): void {
    const kpiCwr = this.container.querySelector('#kpi-cwr') as HTMLElement;
    const kpiCwrCard = this.container.querySelector('#kpi-cwr-card') as HTMLElement;
    const kpiPass = this.container.querySelector('#kpi-pass-rate') as HTMLElement;
    const kpiMedian = this.container.querySelector('#kpi-median') as HTMLElement;
    const kpiIqr = this.container.querySelector('#kpi-iqr') as HTMLElement;
    const kpiBomb = this.container.querySelector('#kpi-bomb') as HTMLElement;

    const cwr = metrics.closeWinRate;
    if (kpiCwr) kpiCwr.innerText = `${cwr.toFixed(1)}%`;
    if (kpiPass) kpiPass.innerText = `${metrics.passRate.toFixed(1)}%`;
    if (kpiMedian) kpiMedian.innerText = `${metrics.medianRemainder} cards`;
    if (kpiIqr) kpiIqr.innerText = `±${metrics.iqrRemainder}`;
    if (kpiBomb) kpiBomb.innerText = `${metrics.bombLossRate.toFixed(1)}%`;

    if (kpiCwrCard) {
      if (cwr >= 68.0 && cwr <= 72.0) {
        kpiCwrCard.className = 'kpi-card target-matched';
      } else if (cwr >= 60.0 && cwr <= 80.0) {
        kpiCwrCard.className = 'kpi-card';
      } else {
        kpiCwrCard.className = 'kpi-card target-missed';
      }
    }

    // Render Charts
    const histContainer = this.container.querySelector('#chart-histogram') as HTMLElement;
    const donutContainer = this.container.querySelector('#chart-donut') as HTMLElement;

    if (histContainer) {
      ChartsView.renderHistogram(histContainer, metrics.remainderDistribution, metrics.wins);
    }
    if (donutContainer) {
      ChartsView.renderOutcomeDonut(donutContainer, metrics);
    }
  }
}
