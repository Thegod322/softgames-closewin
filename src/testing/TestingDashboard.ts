import {
  DEFAULT_BOT_CONFIG,
  DEFAULT_SIMULATION_SETTINGS,
  GoldenSeedEntry,
  LevelAnalysisReport,
  LevelJSON,
  type SimulationMetrics,
  type SimulationSettings,
} from '../core/types.ts';

import { runSimulationAsync } from '../workers/sim.worker.ts';
import { AutoCalibrator } from './AutoCalibrator.ts';
import { ChartsView } from './ChartsView.ts';
import { JsonExporter } from './JsonExporter.ts';
import { SeedMiner } from '../core/SeedMiner.ts';

export class TestingDashboard {
  private container!: HTMLElement;
  private levelMap: Map<string, LevelJSON> = new Map();
  private currentLevelId: string = 'level_25';
  private autoCalibrator: AutoCalibrator = new AutoCalibrator();
  private currentMetrics: SimulationMetrics | null = null;
  private lastAnalysisReport: LevelAnalysisReport | null = null;
  private optimalDeckSize: number | null = null;
  private onPlayLevel?: (levelJson: LevelJSON, customDeckSize?: number, customSeed?: number) => void;
  private isSimulating: boolean = false;
  private isMining: boolean = false;
  private isAnalyzing: boolean = false;
  private miningAbortSignal: { aborted: boolean } | null = null;

  private currentGoldenSeeds: GoldenSeedEntry[] = [];
  private selectedSeedEntry: GoldenSeedEntry | null = null;

  private settings: SimulationSettings = {
    targetCWR: DEFAULT_SIMULATION_SETTINGS.targetCWR,
    tolerance: DEFAULT_SIMULATION_SETTINGS.tolerance,
    iterations: DEFAULT_SIMULATION_SETTINGS.iterations,
    seedOffset: DEFAULT_SIMULATION_SETTINGS.seedOffset,
    useGoldenSeeds: false,
    botConfig: { ...DEFAULT_BOT_CONFIG },
  };

  public getCurrentMetrics(): SimulationMetrics | null {
    return this.currentMetrics;
  }

  public getActiveGoldenSeeds(): GoldenSeedEntry[] {
    return this.currentGoldenSeeds;
  }

  public getActiveGoldenSeedIds(): number[] {
    return this.currentGoldenSeeds.map((s) => s.seed);
  }

  public init(
    container: HTMLElement,
    levelMap: Map<string, LevelJSON>,
    onPlayLevel?: (levelJson: LevelJSON, customDeckSize?: number, customSeed?: number) => void
  ): void {
    this.container = container;
    this.levelMap = levelMap;
    this.onPlayLevel = onPlayLevel;

    this.renderUI();
    this.attachEvents();
    this.runFullAnalysis();
  }

