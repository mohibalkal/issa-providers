import { MovieScrapeContext, ShowScrapeContext } from '@/utils/context';

export const baseUrl = 'https://vidapi.click';

export function buildStreamUrl(ctx: MovieScrapeContext | ShowScrapeContext): string {
  let url = `${baseUrl}/api/v1/${ctx.media.type}/${ctx.media.tmdbId}`;
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
