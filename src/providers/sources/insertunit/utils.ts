import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://insertunit.com';

export const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': baseUrl,
  'Referer': baseUrl,
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Connection': 'keep-alive',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1'
};

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  const base = `${baseUrl}/api/embed`;
  
  if (ctx.media.type === 'movie') {
    return `${base}/imdb/${ctx.media.imdbId}`;
  }
  
  return `${base}/imdb/${ctx.media.imdbId}`;
} 