# Softgames — Operation Close Win: AI-First Workflow & Candidate Brief

- **Candidate:** Arkady Krutius
- **Live Prototype & Difficulty Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Chrono-Timeline Viewer:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Conversation Transcripts & Prompts:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Source Code Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

---

## 1. Executive Summary & Core Balancing Insight

**Operation Close Win** was delivered as a 100% data-driven web application (PixiJS v8 + headless TypeScript FSM + Web Workers) in **4 hours 09 minutes of net active AI development time** across 8 focused sessions. While automated bisection search successfully calibrated deck sizes (13–16 cards) to satisfy the brief's $70\% \pm 2\%$ Close Win Rate target ($<3$ cards left in the draw pile), large-scale Monte Carlo simulation ($N = 2{,}000$) revealed a critical game balancing reality: strictly enforcing 70% CWR on raw PRNG deals causes pass rates to collapse to ~3% (survivorship bias). To reconcile commercial player retention with high emotional excitement, we engineered **dynamic on-demand Golden Seed Mining** (~8,000 seeds/s in background Web Workers), providing 100% winnable, dramatic close-win deals without penalizing deck economy.

---

## 2. The 3-Stage "AI-First" Iterative Pipeline

Rather than relying on naive one-shot generation, the project was executed via a structured 3-stage iterative engineering cycle:

1. **Stage A: Context Preparation & Rule Codification** — Ingested level schemas, research on Solitaire solver heuristics, and modifier mechanics. Codified all spatial geometry formulas ($|\Delta x| < 0.98 \cdot W$, $|\Delta y| < 0.98 \cdot H$), state transition rules, and UX invariants into a persistent repository AI skill (`softgames-closewin`). This living knowledge base served as shared long-term memory across sessions, eliminating context drift. Decomposed requirements into 8 modular task specifications (`task_01`–`task_08`) with explicit interfaces and acceptance criteria.
2. **Stage B: Autonomous Execution & In-Browser Playtesting** — AI subagents implemented core FSM logic, procedural vector card textures, and parallel Web Worker threads. After each build, the operator performed rapid in-browser playtests to diagnose subtle spatial edge cases (such as the $150\text{px}$ bounding box vs $144\text{px}$ row delta occlusion mismatch) and refine tactile game feel (GSAP draw pacing, bomb countdown feedback, responsive layouts).
3. **Stage C: Milestone Evaluation & Scope Framing** — Evaluated compiled builds against the brief, identifying empirical insights (such as CWR survivorship bias and multi-persona skill variance) to define subsequent milestones.

---

## 3. Project Evolution Across 3 Milestones (8 Sessions)

- **Milestone 1: Core MVP & Engine (Chats 1–4, 1h 36m AI Time)** — Built the headless game state machine (`TripeaksEngine`), spatial overlap graph (`CardGraph`), zero-asset procedural vector renderer (`CardTextureFactory`), PixiJS v8 canvas view, GSAP animations, bisection auto-calibrator, and baseline Monte Carlo engine.
- **Milestone 2: Multi-Persona Benchmark & Dynamic Mining (Chats 5–6, 1h 08m AI Time)** — Implemented 3 player personas (🟢 Expert $\epsilon{=}0\%$, 🟡 Medium $\epsilon{=}3\%$, 🔴 Casual $\epsilon{=}15\%$) to quantify skill expression ($\Delta PR = PR_{\text{expert}} - PR_{\text{casual}}$), replaced static pre-mined files with real-time on-demand Web Worker seed mining, and designed Dual-Donut conversion charts.
- **Milestone 3: Production Hardening & UI Consolidation (Chats 7–8, 1h 25m AI Time)** — Streamlined the Tuner into a single full-width Target card with symmetrical Manual Testing, established 1:1 statistical parity ($N=2,000$, 150 golden seeds, $6\times 600$ persona runs), added batch multi-file custom JSON upload with `localStorage` persistence, and deployed to GitHub Pages.

---

## 4. Honest Time Breakdown: Development vs. Prompting / Tuning

All metrics are extracted directly from conversation transcript logs via [`scripts/timeline_analyzer.py`](file:///c:/Misc/GuapikoProjects/Vaults/GuapikoClaw/GuapikoClaw/scripts/timeline_analyzer.py):

- **Total Calendar Span:** 78 hours (Aug 18, 22:10 — Aug 22, 04:42)
- **Net Active AI Development Time:** **4 hours 09 minutes** across **80 turns in 8 sessions**
- **Idle / Sleep / Playtesting Gaps:** 74 hours 27 minutes

### Effort Allocation

- **Prompting & Architectural Specs:** ~45 mins (18%) — Domain framing, mathematical invariants, task decomposition.
- **AI Code Generation & Compilation:** ~1h 24m (34%) — TypeScript FSM, WebGL rendering, Web Workers, CSS layout.
- **Manual Playtesting, Game Feel & Balancing:** ~2h 00m (48%) — In-browser playtesting, diagnosing CWR survivorship bias, golden seed verification, UI polish.

---

## 5. Production Benchmark & Session Chrono-Log

### Level Calibration Results ($N = 2{,}000$ per Level)

| Level ID | Key Mechanics & Modifiers | Raw Deck | Calibrated Deck (70% CWR) | Random Deal Pass Rate | Golden Seed Pass Rate |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **level_25** | Standard 3-Peak Layout (21 cards) | 21 | **15 cards** (72.9% CWR) | 2.6% | **100%** |
| **level_31** | ⚡ Zap + 🔒 2 Locks + 🔑 1 Key (26 cards) | 26 | **15 cards** (68.0% CWR) | 4.5% | **100%** |
| **level_43** | Multi-Layer Pyramid (28 cards) | 28 | **16 cards** (70.5% CWR) | 3.1% | **100%** |
| **level_54** | 💣 Bomb Countdown ($T{=}5$, 20 cards) | 20 | **13 cards** (71.1% CWR) | 3.3% | **100%** |

*Calibrated level JSON files are available in [`data/levels/`](./data/levels/).*

### Session Chrono-Log

| Chat | Milestone | Key Focus | Active AI Time | Turns |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Milestone 1 | Requirements research, architecture, task decomposition | **5 min** | 7 |
| 2 | Milestone 1 | Headless engine, overlap graph, PixiJS prototype | **12 min** | 7 |
| 3 | Milestone 1 | Geometry tuning, modifiers, game feel iteration | **54 min** | 8 |
| 4 | Milestone 1 | Monte Carlo bot, bisection tuner, seed mining | **25 min** | 12 |
| 5 | Milestone 2 | Multi-persona spec, UI architecture | **4 min** | 2 |
| 6 | Milestone 2 | 3-persona engine, dynamic miner, UI encapsulation | **1h 03m** | 11 |
| 7 | Milestone 3 | GitHub Pages deploy, viewer repo, report structure | **31 min** | 15 |
| 8 | Milestone 3 | UI consolidation, 1:1 statistical parity, batch upload | **54 min** | 18 |
| | **Total** | **3 Milestones, 8 Sessions** | **4h 09m** | **80** |
