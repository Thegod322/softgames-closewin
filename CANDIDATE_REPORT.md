# Softgames — Operation Close Win: AI-First Workflow & Time Breakdown

- **Candidate:** Arkady Krutius
- **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Timeline & Prompts:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Conversation Transcripts:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Source Code Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)

---

## 1. AI-First Production Pipeline

The entire project was built using a repeating three-stage cycle:

**Stage A: Context Preparation** — Gather domain knowledge, codify it into persistent repository-level rules, write a technical specification, and decompose it into modular task files with clear acceptance criteria.

**Stage B: Autonomous Development** — AI subagents execute tasks sequentially. The operator playtests each compiled build in-browser, writes structured feedback, and iterates with the agent until the build matches the spec.

**Stage C: Milestone Evaluation** — Evaluate the delivered build against the original brief. Identify gaps, new requirements, or design insights that emerged during development. Feed these back into Stage A for the next cycle.

This cycle was executed twice across two milestones:

---

### Milestone 1: Core MVP (Chats 1–4)

**Stage A — Context & Spec:**
- Ingested all four JSON level schemas, researched IS-MCTS bot heuristics and Solitaire solver algorithms.
- Codified all game rules, coordinate geometry formulas, and modifier behaviors into a persistent AI skill (`softgames-closewin`) — a living document that serves as long-term memory across chat sessions, preventing context drift.
- Decomposed the project into 7 task files (`task_01`–`task_07`) with explicit input/output interfaces and verification criteria.

**Stage B — Development & Iteration:**
- Agent built the headless state machine (`TripeaksEngine`), spatial overlap graph (`CardGraph`), zero-asset procedural vector renderer (`CardTextureFactory`), and PixiJS canvas view.
- Operator playtested each build: diagnosed false-positive card reveals caused by overlap threshold mismatch ($150\text{px}$ bounding box vs $144\text{px}$ level spacing), iterated on GSAP animation pacing, lock feedback, and responsive layout scaling.
- Agent implemented the Monte Carlo simulation engine with parallel Web Workers ($4,500+\text{ games/s}$), automated bisection auto-tuner, and initial golden seed mining.

**Stage C — Milestone 1 Evaluation:**
- The playable prototype and difficulty tuner were functional and matched the brief.
- Batch simulations revealed that strictly targeting 70% CWR on random deals collapsed pass rates to ~3% — a survivorship bias problem. This insight, along with the need for multi-persona skill validation, defined the scope for Milestone 2.

---

### Milestone 2: Multi-Persona Benchmark & Polish (Chats 5–6)

**Stage A — Context & Spec:**
- Formulated Task 08 based on the Milestone 1 evaluation: implement 3 player personas (Casual/Medium/Expert) to test skill expression, and replace static pre-mined seed files with dynamic on-demand Web Worker mining.

**Stage B — Development & Iteration:**
- Agent implemented the 3-persona simulator with configurable error rates ($\epsilon = 15\%, 3\%, 0\%$) and the real-time seed miner (~8,000 seeds/s in background workers).
- Operator verified that golden seed deals deliver 100% winnable, high-excitement close wins without penalizing deck size.
- Redesigned the Tab 2 dashboard into compact ~340px modular cards with Dual-Donut charts and 1-click calibrated JSON export.

**Stage C — Milestone 2 Evaluation:**
- Full delivery: playable prototype, difficulty tuner with multi-persona benchmarks, dynamic golden seed mining, and studio-grade UI — all matching the brief requirements.

---

## 2. Honest Time Breakdown: Development vs. Prompting / Tuning

All metrics were extracted directly from conversation transcript logs via [`scripts/timeline_analyzer.py`](../scripts/timeline_analyzer.py):

- **Total Calendar Span:** 44 hours (Aug 18, 22:10 — Aug 20, 18:10)
- **Net Active AI Time:** **2 hours 44 minutes** across **47 turns in 6 chat sessions**
- **Idle / Sleep / Playtesting Gaps:** 41 hours 17 minutes

### Effort Allocation

- **Prompting & Task Specification:** ~25 mins (15%) — Framing constraints, domain rules, structuring task specs.
- **AI Code Generation & Compilation:** ~55 mins (35%) — TypeScript data models, WebGL rendering, FSM logic, Web Workers.
- **Manual Playtesting, Game Feel & Balancing:** ~1h 24m (50%) — In-browser playtesting, diagnosing CWR survivorship bias, golden seed verification, UI polish.

### Session Log

| Chat | Milestone | Focus | Active AI Time | Turns |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Milestone 1 | Requirements research, architecture, task specs | **5 min** | 7 |
| 2 | Milestone 1 | Headless engine, overlap graph, PixiJS prototype | **12 min** | 7 |
| 3 | Milestone 1 | Geometry tuning, modifiers, game feel iteration | **54 min** | 8 |
| 4 | Milestone 1 | Monte Carlo bot, bisection tuner, seed mining | **25 min** | 12 |
| 5 | Milestone 2 | Multi-persona spec, UI architecture | **4 min** | 2 |
| 6 | Milestone 2 | 3-persona engine, dynamic miner, UI encapsulation | **1h 04m** | 11 |
| | **Total** | **2 Milestones, 6 Chats** | **2h 44m** | **47** |

---

## 3. Level Calibration Results

Simulations run with $N = 2{,}000$ per configuration (normalized to a cohort of 1,000 players):

| Level | Key Mechanics | Raw Deck | Calibrated Deck (70% CWR) | Random Deal Pass Rate | Golden Seed Pass Rate |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **level_25** | Standard 3-Peak (21 cards) | 21 | **15 cards** (72.9% CWR) | 2.6% | **100%** |
| **level_31** | Zap + 2 Locks + 1 Key (26 cards) | 26 | **15 cards** (68.0% CWR) | 4.5% | **100%** |
| **level_43** | Multi-Layer Pyramid (28 cards) | 28 | **16 cards** (70.5% CWR) | 3.1% | **100%** |
| **level_54** | Bomb Countdown ($T{=}5$, 20 cards) | 20 | **13 cards** (71.1% CWR) | 3.3% | **100%** |

*Calibrated JSON files available in [`data/levels/`](./data/levels/).*
