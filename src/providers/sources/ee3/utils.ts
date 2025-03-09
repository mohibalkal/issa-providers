import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://ee3.me';

export const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': baseUrl,
  'Referer': baseUrl,
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Connection': 'keep-alive',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
  'X-Requested-With': 'XMLHttpRequest'
};

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  const base = `${baseUrl}/api/source`;
  
  if (ctx.media.type === 'movie') {
    return `${base}/movie/${ctx.media.tmdbId}`;
  }
  
  return `${base}/tv/${ctx.media.tmdbId}/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
}

export function buildBackupUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  const base = `${baseUrl}/api/backup`;
  
  if (ctx.media.type === 'movie') {
    return `${base}/movie/${ctx.media.tmdbId}`;
  }
  
  return `${base}/tv/${ctx.media.tmdbId}/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
} 