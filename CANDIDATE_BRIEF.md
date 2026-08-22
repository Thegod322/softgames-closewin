# Softgames — Operation Close Win: Candidate Brief & Engineering Summary

- **Candidate:** Arkady Krutius
- **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Chrono-Timeline:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Transcripts & Prompts:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Source Code:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

---

## 1. Executive Summary & The Balancing Finding

I built a data-driven Tripeaks Solitaire prototype and Monte Carlo difficulty tuner in **14 hours 37 minutes of combined active co-work** (4h 09m net AI execution + 10h 27m operator prompt engineering, specs & testing) across 8 sessions over a 78-hour calendar span.

Automated bisection search tuned deck sizes down to 13–16 cards to meet the brief's target: a 70% Close Win Rate (CWR), defined as winning with fewer than 3 cards left in the draw pile.

Simulating 2,000 runs per level exposed a core game design problem: **survivorship bias**. When you shrink the deck to force close finishes on random deals, total win rate drops to 2.6%–4.5%. Most deals simply become unwinnable because the player runs out of cards before clearing the board.

To solve this, I built a background **Golden Seed Miner** (~8,000 seeds/s via Web Workers). It isolates seeds guaranteed to be winnable and balances them to finish with 0–2 cards remaining. This gives players dramatic close wins without ruining progression or win rates.

---

## 2. Development Workflow

Development followed an iterative 3-step milestone loop across 8 sessions:

1. **Context & Task Decomposition**
   - **Step:** Gather domain context, write the technical specification (Tech Spec), and decompose the milestone into atomic tasks.
   - **Result:** Codified game rules into a persistent repository skill (`softgames-closewin.md`) and broke the architecture into 8 task files (`task_01` to `task_08`).

2. **Autonomous Execution & In-Browser Iteration**
   - **Step:** AI subagents implement tasks in sequence and iterate with in-browser playtesting until all milestone tasks are resolved.
   - **Result:** Built the headless state machine, procedural vector card renderer, and parallel simulation workers while tuning game feel directly in the browser.

3. **Milestone Audit & Quality Gate**
   - **Step:** Empirically evaluate the milestone. If all criteria are satisfied $\rightarrow$ **Done / Ship**. If improvements or edge cases emerge $\rightarrow$ **Return to Step 1 for the next cycle**.
   - **Result:** Benchmark simulations exposed survivorship bias and UX bottlenecks, driving subsequent loop iterations for dynamic golden seed mining, multi-persona testing, and UI hardening.

---

## 3. Honest Time Breakdown

Tracked from exact session timestamps via [`scripts/timeline_analyzer.py`](file:///c:/Misc/GuapikoProjects/Vaults/GuapikoClaw/GuapikoClaw/scripts/timeline_analyzer.py):

- **Calendar Span:** 78 hours 32 min (Aug 18, 22:10 — Aug 22, 04:42)
- **Combined Active Co-Work:** **14 hours 37 minutes** (18.6% total density)
  - **Net Active AI Execution:** **4 hours 09 minutes** (80 turns in 8 sessions)
  - **Operator Prompting & Analysis (<1.5h):** **10 hours 27 minutes** (prompt engineering, specs & in-browser testing)
- **Offline Breaks & Sleep (≥1.5h):** **64 hours 00 minutes** (6 sleep & offline intervals)

### Where Active Time Went (14h 37m Co-Work)

- **Operator Prompting & Tech Specs (36% / ~5h 15m):** Domain research, invariant modeling, task decomposition, and prompt drafting.
- **Manual Playtesting & Game Balancing (36% / ~5h 13m):** In-browser feel verification, diagnosing survivorship bias, tuning bot heuristics, testing custom JSON uploads.
- **AI Code Generation & Sim Threads (28% / ~4h 09m):** Headless FSM, PixiJS vector renderer, Web Worker Monte Carlo loops, single-page UI.

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
