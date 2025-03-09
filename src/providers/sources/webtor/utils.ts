import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://webtor.io';

export function buildSearchQuery(ctx: MovieScrapeContext | ShowScrapeContext): string {
  if (ctx.media.type === 'movie') {
    return `${ctx.media.title} ${ctx.media.releaseYear}`;
  }
  return `${ctx.media.title} S${ctx.media.season.number.toString().padStart(2, '0')}E${ctx.media.episode.number.toString().padStart(2, '0')}`;
}

export const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache',
  'Content-Type': 'application/json'
};

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  let url = `${baseUrl}/api/stream/${ctx.media.type}/${ctx.media.tmdbId}`;
  if (ctx.media.type === 'show') {
    url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
  }
  return url;
}

export function formatQuality(size?: string): string {
  if (!size) return 'unknown';
  const sizeInGB = parseFloat(size);
  if (sizeInGB > 4) return '1080p';
  if (sizeInGB > 2) return '720p';
  return '480p';
}
