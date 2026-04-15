import { NextRequest, NextResponse } from 'next/server';
import type { Citation } from '@/types';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are a crypto market analyst AI assistant integrated into the Felswerke Terminal — a professional modular trading dashboard with multiple workspaces and configurable widgets.

You have access to real-time market data provided in the user's context. The user may share their current workspace context, which tells you which widgets they are looking at, which symbols they are tracking, current prices, news, and arbitrage spreads. Use this context to give relevant, targeted analysis.

You can call tools to fetch additional data.

Your role:
- Analyze price movements and trends
- Explain arbitrage opportunities
- Summarize news sentiment
- Provide market context and education
- Compute and explain technical indicators

Rules:
- You do NOT provide financial advice
- You do NOT recommend specific trades (no "buy", "sell", "hold" recommendations)
- You always note that crypto is volatile and risky
- You present factual analysis only
- Be concise, professional, and data-driven
- Use numbers and data when available
- Always cite your data sources with provider names and timestamps
- Label data as "delayed" or "estimated" when appropriate
- Refuse requests for insider trading, market manipulation, or bypassing paywalls`;

// Tool definitions for function calling
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_price_quote',
      description: 'Get current prices for a cryptocurrency symbol from all exchanges',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Symbol like BTC or ETH' } },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_chart_history',
      description: 'Get historical OHLCV price data for charting and indicator analysis',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Symbol like BTC or ETH' },
          range: { type: 'string', enum: ['1H', '1D', '1W', '1M', '1Y'], description: 'Time range' },
        },
        required: ['symbol', 'range'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_market_overview',
      description: 'Get global crypto market data: total market cap, 24h volume, BTC/ETH dominance',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_fear_greed',
      description: 'Get the current Fear & Greed Index value and classification',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_alerts',
      description: 'Get current active risk alerts from the alert engine',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_news',
      description: 'Get latest crypto news with sentiment analysis',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function executeTool(
  name: string,
  args: Record<string, string>,
  baseUrl: string
): Promise<{ result: string; citation: Citation }> {
  const now = Date.now();
  let endpoint = '';
  let data: unknown;

  switch (name) {
    case 'get_price_quote': {
      endpoint = '/api/prices';
      const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
      const json = await res.json();
      const filtered = (json.prices || []).filter(
        (p: { symbol: string }) => p.symbol === (args.symbol || '').toUpperCase()
      );
      data = { symbol: args.symbol, prices: filtered, reachable: json.reachable };
      break;
    }
    case 'get_chart_history': {
      endpoint = `/api/history?symbol=${args.symbol || 'BTC'}&range=${args.range || '1D'}`;
      const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
      const json = await res.json();
      const ohlcv = json.ohlcv || [];
      const last5 = ohlcv.slice(-5);
      data = {
        symbol: args.symbol, range: args.range, source: json.source,
        totalCandles: ohlcv.length,
        first: ohlcv[0] ? { time: ohlcv[0].time, close: ohlcv[0].close } : null,
        last5: last5.map((c: { time: number; open: number; high: number; low: number; close: number; volume: number }) => ({
          time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
        })),
        periodHigh: ohlcv.length ? Math.max(...ohlcv.map((c: { high: number }) => c.high)) : 0,
        periodLow: ohlcv.length ? Math.min(...ohlcv.map((c: { low: number }) => c.low)) : 0,
      };
      break;
    }
    case 'get_market_overview': {
      endpoint = '/api/market';
      const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
      data = await res.json();
      break;
    }
    case 'get_fear_greed': {
      endpoint = '/api/fear-greed';
      const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
      data = await res.json();
      break;
    }
    case 'get_alerts': {
      endpoint = '/api/alerts';
      const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
      data = await res.json();
      break;
    }
    case 'get_news': {
      endpoint = '/api/news';
      const res = await fetch(`${baseUrl}${endpoint}`, { cache: 'no-store' });
      data = await res.json();
      break;
    }
    default:
      data = { error: `Unknown tool: ${name}` };
  }

  return {
    result: JSON.stringify(data),
    citation: { source: name, endpoint, retrievedAt: now },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;
    const context = body?.context;

    if (!message || typeof message !== 'string' || message.length > 4000) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const aiProvider = process.env.AI_PROVIDER || 'openai';
    const apiKey = aiProvider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        response: 'AI assistant is not configured. Add your API key to .env.local (OPENAI_API_KEY or ANTHROPIC_API_KEY) and restart the server.',
        citations: [],
        followUps: [],
      });
    }

    const contextStr = context ? `\n\nCurrent Market Context:\n${JSON.stringify(context, null, 2)}` : '';
    const userMessage = `${message}${contextStr}`;
    const baseUrl = request.nextUrl.origin;
    const citations: Citation[] = [];

    let responseText: string;
    if (aiProvider === 'anthropic') {
      responseText = await callAnthropic(apiKey, userMessage, baseUrl, citations);
    } else {
      responseText = await callOpenAI(apiKey, userMessage, baseUrl, citations);
    }

    const followUps = generateFollowUps(message, responseText);
    return NextResponse.json({ response: responseText, citations, followUps });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}

async function callOpenAI(apiKey: string, userMessage: string, baseUrl: string, citations: Citation[]): Promise<string> {
  const messages: { role: string; content: string; tool_call_id?: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  let res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages, tools: TOOLS, tool_choice: 'auto',
      max_tokens: 1500, temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  let data = await res.json();
  let choice = data.choices?.[0];

  if (choice?.message?.tool_calls) {
    messages.push(choice.message);
    for (const tc of choice.message.tool_calls) {
      const args = JSON.parse(tc.function.arguments || '{}');
      const { result, citation } = await executeTool(tc.function.name, args, baseUrl);
      citations.push(citation);
      messages.push({ role: 'tool', content: result, tool_call_id: tc.id });
    }

    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages, max_tokens: 1500, temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    data = await res.json();
    choice = data.choices?.[0];
  }

  return choice?.message?.content || 'No response generated.';
}

async function callAnthropic(apiKey: string, userMessage: string, baseUrl: string, citations: Citation[]): Promise<string> {
  const anthropicTools = TOOLS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));

  let res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1500, system: SYSTEM_PROMPT, tools: anthropicTools,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  let data = await res.json();

  if (data.stop_reason === 'tool_use') {
    const toolBlocks = data.content.filter((b: { type: string }) => b.type === 'tool_use');
    const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
    for (const block of toolBlocks) {
      const { result, citation } = await executeTool(block.name, block.input || {}, baseUrl);
      citations.push(citation);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 1500, system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: data.content },
          { role: 'user', content: toolResults },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    data = await res.json();
  }

  return data.content?.find((b: { type: string }) => b.type === 'text')?.text || 'No response generated.';
}

function generateFollowUps(userMessage: string, response: string): string[] {
  const lower = (userMessage + ' ' + response).toLowerCase();
  const suggestions: string[] = [];
  if (lower.includes('btc') || lower.includes('bitcoin')) {
    suggestions.push('Zeig mir den RSI von BTC der letzten Woche');
    suggestions.push('Wie ist das aktuelle Marktsentiment?');
  }
  if (lower.includes('eth') || lower.includes('ethereum')) {
    suggestions.push('Vergleiche ETH mit BTC Performance');
  }
  if (lower.includes('arbitrage') || lower.includes('spread')) {
    suggestions.push('Welche Exchanges haben die besten Preise?');
  }
  if (lower.includes('news') || lower.includes('nachrichten')) {
    suggestions.push('Was ist die aktuelle Marktstimmung?');
  }
  if (suggestions.length === 0) {
    suggestions.push('Was passiert gerade am Markt?');
    suggestions.push('Gibt es aktuelle Risiko-Alerts?');
  }
  return suggestions.slice(0, 3);
}
