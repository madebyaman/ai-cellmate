# Queue Utils

Small, focused, and observable helpers:

- `csv.ts`: parse/reconstruct CSV with logging
- `llm.ts`: provider-agnostic LLM facade
- `chunking.ts`: concurrency helpers

Environment variables:

- `LLM_PROVIDER` = `openai` | `anthropic` | (fallback echo)
- `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`)
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-3-5-sonnet-latest`)
- `LLM_TEMPERATURE` (default `0`), `LLM_MAX_TOKENS` (default `200`)
- `LLM_CONCURRENCY` (default `4`)


