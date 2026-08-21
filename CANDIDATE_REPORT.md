# Softgames — Operation Close Win: AI-First Workflow & Time Breakdown

- **Candidate:** Arkady Krutius
- **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Timeline & Prompts:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Conversation Transcripts:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Source Code Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

---

## 1. AI-First Production Pipeline & Engineering Workflow

To build a fully playable WebGL prototype, a headless Monte Carlo simulator ($4,500+\text{ games/s}$), and a multi-persona balancing suite within hours, I used a structured **human-in-the-loop AI pipeline**:

### Step 1: Ingestion, Research & Persistent Project Skill Setup
- **Domain Ingestion:** Researched Information Set Monte Carlo (IS-MCTS) and Solitaire heuristic bot algorithms, saving the findings as persistent project context.
- **Living Project Skill (`softgames-closewin`):** Instead of relying on fragile, one-off prompts, I codified all level schemas, modifier rules, and coordinate geometry formulas into a persistent AI skill. This served as a long-term memory bank across all subsequent chat sessions, preventing context drift and hallucinations.
- **Task Decomposition:** Decomposed the project into 7 modular, test-driven task specifications with clear input/output interfaces and verification criteria.

### Step 2: Autonomous Implementation & Human-in-the-Loop Feedback Loop
- **Headless Execution:** AI subagents implemented the headless state machine (`TripeaksEngine`), spatial overlap graph (`CardGraph`), zero-asset vector renderer (`CardTextureFactory`), and PixiJS canvas view.
- **In-Browser Playtesting:** After each build was compiled, I playtested it directly in the browser, compiling structured feedback notes:
  - *Occlusion & Geometry:* Diagnosed and fixed false-positive card reveals by adjusting spatial overlap thresholds ($150\text{px}$ vs $144\text{px}$ spacing delta).
  - *Game Feel:* Iterated on card draw velocity, lock shake feedback, and responsive viewport scaling (`BoardLayout.scale`).

### Step 3: Analytical Balancing Discovery & The Golden Seed Solution
- **The Pass Rate Conflict:** Running batch Monte Carlo auto-tuning revealed that strictly forcing a 70% Close Win Rate (CWR) on random deals reduced deck sizes to 13–16 cards, crashing the overall pass rate to ~3% (an unrewarding paywall).
- **The Golden Seed Solution:** To solve this, I designed a **dynamic Golden Seed Miner** running in background Web Workers. Instead of penalizing deck size on random deals, the engine extracts deterministic seeds where the level is verified 100% winnable with $\le 2$ cards left, delivering maximum excitement, tight chain clears, and zero player frustration.

### Step 4: Milestone 2 — Multi-Persona Benchmark & Dynamic Mining
- **Multi-Persona Testing:** Formulated and implemented Task 08 to test levels across 3 player archetypes (Casual $\epsilon=15\%$, Medium $\epsilon=3\%$, Expert $\epsilon=0\%$) to evaluate skill ceiling and level fairness.
- **On-Demand Worker Mining:** Built real-time seed scanning (~8,000 seeds/s) in Web Workers, eliminating the need for multi-megabyte static pre-mined seed files.

### Step 5: UI/UX Encapsulation
- Consolidated heavy simulation data into compact ~340px modular cards, Dual-Donut charts (All Games conversion vs. Win Quality), single-seed deep-dive tools, and 1-click calibrated JSON export.

---

## 2. Honest Time Breakdown: Development vs. Prompting / Tuning

All metrics below were extracted directly from the conversation transcript logs via [`scripts/timeline_analyzer.py`](../scripts/timeline_analyzer.py):

### Project Overview
- **Total Calendar Span (Wall-Clock):** 44 hours (Aug 18, 22:10 ➔ Aug 20, 18:10)
- **Net Active AI Development Time:** **2 hours 44 minutes** across **47 turns in 6 sessions (2 major milestones)**
- **Idle, Sleep & Manual Playtesting Gaps:** 41 hours 17 minutes

### Effort Allocation
- **Prompting & Task Specification:** ~25 mins (15%) — Framing constraints, domain rules, and structuring task specs.
- **AI Code Generation & Compilation:** ~55 mins (35%) — Automated creation of TypeScript data models, WebGL rendering routines, FSM logic, and Web Workers.
- **Manual Playtesting, Game Feel & Balancing:** ~1h 24m (50%) — Hands-on in-browser playtesting, diagnosing CWR survivorship bias, verifying golden seeds, and UI polish.

### Session Log & Development Phases

| Phase | Milestone / Focus | Active AI Time | Turns |
| :--- | :--- | :---: | :---: |
| **Phase 1** | Requirements Research, Bot Heuristics & Task Specs | **5 mins** | 7 |
| **Phase 2** | Headless Engine, 2D Overlap Graph & PixiJS Prototype | **12 mins** | 7 |
| **Phase 3** | Geometry Occlusion Tuning, Modifiers & Game Feel | **54 mins** | 8 |
| **Phase 4** | Monte Carlo Bot, Bisection Auto-Tuner & Seed Mining | **25 mins** | 12 |
| **Phase 5** | 3-Persona Benchmark, Dynamic Worker Miner & UI Polish | **1h 08m** | 13 |
| **Total** | **Full-Cycle Delivery (2 Milestones, 6 Sessions)** | **2h 44m** | **47** |

---

## 3. Level Calibration Results Summary

Simulations run with $N = 2,000$ per candidate configuration (normalized to a cohort of 1,000 players):

| Level ID | Key Mechanics | Raw Deck | Calibrated Deck (70% CWR) | Random Deal Pass Rate | Golden Seed Pass Rate | Near Miss Rate (Lost with $\le 2$ on board) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **level_25** | Standard 3-Peak Layout (21 cards) | 21 | **15 cards** (72.9% CWR) | 2.6% | **100%** | 8.8% (88 / 1,000) |
| **level_31** | Zap + 2 Locks + 1 Key (26 cards) | 26 | **15 cards** (68.0% CWR) | 4.5% | **100%** | 12.5% (125 / 1,000) |
| **level_43** | Multi-Layer Pyramid (28 cards) | 28 | **16 cards** (70.5% CWR) | 3.1% | **100%** | 9.3% (93 / 1,000) |
| **level_54** | Ticking Bomb Countdown ($T=5$, 20 cards) | 20 | **13 cards** (71.1% CWR) | 3.3% | **100%** | 10.3% (103 / 1,000) |

*All calibrated JSON files are available in [`data/levels/`](./data/levels/).*
