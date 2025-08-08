/*
  LLM client facade with provider-agnostic interface.
  Uses environment variables to determine provider and API key.
  This module intentionally logs verbosely for observability.
*/

export type LlmenrichmentInput = {
  prompt: string;
  rowIndex: number;
  columnName: string;
  rowObject: Record<string, string>;
};

export type LlmenrichmentOutput = {
  rowIndex: number;
  columnName: string;
  value: string;
  raw?: unknown;
};

export async function enrichCellWithLLM(input: LlmenrichmentInput): Promise<LlmenrichmentOutput> {
  const provider = process.env.LLM_PROVIDER?.toLowerCase() || 'openai';
  console.log('[llm] enrichCell:start', { provider, rowIndex: input.rowIndex, column: input.columnName });

  switch (provider) {
    case 'openai':
      return await enrichWithOpenAI(input);
    case 'anthropic':
      return await enrichWithAnthropic(input);
    default:
      console.warn('[llm] unknown provider, using echo fallback', { provider });
      return await enrichWithEcho(input);
  }
}

async function enrichWithOpenAI(input: LlmenrichmentInput): Promise<LlmenrichmentOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[llm] OPENAI_API_KEY missing, falling back to echo mode');
    return enrichWithEcho(input);
  }
  // Lazy import to avoid dependency at startup if not used
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  const systemPrompt = 'You are a data enrichment assistant. Return only the value for the requested cell. No extra text.';
  const userPrompt = buildUserPrompt(input);
  console.log('[llm] openai:request', { model: process.env.OPENAI_MODEL || 'gpt-4o-mini', rowIndex: input.rowIndex, column: input.columnName });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: Number(process.env.LLM_TEMPERATURE || 0),
    max_tokens: Number(process.env.LLM_MAX_TOKENS || 200),
  });
  const content = completion.choices?.[0]?.message?.content ?? '';
  const value = (Array.isArray(content) ? content.map((c: any) => c.text || '').join('') : content).trim();
  console.log('[llm] openai:response', { rowIndex: input.rowIndex, column: input.columnName, length: value.length });
  return { rowIndex: input.rowIndex, columnName: input.columnName, value, raw: completion };
}

async function enrichWithAnthropic(input: LlmenrichmentInput): Promise<LlmenrichmentOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[llm] ANTHROPIC_API_KEY missing, falling back to echo mode');
    return enrichWithEcho(input);
  }
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const system = 'You are a data enrichment assistant. Return only the value for the requested cell. No extra text.';
  const prompt = buildUserPrompt(input);
  console.log('[llm] anthropic:request', { model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest', rowIndex: input.rowIndex, column: input.columnName });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    system,
    messages: [{ role: 'user', content: prompt }],
    temperature: Number(process.env.LLM_TEMPERATURE || 0),
    max_tokens: Number(process.env.LLM_MAX_TOKENS || 200),
  });
  const value = (message.content?.[0] as any)?.text?.trim?.() ?? '';
  console.log('[llm] anthropic:response', { rowIndex: input.rowIndex, column: input.columnName, length: value.length });
  return { rowIndex: input.rowIndex, columnName: input.columnName, value, raw: message };
}

async function enrichWithEcho(input: LlmenrichmentInput): Promise<LlmenrichmentOutput> {
  const value = `[echo:${input.columnName}]`;
  console.log('[llm] echo:response', { rowIndex: input.rowIndex, column: input.columnName, value });
  return { rowIndex: input.rowIndex, columnName: input.columnName, value };
}

function buildUserPrompt(input: LlmenrichmentInput): string {
  const context = JSON.stringify(input.rowObject);
  return `${input.prompt}\n\nRow Index: ${input.rowIndex}\nTarget Column: ${input.columnName}\nRow Data JSON: ${context}\n\nReturn only the value for the cell.`;
}


