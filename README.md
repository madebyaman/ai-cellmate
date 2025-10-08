```sh
stripe listen --forward-to localhost:5173/api/auth/stripe/webhook
```

  2. Multi-Agent with Orchestrator (For complex leads)

  Different agents handle different aspects:
  - Profile Agent: Finds LinkedIn, validates job titles
  - Contact Agent: Discovers emails, phones, alternative contacts
  - Social Agent: Aggregates Twitter, GitHub, personal blogs
  - Company Agent: Enriches company data (size, funding, tech stack)
  - Orchestrator: Runs agents in parallel, merges results, handles conflicts

  Pros: Parallelization, specialized prompts per domain, easier to A/B test agents
  Cons: More complex, orchestration overhead, potential data conflicts


Tasks

- [] when a run is created add redis job with run Id
- [] in that redis job, we need to find the runId and run the job. Only update the columns to be enriched
- [] in the job, continue updating the table + status. Finally update the table cache.
- [] we also need a redis entry or entries where we can use it to send streaming. How will it clear it itself. (Low priority)

(Not Doing) Updating schema for enriched columns support
- [] Update adding a new run at dashboard
- [] Also update reading / creating cache
