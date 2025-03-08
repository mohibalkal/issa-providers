import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://webtor.io';

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  let url = `${baseUrl}/api/stream/${ctx.media.type}/${ctx.media.tmdbId}`;
  if (ctx.media.type === 'show') {
    url += `/season/${ctx.media.season.number}/episode/${ctx.media.episode.number}`;
  }
  return url;
}

export const headers = {
  'User-Agent': 'Mozilla/5.0',
  Referer: baseUrl,
  Accept: 'application/json',
};

export function formatQuality(size?: string): string {
  if (!size) return 'unknown';
  const sizeInGB = parseFloat(size);
  if (sizeInGB > 4) return '1080p';
  if (sizeInGB > 2) return '720p';
  return '480p';
}
