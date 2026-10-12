# Crew Health Monitor

Mission-control-style dashboard that simulates crew telemetry, runs deterministic rule-based alerts, and uses an LLM (via OpenRouter) to write a flight-surgeon brief and answer follow-up questions.

The deterministic AI risk score runs in the browser. The LLM only **writes prose** — it never raises alerts. The contract is: *rules decide, AI advises*.

## Run locally

```bash
npm install
cp .env.local.example .env.local
# paste your OpenRouter key into .env.local
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. Import the repo on https://vercel.com/new.
3. In the project, go to **Settings → Environment Variables** and add:
   - `OPENROUTER_API_KEY` = your key from https://openrouter.ai/keys
4. Deploy.

The key is only used inside `app/api/*/route.ts` and is never shipped to the browser.

## How the model cascade works

`lib/openrouter.ts` fetches `https://openrouter.ai/api/v1/models` on first use, ranks chat-capable models by (free-first, then price, then context length, then family preference), and caches the top 5 for 10 minutes. Each API request tries them in order with an 8s timeout, falling through to the next on failure. Check the Vercel function logs — every successful request logs the model that served it.
