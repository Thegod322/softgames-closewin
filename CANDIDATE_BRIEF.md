# Softgames — Operation Close Win: Candidate Brief & Engineering Summary

- **Candidate:** Arkady Krutius
- **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Chrono-Timeline:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Transcripts & Prompts:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Source Code:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

---

## 1. Executive Summary & The Balancing Finding

I built a data-driven Tripeaks Solitaire prototype and Monte Carlo difficulty tuner in **4 hours 09 minutes of active AI development time** across 8 sessions (78 hours total calendar span).

Automated bisection search tuned deck sizes down to 13–16 cards to meet the brief's target: a 70% Close Win Rate (CWR), defined as winning with fewer than 3 cards left in the draw pile.

Simulating 2,000 runs per level exposed a core game design problem: **survivorship bias**. When you shrink the deck to force close finishes on random deals, total win rate drops to 2.6%–4.5%. Most deals simply become unwinnable because the player runs out of cards before clearing the board.

To solve this, I built a background **Golden Seed Miner** (~8,000 seeds/s via Web Workers). It isolates seeds guaranteed to be winnable and balances them to finish with 0–2 cards remaining. This gives players dramatic close wins without ruining progression or win rates.

---

## 2. Development Workflow

The project ran on three practical stages:

1. **Context & Invariants First:** Before generating code, I codified the mathematical rules into a persistent repository skill (`softgames-closewin.md`). This included card overlap geometry ($|\Delta x| < 0.98 \cdot W$, $|\Delta y| < 0.98 \cdot H$), modifier states (bombs, locks, keys, zap cards), and persona heuristics. I then broke the build into 8 discrete task files (`task_01` to `task_08`).
2. **Implementation & In-Browser Checks:** Subagents wrote the headless state machine, vector card renderer, and parallel simulation workers. After each build, I playtested directly in the browser to fix spatial edge cases—like correcting card occlusion when bounding box deltas mismatched row offsets—and tune game feel (draw speed, bomb timers, layout scaling).
3. **Benchmarking & UI Hardening:** I added multi-persona testing (Casual, Medium, Pro), unified the tuner into a single-page view with 1:1 statistical parity between batch runs and golden seed verification, and added custom JSON level uploads with `localStorage` caching.

---

## 3. Honest Time Breakdown

Tracked from exact session timestamps via [`scripts/timeline_analyzer.py`](file:///c:/Misc/GuapikoProjects/Vaults/GuapikoClaw/GuapikoClaw/scripts/timeline_analyzer.py):

- **Calendar Span:** 78 hours (Aug 18, 22:10 — Aug 22, 04:42)
- **Net Active AI Time:** **4 hours 09 minutes** (80 turns in 8 sessions)
- **Playtesting, Sleep & Analysis Gaps:** 74 hours 27 minutes

### Where the Time Went

- **Prompting & Specifications (18% / ~45 min):** Writing technical specs, defining card graph geometry, task decomposition.
- **AI Code Generation (34% / ~1h 24m):** State machine, PixiJS vector renderer, Web Worker simulation loops, UI components.
- **Manual Playtesting & Game Balancing (48% / ~2h 00m):** Verifying draw feel, diagnosing survivorship bias in seed generation, tuning IS-MCTS bot weights, testing mobile layout.

---

## 4. Session Chrono-Log

| Chat | Milestone | Key Deliverables | Active AI Time | Turns |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Architecture | Tech spec, Solitaire math invariants, task decomposition | **5 min** | 7 |
| 2 | MVP Engine | Headless state machine, overlap graph, PixiJS prototype | **12 min** | 7 |
| 3 | Game Feel | Geometry depth fix, modifier rules, animation pacing | **54 min** | 8 |
| 4 | Balancer | Monte Carlo bot, bisection deck tuner, initial seed mining | **25 min** | 12 |
| 5 | Persona Spec | Multi-persona formalization, telemetry metrics | **4 min** | 2 |
| 6 | Dynamic Miner | 3-persona bot (Casual/Medium/Pro), Web Worker dynamic miner | **1h 03m** | 11 |
| 7 | Deployment | GitHub Pages build, timeline analyzer, project docs | **31 min** | 15 |
| 8 | Hardening | Single-target UI consolidation, 1:1 parity, custom JSON upload | **54 min** | 18 |
| | **Total** | **8 Sessions** | **4h 09m** | **80** |
