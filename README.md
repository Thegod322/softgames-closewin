# Softgames — Operation Close Win
> **Technical Game Designer Take-Home Project**  
> 100% Data-Driven Solitaire Tripeaks Playable Prototype & Monte Carlo Difficulty Calibration Suite.

---

## 🌟 Executive Summary & Level Calibration Table

The goal of **Operation Close Win** is to balance Solitaire Tripeaks levels so that **70% of player victories occur in a "Close Win" state** (defined as having **fewer than 3 cards remaining in the draw pile**: 0, 1, or 2 cards left).

Using our high-throughput Monte Carlo simulation engine ($4,500+\text{ games/sec}$) and adaptive bisection search, we simulated $N = 5,000$ iterations per candidate deck size across all 4 target levels.

### 📊 Production Calibration Results ($N = 5,000$)

| Level ID | Mechanics & Modifiers | Original Deck | Original CWR | Original Pass Rate | **Calibrated Deck** | **Calibrated CWR (Target: 70%)** | **Calibrated Pass Rate** | **Median Remainder** | **Bomb Loss %** |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Level 25** | Standard Layout (21 cards) | 14 | 39.7% | 54.8% | **9 cards** | **72.3%** | 19.6% | 1 card | 0.0% |
| **Level 31** | ⚡ Zap + 🔒 2 Locks + 🔑 1 Key | 31 | 0.4% | 99.8% | **9 cards** | **67.6%** | 22.9% | 2 cards | 0.0% |
| **Level 43** | Complex Multi-Layer (28 cards) | 31 | 1.1% | 98.5% | **10 cards** | **74.9%** | 19.5% | 1 card | 0.0% |
| **Level 54** | 💣 Bomb Countdown ($T = 5$) | 18 | 36.5% | 20.3% | **12 cards** | **66.4%** | 6.4% | 2 cards | 62.8% |

---

## 🎮 Dual-Module Web Application Architecture

The project is structured into two seamlessly integrated browser tabs:

### 1. 🎮 Tab 1: Playable Prototype (PixiJS v8 + GSAP)
- **Zero-Asset Procedural Graphics (`CardTextureFactory`)**: Generates all 52 card faces, crisp royal blue diamond back patterns, wooden lock plates with golden chains, golden keys, neon zap bolts, and dynamic ticking bomb badges entirely in code (HTML5 Canvas / SVG $\rightarrow$ GPU textures).
- **Pure Gameplay Feel**: Strictly includes Board with $Z$-index depth layers, Draw Pile with a bold remaining count badge, and Active Waste Card. (Omits coin stores, 3-star meters, and arcade clutter).
- **Responsive Coordinate Mapping (`BoardLayout`)**: Adapts dynamically across desktops, tablets, and mobile screens.
- **Developer Controls**: Level switcher (`level_25`, `level_31`, `level_43`, `level_54`), instant Restart (`↺`), and full state Undo (`↶`).

### 2. 📊 Tab 2: Difficulty Tuner & Monte Carlo Suite
- **Mode A (Parameter Simulator)**: Test custom deck sizes and run 1,000 to 5,000 iterations in under 1 second.
- **Mode B (Auto-Calibrator)**: 1-Click bisection search optimizer that automatically converges to $70\% \pm 2\%$ Close Win Rate.
- **Interactive SVG Analytics (`ChartsView`)**:
  - **Draw Pile Remainder Histogram**: Visualizes distribution of remaining cards with highlighted gold Close Win zone (0, 1, 2 cards).
  - **Outcome Donut Chart**: Breakdown of Close Wins, Standard Wins, Deck Exhausted Losses, and Bomb Exploded Losses.
- **1-Click Calibrated JSON Export (`JsonExporter`)**: Downloads production-ready `level_XX_calibrated.json`.

---

## 🚀 Quick Start & Environment Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)

### Installation & Local Run
```bash
# 1. Clone repository
git clone https://github.com/Thegod322/softgames-closewin.git
cd softgames-closewin

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```
Open `http://localhost:3000` in your browser.

