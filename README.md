# ai cellmate

autonomous ai agents that search, scrape, and enrich csv data using multi-cycle agentic loops with real-time streaming.

---

## demo

<video src="https://github.com/user-attachments/assets/7a4876ac-14c0-4c93-9d4a-2cdaa46480a5" controls width="600"></video>

upload csv → agents search and scrape missing data → watch real-time progress → download enriched csv

---

## overview

full-stack csv enrichment platform using ai agents. agents run in background workers, stream progress via redis pub/sub + sse, and use multi-cycle loops to fill missing data.

built to showcase:

- multi-agent ai orchestration with langfuse telemetry
- real-time streaming (redis pub/sub + server-sent events)
- background job processing (bullmq workers)
- multi-tenant saas architecture

**auth**: better-auth with organization support and multi-tenancy
**billing**: stripe subscriptions with organization-scoped credits
**deployment**: docker + railway with automatic migrations

---

## tech stack

**frontend**
react 19, react router 7, typescript 5.8, tailwindcss 4, radix ui

**backend**
node.js, react router server, prisma 6, sqlite, better auth, zod

**ai & external apis**
openai gpt-4o (query generation, extraction), google gemini (summarization), serper (search), scrapingbee (scraping), langfuse (telemetry)

**infrastructure**
bullmq, redis (job queue + pub/sub), stripe, railway, docker, tsup

---

## architecture

```
CLIENT (browser)
    │
    │ SSE (server-sent events)
    ↓
SERVER (react router 7)
    │
    │ subscribe to redis channel
    ↓
REDIS (pub/sub + job queue)
    ↑                    │
    │                    │ jobs
    │ events             ↓
    │              WORKER (bullmq)
    │                    │
    │                    │ agentic loop
    │                    ↓
    │              ┌──────────────────┐
    │              │  1. query writer │
    │              │  2. search tool  │
    └──────────────│  3. scraper tool │
       publish     │  4. extractor    │
       progress    │  5. retry logic  │
                   └──────────────────┘
                            │
                            ↓
                   external apis
                   (openai, serper, scrapingbee)
```

---

## technical details

<details>
<summary><strong>agentic loop</strong></summary>

**file**: `app/agent/agent-loop.ts`

runs up to 2 enrichment cycles per csv row.

**stages**:

1. **query writer** - generates search queries for missing columns using gpt-4o
   - uses failed query history to avoid repeating mistakes
   - structured output with zod schemas

2. **search tool** - parallel web searches via serper api
   - returns urls, snippets, titles

3. **scraper tool** - scrapes urls with deduplication
   - custom lightweight scraper first
   - scrapingbee fallback for js-heavy sites
   - converts html → markdown
   - configurable concurrency

4. **result extractor** - extracts structured data using gpt-4o
   - gemini summarizes content
   - zod validation

5. **retry logic** - tracks failed columns
   - retries in next cycle
   - saves final state

**telemetry**: langfuse tracks all llm calls, token usage, latency

**events**: publishes to redis at each stage (`stage-start`, `stage-complete`, `cell-update`)

</details>

<details>
<summary><strong>server-sent events (sse)</strong></summary>

**real-time progress streaming**

**publisher** (`app/lib/redis-event-publisher.ts`):

- singleton redis client
- publishes events to `enrichment:{tableId}` channel
- 11 event types: `row-start`, `stage-start`, `cell-update`, `row-complete`, etc.
- graceful degradation if redis fails

**subscriber** (`app/routes/csv-view.$tableId.stream.tsx`):

- creates redis subscriber per browser client
- subscribes to table-specific channel
- streams events via sse endpoint
- auto cleanup on disconnect

**client** (`app/routes/csv-view.tsx`):

- eventsource connection
- updates ui in real-time based on events
- multiple clients can watch same enrichment

</details>

<details>
<summary><strong>background workers</strong></summary>

**file**: `app/queues/workers/csv-enrichment.worker.ts`

**queue** (bullmq + redis):

- persistent job storage
- each enrichment run = one job
- retry logic and error handling

**worker process**:

- separate node process (`worker.ts`)
- production: compiled with tsup
- development: runs with tsx
- sequential processing (concurrency: 1)

**workflow**:

1. fetch csv data from database
2. for each row:
   - publish `row-start` event
   - run agentic loop (up to 2 cycles)
   - save enriched data
   - publish `cell-update` events
   - publish `row-complete`
3. update run status
4. publish `complete` event

**cancellation** (`app/lib/enrichment-cancellation.server.ts`):

- sets redis flag `cancel:{runId}`
- agent loop checks flag before each operation
- graceful shutdown

</details>

---

## project structure

```
app/
├── agent/                  # agentic loop + tools
│   ├── agent-loop.ts       # multi-cycle orchestrator
│   ├── query-writer.ts     # query generation
│   ├── search-tool.ts      # serper integration
│   ├── scraper-tool.ts     # web scraping
│   └── result-extracter.ts # data extraction
├── queues/
│   ├── csv-enrichment.queue.ts
│   └── workers/
│       └── csv-enrichment.worker.ts
├── routes/
│   ├── csv-view.tsx                    # enrichment ui
│   └── csv-view.$tableId.stream.tsx    # sse endpoint
└── lib/
    ├── redis-event-publisher.ts        # event publishing
    └── enrichment-cancellation.server.ts
```

---

## development

```bash
npm install
cp .env.template .env
npm run postinstall
npx prisma migrate dev
npm run dev
```

runs web server (port 5173) + worker process

**production**:

```bash
npm run build
npm start              # web server
npm run start:workers  # worker process
```

---
