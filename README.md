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

- [x] when a run is created add redis job with run Id
- [x] in that redis job, we need to find the runId and run the job. Only update the columns to be enriched
- [x] in the job, continue updating the table + status. Finally update the table cache.
- [x] create hints for column

(Not Doing) Updating schema for enriched columns support
- [x] Update adding a new run at dashboard
- [x] Also update reading / creating cache

Problems
- [x] too many pages being scraped and searched. Limit to 5-6 . THink search query is problem
so basically it is calling 4-5 searches at parallel. Each search yields a list of pages to scrape around 10. So there are 40-50 pages being scraped in a cycle. Too many. Max could be 10-20 pages. With average of roughly 10 pages.
- [x] custom smaller scrapper. scraping bee is failing a lot
- [x] what happens if scrapper is failing. try any ways
- [x] context window is limiting

- [] no need in hints how to find the data. Also tell all the columns that are in the csv.
- [] In the logs also tell row # currently being processed could be [ROW 4 EXTRACTION STAGE]
- [] If 300X responses no need to include them only include 200 response
- [] we also need a redis entry or entries where we can use it to send streaming. How will it clear it itself. (Low priority)

- [x] Log design. Also come up with 5-6 different logs
- [x] Design for finished state. Here i want to not show details/generate buttton. Only export and delete buttons
- [] Height and border of leave feedback not matching the other workspace switcher
- [x] When we get the row-start event, make sure we auto scroll to that row. We should probably remove the much highlights after row completion
- [-] when enrichment complete, get the full table. Or refresh the page implicitly.
- [] Export button (verify)
- [x] Row shouldn't highlight once they fill
- [] Make cancel button work (verify)
- [-] Clearing redis entries after successful completion
- [x] Processing starts from 0 and finishes 1 before and continues in loading
- [x] retrying row event clear all the stages.
- [x] on page refresh, the cells are clearing. need to refetch
- [] pagination in table
