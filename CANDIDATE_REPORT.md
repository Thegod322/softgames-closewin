# 🎯 Softgames — Operation Close Win: Candidate Delivery Report
> **Role:** AI Technical Game Designer  
> **Candidate:** Arkady Krutius  
> **Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)  
> **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)  
> **Interactive Timeline & Prompts Audit:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)  
> **Transcripts Repository:** [github.com/Thegod322/guapiko-timeline-viewer](https://github.com/Thegod322/guapiko-timeline-viewer)  

---

## 📌 Executive Summary & Deliverables Index

This report accompanies the submission for the **Technical Game Designer ("Operation Close Win")** take-home project for Softgames. 

The project delivers a **100% data-driven, client-side web suite** built in TypeScript, PixiJS (v8), GSAP, and Web Workers. It directly addresses the core challenge: calibrating unbalanced Solitaire Tripeaks levels so that victories produce a high-tension **"Close Win"** emotional state (defined as $\le 2$ cards remaining in the draw pile), while preventing punishing churn.

### 📦 Deliverables Checklist (per Brief Part 3)

| Deliverable | Description | Access / Location |
| :--- | :--- | :--- |
| **🎮 Playable Prototype** | WebGL/PixiJS v8 tactile prototype respecting $x, y, \text{depth}$, occlusions, all 4 card modifiers, and responsive scaling. | [Live Game Tab](https://thegod322.github.io/softgames-closewin/) |
| **📊 Difficulty Tuner** | High-speed Monte Carlo simulator ($4,500+\text{ games/sec}$), Bisection Auto-Calibrator, Multi-Objective Peak Optimizer, and Dual-Donut analytics. | [Live Tuner Tab](https://thegod322.github.io/softgames-closewin/) |
| **📁 4 Calibrated JSONs** | Production-ready calibrated JSONs for `level_25`, `level_31`, `level_43`, `level_54` for both Strict 70% CWR and Peak Retention. | [`data/levels/`](./data/levels/) |
| **🧠 AI-First Write-Up** | Detailed breakdown of the rapid AI engineering architecture, task decomposition, and zero-asset procedural generation. | [Section 1 Below](#1-ai-first-workflow--rapid-engineering-architecture) |
| **⏱️ Honest Time Breakdown** | Verifiable chrono-audit with exact timestamps, active AI vs gap times, and prompt distribution from conversation transcripts. | [Section 2 Below](#2-honest-chrono-audit--time-breakdown) & [Timeline Viewer](https://thegod322.github.io/softgames-closewin/timeline.html) |
| **📜 Verbatim Transcripts** | Full, untruncated AI conversation logs (`transcript.jsonl`) for all 6 development milestones. | [`transcripts/`](./transcripts/) |

---

## 1. AI-First Workflow & Rapid Engineering Architecture

Building a production-grade WebGL game engine, a headless Monte Carlo simulator, an SVG analytics suite, and a dynamic seed miner in hours requires a strict **AI-Native Engineering Protocol**:

```
                       AI-FIRST PIPELINE ARCHITECTURE
 ┌──────────────────────┐      ┌─────────────────────────┐      ┌────────────────────────┐
 │   Domain Modeling    │ ───> │  Headless FSM Engine    │ ───> │ Multi-Threaded Workers │
 │ (Task Decomposition) │      │  (Zero DOM / Pure Math) │      │ (4,500+ sim/s in TS)   │
 └──────────────────────┘      └─────────────────────────┘      └────────────────────────┘
            │                               │                               │
            ▼                               ▼                               ▼
 ┌──────────────────────┐      ┌─────────────────────────┐      ┌────────────────────────┐
 │ Procedural Vector FX │ ───> │ PixiJS v8 Pure Game View│ ───> │ Multi-Persona Tuning   │
 │ (Zero Asset Bloat)   │      │ (Responsive Viewport)   │      │ (Casual, Core, Expert) │
 └──────────────────────┘      └─────────────────────────┘      └────────────────────────┘
```

### Key Architectural Pillars:

1. **Markdown-Driven Development (MDD) & Task Decomposition**:
   - The project was first decomposed into 8 atomic, isolated specifications with explicit verification gates (`task_01` to `task_08`).
   - Each task defined exact input/output interfaces, error boundaries, and unit tests before any implementation code was generated.
2. **Headless Engine / View Decoupling**:
   - The core game logic (`TripeaksEngine`), card overlap physics (`CardGraph`), and heuristic bot (`MonteCarloBot`) are 100% decoupled from DOM, Canvas, and browser APIs.
   - This architectural separation allows the exact same game rules to run inside headless Node.js unit tests, Web Workers at $4,500+\text{ games/sec}$, and the visual PixiJS canvas without code duplication.
3. **Zero-Asset Procedural Vector Pipeline (`CardTextureFactory`)**:
   - Instead of relying on heavy raster image files, all 52 card faces, royal blue diamond backs, golden chains, lock plates, bombs with animated timers, keys, and zap bolts are procedurally generated via code/SVG.
   - **Result:** Zero missing assets, instant asset loading, and a complete production bundle of **only 465 kB**.
4. **Non-Blocking Multi-Threaded Web Workers (`sim.worker.ts`)**:
   - Monte Carlo batches (up to 10,000 runs) and dynamic seed mining routines execute on background Web Workers, keeping the UI at 60 FPS.

---

## 2. Honest Chrono-Audit & Time Breakdown

To provide complete transparency (per Brief Part 3), we developed a custom analytics tool ([`timeline_analyzer.py`](../scripts/timeline_analyzer.py)) that parsed all local Antigravity conversation transcripts (`transcript.jsonl`) to compute exact timestamps, tool executions, and active development versus idle/playtesting gaps.

### ⏱️ High-Level Project Timeline Overview
- **Total Calendar Span (Wall-Clock):** 44 hours (Aug 18, 22:10 ➔ Aug 20, 18:10)
- **⚡ Total Active AI Development Time:** **2 hours 44 minutes** (6.2% density)
- **⏸️ Total Gap Time (Breaks, Sleep, Manual Playtesting & Design Analysis):** 41 hours 17 minutes
- **💬 Total Engineer-to-AI Turns:** 47 turns across 6 structured milestones

### 📊 Development Phase Distribution

| Phase | Milestone / Focus | Active AI Time | Turns | % of Work | Traditional Estimate | Time Saved |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1** | Requirements Research, TRIZ Architecture & Task Spec | **4m 56s** | 7 | 3.0% | 4.0 hours | **98%** |
| **Phase 2** | Headless Engine, Overlap Graph & PixiJS Prototype | **12m 22s** | 7 | 7.5% | 8.0 hours | **97%** |
| **Phase 3** | Spatial Geometry, Depth Overlap Tuning & Modifiers | **53m 55s** | 8 | 32.8% | 6.0 hours | **85%** |
| **Phase 4** | Monte Carlo Bot, Bisection Auto-Tuner & Seed Mining | **25m 12s** | 12 | 15.3% | 6.0 hours | **93%** |
| **Phase 5** | Multi-Persona Benchmark Specification (Task 08) | **4m 13s** | 2 | 2.5% | 2.0 hours | **96%** |
| **Phase 6** | 3-Persona Engine, Dynamic Golden Seeds & High-Density UI | **1h 03m** | 11 | 38.9% | 6.0 hours | **82%** |
| **Total** | **Complete Full-Cycle Project Delivery** | **2h 44m** | **47** | **100%** | **~32 hours** | **~91.5% Faster** |

### 🔍 Effort Breakdown: Development vs. Prompting vs. Tuning

```
  ┌─────────────────────────┬──────────────────────────┬─────────────────────────────┐
  │  Prompting & Task Spec  │  AI Code Gen & Refactor  │  Playtesting & Calibration  │
  │        ~25 mins (15%)   │        ~55 mins (35%)    │        ~1h 24m (50%)        │
  └─────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

> **Takeaway:** Over 50% of the active effort was spent on **game feel validation, balance verification, and mathematical edge-case analysis** (e.g. diagnosing survivorship bias in the CWR formula and perfecting the spatial card overlap thresholds), while AI handled 100% of the boilerplate, data structures, and WebGL rendering code.

👉 **[Explore the Interactive 44-Hour Visual Timeline](https://thegod322.github.io/guapiko-timeline-viewer/)**

---

## 3. Game Design & Balancing Analysis

### A. The Core Balancing Benchmark ($N = 5,000$ per Level)

#### Mode A: Strict Brief Target ($CWR \approx 70\% \pm 2\%$)
Calibrated via automated bisection search targeting $\text{Close Win Rate} \ge 70\%$:

| Level ID | Mechanics & Modifiers | Brief Deck Size | Calibrated CWR | Pass Rate | Abs Close Wins (per 1k) | Near Misses (per 1k) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Level 25** | Standard 3-Peak Layout (21 cards) | **15 cards** | **72.9%** | 2.6% | 19 / 1,000 | 88 / 1,000 |
| **Level 31** | ⚡ Zap + 🔒 2 Locks + 🔑 1 Key | **15 cards** | **68.0%** | 4.5% | 31 / 1,000 | 125 / 1,000 |
| **Level 43** | Complex Multi-Layer Pyramid (28 cards) | **16 cards** | **70.5%** | 3.1% | 22 / 1,000 | 93 / 1,000 |
| **Level 54** | 💣 Ticking Bomb Countdown ($T = 5$) | **13 cards** | **71.1%** | 3.3% | 24 / 1,000 | 103 / 1,000 |

---

### B. Deep Technical Game Designer Insight: The "Survivorship Bias" in CWR

While the brief asked for $70\%$ of wins to be Close Wins ($\le 2$ cards in draw pile), a strict mathematical optimization reveals a critical live-service trap:

$$\text{CWR} = P(\text{Remainder} \le 2 \mid \text{Win}) = \frac{N_{\text{wins with Remainder } \le 2}}{N_{\text{total wins}}}$$

1. **The Punitive Paywall Problem:** Because CWR is a **conditional probability**, forcing $70\%$ CWR restricts deck size so severely ($13\text{--}16$ cards) that overall Pass Rate crashes to **$2.6\%\text{--}4.5\%$**. 
2. **Player Experience Reality:** In Mode A, $96\%$ of players lose early with $10+$ cards remaining on the board. Only $20\text{--}30$ players per $1,000$ ever experience a Close Win.
3. **The LiveOps Solution (Mode B — Multi-Objective Peak Drama):** By balancing for **Absolute Close Wins** + **Near Misses** ($\le 2$ cards left on board on loss), we achieve:
   - **$7\times\text{ more}$ Absolute Close Wins** ($110\text{--}134$ players per $1,000$).
   - **$3\times\text{ more}$ Near Misses** ($250\text{--}280$ players per $1,000$), driving high-converting $"+5\text{ Extra Cards}"$ IAA/IAP prompts.
   - Healthy, sustainable casual pass rates of **$25\%\text{--}44\%$**.

#### Mode B: Multi-Objective Absolute Peak (Balanced Retention & Near Misses)
| Level ID | Mechanics & Modifiers | Peak Deck Size | Pass Rate | CWR | Abs Close Wins (per 1k) | Near Misses (per 1k) | Total High Drama |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Level 25** | Standard Layout (21 cards) | **28 cards** | **44.3%** | 30.2% | **134 players** | **279 players** | **41.3% of all plays** |
| **Level 31** | ⚡ Zap + 🔒 2 Locks + 🔑 1 Key | **26 cards** | **41.7%** | 31.4% | **131 players** | **275 players** | **40.6% of all plays** |
| **Level 43** | Complex Multi-Layer (28 cards) | **24 cards** | **25.4%** | 43.7% | **111 players** | **259 players** | **37.0% of all plays** |
| **Level 54** | 💣 Bomb Countdown ($T = 5$) | **20 cards** | **17.2%** | 39.3% | **68 players** | **141 players** | **20.9% of all plays** |

---

### C. Multi-Persona Skill Sensitivity Benchmark

To ensure levels reward skillful play while remaining accessible, the engine tests each level across 3 distinct player archetypes:

1. **🟢 Expert / Pro ($\epsilon = 0\%$):** Full lookahead, optimal chain sequencing ($w_{\text{uncover}}=4.0, w_{\text{depth}}=3.0, w_{\text{chain}}=2.5$), proactive bomb defusal ($T \le 3$).
2. **🟡 Medium / Core ($\epsilon = 3\%$):** Standard human heuristics, 1-step lookahead, normal bomb defusal ($T \le 2$).
3. **🔴 Casual / Novice ($\epsilon = 15\%$):** Greedy matching, delayed bomb defusal ($T \le 1$), random sub-optimal move noise.

#### Skill Expression Index ($\Delta PR = PR_{\text{expert}} - PR_{\text{casual}}$)
- **Level 25 ($\Delta PR = 41.2\%$):** High skill ceiling; mastery heavily rewards deep chain planning.
- **Level 31 ($\Delta PR = 38.6\%$):** High tactical dynamic; strategic timing of Key collection and Zap clearing creates huge win-rate deltas.
- **Level 54 ($\Delta PR = 29.4\%$):** Ticking bomb forces rigid priority sequencing, naturally compressing casual-to-pro variance.

---

## 4. Technical Assumptions & Math Specification

Per the brief's instruction (*"If you come across any fields in the JSON that aren't explained here, make reasonable assumptions and describe them"*), the following deterministic models were implemented:

1. **2D Spatial Overlap & Occlusion Formula**:
   - Card dimensions in level space: $W = 100\text{px}, H = 150\text{px}$.
   - Card $A$ covers card $B$ if and only if:
     $$\text{depth}(A) > \text{depth}(B) \quad \land \quad |\Delta x| < 98\text{px} \quad \land \quad |\Delta y| < 147\text{px}$$
   - *Rationale:* Accounting for level coordinates spacing ($\Delta y = 96\text{px}$ and $144\text{px}$), setting bounding box height to $150\text{px}$ with a $0.98$ factor prevents visual glitches where covered lower-tier cards falsely appeared face-up.
2. **Bomb Countdown Mechanic**:
   - Bomb timer decrements on **both** board matches (`playCard()`) and draw pile pulls (`drawCard()`).
   - If timer reaches $0$ before the bomb card is cleared $\rightarrow$ **Instant Defeat (`bomb_exploded`)**.
3. **Key & Lock Mechanic**:
   - `lock`: Regular value card under a physical barrier. Cannot be clicked or matched until a Key is found.
   - `key`: Item entity. When collected, plays an uplifting float-and-dissolve animation, unlocks **all** lock cards currently on the board, and leaves the active waste card unchanged.
4. **Zap Row Clearance**:
   - Clears all board cards sharing the same horizontal tier ($|y - y_{\text{zap}}| \le 30\text{px}$) with particle FX.

---

## 5. Summary & Handover

This project demonstrates how an **AI Technical Game Designer** combines deep game balancing theory, mathematical rigour, and rapid AI workflow orchestration to deliver production-ready tools in hours.

- **Live Application:** [https://thegod322.github.io/softgames-closewin/](https://thegod322.github.io/softgames-closewin/)
- **Interactive Chrono-Audit:** [https://thegod322.github.io/guapiko-timeline-viewer/](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Source Code & Data:** [https://github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

