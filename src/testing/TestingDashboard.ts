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
import { CustomLevelStorage } from '../core/CustomLevelStorage.ts';

export class TestingDashboard {
  private container!: HTMLElement;
  private levelMap: Map<string, LevelJSON> = new Map();
  private currentLevelId: string = 'level_25';
  private autoCalibrator: AutoCalibrator = new AutoCalibrator();
  private currentMetrics: SimulationMetrics | null = null;
  private lastAnalysisReport: LevelAnalysisReport | null = null;
  private onPlayLevel?: (levelJson: LevelJSON, customDeckSize?: number, customSeed?: number) => void;
  private onLevelAdded?: (levelId: string, levelJson: LevelJSON) => void;
  private isSimulating: boolean = false;
  private isMining: boolean = false;
  private isAnalyzing: boolean = false;

  private currentGoldenSeeds: GoldenSeedEntry[] = [];

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
    if (this.currentGoldenSeeds && this.currentGoldenSeeds.length > 0) {
      return this.currentGoldenSeeds.map((s) => s.seed);
    }
    if (this.lastAnalysisReport?.targetBrief?.minedGoldenSeeds) {
      return this.lastAnalysisReport.targetBrief.minedGoldenSeeds.map((s) => s.seed);
    }
    return [];
  }

  public getLevelLabel(lvlId: string): string {
    switch (lvlId) {
      case 'level_25':
        return 'Level 25 (Baseline / Hard Layout)';
      case 'level_31':
        return 'Level 31 (Zap + Locks + Keys)';
      case 'level_43':
        return 'Level 43 (Complex Multi-Layer)';
      case 'level_54':
        return 'Level 54 (Bomb Modifiers - Timer 5)';
      default:
        if (lvlId.startsWith('custom_')) {
          return `📁 ${lvlId.replace(/^custom_/, '')} (Uploaded)`;
        }
        return `Level ${lvlId}`;
    }
  }

  public syncTunerLevelSelectOptions(selectedId?: string): void {
    const select = this.container?.querySelector('#tuner-level-select') as HTMLSelectElement;
    if (!select) return;
    const current = selectedId || select.value || this.currentLevelId;
    this.currentLevelId = current;
    select.innerHTML = '';

    for (const [lvlId] of this.levelMap.entries()) {
      const opt = document.createElement('option');
      opt.value = lvlId;
      opt.innerText = this.getLevelLabel(lvlId);
      select.appendChild(opt);
    }

    if (this.levelMap.has(current)) {
      select.value = current;
      this.currentLevelId = current;
    }
  }

  public init(
    container: HTMLElement,
    levelMap: Map<string, LevelJSON>,
    onPlayLevel?: (levelJson: LevelJSON, customDeckSize?: number, customSeed?: number) => void,
    onLevelAdded?: (levelId: string, levelJson: LevelJSON) => void
  ): void {
    this.container = container;
    this.levelMap = levelMap;
    for (const [key, lvl] of this.levelMap.entries()) {
      if (!lvl.id) lvl.id = key;
    }
    this.onPlayLevel = onPlayLevel;
    this.onLevelAdded = onLevelAdded;

    this.renderUI();
    this.attachEvents();
    this.runFullAnalysis();
  }

  private renderUI(): void {
    const currentLevel = this.levelMap.get(this.currentLevelId) || this.levelMap.values().next().value!;
    const defaultDeckSize = currentLevel.settings.cards_in_stack.length;

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
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

        <!-- Primary Target Card: 70% CWR - Full Width -->
        <div class="target-cards-grid">
          <div class="target-card highlight" id="target-card-brief">
            <div class="target-card-header">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span class="target-card-title" style="font-size: 15px; font-weight: 800; color: #fbbf24;">🎯 Target: 70% CWR</span>
                <span class="target-card-badge badge-gold" id="target1-badge" title="Actual Calibrated Close Win Rate">--% CWR</span>
                <select id="tuner-level-select" class="workbench-level-select" style="min-width: 220px;">
                  ${Array.from(this.levelMap.keys())
                    .map((id) => `<option value="${id}" ${id === this.currentLevelId ? 'selected' : ''}>${this.getLevelLabel(id)}</option>`)
                    .join('')}
                </select>
                <input type="file" id="input-upload-level" accept=".json" multiple style="display: none;" />
                <button id="btn-upload-level" class="btn btn-upload-level btn-sm" title="Upload custom level JSON file(s) from disk">
                  📂 Upload JSON
                </button>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button id="btn-export-json" class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 7px 16px;" title="Download calibrated level JSON">
                  💾 Download JSON
                </button>
                <button id="btn-run-full-analysis" class="btn-analyze-full btn-sm" style="padding: 7px 16px;">
                  <span>🚀 Run Analysis</span>
                </button>
                <button id="btn-apply-target1" class="btn btn-warning btn-sm" style="font-weight: 700; padding: 7px 16px;">
                  🎮 Apply & Play
                </button>
              </div>
            </div>

            <!-- 1. Hero KPI Ribbon (4 Big Headline Metrics) -->
            <div class="target-hero-kpi-grid">
              <!-- KPI 1: Hand Size -->
              <div class="hero-kpi-item">
                <div class="hero-kpi-top">
                  <span class="hero-kpi-icon">🃏</span>
                  <span class="hero-kpi-lbl">Hand Size (Draw Pile)</span>
                </div>
                <div class="hero-kpi-main">
                  <span class="hero-kpi-val" id="target1-deck-num">--</span>
                  <span class="hero-kpi-unit">cards</span>
                </div>
                <div class="hero-kpi-sub" id="target1-sample-size">N = 2,000 simulations</div>
              </div>

              <!-- KPI 2: Overall Pass Rate (Random PRNG vs Golden Seeds) -->
              <div class="hero-kpi-item">
                <div class="hero-kpi-top">
                  <span class="hero-kpi-icon">🏆</span>
                  <span class="hero-kpi-lbl">Overall Pass Rate</span>
                </div>
                <div class="hero-kpi-main" style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                  <span class="hero-kpi-val" id="target1-kpi-pass" style="color: #22c55e;" title="Random Deal Pass Rate">--%</span>
                  <span class="hero-kpi-golden-badge" id="target1-kpi-golden-pass" title="Average Golden Seeds Pass Rate">🌟 --% Golden</span>
                </div>
                <div class="hero-kpi-sub" id="target1-kpi-pass-sub">-- wins / 2k games (🎲 Random Deals)</div>
              </div>

              <!-- KPI 3: Close Win Rate (CWR) -->
              <div class="hero-kpi-item highlight-gold">
                <div class="hero-kpi-top">
                  <span class="hero-kpi-icon">🎯</span>
                  <span class="hero-kpi-lbl">Close Win Rate (CWR)</span>
                </div>
                <div class="hero-kpi-main">
                  <span class="hero-kpi-val" id="target1-kpi-cwr" style="color: #fbbf24;">--%</span>
                </div>
                <div class="hero-kpi-sub" id="target1-kpi-cwr-sub">Target: 70% ± 2%</div>
              </div>

              <!-- KPI 4: Total Drama Experience -->
              <div class="hero-kpi-item highlight-blue">
                <div class="hero-kpi-top">
                  <span class="hero-kpi-icon">🔥</span>
                  <span class="hero-kpi-lbl">High-Excitement Cohort</span>
                </div>
                <div class="hero-kpi-main">
                  <span class="hero-kpi-val" id="target1-kpi-drama" style="color: #38bdf8;">-- <small style="font-size: 13px; color: var(--text-muted);">/ 1k</small></span>
                </div>
                <div class="hero-kpi-sub" id="target1-kpi-drama-sub">Close Wins + Near Misses</div>
              </div>
            </div>

            <!-- 2. Balanced 3-Column Deep Dive Grid -->
            <div class="target-panels-grid">
              <!-- Col 1: Dual Donut Visual Funnel -->
              <div class="target-panel">
                <div class="target-panel-header">
                  <span class="panel-title">📊 Visual Cohort & Quality Funnel</span>
                </div>
                <div class="target-donut-container" id="target1-donut-container"></div>
              </div>

              <!-- Col 2: Detailed Loss & Flow Dynamics -->
              <div class="target-panel">
                <div class="target-panel-header">
                  <span class="panel-title">📈 Detailed Flow & Loss Causes</span>
                </div>
                <div class="target-metrics-list" id="target1-metrics-list">
                  ${this.renderTargetMetricsSkeleton('target1')}
                </div>
              </div>

              <!-- Col 3: 3-Persona Skill Expression Benchmark -->
              <div class="target-panel">
                <div class="target-panel-header">
                  <span class="panel-title">👥 Multi-Persona Skill Benchmark</span>
                </div>
                ${this.renderTargetPersonaBenchmarkSkeleton('target1')}
              </div>
            </div>
          </div>
        </div>

        <!-- Expandable Manual Testing & Custom Simulation Drawer -->
        <div class="manual-testing-drawer" id="manual-testing-drawer">
          <button type="button" class="drawer-toggle-btn" id="btn-toggle-manual-drawer">
            <div class="drawer-title-wrap">
              <span class="drawer-icon">🛠️</span>
              <div class="drawer-text-group">
                <h4 class="drawer-title">Manual Simulation & Custom Deck Testing</h4>
                <span class="drawer-subtitle">Adjust hand size directly in the card to evaluate custom deck iterations and benchmark personas</span>
              </div>
            </div>
            <span class="drawer-chevron" id="manual-drawer-chevron">▼ Expand Manual Testing</span>
          </button>

          <div id="manual-testing-content" class="drawer-content" style="display: none;">
            <!-- EXACT PARITY MANUAL RESULTS CARD (Full Width & Interactive) -->
            <div class="target-card manual-card" id="manual-results-card">
              <div class="target-card-header">
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <span class="target-card-title" style="font-size: 15px;">🧪 Manual Simulation & Benchmark</span>
                  <span class="target-card-badge badge-blue" id="manual-badge">Custom Config</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <button id="btn-run-sim" class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 7px 16px;">
                    ▶ Run Simulation
                  </button>
                  <button id="btn-export-manual-json" class="btn btn-secondary btn-sm" style="font-weight: 700; padding: 7px 16px;" title="Export manually calibrated level JSON with custom hand size">
                    💾 Export JSON
                  </button>
                  <button id="btn-apply-manual" class="btn btn-accent btn-sm" style="font-weight: 700; padding: 7px 16px;">
                    🎮 Apply & Play Custom Deck
                  </button>
                </div>
              </div>

              <!-- 1. Hero KPI Ribbon (Interactive Hand Size + Pass Rate + CWR + Drama) -->
              <div class="target-hero-kpi-grid">
                <!-- KPI 1: Interactive Hand Size -->
                <div class="hero-kpi-item" style="border-color: rgba(56, 189, 248, 0.35);">
                  <div class="hero-kpi-top">
                    <span class="hero-kpi-icon">🃏</span>
                    <span class="hero-kpi-lbl">Hand Size (Draw Pile)</span>
                  </div>
                  <div class="hero-kpi-interactive-row">
                    <button type="button" class="btn-step-deck" id="btn-manual-dec-deck" title="Decrease hand size">−</button>
                    <input type="number" id="manual-deck-input" min="5" max="45" value="${defaultDeckSize}" class="hero-kpi-input" />
                    <button type="button" class="btn-step-deck" id="btn-manual-inc-deck" title="Increase hand size">+</button>
                    <span class="hero-kpi-unit">cards</span>
                  </div>
                  <div class="hero-kpi-sub" id="manual-sample-size">N = 2,500 games (Click ▶ Run)</div>
                </div>

                <!-- KPI 2: Overall Pass Rate (Random vs Golden) -->
                <div class="hero-kpi-item">
                  <div class="hero-kpi-top">
                    <span class="hero-kpi-icon">🏆</span>
                    <span class="hero-kpi-lbl">Overall Pass Rate</span>
                  </div>
                  <div class="hero-kpi-main" style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                    <span class="hero-kpi-val" id="manual-kpi-pass" style="color: #22c55e;" title="Random Deal Pass Rate">--%</span>
                    <span class="hero-kpi-golden-badge" id="manual-kpi-golden-pass" title="Average Golden Seeds Pass Rate">🌟 --% Golden</span>
                  </div>
                  <div class="hero-kpi-sub" id="manual-kpi-pass-sub">-- wins / -- games</div>
                </div>

                <!-- KPI 3: Close Win Rate (CWR) -->
                <div class="hero-kpi-item highlight-gold">
                  <div class="hero-kpi-top">
                    <span class="hero-kpi-icon">🎯</span>
                    <span class="hero-kpi-lbl">Close Win Rate (CWR)</span>
                  </div>
                  <div class="hero-kpi-main">
                    <span class="hero-kpi-val" id="manual-kpi-cwr" style="color: #fbbf24;">--%</span>
                  </div>
                  <div class="hero-kpi-sub" id="manual-kpi-cwr-sub">Custom Evaluation</div>
                </div>

                <!-- KPI 4: Total Drama Experience -->
                <div class="hero-kpi-item highlight-blue">
                  <div class="hero-kpi-top">
                    <span class="hero-kpi-icon">🔥</span>
                    <span class="hero-kpi-lbl">High-Excitement Cohort</span>
                  </div>
                  <div class="hero-kpi-main">
                    <span class="hero-kpi-val" id="manual-kpi-drama" style="color: #38bdf8;">-- <small style="font-size: 13px; color: var(--text-muted);">/ 1k</small></span>
                  </div>
                  <div class="hero-kpi-sub" id="manual-kpi-drama-sub">Close Wins + Near Misses</div>
                </div>
              </div>

              <!-- 2. Balanced 3-Column Deep Dive Grid -->
              <div class="target-panels-grid">
                <!-- Col 1: Dual Donut Visual Funnel -->
                <div class="target-panel">
                  <div class="target-panel-header">
                    <span class="panel-title">📊 Visual Cohort & Quality Funnel</span>
                  </div>
                  <div class="target-donut-container" id="manual-donut-container"></div>
                </div>

                <!-- Col 2: Detailed Loss & Flow Dynamics -->
                <div class="target-panel">
                  <div class="target-panel-header">
                    <span class="panel-title">📈 Detailed Flow & Loss Causes</span>
                  </div>
                  <div class="target-metrics-list" id="manual-metrics-list">
                    ${this.renderTargetMetricsSkeleton('manual')}
                  </div>
                </div>

                <!-- Col 3: 3-Persona Skill Expression Benchmark -->
                <div class="target-panel">
                  <div class="target-panel-header">
                    <span class="panel-title">👥 Multi-Persona Skill Benchmark</span>
                  </div>
                  ${this.renderTargetPersonaBenchmarkSkeleton('manual')}
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
      <div class="target-metric-item">
        <div class="metric-row-main">
          <span class="metric-lbl"><span class="metric-icon">🟣</span> Near Misses (≤2 on board):</span>
          <strong id="${prefix}-near-miss" style="color: #c084fc;">--%</strong>
        </div>
        <div class="metric-micro-sub" id="${prefix}-near-miss-sub">(-- / 2k games | -- / 1k players)</div>
      </div>

      <div class="target-metric-item">
        <div class="metric-row-main">
          <span class="metric-lbl"><span class="metric-icon">🔥</span> Abs Close Wins (All Players):</span>
          <strong id="${prefix}-abs-cwr" style="color: #fbbf24;">--%</strong>
        </div>
        <div class="metric-micro-sub" id="${prefix}-abs-cwr-sub">(-- / 2k games | -- / 1k players)</div>
      </div>

      <div class="target-metric-item">
        <div class="metric-row-main">
          <span class="metric-lbl"><span class="metric-icon">💥</span> Loss Causes Breakdown:</span>
          <strong id="${prefix}-losses" style="font-size: 11.5px; color: #f8fafc;">Deck: --% | Bomb: --%</strong>
        </div>
      </div>

      <div class="target-metric-item">
        <div class="metric-row-main">
          <span class="metric-lbl"><span class="metric-icon">🃏</span> Median Draw Remainder:</span>
          <strong id="${prefix}-median-rem" style="color: #38bdf8;">--</strong>
        </div>
      </div>

      <div class="target-metric-item">
        <div class="metric-row-main">
          <span class="metric-lbl"><span class="metric-icon">⚡</span> Average Win Streak:</span>
          <strong id="${prefix}-streak" style="color: #fbbf24;">-- cards</strong>
        </div>
      </div>

      <div class="target-metric-item">
        <div class="metric-row-main">
          <span class="metric-lbl"><span class="metric-icon">⏱️</span> Avg Moves to Solve:</span>
          <strong id="${prefix}-moves">--</strong>
        </div>
      </div>
    `;
  }

  private updateTargetCardMetrics(prefix: string, metrics: SimulationMetrics, goldenPassRate?: number): void {
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

    // 1. Top Hero KPI Ribbon
    setEl(`#${prefix}-kpi-pass`, `${metrics.passRate.toFixed(1)}%`);
    if (goldenPassRate !== undefined && !isNaN(goldenPassRate)) {
      setEl(`#${prefix}-kpi-golden-pass`, `🌟 ${goldenPassRate.toFixed(1)}% Golden`);
    } else {
      setEl(`#${prefix}-kpi-golden-pass`, `🌟 --% Golden`);
    }
    setHtml(`#${prefix}-kpi-pass-sub`, `${wins.toLocaleString()} wins / ${n.toLocaleString()} games (${pass1k} / 1k | 🎲 Random Deals)`);

    setEl(`#${prefix}-kpi-cwr`, `${metrics.closeWinRate.toFixed(1)}%`);
    setHtml(`#${prefix}-kpi-cwr-sub`, `${metrics.closeWins.toLocaleString()} / ${wins.toLocaleString()} wins (≤2 cards)`);

    setHtml(`#${prefix}-kpi-drama`, `${drama1k} <small style="font-size: 13px; color: var(--text-muted);">/ 1k</small>`);
    setHtml(`#${prefix}-kpi-drama-sub`, `Close Wins (${close1k}) + Misses (${nearMiss1k})`);

    // 2. Middle Detailed Metrics Column
    setEl(`#${prefix}-near-miss`, `${metrics.nearMissRate.toFixed(1)}%`);
    setHtml(`#${prefix}-near-miss-sub`, `${metrics.nearMisses.toLocaleString()} / ${n.toLocaleString()} games | ${nearMiss1k} / 1k players`);

    setEl(`#${prefix}-abs-cwr`, `${metrics.absCloseWinRate.toFixed(1)}%`);
    setHtml(`#${prefix}-abs-cwr-sub`, `${metrics.closeWins.toLocaleString()} / ${n.toLocaleString()} games | ${close1k} / 1k players`);

    setEl(`#${prefix}-losses`, `Deck: ${metrics.deckLossRate.toFixed(1)}% | Bomb: ${metrics.bombLossRate.toFixed(1)}%`);
    setEl(`#${prefix}-median-rem`, `${metrics.medianRemainder} card${metrics.medianRemainder === 1 ? '' : 's'} left`);
    setEl(`#${prefix}-streak`, `${metrics.avgStreak.toFixed(1)} cards`);
    setEl(`#${prefix}-moves`, `${metrics.avgMoves.toFixed(1)} moves`);
  }

  private renderTargetPersonaBenchmarkSkeleton(prefix: string): string {
    return `
      <div class="persona-benchmark-container" id="${prefix}-persona-benchmark">
        <!-- Top Headline: Skill Expression Gap -->
        <div class="persona-skill-summary-card">
          <div class="skill-summary-left">
            <span class="skill-summary-lbl">Skill Expression Gap:</span>
            <span class="badge-skill-gap" id="${prefix}-skill-gap-tag">ΔPR: +--%</span>
          </div>
          <div class="skill-summary-sub" id="${prefix}-persona-pool-subtitle">
            🌟 150 Solvable vs 🎲 600 PRNG
          </div>
        </div>

        <!-- 3 Dedicated Persona Cards -->
        <div class="persona-cards-stack">
          <!-- Expert -->
          <div class="persona-card-item expert-card">
            <div class="persona-card-top">
              <div class="persona-card-id">
                <span class="persona-status-dot dot-expert"></span>
                <span class="persona-title">🟢 Expert (Pro)</span>
                <span class="persona-desc">Max lookahead & bomb defusal</span>
              </div>
            </div>
            <div class="persona-metric-dual-track">
              <div class="track-row">
                <span class="track-lbl">🌟 Solvable:</span>
                <div class="track-bar-bg">
                  <div class="track-bar-fill fill-golden" id="${prefix}-p-exp-golden-bar" style="width: 0%;"></div>
                </div>
                <strong class="track-val val-golden" id="${prefix}-p-exp-golden-lbl">--%</strong>
              </div>
              <div class="track-row">
                <span class="track-lbl">🎲 Raw PRNG:</span>
                <div class="track-bar-bg">
                  <div class="track-bar-fill fill-random" id="${prefix}-p-exp-rand-bar" style="width: 0%;"></div>
                </div>
                <strong class="track-val val-random" id="${prefix}-p-exp-rand-lbl">--%</strong>
              </div>
            </div>
            <div class="persona-micro-pills">
              <span>CWR: <strong id="${prefix}-t-exp-cwr">--%</strong></span>
              <span>Streak: <strong id="${prefix}-t-exp-streak">--</strong></span>
              <span>Bomb Loss: <strong id="${prefix}-t-exp-bomb">--%</strong></span>
            </div>
          </div>

          <!-- Medium -->
          <div class="persona-card-item medium-card">
            <div class="persona-card-top">
              <div class="persona-card-id">
                <span class="persona-status-dot dot-medium"></span>
                <span class="persona-title">🟡 Medium (Core)</span>
                <span class="persona-desc">Greedy chains, light lookahead</span>
              </div>
            </div>
            <div class="persona-metric-dual-track">
              <div class="track-row">
                <span class="track-lbl">🌟 Solvable:</span>
                <div class="track-bar-bg">
                  <div class="track-bar-fill fill-golden" id="${prefix}-p-med-golden-bar" style="width: 0%;"></div>
                </div>
                <strong class="track-val val-golden" id="${prefix}-p-med-golden-lbl">--%</strong>
              </div>
              <div class="track-row">
                <span class="track-lbl">🎲 Raw PRNG:</span>
                <div class="track-bar-bg">
                  <div class="track-bar-fill fill-random" id="${prefix}-p-med-rand-bar" style="width: 0%;"></div>
                </div>
                <strong class="track-val val-random" id="${prefix}-p-med-rand-lbl">--%</strong>
              </div>
            </div>
            <div class="persona-micro-pills">
              <span>CWR: <strong id="${prefix}-t-med-cwr">--%</strong></span>
              <span>Streak: <strong id="${prefix}-t-med-streak">--</strong></span>
              <span>Bomb Loss: <strong id="${prefix}-t-med-bomb">--%</strong></span>
            </div>
          </div>

          <!-- Casual -->
          <div class="persona-card-item casual-card">
            <div class="persona-card-top">
              <div class="persona-card-id">
                <span class="persona-status-dot dot-casual"></span>
                <span class="persona-title">🔴 Casual (Novice)</span>
                <span class="persona-desc">Random moves, ignores hazards</span>
              </div>
            </div>
            <div class="persona-metric-dual-track">
              <div class="track-row">
                <span class="track-lbl">🌟 Solvable:</span>
                <div class="track-bar-bg">
                  <div class="track-bar-fill fill-golden" id="${prefix}-p-cas-golden-bar" style="width: 0%;"></div>
                </div>
                <strong class="track-val val-golden" id="${prefix}-p-cas-golden-lbl">--%</strong>
              </div>
              <div class="track-row">
                <span class="track-lbl">🎲 Raw PRNG:</span>
                <div class="track-bar-bg">
                  <div class="track-bar-fill fill-random" id="${prefix}-p-cas-rand-bar" style="width: 0%;"></div>
                </div>
                <strong class="track-val val-random" id="${prefix}-p-cas-rand-lbl">--%</strong>
              </div>
            </div>
            <div class="persona-micro-pills">
              <span>CWR: <strong id="${prefix}-t-cas-cwr">--%</strong></span>
              <span>Streak: <strong id="${prefix}-t-cas-streak">--</strong></span>
              <span>Bomb Loss: <strong id="${prefix}-t-cas-bomb">--%</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private updateTargetCardPersonaBenchmark(
    prefix: string,
    data: {
      deckSize: number;
      goldenSeedsMinedCount: number;
      personaResultsGolden: Record<import('../core/types.ts').PersonaType, SimulationMetrics>;
      personaResultsRandom: Record<import('../core/types.ts').PersonaType, SimulationMetrics>;
      skillIndex: number;
    }
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
    if (poolSub) poolSub.innerText = `🌟 ${goldenSeedsMinedCount} Solvable (K=${deckSize}) vs 🎲 600 PRNG`;

    // 2. Bar Labels & Widths
    const setBar = (idPrefix: string, golden: SimulationMetrics, rand: SimulationMetrics) => {
      const lblG = this.container.querySelector(`#${idPrefix}-golden-lbl`) as HTMLElement;
      const lblR = this.container.querySelector(`#${idPrefix}-rand-lbl`) as HTMLElement;
      const barG = this.container.querySelector(`#${idPrefix}-golden-bar`) as HTMLElement;
      const barR = this.container.querySelector(`#${idPrefix}-rand-bar`) as HTMLElement;

      if (lblG) lblG.innerText = `${golden.passRate.toFixed(1)}%`;
      if (lblR) lblR.innerText = `${rand.passRate.toFixed(1)}%`;
      if (barG) barG.style.width = `${Math.min(100, Math.max(0, golden.passRate))}%`;
      if (barR) barR.style.width = `${Math.min(100, Math.max(0, rand.passRate))}%`;
    };

    setBar(`${prefix}-p-exp`, expG, expR);
    setBar(`${prefix}-p-med`, medG, medR);
    setBar(`${prefix}-p-cas`, casG, casR);

    // 3. Micro-Pills Details
    const setEl = (id: string, text: string) => {
      const el = this.container.querySelector(id) as HTMLElement;
      if (el) el.innerText = text;
    };

    setEl(`#${prefix}-t-exp-cwr`, `${expG.closeWinRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-exp-streak`, `${expG.avgStreak.toFixed(1)}`);
    setEl(`#${prefix}-t-exp-bomb`, `${expG.bombLossRate.toFixed(1)}%`);

    setEl(`#${prefix}-t-med-cwr`, `${medG.closeWinRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-med-streak`, `${medG.avgStreak.toFixed(1)}`);
    setEl(`#${prefix}-t-med-bomb`, `${medG.bombLossRate.toFixed(1)}%`);

    setEl(`#${prefix}-t-cas-cwr`, `${casG.closeWinRate.toFixed(1)}%`);
    setEl(`#${prefix}-t-cas-streak`, `${casG.avgStreak.toFixed(1)}`);
    setEl(`#${prefix}-t-cas-bomb`, `${casG.bombLossRate.toFixed(1)}%`);
  }

  private attachEvents(): void {
    const levelSelect = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
    const btnRunFullAnalysis = this.container.querySelector('#btn-run-full-analysis') as HTMLButtonElement;
    const btnExport = this.container.querySelector('#btn-export-json') as HTMLButtonElement;
    const btnApplyTarget1 = this.container.querySelector('#btn-apply-target1') as HTMLButtonElement;
    const btnApplyManual = this.container.querySelector('#btn-apply-manual') as HTMLButtonElement;
    const btnExportManual = this.container.querySelector('#btn-export-manual-json') as HTMLButtonElement;
    const btnRunSim = this.container.querySelector('#btn-run-sim') as HTMLButtonElement;
    const btnUpload = this.container.querySelector('#btn-upload-level') as HTMLButtonElement;
    const inputUpload = this.container.querySelector('#input-upload-level') as HTMLInputElement;

    const manualDeckInput = this.container.querySelector('#manual-deck-input') as HTMLInputElement;
    const btnDecDeck = this.container.querySelector('#btn-manual-dec-deck') as HTMLButtonElement;
    const btnIncDeck = this.container.querySelector('#btn-manual-inc-deck') as HTMLButtonElement;

    // Custom Level Upload (Batch & Multiple Files Support)
    btnUpload?.addEventListener('click', () => {
      inputUpload?.click();
    });

    inputUpload?.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = Array.from(target.files || []);
      if (files.length === 0) return;

      try {
        const loadedLevels = await CustomLevelStorage.parseBatchJsonFiles(files);
        if (loadedLevels.length === 0) {
          throw new Error('No valid level JSON files found.');
        }

        CustomLevelStorage.persistCustomLevels(loadedLevels);

        for (const lvl of loadedLevels) {
          this.levelMap.set(lvl.id, lvl);
          this.onLevelAdded?.(lvl.id, lvl);
        }

        const lastLevel = loadedLevels[loadedLevels.length - 1];
        this.currentLevelId = lastLevel.id;
        this.syncTunerLevelSelectOptions(lastLevel.id);

        if (manualDeckInput) {
          manualDeckInput.value = `${lastLevel.settings?.cards_in_stack?.length || 15}`;
        }

        this.currentGoldenSeeds = [];
        this.showToast(`✨ Loaded ${loadedLevels.length} level${loadedLevels.length > 1 ? 's' : ''}! Analyzing "${lastLevel.id}"...`);
        this.runFullAnalysis();
      } catch (err: any) {
        console.error('Failed to parse uploaded level JSON:', err);
        this.showToast(`❌ Upload failed: ${err?.message || 'Invalid level JSON'}`);
      } finally {
        inputUpload.value = '';
      }
    });

    // Interactive Hand Size Stepper & Input
    btnDecDeck?.addEventListener('click', () => {
      if (manualDeckInput) {
        const current = parseInt(manualDeckInput.value || '14', 10);
        const next = Math.max(5, current - 1);
        manualDeckInput.value = `${next}`;
      }
    });

    btnIncDeck?.addEventListener('click', () => {
      if (manualDeckInput) {
        const current = parseInt(manualDeckInput.value || '14', 10);
        const next = Math.min(45, current + 1);
        manualDeckInput.value = `${next}`;
      }
    });

    btnRunFullAnalysis?.addEventListener('click', () => {
      this.runFullAnalysis();
    });

    btnRunSim?.addEventListener('click', () => {
      this.runManualSimulation();
    });

    btnApplyTarget1?.addEventListener('click', () => {
      const select = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
      const activeId = select?.value || this.currentLevelId;
      this.currentLevelId = activeId;
      const lvl = this.levelMap.get(activeId)!;
      if (lvl && !lvl.id) lvl.id = activeId;
      const targetDeck = (this.lastAnalysisReport && this.lastAnalysisReport.levelId === activeId)
        ? this.lastAnalysisReport.targetBrief.deckSize
        : 15;
      this.onPlayLevel?.(lvl, targetDeck);
    });

    btnApplyManual?.addEventListener('click', () => {
      const select = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
      const activeId = select?.value || this.currentLevelId;
      this.currentLevelId = activeId;
      const lvl = this.levelMap.get(activeId)!;
      if (lvl && !lvl.id) lvl.id = activeId;
      const targetDeck = parseInt(manualDeckInput?.value || '14', 10);
      this.onPlayLevel?.(lvl, targetDeck);
    });

    btnExportManual?.addEventListener('click', () => {
      const select = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
      const activeId = select?.value || this.currentLevelId;
      this.currentLevelId = activeId;
      const lvl = this.levelMap.get(activeId)!;
      if (lvl && !lvl.id) lvl.id = activeId;
      const manualDeckSize = parseInt(manualDeckInput?.value || `${lvl.settings?.cards_in_stack?.length || 15}`, 10);
      JsonExporter.exportCalibratedLevel(lvl, manualDeckSize);
      this.showToast(`💾 Exported manual level "${lvl.id}" (${manualDeckSize} cards)!`);
    });

    levelSelect?.addEventListener('change', () => {
      this.currentLevelId = levelSelect.value;
      const lvl = this.levelMap.get(this.currentLevelId)!;
      if (lvl && !lvl.id) lvl.id = this.currentLevelId;
      if (manualDeckInput) {
        manualDeckInput.value = `${lvl.settings?.cards_in_stack?.length || 15}`;
      }
      this.currentGoldenSeeds = [];
      this.runFullAnalysis();
    });

    // Persona Details Accordions for target1 and manual
    ['target1', 'manual'].forEach((prefix) => {
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

    btnExport?.addEventListener('click', () => {
      const select = this.container.querySelector('#tuner-level-select') as HTMLSelectElement;
      const activeId = select?.value || this.currentLevelId;
      this.currentLevelId = activeId;
      const lvl = this.levelMap.get(activeId)!;
      if (lvl && !lvl.id) lvl.id = activeId;
      const targetDeck = (this.lastAnalysisReport && this.lastAnalysisReport.levelId === activeId)
        ? this.lastAnalysisReport.targetBrief.deckSize
        : parseInt(manualDeckInput?.value || `${lvl.settings?.cards_in_stack?.length || 15}`, 10);
      JsonExporter.exportCalibratedLevel(lvl, targetDeck);
      this.showToast(`💾 Exported calibrated level "${lvl.id}" (${targetDeck} cards)!`);
    });
  }

  private async runFullAnalysis(): Promise<void> {
    if (this.isAnalyzing || this.isSimulating || this.isMining) return;

    const lvl = this.levelMap.get(this.currentLevelId)!;
    const progressCard = this.container.querySelector('#tuner-progress-wrap') as HTMLElement;
    const progressFill = this.container.querySelector('#tuner-progress-fill') as HTMLElement;
    const banner = this.container.querySelector('#sim-status-banner') as HTMLElement;
    const textEl = this.container.querySelector('#sim-status-text') as HTMLElement;
    const btnAnalyze = this.container.querySelector('#btn-run-full-analysis') as HTMLButtonElement;

    this.isAnalyzing = true;
    if (progressCard) progressCard.style.display = 'block';
    if (btnAnalyze) {
      btnAnalyze.disabled = true;
      btnAnalyze.innerHTML = '⏳ <span>Analyzing Level...</span>';
    }

    if (banner && textEl) {
      banner.className = 'sim-status-banner running';
      textEl.innerText = `🚀 Running Target Calibration & Multi-Persona Benchmark for ${lvl.id}...`;
    }

    const startTime = performance.now();

    try {
      const report = await this.autoCalibrator.runFullLevelAnalysisAsync(lvl, {
        seedOffset: this.settings.seedOffset,
        botConfig: this.settings.botConfig,
        onProgress: (desc, pct) => {
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (textEl) textEl.innerText = desc;
        },
      });

      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
      this.lastAnalysisReport = report;
      this.currentGoldenSeeds = report.targetBrief.minedGoldenSeeds;

      this.renderReportResults(report);

      this.isAnalyzing = false;
      if (btnAnalyze) {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = '<span>🚀 Run Full Level Analysis</span>';
      }

      if (banner && textEl) {
        banner.className = 'sim-status-banner ready';
        textEl.innerText = `✅ Analysis complete in ${elapsedSec}s! Calibrated Hand Size: ${report.targetBrief.deckSize} cards (CWR: ${report.targetBrief.metrics.closeWinRate.toFixed(1)}%)`;
      }

      this.showToast(`✨ Target calibrated! Hand Size: ${report.targetBrief.deckSize} cards`);
    } catch (e) {
      console.error('Full analysis error:', e);
      this.isAnalyzing = false;
      if (btnAnalyze) {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = '<span>🚀 Run Full Level Analysis</span>';
      }
      if (banner && textEl) {
        banner.className = 'sim-status-banner ready';
        textEl.innerText = '❌ Full level analysis failed';
      }
    }
  }

  private renderReportResults(report: LevelAnalysisReport): void {
    const { targetBrief } = report;

    // 1. Update Target 1 Header & Ribbon
    const target1Badge = this.container.querySelector('#target1-badge') as HTMLElement;
    const target1DeckNum = this.container.querySelector('#target1-deck-num') as HTMLElement;
    const target1SampleSize = this.container.querySelector('#target1-sample-size') as HTMLElement;
    const goldenPoolCountBadge = this.container.querySelector('#golden-pool-count-badge') as HTMLElement;

    if (target1Badge) target1Badge.innerText = `${targetBrief.metrics.closeWinRate.toFixed(1)}% CWR`;
    if (target1DeckNum) target1DeckNum.innerText = `${targetBrief.deckSize}`;
    if (target1SampleSize) target1SampleSize.innerText = `N = ${targetBrief.metrics.totalGames.toLocaleString()} simulations`;
    if (goldenPoolCountBadge) goldenPoolCountBadge.innerText = `🌟 ${targetBrief.goldenSeedsMinedCount} Dynamically Mined Seeds`;

    // Compute average Golden Seeds Pass Rate across personas
    const pG = targetBrief.personaResultsGolden;
    const avgGoldenPR = pG ? (pG.expert.passRate + pG.medium.passRate + pG.casual.passRate) / 3 : undefined;

    this.updateTargetCardMetrics('target1', targetBrief.metrics, avgGoldenPR);

    // 2. Render Donut Charts
    const donutContainer = this.container.querySelector('#target1-donut-container') as HTMLElement;
    if (donutContainer) {
      ChartsView.renderTargetDualDonuts(donutContainer, targetBrief.metrics);
    }

    // 3. Render 3-Persona Benchmark
    this.updateTargetCardPersonaBenchmark('target1', {
      deckSize: targetBrief.deckSize,
      goldenSeedsMinedCount: targetBrief.goldenSeedsMinedCount,
      personaResultsGolden: targetBrief.personaResultsGolden,
      personaResultsRandom: targetBrief.personaResultsRandom,
      skillIndex: targetBrief.skillIndex,
    });
  }

  private async runManualSimulation(): Promise<void> {
    if (this.isSimulating || this.isMining || this.isAnalyzing) return;

    const lvl = this.levelMap.get(this.currentLevelId)!;
    const manualDeckInput = this.container.querySelector('#manual-deck-input') as HTMLInputElement;
    const progressFill = this.container.querySelector('#tuner-progress-fill') as HTMLElement;
    const progressWrap = this.container.querySelector('#tuner-progress-wrap') as HTMLElement;
    const textEl = this.container.querySelector('#sim-status-text') as HTMLElement;
    const manualBadge = this.container.querySelector('#manual-badge') as HTMLElement;
    const manualSampleSize = this.container.querySelector('#manual-sample-size') as HTMLElement;

    const deckSize = parseInt(manualDeckInput?.value || '14', 10);
    const iterations = 2000;

    if (progressWrap) progressWrap.style.display = 'block';
    this.setSimulatingState(true, `[0%] Manual (Deck ${deckSize}): Simulating ${iterations.toLocaleString()} random deals...`);
    const startTime = performance.now();

    try {
      // 1. Run main simulation batch over standard stochastic PRNG deals (Exact parity: N = 2,000 games)
      const metrics = await runSimulationAsync(
        lvl,
        iterations,
        deckSize,
        this.settings.seedOffset,
        this.settings.botConfig,
        (completed, total) => {
          const pct = Math.round((completed / total) * 30);
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (textEl) {
            textEl.innerText = `[${pct}%] Manual (Deck ${deckSize}): Simulating random deals (${completed.toLocaleString()} / ${total.toLocaleString()})...`;
          }
        },
        undefined // Standard random deals so pass rate and CWR match target calibration honestly
      );

      // 2. Evaluate Dynamic Golden Seeds & 3-Persona Benchmark with exact 1:1 parity (150 seeds + 6x600 persona runs)
      const targetData = await this.autoCalibrator.evaluateTargetCalibrationDataAsync(
        lvl,
        `Manual (Deck ${deckSize})`,
        deckSize,
        metrics,
        this.settings.seedOffset,
        this.settings.botConfig,
        (desc, pct) => {
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (textEl) textEl.innerText = `[${Math.round(pct)}%] ${desc}`;
        },
        30,
        100
      );

      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);
      this.currentMetrics = metrics;

      const pG = targetData.personaResultsGolden;
      const avgGoldenPR = pG ? (pG.expert.passRate + pG.medium.passRate + pG.casual.passRate) / 3 : undefined;

      // 3. Update Manual Card Elements
      if (manualBadge) manualBadge.innerText = `${metrics.closeWinRate.toFixed(1)}% CWR`;
      if (manualSampleSize) manualSampleSize.innerText = `N = ${iterations.toLocaleString()} simulations`;

      this.updateTargetCardMetrics('manual', metrics, avgGoldenPR);

      const manualDonutContainer = this.container.querySelector('#manual-donut-container') as HTMLElement;
      if (manualDonutContainer) {
        ChartsView.renderTargetDualDonuts(manualDonutContainer, metrics);
      }

      this.updateTargetCardPersonaBenchmark('manual', {
        deckSize,
        goldenSeedsMinedCount: targetData.goldenSeedsMinedCount,
        personaResultsGolden: targetData.personaResultsGolden,
        personaResultsRandom: targetData.personaResultsRandom,
        skillIndex: targetData.skillIndex,
      });

      this.setSimulatingState(
        false,
        `✅ Manual Benchmark Complete in ${elapsedSec}s! (Hand: ${deckSize} cards | CWR: ${metrics.closeWinRate.toFixed(1)}%, Pass: ${metrics.passRate.toFixed(1)}%, ΔPR: +${targetData.skillIndex.toFixed(1)}%)`
      );
      this.showToast(`✓ Manual benchmark complete! Hand ${deckSize} achieves ${metrics.closeWinRate.toFixed(1)}% CWR`);
    } catch (e) {
      console.error('Manual simulation error:', e);
      this.setSimulatingState(false, '❌ Manual simulation failed');
    }
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
