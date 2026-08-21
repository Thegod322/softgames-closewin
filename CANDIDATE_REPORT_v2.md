# Softgames — Operation Close Win: Candidate Delivery Report

- **Role:** AI Technical Game Designer
- **Candidate:** Arkady Krutius
- **Repository:** [github.com/Thegod322/softgames-closewin](https://github.com/Thegod322/softgames-closewin)
- **Live Prototype & Tuner:** [thegod322.github.io/softgames-closewin](https://thegod322.github.io/softgames-closewin/)
- **Interactive Timeline & Prompts Audit:** [thegod322.github.io/guapiko-timeline-viewer](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Transcripts Repository:** [github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)

---

# Section 1: Project Brief, Calibration Findings & Game Design Analysis

## 1.1 Project Overview & Deliverables Summary

The objective of "Operation Close Win" is to balance four raw Solitaire Tripeaks levels (`level_25`, `level_31`, `level_43`, `level_54`) so that victories consistently produce a "Close Win" emotional state (defined as having fewer than 3 cards remaining in the draw pile: 0, 1, or 2 cards).

The delivered solution consists of a 100% client-side web application built in TypeScript, PixiJS (v8), and Web Workers:
- **Tab 1 (Playable Prototype):** A visual WebGL prototype that ingests the raw JSON levels, respects spatial layout, occlusion depth, card modifiers, and tactile game feel.
- **Tab 2 (Difficulty Tuner):** A headless Monte Carlo simulation suite running parallel Web Workers (4,500+ games/sec) with automated bisection search, multi-persona player modeling, and dynamic golden seed mining.

---

## 1.2 Level Calibration Benchmark

All levels were calibrated across 2,000 simulations per candidate configuration, normalized to a standard cohort of 1,000 players:

### Table 1: Strict Target (70% Close Win Rate) vs. Multi-Objective Peak Drama

| Level ID | Key Mechanics & Modifiers | Raw Deck Size | Mode A: Calibrated Deck (70% CWR) | Mode A: Pass Rate | Mode A: Abs Close Wins (per 1k) | Mode B: Peak Retention Deck | Mode B: Pass Rate | Mode B: Total High Excitement (Close Wins + Near Misses) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **level_25** | Standard 3-Peak Layout (21 cards) | 21 | **15 cards** (72.9% CWR) | 2.6% | 19 / 1,000 | **28 cards** (30.2% CWR) | 44.3% | **413 / 1,000 (41.3%)** |
| **level_31** | Zap + 2 Locks + 1 Key (26 cards) | 26 | **15 cards** (68.0% CWR) | 4.5% | 31 / 1,000 | **26 cards** (31.4% CWR) | 41.7% | **406 / 1,000 (40.6%)** |
| **level_43** | Multi-Layer Pyramid (28 cards) | 28 | **16 cards** (70.5% CWR) | 3.1% | 22 / 1,000 | **24 cards** (43.7% CWR) | 25.4% | **370 / 1,000 (37.0%)** |
| **level_54** | Ticking Bomb Countdown (T=5) | 20 | **13 cards** (71.1% CWR) | 3.3% | 24 / 1,000 | **20 cards** (39.3% CWR) | 17.2% | **209 / 1,000 (20.9%)** |

---

## 1.3 Game Design Analysis: The Close Win Trade-Off & Golden Seeds

### The Mathematical Trap of Conditional CWR (Survivorship Bias)
Close Win Rate is a conditional metric:
$$\text{CWR} = P(\text{Remainder} \le 2 \mid \text{Win}) = \frac{N_{\text{wins with Remainder } \le 2}}{N_{\text{total wins}}}$$

- **The Problem:** Optimizing strictly for 70% CWR chokes the player's resource pool down to 13–16 cards. While 70% of winning sessions feel dramatic, the overall Pass Rate collapses to 2.6%–4.5%. For 96% of players, the level results in an unrewarding early loss with 10+ cards remaining on the board.
- **The Core Balancing Dilemma:** A metric designed to measure victory tension inadvertently creates a punitive paywall when applied in isolation to random deck distributions.

### The Two Solution Pathways:
1. **Curated Golden Seeds (Primary Game Design Solution):**
   - Instead of reducing deck size to an unplayable threshold, the system mines deterministic PRNG seeds where the level is verified to be 100% winnable under calibrated hand sizes and finishes with <=2 cards in hand.
   - In playtesting, golden seed deals deliver maximum engagement: players experience constant forward momentum, tight chain clears, and a guaranteed photo-finish win.
2. **Multi-Objective Retention Tuning (Mode B — LiveOps Solution):**
   - For random-deal LiveOps modes, Mode B expands deck sizes (20–28 cards) to maximize the sum of Absolute Close Wins plus Near Misses (losing with <=2 cards remaining on the board).
   - This delivers 7x more absolute close wins (110–134 per 1,000 plays), healthy 25%–44% pass rates, and maximizes high-converting "+5 Extra Cards" monetization opportunities without player churn.

---

## 1.4 Multi-Persona Skill Sensitivity Benchmark

To evaluate skill ceiling and level fairness, the simulator models three distinct player archetypes:

- **Expert / Pro (lookahead=true, epsilon=0%):** Optimal chain selection, proactive bomb defusal ($T \le 3$), zero suboptimal moves.
- **Medium / Core (lookahead=1, epsilon=3%):** Standard human heuristics, reactive bomb defusal ($T \le 2$), minor error rate.
- **Casual / Novice (greedy=true, epsilon=15%):** Pure greedy top-layer matching, delayed bomb defusal ($T \le 1$), frequent sub-optimal moves.

### Skill Expression Index ($\Delta PR = PR_{\text{expert}} - PR_{\text{casual}}$):
- **level_25 ($\Delta PR = 41.2\%$):** High skill ceiling. Long open chains strongly reward lookahead sequencing.
- **level_31 ($\Delta PR = 38.6\%$):** High tactical dynamic. Timing Key pickups and Zap row clears creates wide win-rate variance.
- **level_54 ($\Delta PR = 29.4\%$):** Ticking bomb forces rigid priority defusal, naturally compressing casual-to-pro variance.

---

## 1.5 Deterministic Mechanics & Coordinate Assumptions

Per the brief's instruction to document reasonable assumptions for ambiguous fields:

- **2D Card Occlusion Threshold:**
  - Board cards occupy $100\text{px} \times 150\text{px}$ in level coordinate space.
  - Card $A$ covers Card $B$ if and only if $\text{depth}(A) > \text{depth}(B)$ and $|\Delta x| < 98\text{px}$ and $|\Delta y| < 147\text{px}$.
  - *Rationale:* With vertical level spacing deltas of $96\text{px}$ and $144\text{px}$, setting bounding height to $150\text{px}$ with a $0.98$ overlap factor prevents visual sorting artifacts where covered cards falsely registered as face-up.
- **Bomb Countdown:**
  - Timer decrements on both board matches (`playCard()`) and stack draws (`drawCard()`).
  - Timer hitting 0 triggers an instant loss (`bomb_exploded`).
- **Key & Lock:**
  - Keys are item pickups that float and dissolve on click; they do not enter the active waste card slot.
  - Collecting a Key instantly unlocks all currently locked cards across the entire board.
- **Zap Modifier:**
  - Collecting a Zap immediately clears all cards within a $\pm 30\text{px}$ vertical window of the zap card's $y$-coordinate.

---

# Section 2: Production Timeline & AI-First Workflow Breakdown

## 2.1 Chronological Development Narrative

The development followed a five-phase human-in-the-loop engineering workflow, driven by clear cause-and-effect iterations:

```
[Phase 1: Ingestion & Skill Setup] ──> [Phase 2: Core Build & Playtest Loop] ──> [Phase 3: Balancing & Golden Seeds]
                                                                                       │
[Phase 5: UI/UX Encapsulation]    <── [Phase 4: Multi-Persona & Worker Mining] <───────┘
```

### Phase 1: Research, Ingestion & Persistent Project Skill
- **Cause:** Raw prompt engineering across separate chat sessions suffers from context drift, forgotten formulas, and inconsistent data schemas.
- **Action:**
  - Ingested the brief and all four JSON level schemas into an initial technical specification.
  - Researched Solitaire solver heuristics and Information Set Monte Carlo bot architectures.
  - Codified all rules, geometry formulas, and constraints into a persistent AI skill (`softgames-closewin`).
  - Decomposed the project into 7 modular task files (`task_01` to `task_07`) with explicit verification criteria.
- **Outcome:** A unified domain context shared across all subsequent AI interactions.

### Phase 2: Autonomous Implementation & Human-in-the-Loop Playtesting Loop
- **Cause:** AI-generated code often compiles successfully while failing subtle tactile gameplay expectations (visual occlusions, animation rhythm, layout scaling).
- **Action:**
  - Agent implemented the headless game state machine (`TripeaksEngine`), spatial overlap graph (`CardGraph`), procedural vector card factory (`CardTextureFactory`), and PixiJS canvas view.
  - The human designer playtested each build in the browser, compiling structured feedback notes:
    - *Geometry fix:* Adjusted card overlap height from $140\text{px}$ to $150\text{px}$ to fix false-positive card reveals.
    - *Game feel:* Tuned GSAP draw animations, stack badge visibility, and lock shake feedback.
- **Outcome:** A robust, tactile playable prototype (Tab 1) verified by hands-on play.

### Phase 3: Analytical Balancing Discovery & The Golden Seed Solution
- **Cause:** Running initial Monte Carlo auto-tuning proved that targeting 70% CWR mathematically strangled pass rate down to ~3%, making the levels unrewarding for casual players.
- **Action:**
  - Tested hand size parameters and analyzed remaining card distribution histograms.
  - Formulated the **Golden Seed Mining architecture**: rather than forcing an unplayable deck size on random deals, the engine extracts deterministic seeds where the level is 100% winnable with $\le 2$ cards left.
  - Added Mode B (Multi-Objective Peak Drama) as an alternative casual LiveOps baseline.
- **Outcome:** Solved the survivorship bias conflict, providing both strict brief compliance and a high-retention live-service model.

### Phase 4: Milestone 2 — Multi-Persona Benchmark & Dynamic Seed Mining
- **Cause:** Static pre-mined seed files bloated client bundle size, and balancing needed validation across different player skill levels.
- **Action:**
  - Implemented Task 08: 3-Persona Skill Sensitivity simulator (Casual, Medium, Expert) with the Skill Expression Index ($\Delta PR$).
  - Built an on-demand Web Worker seed miner (`SeedMiner.ts`) that scans ~8,000 seeds/sec in background threads, eliminating static data bloat.
- **Outcome:** Real-time multi-persona difficulty benchmarking and instant golden seed generation with zero bundle overhead.

### Phase 5: High-Density UI/UX Encapsulation
- **Cause:** Tab 2 dashboard had grown cluttered with raw tables, making parameter comparison difficult for game designers.
- **Action:**
  - Redesigned Tab 2 into high-density ~340px modular strategy cards.
  - Introduced the Dual-Donut visualization model: Donut 1 displays All Games funnel conversion, while Donut 2 isolates Win Quality (CWR %).
  - Added single-seed inspection tools and 1-click jump to playable prototype (`Play This Seed`).
- **Outcome:** A clean, studio-grade workbench for live-ops balancing.

---

## 2.2 Verifiable Chrono-Audit & Time Breakdown

All development metrics were automatically extracted from the raw local conversation logs (`transcript.jsonl`) via a custom parser ([`scripts/timeline_analyzer.py`](../scripts/timeline_analyzer.py)):

### Table 2: Project Timeline & Session Log

- **Total Calendar Span (Wall-Clock):** 44 hours (Aug 18, 22:10 ➔ Aug 20, 18:10)
- **Net Active AI Development Time:** **2 hours 44 minutes** (6.2% density)
- **Idle / Review / Playtesting Gap Time:** 41 hours 17 minutes
- **Total Engineer-to-AI Turns:** 47 turns across **6 development sessions (2 major milestones)**

| Milestone | Session / Focus Area | Active AI Time | Turns | % of Total Active Time | Traditional Estimate | Time Saved |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Milestone 1: Core MVP** | **Chat 1:** Requirements Research, Architecture & Task Specs | **4m 56s** | 7 | 3.0% | 4.0 hours | **98%** |
| | **Chat 2:** Headless FSM, Graph & PixiJS Prototype | **12m 22s** | 7 | 7.5% | 8.0 hours | **97%** |
| | **Chat 3:** Geometry Overlaps, Modifiers & Game Feel | **53m 55s** | 8 | 32.8% | 6.0 hours | **85%** |
| | **Chat 4:** Monte Carlo Bot, Bisection Tuner & Seed Mining | **25m 12s** | 12 | 15.3% | 6.0 hours | **93%** |
| **Milestone 2: Polish & Personas** | **Chat 5:** Multi-Persona Spec & UI Architecture | **4m 13s** | 2 | 2.5% | 2.0 hours | **96%** |
| | **Chat 6:** 3-Persona Engine, Dynamic Miner & UI Encapsulation | **1h 03m** | 11 | 38.9% | 6.0 hours | **82%** |
| **Total** | **Full-Cycle Delivery (2 Milestones, 6 Sessions)** | **2h 44m** | **47** | **100%** | **~32 hours** | **~91.5% Faster** |

---

## 2.3 Effort Allocation: Prompting vs. Implementation vs. Balancing/Playtesting

```
  ┌─────────────────────────┬──────────────────────────┬─────────────────────────────┐
  │  Prompting & Task Spec  │  AI Code Gen & Refactor  │  Playtesting & Calibration  │
  │        ~25 mins (15%)   │        ~55 mins (35%)    │        ~1h 24m (50%)        │
  └─────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

- **Prompting & Task Specification (~15%):** Framing problem constraints, drafting mathematical definitions, and structuring modular tasks.
- **AI Code Generation & Compilation (~35%):** Automated creation of TypeScript data models, WebGL graphics routines, FSM logic, and Web Workers.
- **Game Feel, Playtesting & Balance Synthesis (~50%):** Hands-on playtesting, inspecting remaining card distributions, discovering survivorship bias, and designing golden seed workflows.

---

## 2.4 Transcripts Archive & Verification Links

To enable complete inspection of every prompt, tool execution, and diff:
- **Interactive Visual Timeline:** [https://thegod322.github.io/guapiko-timeline-viewer/](https://thegod322.github.io/guapiko-timeline-viewer/)
- **Raw Transcripts Archive (.jsonl):** [https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts](https://github.com/Thegod322/guapiko-timeline-viewer/tree/main/transcripts)
- **Live Playable Web Prototype & Tuner:** [https://thegod322.github.io/softgames-closewin/](https://thegod322.github.io/softgames-closewin/)