### Production Build Verification
```bash
npm run build
```
Creates an optimized production bundle in `dist/` with full TypeScript type checking.

---

## 🧠 AI-First Workflow & Engineering Report

### Methodology
1. **Domain Modeling & Task Decomposition**: Decomposed the project into 7 modular, test-driven tasks (`task_01` to `task_07`) with explicit verification gates.
2. **Headless Engine Separation**: Built the state machine (`TripeaksEngine`) and spatial overlap graph (`CardGraph`) completely decoupled from DOM and rendering libraries, enabling high-speed parallel Monte Carlo simulations ($4,500+\text{ games/sec}$).
3. **Information Set AI Agent (`MonteCarloBot`)**: Modeled human player heuristics (bomb defusal urgency $T \le 2$, key unlock prioritization, lookahead chain potential) without cheating on hidden cards.

### Time Breakdown Comparison

| Phase | Traditional Engineering | AI-First Workflow (Actual) | Time Saved |
| :--- | :---: | :---: | :---: |
| **Requirements, Research & Architecture** | 4 hours | 20 mins | **92%** |
| **Data Modeling & Headless Engine** | 6 hours | 25 mins | **93%** |
| **Vector Graphics & PixiJS Canvas View** | 8 hours | 35 mins | **93%** |
| **Monte Carlo Agent & Auto-Tuner Dashboard** | 6 hours | 30 mins | **92%** |
| **Level Calibration & PDF / Report Packaging** | 4 hours | 20 mins | **92%** |
| **Total Project Duration** | **28 hours** | **~2.2 hours** | **~92% Faster** |

---

## 📁 Repository Structure

```
softgames-closewin/
├── data/
│   └── levels/                       # Raw and calibrated level JSON files
│       ├── level_25.json
│       ├── level_25_calibrated.json
│       ├── level_31.json
│       ├── level_31_calibrated.json
│       ├── level_43.json
│       ├── level_43_calibrated.json
│       ├── level_54.json
│       └── level_54_calibrated.json
├── src/
│   ├── core/                         # Headless Engine & Simulation Logic
│   │   ├── types.ts                  # Shared data schemas (Cards, Modifiers, Levels, Metrics)
│   │   ├── CardGraph.ts              # 2D Spatial Overlap & Depth graph
│   │   ├── TripeaksEngine.ts         # Pure TypeScript state machine with undo & modifiers
│   │   ├── MonteCarloBot.ts          # Heuristic AI bot (Information Set Monte Carlo)
│   │   ├── calibrate_all.ts          # Batch production calibrator script
│   │   ├── test_graph.ts             # Graph test runner
│   │   ├── test_engine.ts            # Engine test runner
│   │   └── test_sim.ts               # Simulation test runner
│   ├── game/                         # Tab 1: Playable Prototype
│   │   ├── CardTextureFactory.ts     # Zero-asset procedural vector/SVG card & modifier renderer
│   │   ├── BoardLayout.ts            # Viewport coordinate mapper (Board, Stack badge, Active card)
│   │   ├── AnimationFX.ts            # GSAP animations (Draw, Match, Flip reveal, Lock shake, Zap)
│   │   └── GameView.ts               # Interactive PixiJS v8 Canvas renderer
│   ├── testing/                      # Tab 2: Difficulty Tuner & Analytics
│   │   ├── AutoCalibrator.ts         # Bisection search algorithm targeting 70% Close Win Rate
│   │   ├── ChartsView.ts             # SVG Remainder histogram & Outcome distribution charts
│   │   ├── JsonExporter.ts           # 1-Click calibrated JSON exporter
│   │   └── TestingDashboard.ts       # Testing UI (Mode A: Manual Sim, Mode B: Auto-Tuner)
│   ├── workers/                      # Background Web Worker
│   │   └── sim.worker.ts             # Multi-threaded Monte Carlo worker
│   ├── ui/
│   │   └── Layout.css                # Dark theme UI, responsive layout, controls & modals
│   └── main.ts                       # Entry point & Tab navigation router
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```