  private renderUI(): void {
    const currentLevel = this.levelMap.get(this.currentLevelId)!;
    const defaultDeckSize = currentLevel.settings.cards_in_stack.length;
    const goldenCount = this.currentGoldenSeeds.length;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Top Executive Workbench Bar -->
        <div class="workbench-top-bar">
          <div class="workbench-left">
            <label for="tuner-level-select" style="font-weight: 700; font-size: 14px; color: var(--accent-blue);">🎯 Target Level:</label>
            <select id="tuner-level-select" class="workbench-level-select">
              <option value="level_25">Level 25 (Baseline / Hard Layout)</option>
              <option value="level_31">Level 31 (Zap + Locks + Keys)</option>
              <option value="level_43">Level 43 (Complex Multi-Layer)</option>
              <option value="level_54">Level 54 (Bomb Modifiers - Timer 5)</option>
            </select>
            <span class="badge-pill" id="golden-pool-count-badge">🌟 ${goldenCount} Dynamically Mined Seeds</span>
          </div>

          <div class="workbench-actions">
            <button id="btn-run-full-analysis" class="btn-analyze-full">
              <span>🚀 Run Full Level Analysis</span>
            </button>
            <button id="btn-export-json" class="btn btn-secondary">💾 Export JSON</button>
            <button id="btn-play-level" class="btn btn-accent">🎮 Play Level</button>
          </div>
        </div>

        <!-- Execution Status Banner & Multi-Stage Progress Bar -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div class="sim-status-banner" id="sim-status-banner">
            <span class="status-dot ready"></span>
            <span class="status-text" id="sim-status-text">Ready for analysis</span>
          </div>

          <div class="progress-bar-container" id="tuner-progress-wrap">
            <div class="progress-bar-fill" id="tuner-progress-fill"></div>
          </div>
        </div>

        <!-- Symmetrical 3-Target Calibration Matrix -->
        <div class="target-cards-grid">
          <!-- Target 1 Card: Strict Brief (70% CWR) -->
          <div class="target-card highlight" id="target-card-brief">
            <div>
              <div class="target-card-header">
                <span class="target-card-title">🎯 Target 1: Strict Brief</span>
                <span class="target-card-badge badge-gold" id="target1-badge">70% CWR</span>
              </div>
              <div class="target-deck-display">
                <span class="target-deck-num" id="target1-deck-num">--</span>
                <span class="target-deck-lbl">cards in deck</span>
                <span class="badge-sample-size">N = 2,000 games</span>
              </div>
              <!-- Target 1 Outcome Breakdown Donut -->
              <div class="target-donut-container" id="target1-donut-container"></div>
              <div class="target-metrics-list" id="target1-metrics-list">
                ${this.renderTargetMetricsSkeleton('target1')}
              </div>
              <!-- Embedded 3-Persona Benchmark for Target 1 -->
              ${this.renderTargetPersonaBenchmarkSkeleton('target1')}
            </div>
            <button id="btn-apply-target1" class="btn btn-warning btn-apply-target">
              🎮 Apply & Play 70% Brief Deck
            </button>
          </div>

          <!-- Target 2 Card: Retention Peak (Max Drama) -->
          <div class="target-card peak" id="target-card-peak">
            <div>
              <div class="target-card-header">
                <span class="target-card-title">⚡ Target 2: Retention Peak</span>
                <span class="target-card-badge badge-blue">Max Excitement</span>
              </div>
              <div class="target-deck-display">
                <span class="target-deck-num" id="target2-deck-num">--</span>
                <span class="target-deck-lbl">cards in deck</span>
                <span class="badge-sample-size">N = 2,000 games</span>
              </div>
              <!-- Target 2 Outcome Breakdown Donut -->
              <div class="target-donut-container" id="target2-donut-container"></div>
              <div class="target-metrics-list" id="target2-metrics-list">
                ${this.renderTargetMetricsSkeleton('target2')}
              </div>
              <!-- Embedded 3-Persona Benchmark for Target 2 -->
              ${this.renderTargetPersonaBenchmarkSkeleton('target2')}
            </div>
            <button id="btn-apply-target2" class="btn btn-peak btn-apply-target">
              🎮 Apply & Play Peak Deck
            </button>
          </div>

          <!-- Target 3 Card: Raw Baseline -->
          <div class="target-card baseline" id="target-card-baseline">
            <div>
              <div class="target-card-header">
                <span class="target-card-title">📦 Target 3: Raw Baseline</span>
                <span class="target-card-badge badge-slate">Original JSON</span>
              </div>
              <div class="target-deck-display">
                <span class="target-deck-num" id="target3-deck-num">${defaultDeckSize}</span>
                <span class="target-deck-lbl">cards in deck</span>
                <span class="badge-sample-size">N = 2,000 games</span>
              </div>
              <!-- Target 3 Outcome Breakdown Donut -->
              <div class="target-donut-container" id="target3-donut-container"></div>
              <div class="target-metrics-list" id="target3-metrics-list">
                ${this.renderTargetMetricsSkeleton('target3')}
              </div>
              <!-- Embedded 3-Persona Benchmark for Target 3 -->
              ${this.renderTargetPersonaBenchmarkSkeleton('target3')}
            </div>
            <button id="btn-apply-target3" class="btn btn-secondary btn-apply-target">
              🎮 Apply & Play Raw Baseline
            </button>
          </div>
        </div>

        <!-- Expandable Manual Testing, Custom Simulations & Seed Miner Drawer -->
        <div class="manual-testing-drawer" id="manual-testing-drawer">
          <button type="button" class="drawer-toggle-btn" id="btn-toggle-manual-drawer">
            <div class="drawer-title-wrap">
              <span class="drawer-icon">🛠️</span>
              <div class="drawer-text-group">
                <h4 class="drawer-title">Manual Testing, Custom Simulations & Seed Miner</h4>
                <span class="drawer-subtitle">Click to expand custom batch iterations, manual bot heuristics adjustments, and single-seed deep dive</span>
              </div>
            </div>
            <span class="drawer-chevron" id="manual-drawer-chevron">▼ Expand Manual Testing</span>
          </button>

          <div id="manual-testing-content" class="drawer-content" style="display: none;">
            <div class="dashboard-details-grid">
              <!-- Left: Advanced Controls & Dynamic Golden Seed Miner -->
              <div class="tuner-card">
                <h3>⚙️ Manual Simulation & On-Demand Seed Miner</h3>

                <div class="form-group">
                  <label for="sim-iterations">Simulation Batch Iterations:</label>
                  <select id="sim-iterations">
                    <option value="1000">1,000 runs (Instant - 0.1s)</option>
                    <option value="2500" selected>2,500 runs (Accurate - 0.3s)</option>
                    <option value="5000">5,000 runs (Production - 0.7s)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="deck-slider">Custom Deck Size (Draw Pile):</label>
                  <div class="range-wrap">
                    <input type="range" id="deck-slider" min="5" max="45" value="${defaultDeckSize}" />
                    <span id="deck-slider-val" class="range-val">${defaultDeckSize}</span>
                  </div>
                </div>

                <!-- Dynamic Golden Seeds Mining Control Group -->
                <div class="form-group" style="background: rgba(251, 191, 36, 0.07); border: 1px solid rgba(251, 191, 36, 0.25); border-radius: var(--radius-sm); padding: 12px; margin-top: 4px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <label for="chk-use-golden-seeds" style="font-weight: 700; color: #fbbf24; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                      <input type="checkbox" id="chk-use-golden-seeds" />
                      <span>🌟 Use Active Golden Seeds Pool</span>
                    </label>
                    <span class="badge-pill" id="golden-pool-count-badge-side">${goldenCount} seeds</span>
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
                    Evaluates strictly against verified 100% winnable Close-Win seeds mined for this deck size.
                  </div>

                  <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button type="button" id="btn-mine-seeds" class="btn btn-mine" style="flex: 1;">
                      ⛏️ Mine 500 Golden Seeds for Hand ${defaultDeckSize}
                    </button>
                    <button type="button" id="btn-stop-mining" class="btn-stop-mining" style="display: none;">
                      ⏹ Stop
                    </button>
                  </div>

                  <!-- Live Mining Status Card -->
                  <div id="mining-progress-card" class="mining-status-card" style="display: none;">
                    <div class="mining-stats-row">
                      <span id="mining-status-lbl">⛏️ Mining in progress...</span>
                      <span id="mining-pct-lbl">0%</span>
                    </div>
                    <div class="mining-progress-bar">
                      <div id="mining-progress-fill" class="mining-progress-fill"></div>
                    </div>
                    <div class="mining-stats-row" style="font-size: 10px; color: var(--text-muted);">
                      <span id="mining-scanned-lbl">Scanned: 0</span>
                      <span id="mining-speed-lbl">Speed: 0 seeds/s</span>
                    </div>
                  </div>
                </div>

                <!-- Simulation Adjustments Dropdown Accordion -->
                <div class="sim-accordion" id="sim-adjustments-accordion">
                  <button type="button" class="accordion-toggle" id="btn-toggle-adjustments">
                    <span class="accordion-title">🛠️ Advanced Bot Weights & Heuristics</span>
                    <span class="accordion-icon" id="accordion-icon">▼</span>
                  </button>
                  <div class="accordion-content" id="adjustments-content" style="display: none;">
                    <div class="form-group">
                      <label for="adj-uncover">Uncover Weight (w<sub>uncover</sub>):</label>
                      <div class="range-wrap">
                        <input type="range" id="adj-uncover" min="0" max="10" step="0.1" value="${this.settings.botConfig.wUncover}" />
                        <span id="adj-uncover-val" class="range-val">${this.settings.botConfig.wUncover.toFixed(1)}</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="adj-depth">Depth Weight (w<sub>depth</sub>):</label>
                      <div class="range-wrap">
                        <input type="range" id="adj-depth" min="0" max="10" step="0.1" value="${this.settings.botConfig.wDepth}" />
                        <span id="adj-depth-val" class="range-val">${this.settings.botConfig.wDepth.toFixed(1)}</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="adj-chain">Chain Lookahead Weight (w<sub>chain</sub>):</label>
                      <div class="range-wrap">
                        <input type="range" id="adj-chain" min="0" max="10" step="0.1" value="${this.settings.botConfig.wChain}" />
                        <span id="adj-chain-val" class="range-val">${this.settings.botConfig.wChain.toFixed(1)}</span>
                      </div>
                    </div>

                    <div class="form-group">
                      <label for="adj-bomb-threshold">Bomb Defusal Urgency (moves left):</label>
                      <select id="adj-bomb-threshold">
                        <option value="1">1 move</option>
                        <option value="2" selected>2 moves (Default)</option>
                        <option value="3">3 moves</option>
                        <option value="4">4 moves</option>
                        <option value="5">5 moves</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="adj-zap-min">Zap Modifier Trigger (min cards in row):</label>
                      <select id="adj-zap-min">
                        <option value="1">1 card</option>
                        <option value="2" selected>2 cards (Default)</option>
                        <option value="3">3 cards</option>
                      </select>
                    </div>

                    <button id="btn-revert-defaults" class="btn btn-secondary btn-reset" style="margin-top: 6px;">
                      ↺ Revert All Settings to Default
                    </button>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
                  <button id="btn-run-sim" class="btn btn-secondary">▶ Run Manual Simulation</button>
                </div>

                <div id="calibration-log" style="font-size: 11px; color: var(--text-muted); max-height: 140px; overflow-y: auto; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 4px; font-family: monospace; display: none;"></div>
              </div>

              <!-- Right: Visual Distributions & Golden Seed Inspector -->
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Real Player Cohort Experience (1,000 Players) -->
                <div class="cohort-card">
                  <h4>👥 Real Player Conversion Experience (Cohort of 1,000 Players)</h4>
                  <div class="cohort-grid">
                    <div class="cohort-item">
                      <span class="cohort-val" id="cohort-winners" style="color: #22c55e;">--</span>
                      <span class="cohort-lbl">Won Level</span>
                    </div>
                    <div class="cohort-item">
                      <span class="cohort-val" id="cohort-close-wins" style="color: #fbbf24;">--</span>
                      <span class="cohort-lbl">Close Wins (&lt;3 cards left)</span>
                    </div>
                    <div class="cohort-item">
                      <span class="cohort-val" id="cohort-near-miss" style="color: #c084fc;">--</span>
                      <span class="cohort-lbl">Near Misses (≤2 cards on board)</span>
                    </div>
                    <div class="cohort-item highlight">
                      <span class="cohort-val" id="cohort-total-drama" style="color: #38bdf8;">-- / 1,000</span>
                      <span class="cohort-lbl">🔥 High-Excitement Cohort (Total Drama)</span>
                    </div>
                  </div>
                </div>

                <!-- Golden Seed Inspector & Single-Seed Deep Dive -->
                <div class="seed-inspector-card">
                  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <h4 style="margin: 0; color: #fbbf24; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                      <span>🔍 Dynamically Mined Golden Seeds</span>
                      <span class="badge-pill" id="inspector-seed-count">${goldenCount} Available</span>
                    </h4>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <select id="seed-inspector-select" class="seed-select"></select>
                      <button id="btn-test-single-seed" class="btn btn-secondary btn-sm">🔍 Test Seed (100 Runs)</button>
                      <button id="btn-play-single-seed" class="btn btn-accent btn-sm">🎮 Play This Seed</button>
                    </div>
                  </div>

                  <!-- Single Seed Stats Row -->
                  <div class="seed-details-grid" id="seed-details-view">
                    <div class="seed-detail-item">
                      <span class="seed-detail-lbl">Category</span>
                      <span class="seed-detail-val" id="seed-cat-val">--</span>
                    </div>
                    <div class="seed-detail-item">
                      <span class="seed-detail-lbl">Cards Remaining in Deck</span>
                      <span class="seed-detail-val" id="seed-rem-val">--</span>
                    </div>
                    <div class="seed-detail-item">
                      <span class="seed-detail-lbl">Max Streak</span>
                      <span class="seed-detail-val" id="seed-streak-val">--</span>
                    </div>
                    <div class="seed-detail-item">
                      <span class="seed-detail-lbl">Moves to Solve</span>
                      <span class="seed-detail-val" id="seed-moves-val">--</span>
                    </div>
                  </div>

                  <div id="seed-multirun-result" style="display: none; background: rgba(0,0,0,0.35); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 12px; border-left: 3px solid #38bdf8;">
                    <span id="seed-multirun-text"></span>
                  </div>
                </div>

                <!-- Charts Row -->
                <div class="charts-container">
                  <div class="chart-card">
                    <h4>📊 Win Remainder Distribution (0-2: Close Win Zone)</h4>
                    <div id="chart-histogram" class="chart-svg-wrap"></div>
                  </div>
                  <div class="chart-card">
                    <h4>🎯 Overall Outcome Breakdown</h4>
                    <div id="chart-donut" class="chart-svg-wrap"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderTargetMetricsSkeleton(prefix: string): string {
    return `
      <div class="target-metric-row">
        <span>🏆 Pass Rate (Overall Wins):</span>
        <strong id="${prefix}-pass">--%</strong>
      </div>
      <div class="target-metric-subrow" id="${prefix}-pass-sub">
        <span class="sub-count">(-- / 2,000 games | -- / 1,000 players)</span>
      </div>

      <div class="target-metric-row">
        <span>🎯 Close Win Rate (CWR):</span>
        <strong id="${prefix}-cwr" style="color: #fbbf24;">--%</strong>
      </div>
      <div class="target-metric-subrow" id="${prefix}-cwr-sub">
        <span class="sub-count">(-- / -- wins with &lt;3 cards left)</span>
      </div>

      <div class="target-metric-row">
        <span>🔥 Abs Close Wins (All Players):</span>
        <strong id="${prefix}-abs-cwr" style="color: #fbbf24;">--%</strong>
      </div>
      <div class="target-metric-subrow" id="${prefix}-abs-cwr-sub">
        <span class="sub-count">(-- / 2,000 games | -- / 1,000 players)</span>
      </div>

      <div class="target-metric-row">
        <span>🟣 Near Misses (≤2 on board):</span>
        <strong id="${prefix}-near-miss" style="color: #c084fc;">--%</strong>
      </div>
      <div class="target-metric-subrow" id="${prefix}-near-miss-sub">
        <span class="sub-count">(-- / 2,000 games | -- / 1,000 players)</span>
      </div>

      <div class="target-metric-row">
        <span>⚡ High-Excitement Cohort:</span>
        <strong id="${prefix}-drama" style="color: #38bdf8;">-- / 1,000</strong>
      </div>

      <div class="target-metric-row">
        <span>💥 Loss Causes Breakdown:</span>
        <strong id="${prefix}-losses" style="font-size: 11px;">Deck: --% | Bomb: --%</strong>
      </div>

      <div class="target-metric-row">
        <span>🃏 Median Remainder & Streak:</span>
        <strong id="${prefix}-median-streak" style="font-size: 11px;">Rem: -- | Streak: --</strong>
      </div>

      <div class="target-metric-row">
        <span>⏱️ Avg Moves to Solve:</span>
        <strong id="${prefix}-moves">--</strong>
      </div>
    `;
  }

  private updateTargetCardMetrics(prefix: string, metrics: SimulationMetrics): void {
    const setEl = (id: string, text: string) => {
      const el = this.container.querySelector(id) as HTMLElement;
      if (el) el.innerText = text;
    };

    const setHtml = (id: string, html: string) => {
      const el = this.container.querySelector(id) as HTMLElement;
      if (el) el.innerHTML = html;
    };

    const n = metrics.totalGames || 2000;
    const wins = metrics.wins;
    const pass1k = Math.round(metrics.passRate * 10);
    const close1k = Math.round(metrics.absCloseWinRate * 10);
    const nearMiss1k = Math.round(metrics.nearMissRate * 10);
    const drama1k = Math.round(metrics.dramaticRate * 10);

    setEl(`#${prefix}-pass`, `${metrics.passRate.toFixed(1)}%`);
    setHtml(`#${prefix}-pass-sub`, `<span class="sub-count">(${wins.toLocaleString()} / ${n.toLocaleString()} games | ${pass1k} / 1,000 players)</span>`);

    setEl(`#${prefix}-cwr`, `${metrics.closeWinRate.toFixed(1)}%`);
    setHtml(`#${prefix}-cwr-sub`, `<span class="sub-count">(${metrics.closeWins.toLocaleString()} / ${wins.toLocaleString()} wins with 0-2 cards)</span>`);

    setEl(`#${prefix}-abs-cwr`, `${metrics.absCloseWinRate.toFixed(1)}%`);
    setHtml(`#${prefix}-abs-cwr-sub`, `<span class="sub-count">(${metrics.closeWins.toLocaleString()} / ${n.toLocaleString()} games | ${close1k} / 1,000 players)</span>`);

    setEl(`#${prefix}-near-miss`, `${metrics.nearMissRate.toFixed(1)}%`);
    setHtml(`#${prefix}-near-miss-sub`, `<span class="sub-count">(${metrics.nearMisses.toLocaleString()} / ${n.toLocaleString()} games | ${nearMiss1k} / 1,000 players)</span>`);

    setEl(`#${prefix}-drama`, `${drama1k} / 1,000 players (${metrics.dramaticRate.toFixed(1)}%)`);
    setEl(`#${prefix}-losses`, `Deck: ${metrics.deckLossRate.toFixed(1)}% | Bomb: ${metrics.bombLossRate.toFixed(1)}%`);
    setEl(`#${prefix}-median-streak`, `Rem: ${metrics.medianRemainder} cards | Streak: ${metrics.avgStreak.toFixed(1)}`);
    setEl(`#${prefix}-moves`, `${metrics.avgMoves.toFixed(1)} moves`);
  }

  private renderTargetPersonaBenchmarkSkeleton(prefix: string): string {
    return `
      <div class="card-persona-benchmark" id="${prefix}-persona-benchmark">
        <div class="card-persona-header">
          <div class="card-persona-title-row">
            <span class="card-persona-title">👥 3-Persona Benchmark</span>
            <span class="badge-skill-gap" id="${prefix}-skill-gap-tag">ΔPR: +--%</span>
          </div>
          <div class="card-persona-subtitle" id="${prefix}-persona-pool-subtitle">
            <span>🌟 150 Seeds vs 🎲 600 PRNG</span>
          </div>
        </div>

        <div class="card-persona-bars-list">
          <!-- Expert Row -->
          <div class="card-persona-row expert-row">
            <div class="persona-row-top">
              <span class="persona-name"><span class="persona-icon">🟢</span> Expert</span>
              <div class="persona-rates">
                <span class="rate-golden" title="Fresh Golden Seeds Pass Rate" id="${prefix}-p-exp-golden-lbl">🌟 --%</span>
                <span class="rate-sep">|</span>
                <span class="rate-random" title="Random Deals Pass Rate" id="${prefix}-p-exp-rand-lbl">🎲 --%</span>
              </div>
            </div>
            <div class="persona-dual-bar-track">
              <div class="bar-fill bar-random exp-rand-bar" id="${prefix}-p-exp-rand-bar" style="width: 0%;"></div>
              <div class="bar-fill bar-golden exp-golden-bar" id="${prefix}-p-exp-golden-bar" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Medium Row -->
          <div class="card-persona-row medium-row">
            <div class="persona-row-top">
              <span class="persona-name"><span class="persona-icon">🟡</span> Medium</span>
              <div class="persona-rates">
                <span class="rate-golden" title="Fresh Golden Seeds Pass Rate" id="${prefix}-p-med-golden-lbl">🌟 --%</span>
                <span class="rate-sep">|</span>
                <span class="rate-random" title="Random Deals Pass Rate" id="${prefix}-p-med-rand-lbl">🎲 --%</span>
              </div>
            </div>
            <div class="persona-dual-bar-track">
              <div class="bar-fill bar-random med-rand-bar" id="${prefix}-p-med-rand-bar" style="width: 0%;"></div>
              <div class="bar-fill bar-golden med-golden-bar" id="${prefix}-p-med-golden-bar" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Casual Row -->
          <div class="card-persona-row casual-row">
            <div class="persona-row-top">
              <span class="persona-name"><span class="persona-icon">🔴</span> Casual</span>
              <div class="persona-rates">
                <span class="rate-golden" title="Fresh Golden Seeds Pass Rate" id="${prefix}-p-cas-golden-lbl">🌟 --%</span>
                <span class="rate-sep">|</span>
                <span class="rate-random" title="Random Deals Pass Rate" id="${prefix}-p-cas-rand-lbl">🎲 --%</span>
              </div>
            </div>
            <div class="persona-dual-bar-track">
              <div class="bar-fill bar-random cas-rand-bar" id="${prefix}-p-cas-rand-bar" style="width: 0%;"></div>
              <div class="bar-fill bar-golden cas-golden-bar" id="${prefix}-p-cas-golden-bar" style="width: 0%;"></div>
            </div>
          </div>
        </div>

        <div class="card-persona-details-wrap">
          <button type="button" class="btn-toggle-persona-details" id="${prefix}-btn-toggle-persona">
            <span class="toggle-text">Micro Metrics Breakdown</span>
            <span class="toggle-icon" id="${prefix}-persona-chevron">▼</span>
          </button>

          <div class="card-persona-matrix-content" id="${prefix}-persona-content" style="display: none;">
            <table class="card-persona-microtable">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th title="Close Win Rate">CWR</th>
                  <th title="Near Misses (≤2 cards on board)">Near Miss</th>
                  <th title="Loss due to Bomb Exploding">Bomb</th>
                  <th title="Average Streak Length">Streak</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style="color: #22c55e;">Expert</strong></td>
                  <td id="${prefix}-t-exp-cwr">--%</td>
                  <td id="${prefix}-t-exp-miss">--%</td>
                  <td id="${prefix}-t-exp-bomb">--%</td>
                  <td id="${prefix}-t-exp-streak">--</td>
                </tr>
                <tr>
                  <td><strong style="color: #fbbf24;">Medium</strong></td>
                  <td id="${prefix}-t-med-cwr">--%</td>
                  <td id="${prefix}-t-med-miss">--%</td>
                  <td id="${prefix}-t-med-bomb">--%</td>
                  <td id="${prefix}-t-med-streak">--</td>
                </tr>
                <tr>
                  <td><strong style="color: #ef4444;">Casual</strong></td>
                  <td id="${prefix}-t-cas-cwr">--%</td>
                  <td id="${prefix}-t-cas-miss">--%</td>
                  <td id="${prefix}-t-cas-bomb">--%</td>
                  <td id="${prefix}-t-cas-streak">--</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private updateTargetCardPersonaBenchmark(
    prefix: string,
    data: import('../core/types.ts').TargetCalibrationData
  ): void {
    const { deckSize, goldenSeedsMinedCount, personaResultsGolden, personaResultsRandom, skillIndex } = data;
    const expG = personaResultsGolden.expert;
    const expR = personaResultsRandom.expert;
    const medG = personaResultsGolden.medium;
    const medR = personaResultsRandom.medium;
    const casG = personaResultsGolden.casual;
    const casR = personaResultsRandom.casual;

    // 1. Header & Subtitle
    const skillTag = this.container.querySelector(`#${prefix}-skill-gap-tag`) as HTMLElement;
    const poolSub = this.container.querySelector(`#${prefix}-persona-pool-subtitle`) as HTMLElement;
    if (skillTag) skillTag.innerText = `ΔPR: +${skillIndex.toFixed(1)}%`;
    if (poolSub) poolSub.innerText = `🌟 ${goldenSeedsMinedCount} Seeds (K=${deckSize}) vs 🎲 600 PRNG`;

    // 2. Bar Labels & Widths
    const setBar = (idPrefix: string, golden: SimulationMetrics, rand: SimulationMetrics) => {
      const lblG = this.container.querySelector(`#${idPrefix}-golden-lbl`) as HTMLElement;
      const lblR = this.container.querySelector(`#${idPrefix}-rand-lbl`) as HTMLElement;
      const barG = this.container.querySelector(`#${idPrefix}-golden-bar`) as HTMLElement;
      const barR = this.container.querySelector(`#${idPrefix}-rand-bar`) as HTMLElement;

      if (lblG) lblG.innerText = `🌟 ${golden.passRate.toFixed(0)}%`;
      if (lblR) lblR.innerText = `🎲 ${rand.passRate.toFixed(0)}%`;
      if (barG) barG.style.width = `${Math.min(100, Math.max(0, golden.passRate))}%`;
      if (barR) barR.style.width = `${Math.min(100, Math.max(0, rand.passRate))}%`;
    };

    setBar(`${prefix}-p-exp`, expG, expR);
    setBar(`${prefix}-p-med`, medG, medR);
    setBar(`${prefix}-p-cas`, casG, casR);

    // 3. Micro-Table Details
    const setEl = (id: string, text: string) => {
      const el = this.container.querySelector(id) as HTMLElement;
      if (el) el.innerText = text;
    };

    setEl(`#${prefix}-t-exp-cwr`, `${expG.closeWinRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-exp-miss`, `${expG.nearMissRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-exp-bomb`, `${expG.bombLossRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-exp-streak`, `${expG.avgStreak.toFixed(1)}`);

    setEl(`#${prefix}-t-med-cwr`, `${medG.closeWinRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-med-miss`, `${medG.nearMissRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-med-bomb`, `${medG.bombLossRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-med-streak`, `${medG.avgStreak.toFixed(1)}`);

    setEl(`#${prefix}-t-cas-cwr`, `${casG.closeWinRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-cas-miss`, `${casG.nearMissRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-cas-bomb`, `${casG.bombLossRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-cas-streak`, `${casG.avgStreak.toFixed(1)}`);
  }

  private attachEvents(): void {
    const levelSelect = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
    const btnRunFullAnalysis = this.container.querySelector('#btn-run-full-analysis') as HTMLButtonElement;
    const btnExport = this.container.querySelector('#btn-export-json') as HTMLButtonElement;
    const btnPlay = this.container.querySelector('#btn-play-level') as HTMLButtonElement;

    const btnApplyTarget1 = this.container.querySelector('#btn-apply-target1') as HTMLButtonElement;
    const btnApplyTarget2 = this.container.querySelector('#btn-apply-target2') as HTMLButtonElement;
    const btnApplyTarget3 = this.container.querySelector('#btn-apply-target3') as HTMLButtonElement;

    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const deckVal = this.container.querySelector('#deck-slider-val') as HTMLElement;
    const btnRunSim = this.container.querySelector('#btn-run-sim') as HTMLButtonElement;
    const chkGolden = this.container.querySelector('#chk-use-golden-seeds') as HTMLInputElement;
    const btnMine = this.container.querySelector('#btn-mine-seeds') as HTMLButtonElement;
    const btnStopMining = this.container.querySelector('#btn-stop-mining') as HTMLButtonElement;

    // Seed Inspector Elements
    const seedSelect = this.container.querySelector('#seed-inspector-select') as HTMLSelectElement;
    const btnTestSeed = this.container.querySelector('#btn-test-single-seed') as HTMLButtonElement;
    const btnPlaySeed = this.container.querySelector('#btn-play-single-seed') as HTMLButtonElement;

    btnRunFullAnalysis?.addEventListener('click', () => {
      this.runFullAnalysis();
    });

    btnApplyTarget1?.addEventListener('click', () => {
      if (this.lastAnalysisReport) {
        const lvl = this.levelMap.get(this.currentLevelId)!;
        const targetDeck = this.lastAnalysisReport.targetBrief.deckSize;
        this.onPlayLevel?.(lvl, targetDeck);
      }
    });

    btnApplyTarget2?.addEventListener('click', () => {
      if (this.lastAnalysisReport) {
        const lvl = this.levelMap.get(this.currentLevelId)!;
        const targetDeck = this.lastAnalysisReport.targetPeak.deckSize;
        this.onPlayLevel?.(lvl, targetDeck);
      }
    });

    btnApplyTarget3?.addEventListener('click', () => {
      if (this.lastAnalysisReport) {
        const lvl = this.levelMap.get(this.currentLevelId)!;
        const targetDeck = this.lastAnalysisReport.baseline.deckSize;
        this.onPlayLevel?.(lvl, targetDeck);
      }
    });

    levelSelect?.addEventListener('change', () => {
      this.currentLevelId = levelSelect.value;
      const lvl = this.levelMap.get(this.currentLevelId)!;
      if (deckSlider) {
        deckSlider.value = `${lvl.settings.cards_in_stack.length}`;
        if (deckVal) deckVal.innerText = `${lvl.settings.cards_in_stack.length}`;
      }
      if (btnMine) {
        btnMine.innerText = `⛏️ Mine 500 Golden Seeds for Hand ${lvl.settings.cards_in_stack.length}`;
      }

      this.currentGoldenSeeds = [];
      this.populateGoldenSeedsInspector();
      this.runFullAnalysis();
    });

    chkGolden?.addEventListener('change', () => {
      this.settings.useGoldenSeeds = chkGolden.checked;
      this.showToast(
        chkGolden.checked
          ? `🌟 Active Golden Seeds Pool activated (${this.currentGoldenSeeds.length} seeds)!`
          : '🎲 Standard Random PRNG activated!'
      );
      this.runManualSimulation();
    });

    btnMine?.addEventListener('click', () => {
      this.runSeedMining();
    });

    btnStopMining?.addEventListener('click', () => {
      if (this.miningAbortSignal) {
        this.miningAbortSignal.aborted = true;
        this.showToast('⏹ Stopping seed miner...');
      }
    });

    seedSelect?.addEventListener('change', () => {
      const idx = parseInt(seedSelect.value, 10);
      this.selectedSeedEntry = this.currentGoldenSeeds[idx] || null;
      this.updateSelectedSeedDetails();
    });

    btnTestSeed?.addEventListener('click', () => {
      this.testSelectedSeed(100);
    });

    btnPlaySeed?.addEventListener('click', () => {
      if (this.selectedSeedEntry) {
        const lvl = this.levelMap.get(this.currentLevelId)!;
        const targetDeck = this.optimalDeckSize || parseInt(deckSlider?.value || '14', 10);
        this.onPlayLevel?.(lvl, targetDeck, this.selectedSeedEntry.seed);
      }
    });

    // Persona Details Accordions for each Target
    ['target1', 'target2', 'target3'].forEach((prefix) => {
      const btn = this.container.querySelector(`#${prefix}-btn-toggle-persona`) as HTMLButtonElement;
      const content = this.container.querySelector(`#${prefix}-persona-content`) as HTMLElement;
      const chevron = this.container.querySelector(`#${prefix}-persona-chevron`) as HTMLElement;

      btn?.addEventListener('click', () => {
        const isExp = content.style.display !== 'none';
        content.style.display = isExp ? 'none' : 'block';
        if (chevron) chevron.innerText = isExp ? '▼' : '▲';
      });
    });

    // Manual testing drawer toggle
    const btnToggleManual = this.container.querySelector('#btn-toggle-manual-drawer') as HTMLButtonElement;
    const manualContent = this.container.querySelector('#manual-testing-content') as HTMLElement;
    const manualChevron = this.container.querySelector('#manual-drawer-chevron') as HTMLElement;

    btnToggleManual?.addEventListener('click', () => {
      const isExpanded = manualContent.style.display !== 'none';
      manualContent.style.display = isExpanded ? 'none' : 'block';
      if (manualChevron) {
        manualChevron.innerText = isExpanded ? '▼ Expand Manual Testing' : '▲ Collapse Manual Testing';
      }
    });

    // Accordion toggle
    const btnToggle = this.container.querySelector('#btn-toggle-adjustments') as HTMLButtonElement;
    const adjustmentsContent = this.container.querySelector('#adjustments-content') as HTMLElement;
    const accordionIcon = this.container.querySelector('#accordion-icon') as HTMLElement;

    btnToggle?.addEventListener('click', () => {
      const isExpanded = adjustmentsContent.style.display !== 'none';
      adjustmentsContent.style.display = isExpanded ? 'none' : 'block';
      if (accordionIcon) {
        accordionIcon.innerText = isExpanded ? '▼' : '▲';
      }
    });

    // Advanced adjustments
    const adjUncover = this.container.querySelector('#adj-uncover') as HTMLInputElement;
    const adjUncoverVal = this.container.querySelector('#adj-uncover-val') as HTMLElement;
    const adjDepth = this.container.querySelector('#adj-depth') as HTMLInputElement;
    const adjDepthVal = this.container.querySelector('#adj-depth-val') as HTMLElement;
    const adjChain = this.container.querySelector('#adj-chain') as HTMLInputElement;
    const adjChainVal = this.container.querySelector('#adj-chain-val') as HTMLElement;
    const adjBomb = this.container.querySelector('#adj-bomb-threshold') as HTMLSelectElement;
    const adjZap = this.container.querySelector('#adj-zap-min') as HTMLSelectElement;
    const btnRevert = this.container.querySelector('#btn-revert-defaults') as HTMLButtonElement;

    adjUncover?.addEventListener('input', () => {
      this.settings.botConfig.wUncover = parseFloat(adjUncover.value);
      if (adjUncoverVal) adjUncoverVal.innerText = this.settings.botConfig.wUncover.toFixed(1);
    });
    adjDepth?.addEventListener('input', () => {
      this.settings.botConfig.wDepth = parseFloat(adjDepth.value);
      if (adjDepthVal) adjDepthVal.innerText = this.settings.botConfig.wDepth.toFixed(1);
    });
    adjChain?.addEventListener('input', () => {
      this.settings.botConfig.wChain = parseFloat(adjChain.value);
      if (adjChainVal) adjChainVal.innerText = this.settings.botConfig.wChain.toFixed(1);
    });
    adjBomb?.addEventListener('change', () => {
      this.settings.botConfig.bombUrgencyThreshold = parseInt(adjBomb.value, 10);
    });
    adjZap?.addEventListener('change', () => {
      this.settings.botConfig.zapMinRowCards = parseInt(adjZap.value, 10);
    });

    btnRevert?.addEventListener('click', () => {
      this.revertAllSettingsToDefault();
    });

    deckSlider?.addEventListener('input', () => {
      if (deckVal) deckVal.innerText = deckSlider.value;
      if (btnMine && !this.isMining) {
        btnMine.innerText = `⛏️ Mine 500 Golden Seeds for Hand ${deckSlider.value}`;
      }
    });

    btnRunSim?.addEventListener('click', () => {
      this.runManualSimulation();
    });

    btnExport?.addEventListener('click', () => {
      const lvl = this.levelMap.get(this.currentLevelId)!;
      const targetDeck = this.optimalDeckSize || parseInt(deckSlider?.value || '14', 10);
      JsonExporter.exportCalibratedLevel(lvl, targetDeck);
    });

    btnPlay?.addEventListener('click', () => {
      const lvl = this.levelMap.get(this.currentLevelId)!;
      const targetDeck = this.optimalDeckSize || parseInt(deckSlider?.value || '14', 10);
      this.onPlayLevel?.(lvl, targetDeck);
    });
  }

  public async runFullAnalysis(): Promise<void> {
    if (this.isAnalyzing || this.isSimulating || this.isMining) return;

    const lvl = this.levelMap.get(this.currentLevelId)!;
    const progressWrap = this.container.querySelector('#tuner-progress-wrap') as HTMLElement;
    const progressFill = this.container.querySelector('#tuner-progress-fill') as HTMLElement;
    const textEl = this.container.querySelector('#sim-status-text') as HTMLElement;
    const btnAnalyze = this.container.querySelector('#btn-run-full-analysis') as HTMLButtonElement;

    this.isAnalyzing = true;
    if (btnAnalyze) {
      btnAnalyze.disabled = true;
      btnAnalyze.innerHTML = '<span>⏳ Analyzing & Mining Seeds...</span>';
    }

    if (progressWrap) progressWrap.style.display = 'block';
    this.setSimulatingState(true, `🚀 Running Comprehensive Analysis for ${lvl.id}...`);

    const startTime = performance.now();

    try {
      const report = await this.autoCalibrator.runFullLevelAnalysisAsync(lvl, {
        seedOffset: this.settings.seedOffset,
        botConfig: this.settings.botConfig,
        onProgress: (stageDesc, pct) => {
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (textEl) textEl.innerText = stageDesc;
        },
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      this.lastAnalysisReport = report;
      this.optimalDeckSize = report.targetBrief.deckSize;
      this.currentMetrics = report.targetBrief.metrics;
      this.currentGoldenSeeds = report.targetBrief.minedGoldenSeeds;

      // Update UI with report results
      this.renderReportResults(report);
      this.populateGoldenSeedsInspector();

      this.isAnalyzing = false;
      if (btnAnalyze) {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = '<span>🚀 Run Full Level Analysis</span>';
      }

      this.setSimulatingState(
        false,
        `✅ Full Analysis Complete in ${(elapsedMs / 1000).toFixed(1)}s (Target 1 Deck: ${report.targetBrief.deckSize} cards | Target 2: ${report.targetPeak.deckSize} cards | Baseline: ${report.baseline.deckSize} cards)`
      );
      this.showToast('✨ Analysis complete! Mined seeds and calibrated personas for all 3 targets!');
    } catch (e) {
      console.error('Full analysis error:', e);
      this.isAnalyzing = false;
      if (btnAnalyze) {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = '<span>🚀 Run Full Level Analysis</span>';
      }
      this.setSimulatingState(false, '❌ Analysis failed');
    }
  }

  private renderReportResults(report: LevelAnalysisReport): void {
    // 1. Target 1 Card (Brief 70%)
    const t1Deck = this.container.querySelector('#target1-deck-num') as HTMLElement;
    const t1Badge = this.container.querySelector('#target1-badge') as HTMLElement;
    if (t1Deck) t1Deck.innerText = `${report.targetBrief.deckSize}`;
    if (t1Badge) t1Badge.innerText = `${report.targetBrief.metrics.closeWinRate.toFixed(1)}% CWR`;
    this.updateTargetCardMetrics('target1', report.targetBrief.metrics);
    const t1Donut = this.container.querySelector('#target1-donut-container') as HTMLElement;
    if (t1Donut) ChartsView.renderTargetDualDonuts(t1Donut, report.targetBrief.metrics);
    this.updateTargetCardPersonaBenchmark('target1', report.targetBrief);

    // 2. Target 2 Card (Retention Peak)
    const t2Deck = this.container.querySelector('#target2-deck-num') as HTMLElement;
    if (t2Deck) t2Deck.innerText = `${report.targetPeak.deckSize}`;
    this.updateTargetCardMetrics('target2', report.targetPeak.metrics);
    const t2Donut = this.container.querySelector('#target2-donut-container') as HTMLElement;
    if (t2Donut) ChartsView.renderTargetDualDonuts(t2Donut, report.targetPeak.metrics);
    this.updateTargetCardPersonaBenchmark('target2', report.targetPeak);

    // 3. Target 3 Card (Raw Baseline)
    const t3Deck = this.container.querySelector('#target3-deck-num') as HTMLElement;
    if (t3Deck) t3Deck.innerText = `${report.baseline.deckSize}`;
    this.updateTargetCardMetrics('target3', report.baseline.metrics);
    const t3Donut = this.container.querySelector('#target3-donut-container') as HTMLElement;
    if (t3Donut) ChartsView.renderTargetDualDonuts(t3Donut, report.baseline.metrics);
    this.updateTargetCardPersonaBenchmark('target3', report.baseline);

    // 4. Update Top Bar Badge with fresh seeds count & hand size
    const topBadge = this.container.querySelector('#golden-pool-count-badge') as HTMLElement;
    if (topBadge) {
      topBadge.innerText = `🌟 ${report.targetBrief.goldenSeedsMinedCount} Mined Seeds (Hand: ${report.targetBrief.deckSize} cards)`;
    }

    // 5. Render Cohort & Standard Visualizations with Brief target metrics
    this.updateDashboardMetrics(report.targetBrief.metrics);
  }

  private updateDashboardMetrics(metrics: SimulationMetrics): void {
    const cohortWinners = this.container.querySelector('#cohort-winners') as HTMLElement;
    const cohortCloseWins = this.container.querySelector('#cohort-close-wins') as HTMLElement;
    const cohortNearMiss = this.container.querySelector('#cohort-near-miss') as HTMLElement;
    const cohortTotalDrama = this.container.querySelector('#cohort-total-drama') as HTMLElement;

    if (cohortWinners) cohortWinners.innerText = `${Math.round(metrics.passRate * 10)} players`;
    if (cohortCloseWins) cohortCloseWins.innerText = `${Math.round(metrics.absCloseWinRate * 10)} players`;
    if (cohortNearMiss) cohortNearMiss.innerText = `${Math.round(metrics.nearMissRate * 10)} players`;
    if (cohortTotalDrama) cohortTotalDrama.innerText = `${Math.round(metrics.dramaticRate * 10)} / 1,000 players`;

    const histContainer = this.container.querySelector('#chart-histogram') as HTMLElement;
    const donutContainer = this.container.querySelector('#chart-donut') as HTMLElement;

    if (histContainer) {
      ChartsView.renderHistogram(histContainer, metrics.remainderDistribution, metrics.wins);
    }
    if (donutContainer) {
      ChartsView.renderOutcomeDonut(donutContainer, metrics);
    }
  }

  private async runManualSimulation(): Promise<void> {
    if (this.isSimulating || this.isMining || this.isAnalyzing) return;

    const lvl = this.levelMap.get(this.currentLevelId)!;
    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const iterSelect = this.container.querySelector('#sim-iterations') as HTMLSelectElement;
    const progressFill = this.container.querySelector('#tuner-progress-fill') as HTMLElement;
    const textEl = this.container.querySelector('#sim-status-text') as HTMLElement;

    const deckSize = parseInt(deckSlider?.value || '14', 10);
    const iterations = parseInt(iterSelect?.value || '2500', 10);

    const goldenSeedIds = this.settings.useGoldenSeeds
      ? this.currentGoldenSeeds.map((e) => e.seed)
      : undefined;

    const modeLabel = this.settings.useGoldenSeeds ? `🌟 Mined Golden Seeds (${this.currentGoldenSeeds.length})` : '🎲 Random PRNG';
    this.setSimulatingState(true, `⏳ Running simulation [${modeLabel}] (N = ${iterations.toLocaleString()})...`);
    const startTime = performance.now();

    try {
      const metrics = await runSimulationAsync(
        lvl,
        iterations,
        deckSize,
        this.settings.seedOffset,
        this.settings.botConfig,
        (completed, total) => {
          const pct = Math.round((completed / total) * 100);
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (textEl) {
            textEl.innerText = `⏳ Simulating ${lvl.id} [${modeLabel}]... ${pct}% (${completed.toLocaleString()} / ${total.toLocaleString()})`;
          }
        },
        goldenSeedIds
      );

      const elapsedMs = Math.round(performance.now() - startTime);
      this.currentMetrics = metrics;
      this.updateDashboardMetrics(metrics);

      this.setSimulatingState(
        false,
        `✅ Finished ${iterations.toLocaleString()} runs in ${elapsedMs}ms (CWR: ${metrics.closeWinRate.toFixed(1)}%, Pass: ${metrics.passRate.toFixed(1)}%)`
      );
    } catch (e) {
      console.error('Simulation error:', e);
      this.setSimulatingState(false, '❌ Simulation failed');
    }
  }

  private populateGoldenSeedsInspector(): void {
    const seedSelect = this.container.querySelector('#seed-inspector-select') as HTMLSelectElement;
    const countBadge = this.container.querySelector('#golden-pool-count-badge') as HTMLElement;
    const countBadgeSide = this.container.querySelector('#golden-pool-count-badge-side') as HTMLElement;
    const inspectorCount = this.container.querySelector('#inspector-seed-count') as HTMLElement;

    const text = `🌟 ${this.currentGoldenSeeds.length} Dynamically Mined Seeds`;
    if (countBadge) countBadge.innerText = text;
    if (countBadgeSide) countBadgeSide.innerText = `${this.currentGoldenSeeds.length} seeds`;
    if (inspectorCount) inspectorCount.innerText = `${this.currentGoldenSeeds.length} Available`;

    if (!seedSelect) return;
    seedSelect.innerHTML = '';

    if (this.currentGoldenSeeds.length === 0) {
      seedSelect.innerHTML = '<option value="">No seeds mined yet</option>';
      this.selectedSeedEntry = null;
      this.updateSelectedSeedDetails();
      return;
    }

    const previewCount = Math.min(100, this.currentGoldenSeeds.length);
    for (let i = 0; i < previewCount; i++) {
      const entry = this.currentGoldenSeeds[i];
      const opt = document.createElement('option');
      opt.value = `${i}`;
      opt.innerText = `🎯 Seed #${entry.seed} (Close Win: ${entry.remainder} left, Streak: ${entry.maxStreak})`;
      seedSelect.appendChild(opt);
    }

    this.selectedSeedEntry = this.currentGoldenSeeds[0] || null;
    this.updateSelectedSeedDetails();
  }

  private updateSelectedSeedDetails(): void {
    const catVal = this.container.querySelector('#seed-cat-val') as HTMLElement;
    const remVal = this.container.querySelector('#seed-rem-val') as HTMLElement;
    const streakVal = this.container.querySelector('#seed-streak-val') as HTMLElement;
    const movesVal = this.container.querySelector('#seed-moves-val') as HTMLElement;
    const resultBox = this.container.querySelector('#seed-multirun-result') as HTMLElement;

    if (resultBox) resultBox.style.display = 'none';

    if (!this.selectedSeedEntry) {
      if (catVal) catVal.innerText = '--';
      if (remVal) remVal.innerText = '--';
      if (streakVal) streakVal.innerText = '--';
      if (movesVal) movesVal.innerText = '--';
      return;
    }

    const entry = this.selectedSeedEntry;
    if (catVal) catVal.innerHTML = '<span style="color: #fbbf24;">🎯 Close Win (100% Winnable)</span>';
    if (remVal) remVal.innerText = `${entry.remainder} card(s) left in draw pile`;
    if (streakVal) streakVal.innerText = `${entry.maxStreak} streak`;
    if (movesVal) movesVal.innerText = `${entry.moves} moves`;
  }

  private testSelectedSeed(runs: number = 100): void {
    if (!this.selectedSeedEntry) return;

    const lvl = this.levelMap.get(this.currentLevelId)!;
    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const deckSize = parseInt(deckSlider?.value || '14', 10);
    const resultBox = this.container.querySelector('#seed-multirun-result') as HTMLElement;
    const resultText = this.container.querySelector('#seed-multirun-text') as HTMLElement;

    const metrics = SeedMiner.testSingleSeedMultiRuns(
      lvl,
      this.selectedSeedEntry.seed,
      runs,
      deckSize,
      this.settings.botConfig
    );

    if (resultBox && resultText) {
      resultBox.style.display = 'block';
      resultText.innerHTML = `
        <strong>Seed #${this.selectedSeedEntry.seed} Benchmark (${runs} runs):</strong>
        Pass Rate: <strong style="color: #22c55e;">${metrics.passRate.toFixed(1)}%</strong> |
        Close Win Rate: <strong style="color: #fbbf24;">${metrics.closeWinRate.toFixed(1)}%</strong> |
        Near Miss: <strong style="color: #c084fc;">${metrics.nearMissRate.toFixed(1)}%</strong> |
        Median Remainder: <strong>${metrics.medianRemainder} cards</strong>
      `;
    }

    this.showToast(`✓ Tested Seed #${this.selectedSeedEntry.seed} over ${runs} runs`);
  }

  private async runSeedMining(): Promise<void> {
    if (this.isMining || this.isSimulating || this.isAnalyzing) return;

    const lvl = this.levelMap.get(this.currentLevelId)!;
    const deckSlider = this.container.querySelector('#deck-slider') as HTMLInputElement;
    const deckSize = parseInt(deckSlider?.value || '14', 10);
    const logEl = this.container.querySelector('#calibration-log') as HTMLElement;

    const progressCard = this.container.querySelector('#mining-progress-card') as HTMLElement;
    const progressFill = this.container.querySelector('#mining-progress-fill') as HTMLElement;
    const statusLbl = this.container.querySelector('#mining-status-lbl') as HTMLElement;
    const pctLbl = this.container.querySelector('#mining-pct-lbl') as HTMLElement;
    const scannedLbl = this.container.querySelector('#mining-scanned-lbl') as HTMLElement;
    const speedLbl = this.container.querySelector('#mining-speed-lbl') as HTMLElement;
    const btnMine = this.container.querySelector('#btn-mine-seeds') as HTMLButtonElement;
    const btnStop = this.container.querySelector('#btn-stop-mining') as HTMLElement;

    this.isMining = true;
    this.miningAbortSignal = { aborted: false };

    if (progressCard) progressCard.style.display = 'flex';
    if (btnStop) btnStop.style.display = 'block';
    if (btnMine) {
      btnMine.disabled = true;
      btnMine.innerText = '⛏️ Mining in progress...';
    }

    this.setSimulatingState(true, `⛏️ Mining verified Golden Seeds for ${lvl.id} (Deck: ${deckSize})...`);

    if (logEl) {
      logEl.style.display = 'block';
      logEl.innerHTML = `<div>⛏️ Mining verified Golden Close-Win Seeds for ${lvl.id} (Deck: ${deckSize})...</div>`;
    }

    const startTime = performance.now();
    const targetGoal = 500;

    try {
      const result = await SeedMiner.mineGoldenSeedsAsync(
        lvl,
        targetGoal,
        deckSize,
        1,
        100000,
        this.settings.botConfig,
        (scanned, found, yieldRate, speed, latest) => {
          const pct = Math.min(100, Math.round((found / targetGoal) * 100));
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (pctLbl) pctLbl.innerText = `${pct}%`;
          if (statusLbl) statusLbl.innerText = `⛏️ Mined ${found.toLocaleString()} / ${targetGoal.toLocaleString()} Seeds`;
          if (scannedLbl) scannedLbl.innerText = `Scanned: ${scanned.toLocaleString()} | Yield: ${yieldRate.toFixed(1)}%`;
          if (speedLbl) speedLbl.innerText = `Speed: ${speed.toLocaleString()} seeds/s`;

          if (latest && logEl && found % 100 === 0) {
            logEl.innerHTML += `<div>🎯 Found Seed #${latest.seed} [Close Win: ${latest.remainder} left, Streak: ${latest.maxStreak}]</div>`;
            logEl.scrollTop = logEl.scrollHeight;
          }
        },
        this.miningAbortSignal
      );

      const elapsedMs = Math.round(performance.now() - startTime);

      if (result.goldenSeeds.length > 0) {
        this.currentGoldenSeeds = result.goldenSeeds;
        this.populateGoldenSeedsInspector();
      }

      if (logEl) {
        logEl.innerHTML += `<div style="color: #fbbf24; font-weight: bold; margin-top: 6px;">✨ Mining Complete! Mined ${result.goldenSeeds.length.toLocaleString()} Golden Seeds in ${(elapsedMs / 1000).toFixed(1)}s (Yield: ${result.yieldRate.toFixed(1)}%)</div>`;
        logEl.scrollTop = logEl.scrollHeight;
      }

      this.isMining = false;
      if (progressCard) progressCard.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
      if (btnMine) {
        btnMine.disabled = false;
        btnMine.innerText = `⛏️ Mine 500 Golden Seeds for Hand ${deckSize}`;
      }

      this.setSimulatingState(false, `✨ Mined ${result.goldenSeeds.length.toLocaleString()} Golden Seeds!`);
      this.showToast(`✨ ${result.goldenSeeds.length.toLocaleString()} Verified Golden Seeds ready for Hand ${deckSize}!`);
    } catch (e) {
      console.error('Seed mining error:', e);
      this.isMining = false;
      if (progressCard) progressCard.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
      if (btnMine) {
        btnMine.disabled = false;
        btnMine.innerText = `⛏️ Mine 500 Golden Seeds for Hand ${deckSize}`;
      }
      this.setSimulatingState(false, '❌ Seed mining failed');
    }
  }

  private revertAllSettingsToDefault(): void {
    this.settings = {
      targetCWR: DEFAULT_SIMULATION_SETTINGS.targetCWR,
      tolerance: DEFAULT_SIMULATION_SETTINGS.tolerance,
      iterations: DEFAULT_SIMULATION_SETTINGS.iterations,
      seedOffset: DEFAULT_SIMULATION_SETTINGS.seedOffset,
      useGoldenSeeds: false,
      botConfig: { ...DEFAULT_BOT_CONFIG },
    };

    const adjUncover = this.container.querySelector('#adj-uncover') as HTMLInputElement;
    const adjUncoverVal = this.container.querySelector('#adj-uncover-val') as HTMLElement;
    const adjDepth = this.container.querySelector('#adj-depth') as HTMLInputElement;
    const adjDepthVal = this.container.querySelector('#adj-depth-val') as HTMLElement;
    const adjChain = this.container.querySelector('#adj-chain') as HTMLInputElement;
    const adjChainVal = this.container.querySelector('#adj-chain-val') as HTMLElement;
    const adjBomb = this.container.querySelector('#adj-bomb-threshold') as HTMLSelectElement;
    const adjZap = this.container.querySelector('#adj-zap-min') as HTMLSelectElement;
    const chkGolden = this.container.querySelector('#chk-use-golden-seeds') as HTMLInputElement;

    if (adjUncover) {
      adjUncover.value = `${this.settings.botConfig.wUncover}`;
      if (adjUncoverVal) adjUncoverVal.innerText = this.settings.botConfig.wUncover.toFixed(1);
    }
    if (adjDepth) {
      adjDepth.value = `${this.settings.botConfig.wDepth}`;
      if (adjDepthVal) adjDepthVal.innerText = this.settings.botConfig.wDepth.toFixed(1);
    }
    if (adjChain) {
      adjChain.value = `${this.settings.botConfig.wChain}`;
      if (adjChainVal) adjChainVal.innerText = this.settings.botConfig.wChain.toFixed(1);
    }
    if (adjBomb) adjBomb.value = `${this.settings.botConfig.bombUrgencyThreshold}`;
    if (adjZap) adjZap.value = `${this.settings.botConfig.zapMinRowCards}`;
    if (chkGolden) chkGolden.checked = false;

    this.showToast('✓ All settings reverted to defaults!');
  }

  private showToast(msg: string): void {
    const banner = this.container.querySelector('#sim-status-banner') as HTMLElement;
    const textEl = this.container.querySelector('#sim-status-text') as HTMLElement;
    if (banner && textEl) {
      banner.className = 'sim-status-banner toast';
      textEl.innerText = msg;
      setTimeout(() => {
        if (!this.isSimulating && !this.isMining && !this.isAnalyzing) {
          banner.className = 'sim-status-banner ready';
          textEl.innerText = 'Ready for analysis';
        }
      }, 2500);
    }
  }

  private setSimulatingState(simulating: boolean, statusText: string): void {
    this.isSimulating = simulating;
    const btnRunSim = this.container.querySelector('#btn-run-sim') as HTMLButtonElement;
    const progressWrap = this.container.querySelector('#tuner-progress-wrap') as HTMLElement;
    const progressFill = this.container.querySelector('#tuner-progress-fill') as HTMLElement;
    const banner = this.container.querySelector('#sim-status-banner') as HTMLElement;
    const textEl = this.container.querySelector('#sim-status-text') as HTMLElement;

    if (btnRunSim) {
      btnRunSim.disabled = simulating;
      btnRunSim.innerHTML = simulating ? '⏳ Simulating...' : '▶ Run Manual Simulation';
    }

    if (progressWrap && progressFill) {
      progressWrap.style.display = simulating ? 'block' : 'none';
      if (!simulating) progressFill.style.width = '0%';
    }

    if (banner && textEl) {
      banner.className = simulating ? 'sim-status-banner running' : 'sim-status-banner ready';
      textEl.innerText = statusText;
    }
  }
}
