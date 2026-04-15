import { NextResponse } from 'next/server';
import { analyzeSentiment } from '@/lib/sentiment';
import { cacheGet, cacheSet, TTL } from '@/lib/cache';
import type { NewsItem } from '@/types';

export const dynamic = 'force-dynamic';

async function fetchCryptoCompareNews(): Promise<NewsItem[]> {
  const res = await fetch(
    'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest',
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`CryptoCompare API returned ${res.status}`);
  }

  const data = await res.json();
  const articles = data.Data || [];

  return articles.slice(0, 20).map((article: Record<string, unknown>) => ({
    id: String(article.id),
    title: String(article.title || ''),
    source: String(article.source || 'Unknown'),
    url: String(article.url || ''),
    body: String(article.body || '').substring(0, 200),
    publishedAt: Number(article.published_on) || Math.floor(Date.now() / 1000),
    sentiment: analyzeSentiment(
      String(article.title || '') + ' ' + String(article.body || '')
    ),
    categories: typeof article.categories === 'string'
      ? article.categories.split('|')
      : [],
  }));
}

async function fetchGoogleNews(): Promise<NewsItem[]> {
  // Google News RSS for crypto/bitcoin topics
  const res = await fetch(
    'https://news.google.com/rss/search?q=bitcoin+OR+ethereum+OR+crypto&hl=en-US&gl=US&ceid=US:en',
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error(`Google News RSS returned ${res.status}`);
  }

  const xml = await res.text();
  return parseRssItems(xml);
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  // Simple XML parser for RSS <item> elements
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let index = 0;

  while ((match = itemRegex.exec(xml)) !== null && index < 20) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const source = extractTag(itemXml, 'source') || 'Google News';
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');

    if (title) {
      const publishedAt = pubDate
        ? Math.floor(new Date(pubDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      items.push({
        id: `gn-${index}`,
        title: decodeHtmlEntities(title),
        source: decodeHtmlEntities(source),
        url: link || '',
        body: description ? decodeHtmlEntities(description).substring(0, 200) : '',
        publishedAt,
        sentiment: analyzeSentiment(title + ' ' + (description || '')),
        categories: ['Crypto'],
      });
      index++;
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1].trim() : '';
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '');
}

export async function GET() {
  const cached = cacheGet<{ news: NewsItem[] }>('news');
  if (cached) return NextResponse.json(cached);

  const errors: string[] = [];

  // Try CryptoCompare first
  try {
    const news = await fetchCryptoCompareNews();
    if (news.length > 0) {
      const result = { news, provider: 'CryptoCompare', warnings: [] as string[] };
      cacheSet('news', result, TTL.NEWS);
      return NextResponse.json(result);
    }
  } catch (err) {
    errors.push(`CryptoCompare: ${err}`);
  }

  // Fallback: Google News RSS
  try {
    const news = await fetchGoogleNews();
    if (news.length > 0) {
      const result = { news, provider: 'Google News', warnings: ['CryptoCompare unavailable'] };
      cacheSet('news', result, TTL.NEWS);
      return NextResponse.json(result);
    }
  } catch (err) {
    errors.push(`Google News: ${err}`);
  }

  console.error('All news sources failed:', errors.join(' | '));
  return NextResponse.json(
    { error: 'All news sources unreachable', news: [] },
    { status: 500 }
  );
}
