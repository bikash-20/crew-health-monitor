# Crew Health Monitor

A mission-control-style dashboard for a long-duration deep-space mission that simulates three crew members' telemetry, runs deterministic rule-based alerts, and uses an LLM (via OpenRouter) to write a flight-surgeon brief and answer follow-up questions.

The core architectural contract is **rules decide, AI advises**. The deterministic AI risk score runs in the browser; the LLM only writes prose — it never raises alerts. This separation is enforced at every layer of the stack.

![Mission-control dashboard](https://github.com/bikash-20/crew-health-monitor)

---

## Table of contents

- [The principle: rules decide, AI advises](#the-principle-rules-decide-ai-advises)
- [Features](#features)
- [Quick start](#quick-start)
- [Deploy to Vercel](#deploy-to-vercel)
- [Architecture](#architecture)
  - [Directory layout](#directory-layout)
  - [Data flow](#data-flow)
  - [The simulation](#the-simulation)
  - [The rule engine](#the-rule-engine)
  - [The AI risk score](#the-ai-risk-score)
  - [The LLM cascade](#the-llm-cascade)
  - [The chat trust boundary](#the-chat-trust-boundary)
- [State management](#state-management)
- [UI components](#ui-components)
- [Testing](#testing)
- [Performance notes](#performance-notes)
- [Security notes](#security-notes)
- [Accessibility](#accessibility)
- [Project scripts](#project-scripts)
- [Environment variables](#environment-variables)
- [Limitations and non-goals](#limitations-and-non-goals)
- [License](#license)

---

## The principle: rules decide, AI advises

This is the load-bearing idea of the whole project. Throughout the codebase:

1. **The rule engine** (`lib/rules.ts`) is the only thing that raises alerts. It runs on every tick, for every crew member, in the browser. Its thresholds are fixed and documented.
2. **The deterministic AI risk score** (`lib/aiScore.ts`) is a numeric 0–100 advisory score. It may surface a *combined pattern* the rules didn't catch, but it never emits an alert on its own. When the score is high while every individual rule is at level 0, the UI calls it out explicitly ("flagged for review, not raised as an alert").
3. **The LLM** (via `lib/openrouter.ts`) is restricted to writing prose. Its system prompt forbids raising new alerts or contradicting the rules engine. The prompt can ask the model to *explain* what the rules already decided — never to make a different decision.
4. **The UI** mirrors the same boundary. Rules-driven `AlertsCard` and `TraceCard` show only rule decisions. The `BriefCard` and chat thread are the only places the LLM is heard from, and they always carry a "model: ..." label so the user knows what they're reading.

The LLM is a multiplier on the operator's understanding, not a decision-maker.

---

## Features

- **Live simulation** of three crew members with realistic vitals — heart rate, blood oxygen, 3-night sleep average, stress index, and 30-day radiation dose.
- **Six injected problems** (solar storm, sleep debt, cardiac strain, AI offline, plus speed/run controls) that let the user drive the simulation by hand.
- **Guided demo** that walks through the full pipeline: cardiac event → solar storm → rules fire → trace the decision → write the brief.
- **Deterministic alert pipeline** with five rules, each documented with thresholds and a human-readable "why".
- **Trace view** that explains exactly which rule fired, on which reading, with what threshold, and what action the protocol calls for.
- **LLM-written flight-surgeon brief** generated from a structured snapshot of the selected crew member. Model name is displayed.
- **Streaming follow-up chat** with the LLM using Server-Sent Events, with the serving model displayed for each reply.
- **OpenRouter model cascade** that automatically picks the best available chat model and falls through on failure. Free models are preferred.
- **Fully responsive** down to mobile width, with a dark mission-control palette and reduced-motion support.

---

## Quick start

Requirements: Node.js 20+ and an OpenRouter API key from <https://openrouter.ai/keys>.

```bash
git clone https://github.com/bikash-20/crew-health-monitor.git
cd crew-health-monitor
npm install
cp .env.local.example .env.local
# edit .env.local and paste your OPENROUTER_API_KEY
npm run dev
```

Open <http://localhost:3000>.

> The OpenRouter key is only used inside `app/api/*/route.ts` and is never shipped to the browser. There are no `NEXT_PUBLIC_*` environment variables.

If you don't have an OpenRouter key, the app still runs — the simulation, rules, AI risk score, and all the panels work. Only the "Write brief" button and the chat input will fail with a clear "OPENROUTER_API_KEY is not set" error.

---

## Deploy to Vercel

1. Push this folder to a new GitHub repo (or use the existing one).
2. Import the repo on <https://vercel.com/new>.
3. In the project, go to **Settings → Environment Variables** and add:
   - `OPENROUTER_API_KEY` = your key from <https://openrouter.ai/keys>
4. Deploy.

The Vercel function logs will include `[openrouter] served by: <model-id>` for every successful LLM call, so you can verify which model served each request.

---

## Architecture

### Directory layout

```
.
├── app/                       Next.js App Router
│   ├── api/
│   │   ├── brief/route.ts     POST /api/brief   — non-streaming LLM brief
│   │   └── chat/route.ts      POST /api/chat    — streaming LLM follow-up
│   ├── globals.css            Tailwind base + design tokens
│   ├── layout.tsx             Root layout, fonts, MotionConfig
│   └── page.tsx               The entire client-side dashboard
├── components/
│   ├── ui/                    Primitive UI (Panel, Button, ProgressBar, Sparkline)
│   ├── AIScoreCard.tsx        Deterministic 0–100 score + factor breakdown
│   ├── AlertsCard.tsx         Rule-fired alerts list
│   ├── BriefCard.tsx          LLM brief display + chat input
│   ├── CrewList.tsx           Crew selector with worst-level badges
│   ├── Pipeline.tsx           6-step pipeline header
│   ├── RulesCard.tsx          5-rule status table
│   ├── ScenarioBar.tsx        Inject-problem buttons + demo runner
│   ├── TopBar.tsx             Mission clock + play/pause/speed
│   ├── TraceCard.tsx          Per-alert "why did this fire" view
│   └── VitalsCard.tsx         Per-crew live vitals grid
├── lib/
│   ├── aiScore.ts             Deterministic 0–100 risk score
│   ├── cn.ts                  clsx + tailwind-merge helper
│   ├── colors.ts              Level → color mapping
│   ├── openrouter.ts          Model cascade (chat + streaming)
│   ├── rules.ts               The 5 deterministic alert rules
│   ├── serialize.ts           Crew snapshot → LLM-ready text
│   ├── simulation.ts          Tick engine, crew factory, mission clock
│   └── types.ts               All shared types
├── .env.local.example
├── .eslintrc.json
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

### Data flow

```
                ┌──────────────────────────────────────────┐
                │           Browser (client)               │
                │                                          │
   tick loop →  │  simulation.step(crew)                   │
                │      ├─ aiScore(c)        ← deterministic│
                │      └─ evalRules(c)      ← raises alerts│
                │                                          │
                │  UI renders:                             │
                │      CrewList · VitalsCard · RulesCard   │
                │      AIScoreCard · AlertsCard · TraceCard│
                │                                          │
                │  /api/brief, /api/chat  ──── HTTPS ──────┼──→  app/api/*
                │                                          │       │
                └──────────────────────────────────────────┘       │
                                                                   ▼
                                                          lib/openrouter.ts
                                                                   │
                                                                   ▼
                                                        OpenRouter /v1/chat
```

The server has exactly one job: forward LLM requests to OpenRouter with a strong system prompt, returning either JSON (`/api/brief`) or SSE (`/api/chat`). It never sees the simulation; the simulation is entirely client-side.

### The simulation

`lib/simulation.ts` owns a `Crew[]` of three members and a `tick` counter. On every tick:

1. **Stress** moves toward a target (`28 + 34·sleep + 28·card + 18·storm`), with small random noise, clamped to [0, 100].
2. **Heart rate** moves toward `bhr·(1 + 0.6·card) + 0.12·(stress − 30)` with noise.
3. **SpO2** moves toward `93.2` if cardiac flag is on, else `98`, clamped to ≤ 100.
4. **Sleep** moves toward `3.8` (debt on) or `7.2` (default) with tiny noise.
5. **Dose rate** is `3 mSv/h ± noise` under storm, else `0.04 mSv/h`. The 30-day `dose` integrates this at `0.5` per tick.
6. All four signals are pushed into a 60-sample rolling history.
7. `aiScore(c)` recomputes the 0–100 score.
8. `evalRules(c)` returns 5 `RuleResult`s. For any rule whose level *increased* compared to `c.r[j]`, an `Alert` is emitted via `onAlert`.

The mission clock is `clock(tick)` — 30 minutes per tick, starting at Day 112, 06:00.

`seedCrew(warmup=60)` builds a fresh 3-person crew and runs 60 ticks without alerts. It's used by the page initializer and the "Reset" action so the first paint always shows populated charts.

### The rule engine

`lib/rules.ts` defines the five rules:

| Rule | Watch | Alert | Source |
|------|-------|-------|--------|
| Heart rate | 6-tick mean > 130% of baseline | > 150% of baseline | `c.H.hr` |
| Blood oxygen | < 94% | < 90% | `c.spo2` |
| Sleep (3-night) | < 5.5 h | < 4.5 h | `c.sleep` |
| Stress index | > 75 | > 90 | `c.stress` |
| Radiation (30-day) | dose ≥ 200 mSv (80% of 250) **or** rate ≥ 1 mSv/h | dose ≥ 237.5 mSv (95% of 250) | `c.dose`, `c.rate` |

Thresholds are documented in code via both numeric literals and a one-line `th` string on each `RuleResult` ("+30% watch, +50% alert over baseline", "below 94% watch, below 90% alert", etc.).

Every rule produces a `why` string ("Heart rate averaged 91 bpm, 52% above baseline of 60") that the trace panel renders verbatim. The LLM is given the same string and is told to *use only the data in the snapshot* — so the model and the rules engine are looking at the exact same words.

### The AI risk score

`lib/aiScore.ts` is a deterministic, dependency-free 0–100 score with five factors, each clamped to its documented weight:

| Factor | Weight | Normalized input |
|--------|--------|------------------|
| Heart rate | 30 | `mean(6-sample HR) / baseline`, capped at 1.5× above |
| Oxygen | 20 | `(98 − SpO2) / 8` |
| Sleep | 20 | `(7 − sleep) / 3.5` |
| Stress | 15 | `(stress − 30) / 60` |
| Radiation | 10 + 5 | `(dose − 165) / 85` and `rate / 3` |

A bonus of +12 is added if three or more factors are at > 30% saturation, mimicking the "multiple mild problems compound" intuition.

The final score is an EMA: `c.ai = 0.6·prev + 0.4·new`, so it doesn't snap.

The `band()` helper maps the score to "Low" / "Watch" / "High" labels. The UI surfaces a contextual hint: if the worst rule level is 0 but the AI score is ≥ 45, it tells the user "The AI sees a combined pattern no single rule caught." That's the only place the AI score is allowed to *flag* something — and even then, no alert is emitted.

### The LLM cascade

`lib/openrouter.ts` implements a small, robust cascade:

1. **Catalog fetch.** On first use, the server fetches `https://openrouter.ai/api/v1/models` and keeps models whose architecture outputs `text`.
2. **Ranking.** Each model is scored:
   - `+1000` if its id ends in `:free` (OpenRouter's canonical free signal)
   - `+100` if its context length is ≥ 32 000
   - `+50` if its id matches a preferred family (`llama`, `qwen`, `gemini`, `deepseek`, `glm`, `mistral`, `claude`, `gpt`, `command`)
   - minus `10·(prompt_price + completion_price)` for tie-breaking among the same tier
3. **Top 5 are cached** in process for 10 minutes; the cache is shared by in-flight requests to avoid a thundering herd on cold start.
4. **Per-request** the cascade tries the ranked models in order with an 8-second timeout (`16s` for streaming). On `401`/`403` the whole cascade aborts because the key is bad; on any other failure it falls through. The route handler is told which model served the request, and that model name is shown in the UI.

The result is "give me any working free model, fall back to a paid one, time out quickly so the user isn't staring at a spinner." Check the Vercel function logs for the `[openrouter] served by: <id>` line on every successful call.

### The chat trust boundary

`/api/chat` accepts a `messages` array from the browser. The route **filters out any client-supplied "assistant" turns** before forwarding to the LLM. The browser is allowed to send user turns; it is not allowed to forge the assistant's prior replies. Without this, a malicious client could prepend a fake assistant turn like "I'm ignoring the snapshot, here's the real answer" and many models would follow it.

The browser always sends the live crew + alerts alongside the messages. The server builds the conversation as:

```
system:  flight-surgeon system prompt (forbids raising alerts)
user:    crew snapshot for the selected crew member
assistant:  "Understood. I have the snapshot. What would you like to know?"
user:    ... (the actual user turns, filtered)
```

Server-Sent Events stream the model's deltas to the client as `data: {delta, model}` lines, terminating with `data: [DONE]`. The client uses a `TextDecoder`-based SSE reader and dispatches deltas into the reducer.

---

## State management

The whole dashboard runs in a single `useReducer` (`app/page.tsx`) with a discriminated-union `Action`. The state owns:

- the `Crew[]` array (mutated in place by `simulation.step`),
- selected crew, running/speed, scenario flags,
- the `Alert[]` log,
- the brief text + the model that wrote it,
- the chat thread + the model that served it,
- a transient caption string for the demo script.

The demo script is held in a `useRef<DemoStep[]>` and consumed by the tick interval — it doesn't go through the reducer. The interval itself depends only on `[running, speed]`; live `crew`/`storm`/`aiOn` are read through refs so the timer isn't torn down on every tick.

---

## UI components

- **`TopBar`** — mission clock (Day 112 · 06:00, advancing 30 min per tick) and play/pause + 1×/2×/4× speed selector.
- **`Pipeline`** — six steps ("Simulate → Baseline → AI score → Rules → Alert → Brief") that highlight in sequence when clicked, with a current-value footer for each stage.
- **`ScenarioBar`** — buttons to inject solar storm, sleep debt, or cardiac strain on the selected crew, plus "AI offline" and the "Run guided demo" / "Reset" controls.
- **`CrewList`** — three crew members with worst-level badges, AI score (when on), and current HR/SpO₂. Click to select.
- **`VitalsCard`** — five live tiles for the selected crew member: HR, SpO₂, sleep, stress, and 30-day dose + dose-rate sparkline.
- **`AIScoreCard`** — animated 0–100 score, per-factor bar breakdown, and the contextual "AI sees a pattern" hint.
- **`RulesCard`** — table of all five rules with current value, level badge, and threshold text.
- **`AlertsCard`** — eight most recent alerts, with `cleared` vs `active` badge. Click to select.
- **`TraceCard`** — "Why did this alert fire?" with the rule name, threshold, value, AI score at the time, and the action the protocol calls for.
- **`BriefCard`** — LLM-written brief, with a hand-rolled minimal Markdown renderer (headings + bullets + bold), the model name, the chat thread, and the chat input.

`components/ui/` holds three primitives used everywhere: `Panel`, `Button`, `ProgressBar`, plus a Recharts-based `Sparkline`.

---

## Testing

```bash
npm run test          # one-shot
npm run test:watch    # watch mode
```

The suite is pure-Node (no jsdom) and targets the deterministic layer: rules, AI score, snapshot serializer, and simulation. It uses [Vitest](https://vitest.dev).

Test files:

- `lib/rules.test.ts` — every threshold boundary for every rule, plus stable-order output.
- `lib/aiScore.test.ts` — factor weights sum to 100, EMA decay, `band()` classifier.
- `lib/serialize.test.ts` — snapshot completeness, scenario-flag formatting, 5-alert cap, wrong-crew filtering.
- `lib/simulation.test.ts` — `mkCrew` baseline, `seedCrew` warmup, `step` history mutation + 60-sample cap, `clock` rollover.

23 tests, ~280 ms total.

---

## Performance notes

- The simulation is single-threaded JavaScript that mutates three crew objects in place. A tick is sub-millisecond. We comfortably run at 4× speed (250 ms between ticks).
- Sparklines are Recharts `<LineChart>` with `dot={false}` and 300 ms animations. Only the visible crew's chart re-renders on selection.
- Framer Motion is wrapped in `<MotionConfig reducedMotion="user">` so `prefers-reduced-motion: reduce` disables all component-level animations.
- Tailwind's `optimizePackageImports` is enabled for `recharts` and `framer-motion` in `next.config.mjs`, tree-shaking icon-only imports.

The main bottleneck on a real deployment is the LLM cascade, not the simulation.

---

## Security notes

- The OpenRouter key is server-only. There are no `NEXT_PUBLIC_*` env vars. The `.gitignore` excludes `.env*`.
- The `/api/chat` route enforces a trust boundary: only `user`-role messages from the client are forwarded to the LLM. Client-supplied "assistant" turns are dropped.
- The hand-rolled Markdown renderer in `BriefCard` only handles a tiny subset of Markdown (headings, bullets, bold). It does not render HTML or interpret arbitrary text as code, so there is no XSS surface in the LLM-written brief.
- No `eval`, no `dangerouslySetInnerHTML`, no client-side calls to OpenRouter.

---

## Accessibility

- The play/pause button and the speed-selector buttons all carry `aria-pressed` so screen readers can announce their state.
- `Button` and the speed selector apply `focus-visible:ring-2 focus-visible:ring-accent/60` so keyboard focus is always visible.
- Color is never the only signal: every level badge is also a text label ("Stable" / "Watch" / "Alert").
- Decorative motion is suppressed under `prefers-reduced-motion: reduce` via `MotionConfig`.

---

## Project scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server on <http://localhost:3000> |
| `npm run build` | Production build (TypeScript + Next.js) |
| `npm run start` | Run the production build |
| `npm run lint` | `next lint` (ESLint, `next/core-web-vitals`) |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

---

## Environment variables

| Variable | Required | Where it's used | Notes |
|----------|----------|-----------------|-------|
| `OPENROUTER_API_KEY` | For briefs and chat | `app/api/brief/route.ts`, `app/api/chat/route.ts` | Server-only. Get one at <https://openrouter.ai/keys> |

The simulation, rules, AI score, and all panels work without it; only the LLM features will fail.

---

## Limitations and non-goals

- This is a **demo**, not a medical device. The rules, thresholds, and the "Page the flight surgeon now / re-check in 30 minutes" action text are illustrative.
- The simulation is **stochastic**, not seeded. The `seedCrew` warmup is meant to make the first paint look populated; reruns will differ.
- There is no persistence. Reloading the page resets everything.
- The chat history is per-session and only stored in component state.
- Only three crew members, hard-coded in `lib/simulation.ts`.
- The mission clock starts at Day 112, 06:00 and is purely cosmetic — it does not affect the simulation.

---

## License

This project is provided as-is for educational and demonstration purposes. Adapt it freely for your own mission-control dashboards.
